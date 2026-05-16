"use client";
/**
 * Tus resumable upload hook — wraps tus-js-client for direct Walrus uploads.
 * Flow: request session → upload to Walrus publisher → confirm with backend.
 */
import { useState, useCallback, useRef } from "react";
import { WalrusUploader } from "../lib/walrus";
import { env } from "../lib/env";
import { createUploadSession, confirmUpload } from "../lib/api/uploads";

export type UploadStatus = "idle" | "requesting" | "uploading" | "confirming" | "done" | "error";

interface UploadState {
  status: UploadStatus;
  progress: number;
  blobId: string | null;
  error: string | null;
}

export function useTusUpload(formId: string) {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    blobId: null,
    error: null,
  });
  const uploadRef = useRef<WalrusUploader | null>(null);

  const upload = useCallback(
    async (
      file: File,
      options: {
        allowedMimeTypes?: string[];
        maxFileSize?: number;
        uploadPurpose?: "submission" | "branding_logo" | "branding_background" | "branding_favicon";
      } = {}
    ): Promise<string> => {
      setState({ status: "requesting", progress: 0, blobId: null, error: null });

      // 1. Request upload session from backend
      const session = await createUploadSession({
        formId,
        allowedMimeTypes: options.allowedMimeTypes ?? [file.type || "*/*"],
        maxFileSize: options.maxFileSize ?? 100 * 1024 * 1024, // 100MB default
        uploadPurpose: options.uploadPurpose ?? "submission",
      });

      setState((s) => ({ ...s, status: "uploading" }));

      // 2. Upload directly to Walrus publisher via tus
      return new Promise<string>((resolve, reject) => {
        const publisher = session.publisherEndpoint || env.NEXT_PUBLIC_WALRUS_PUBLISHER_ENDPOINT;
        const tusUpload = new WalrusUploader(file, {
          endpoint: `${publisher}/v1/blobs?epochs=1`,
          onProgress(bytesUploaded, bytesTotal) {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setState((s) => ({ ...s, progress: pct }));
          },
          async onSuccess() {
            try {
              const uploadUrl = tusUpload.url ?? "";
              const blobId = uploadUrl.split("/").pop() ?? "";

              setState((s) => ({ ...s, status: "confirming" }));

              // 3. Confirm with backend
              await confirmUpload({ sessionToken: session.sessionToken, blobId });

              setState({ status: "done", progress: 100, blobId, error: null });
              resolve(blobId);
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Confirm failed";
              setState((s) => ({ ...s, status: "error", error: msg }));
              reject(new Error(msg));
            }
          },
          onError(error) {
            const msg = error instanceof Error ? error.message : "Upload failed";
            setState((s) => ({ ...s, status: "error", error: msg }));
            reject(new Error(msg));
          },
        });

        uploadRef.current = tusUpload;
        tusUpload.start();
      });
    },
    [formId]
  );

  const abort = useCallback(() => {
    uploadRef.current?.abort();
    setState({ status: "idle", progress: 0, blobId: null, error: null });
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", progress: 0, blobId: null, error: null });
  }, []);

  return { ...state, upload, abort, reset };
}
