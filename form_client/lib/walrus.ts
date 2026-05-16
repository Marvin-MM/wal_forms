/**
 * Walrus client — direct blob reads from aggregator and tus uploads to publisher.
 * The server never proxies content; all blob I/O happens client-side.
 */
import { env } from "./env";

const AGGREGATOR = env.NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT;
const PUBLISHER = env.NEXT_PUBLIC_WALRUS_PUBLISHER_ENDPOINT;

// ── Blob Reads ────────────────────────────────────────────────────────────────

export async function fetchBlob(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
  if (!res.ok) {
    throw new Error(`Walrus fetch failed: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export async function fetchBlobAsJson<T = unknown>(blobId: string): Promise<T> {
  const bytes = await fetchBlob(blobId);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

export async function fetchBlobAsText(blobId: string): Promise<string> {
  const bytes = await fetchBlob(blobId);
  return new TextDecoder().decode(bytes);
}

// ── Blob Uploads (tus resumable) ──────────────────────────────────────────────

export interface UploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
}

export interface TusUploadResult {
  blobId: string;
}

export class WalrusUploader {
  private xhr: XMLHttpRequest;
  private endpoint: string;

  constructor(
    private file: File | Blob,
    private options: {
      endpoint: string;
      onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) {
    this.endpoint = options.endpoint;
    this.xhr = new XMLHttpRequest();
  }

  public url: string | null = null;

  start() {
    this.xhr.open("PUT", this.endpoint, true);
    this.xhr.setRequestHeader("Content-Type", this.file.type || "application/octet-stream");

    this.xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        this.options.onProgress?.(e.loaded, e.total);
      }
    };

    this.xhr.onload = () => {
      if (this.xhr.status >= 200 && this.xhr.status < 300) {
        try {
          const result = JSON.parse(this.xhr.responseText);
          // Parse the Walrus JSON response to get the blobId
          let blobId: string | undefined;
          if (result.newlyCreated?.blobObject?.blobId) {
            blobId = result.newlyCreated.blobObject.blobId;
          } else if (result.alreadyCertified?.blobId) {
            blobId = result.alreadyCertified.blobId;
          }
          if (blobId) {
            // Mock the URL so consumers extracting the ID from it still work
            this.url = `${this.endpoint}/${blobId}`;
            this.options.onSuccess?.();
          } else {
            this.options.onError?.(new Error("Invalid response format from Walrus"));
          }
        } catch (err) {
          this.options.onError?.(new Error("Failed to parse Walrus response"));
        }
      } else {
        this.options.onError?.(new Error(`Walrus upload failed: ${this.xhr.status} ${this.xhr.responseText}`));
      }
    };

    this.xhr.onerror = () => {
      this.options.onError?.(new Error("Network error during Walrus upload"));
    };

    this.xhr.send(this.file);
  }

  abort() {
    this.xhr.abort();
  }
}

export function uploadBlob(
  file: File | Blob,
  options: {
    publisherEndpoint?: string;
    onProgress?: (progress: UploadProgress) => void;
    onSuccess?: (result: TusUploadResult) => void;
    onError?: (error: Error) => void;
  } = {}
): WalrusUploader {
  const {
    publisherEndpoint = PUBLISHER,
    onProgress,
    onSuccess,
    onError,
  } = options;

  const upload = new WalrusUploader(file, {
    endpoint: `${publisherEndpoint}/v1/blobs?epochs=1`,
    onProgress(bytesUploaded, bytesTotal) {
      onProgress?.({
        bytesUploaded,
        bytesTotal,
        percentage: Math.round((bytesUploaded / bytesTotal) * 100),
      });
    },
    onSuccess() {
      const uploadUrl = upload.url ?? "";
      const blobId = uploadUrl.split("/").pop() ?? "";
      onSuccess?.({ blobId });
    },
    onError(error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    },
  });

  return upload;
}

export function uploadBlobPromise(
  file: File | Blob,
  options: {
    publisherEndpoint?: string;
    onProgress?: (progress: UploadProgress) => void;
  } = {}
): Promise<TusUploadResult> {
  return new Promise((resolve, reject) => {
    const upload = uploadBlob(file, {
      ...options,
      onSuccess: resolve,
      onError: reject,
    });
    upload.start();
  });
}
