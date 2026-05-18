"use client";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { CheckCircle2, Shield, ExternalLink } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import type { Form } from "../../shared/types/entities";
import type { FormBranding, AccessPolicy } from "../../shared/types/entities";
import type { FormSchemaType, FormField, SubmissionIdentityMode } from "../../shared/schemas/form-schema";
import { env } from "../../lib/env";
import { checkAccess } from "../../lib/api/access";
import { createSubmissionUploadSession, confirmUpload } from "../../lib/api/uploads";
import { queryKeys } from "../../lib/query-keys";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { Select } from "../ui/Select";
import { SuiExplorerLink } from "../common/ExplorerLinks";
import { useSubmissionFlow } from "../../hooks/useSubmissionFlow";
import { uploadBlobPromise } from "../../lib/walrus";
import { IdentityPanel } from "./IdentityPanel";
import { WalletGate } from "./WalletGate";
import { NotAuthorizedPage, PasswordGatePage } from "./AccessGatePages";
import { cn, walrusBlobUrl } from "../../lib/utils";

function buildZodSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let schema: z.ZodTypeAny;
    switch (field.type) {
      case "number": case "rating": case "scale":
        schema = z.coerce.number();
        if (field.validation?.min !== undefined) schema = (schema as z.ZodNumber).min(field.validation.min);
        if (field.validation?.max !== undefined) schema = (schema as z.ZodNumber).max(field.validation.max);
        break;
      case "email": schema = z.string().email(); break;
      case "url": schema = z.string().url(); break;
      case "checkbox": schema = z.boolean(); break;
      case "multiselect": schema = z.array(z.string()); break;
      case "file":
          schema = z.any();
        if (field.validation?.required) {
          schema = schema.refine(
            (value) => typeof FileList !== "undefined" && value instanceof FileList && value.length > 0,
            "File is required"
          );
        }
        break;
      default:
        schema = z.string();
        if (field.validation?.minLength) schema = (schema as z.ZodString).min(field.validation.minLength);
        if (field.validation?.maxLength) schema = (schema as z.ZodString).max(field.validation.maxLength);
    }
    if (field.type !== "file" && !field.validation?.required) schema = schema.optional();
    shape[field.id] = schema;
  }
  return z.object(shape);
}

async function uploadSubmissionFiles(
  formId: string,
  fields: FormField[],
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const payload = { ...data };
  const fileFields = fields.filter((field) => field.type === "file");

  for (const field of fileFields) {
    const value = payload[field.id];
    const file =
      typeof FileList !== "undefined" && value instanceof FileList ? value.item(0) : null;

    if (!file) {
      delete payload[field.id];
      continue;
    }

    const session = await createSubmissionUploadSession({
      formId,
      fieldId: field.id,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
    });
    const uploaded = await uploadBlobPromise(file, {
      publisherEndpoint: session.publisherEndpoint,
    });
    await confirmUpload({ sessionToken: session.sessionToken, blobId: uploaded.blobId });

    payload[field.id] = {
      blobId: uploaded.blobId,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    };
  }

  return payload;
}

interface PublicFormClientProps {
  form: Form;
  branding?: FormBranding | null;
  accessPolicy?: AccessPolicy | null;
  identityMode?: SubmissionIdentityMode;
  passwordError?: string | null;
  /** Called when the password gate form needs the password forwarded */
  onPasswordSubmit?: (password: string) => void;
}

export function PublicFormClient({
  form,
  branding,
  accessPolicy,
  identityMode = "anonymous",
  passwordError,
}: PublicFormClientProps) {
  const prefersReducedMotion = useReducedMotion();
  const currentAccount = useCurrentAccount();
  const schema = form.denormalizedSchema as FormSchemaType;
  const zodSchema = buildZodSchema(schema.fields);

  // Turnstile token state (bypassed for now)
  const [turnstileToken, setTurnstileToken] = useState<string | null>("bypassed");
  const [password, setPassword] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: rhfIsSubmitting },
    setValue,
    watch,
  } = useForm({ resolver: zodResolver(zodSchema) });

  const { submit, status, result, isSubmitting, buttonLabel } = useSubmissionFlow({
    formId: form.id,
    formObjectId: form.suiObjectId,
    identityMode,
    isPrivate: form.isPrivate,
    ownerWallet: form.ownerWallet,
    sponsorshipEnabled: !!form.sponsorshipPoolObjectId,
  });

  const onSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      const payload = await uploadSubmissionFiles(form.id, schema.fields, data);
      await submit(payload, turnstileToken || "bypassed", password ?? undefined);
    },
    [form.id, schema.fields, submit, turnstileToken, password]
  );

  const { data: allowlistAccess, isLoading: allowlistLoading } = useQuery({
    queryKey: [...queryKeys.access.allowlist(form.id), "check", currentAccount?.address],
    queryFn: () => checkAccess(form.id, currentAccount!.address),
    enabled: !!accessPolicy?.requiresAllowlist && !!currentAccount?.address,
  });

  // Custom branding CSS vars applied inline on the container
  const brandingStyle: React.CSSProperties = {
    ...(branding?.accentColor
      ? { "--form-accent": branding.accentColor } as React.CSSProperties
      : {}),
    ...(branding?.backgroundColor
      ? { backgroundColor: branding.backgroundColor }
      : {}),
  };

  const accentClass = branding?.accentColor ? "" : "";

  // ── Success screen ─────────────────────────────────────────────────────────
  if (status === "complete" && result) {
    const isAnon = identityMode === "anonymous";
    const successMsg = branding?.thankYouMessage ?? schema.settings?.successMessage ?? "Thank you for your submission!";

    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)]">
          <CheckCircle2 className="h-8 w-8 text-[var(--color-success)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{successMsg}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {isAnon
            ? result.digest
              ? "Your response was recorded on-chain by the platform."
              : "Your response was securely recorded."
            : "Your response was recorded on-chain with your wallet."}
        </p>

        {result.digest && (
          <div className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-left space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              On-chain proof
            </p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-[var(--text-secondary)] break-all">
                Tx: {result.digest.slice(0, 20)}…
              </code>
            </div>
            {result.suiObjectId && (
              <div className="flex items-center gap-2">
                <SuiExplorerLink objectId={result.suiObjectId} label="View receipt" />
                <a
                  href={`/verify/${result.suiObjectId}`}
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-400)] hover:underline"
                >
                  <Shield className="h-3 w-3" />
                  Verify
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  if (accessPolicy?.hasPassword && password === null) {
    return (
      <PasswordGatePage
        formTitle={schema.title}
        formDescription={schema.description ?? null}
        error={passwordError}
        onPasswordSubmit={setPassword}
      />
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  const formContent = (
    <div
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 sm:p-8"
      style={brandingStyle}
    >
      {/* Form header */}
      <div className="mb-6">
        {branding?.logoWalrusBlobId && (
          <img
            src={walrusBlobUrl(branding.logoWalrusBlobId)}
            alt="Form logo"
            className="mb-4 h-10 object-contain"
          />
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {schema.title}
        </h1>
        {schema.description && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{schema.description}</p>
        )}
        {form.isPrivate && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)]/10 px-3 py-2">
            <Shield className="h-4 w-4 text-[var(--color-brand-400)]" />
            <span className="text-xs text-[var(--color-brand-400)]">
              Your response will be Seal-encrypted before storage.
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit((d) => void onSubmit(d as Record<string, unknown>))} noValidate>
        <div className="space-y-5">
          {schema.fields.map((field) => (
            <PublicField
              key={field.id}
              field={field}
              error={errors[field.id]?.message as string | undefined}
              register={register}
              setValue={setValue}
              watch={watch}
            />
          ))}
        </div>

        {/* Identity panel for optional_connected */}
        {identityMode === "optional_connected" && (
          <div className="mt-6">
            <IdentityPanel />
          </div>
        )}

        {/* Turnstile temporarily bypassed because a valid domain is not available. */}
        {/*
        <Turnstile
          siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
          className="mt-6"
        />
        */}

        <div className="mt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={cn("w-full", accentClass)}
            disabled={isSubmitting || rhfIsSubmitting}
            loading={isSubmitting || rhfIsSubmitting}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={buttonLabel}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {buttonLabel !== "Submit"
                  ? buttonLabel
                  : (branding?.submitButtonText ?? schema.settings?.submitButtonText ?? "Submit")}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </form>

      {/* WalrusForms attribution */}
      {(branding?.showWalrusFormsBranding ?? true) && (
        <div className="mt-6 flex items-center justify-center gap-1 text-xs text-[var(--text-tertiary)]">
          <span>Powered by</span>
          <span className="font-semibold text-[var(--color-brand-400)]">WalrusForms</span>
          <span>· On-chain verifiable</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {accessPolicy?.requiresAllowlist && currentAccount && !allowlistLoading && allowlistAccess?.allowed === false ? (
        <NotAuthorizedPage formTitle={schema.title} />
      ) : accessPolicy?.requiresAllowlist || identityMode === "required_connected" ? (
        <WalletGate>{formContent}</WalletGate>
      ) : (
        formContent
      )}
    </>
  );
}

// ── Field renderer (unchanged, extracted for clarity) ──────────────────────────

interface PublicFieldProps {
  field: FormField;
  error?: string;
  register: ReturnType<typeof useForm>["register"];
  setValue: ReturnType<typeof useForm>["setValue"];
  watch: ReturnType<typeof useForm>["watch"];
}

function PublicField({ field, error, register, setValue, watch }: PublicFieldProps) {
  const value = watch(field.id);

  const commonProps = {
    label: field.label,
    error,
    required: field.validation?.required,
  };

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          {...commonProps}
          {...register(field.id)}
          placeholder={field.placeholder}
          hint={field.helpText}
          rows={4}
        />
      );

    case "select": case "radio":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            {field.label}
            {field.validation?.required && <span className="ml-1 text-[var(--color-error)]">*</span>}
          </label>
          {field.type === "select" ? (
            <Select
              {...register(field.id)}
              options={field.options ?? []}
              placeholder="Select an option"
            />
          ) : (
            <div className="space-y-2">
              {(field.options ?? []).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register(field.id)} value={opt.value} className="accent-[var(--color-brand-600)]" />
                  <span className="text-sm text-[var(--text-primary)]">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
        </div>
      );

    case "checkbox":
      return (
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" {...register(field.id)} className="mt-0.5 accent-[var(--color-brand-600)]" />
          <div>
            <span className="text-sm font-medium text-[var(--text-primary)]">{field.label}</span>
            {field.helpText && <p className="text-xs text-[var(--text-tertiary)]">{field.helpText}</p>}
            {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
          </div>
        </label>
      );

    case "rating":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            {field.label}
            {field.validation?.required && <span className="ml-1 text-[var(--color-error)]">*</span>}
          </label>
          <div className="flex gap-1" role="group" aria-label={field.label}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setValue(field.id, star)}
                aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                aria-pressed={Number(value) >= star}
                className={cn(
                  "text-2xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded",
                  Number(value) >= star ? "text-amber-400" : "text-[var(--border-strong)]"
                )}
              >
                ★
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
        </div>
      );

    case "file":
      return (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            {field.label}
            {field.validation?.required && <span className="ml-1 text-[var(--color-error)]">*</span>}
          </label>
          <input
            type="file"
            {...register(field.id)}
            accept={field.validation?.allowedFileTypes?.join(",")}
            className="block w-full text-sm text-[var(--text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-brand-500)] file:text-white hover:file:bg-[var(--color-brand-600)] transition-colors focus:outline-none"
          />
          {field.helpText && <p className="text-xs text-[var(--text-tertiary)]">{field.helpText}</p>}
          {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
        </div>
      );

    default:
      return (
        <Input
          {...commonProps}
          type={
            field.type === "email" ? "email"
            : field.type === "url" ? "url"
            : field.type === "number" ? "number"
            : field.type === "date" ? "date"
            : field.type === "datetime" ? "datetime-local"
            : field.type === "phone" ? "tel"
            : "text"
          }
          placeholder={field.placeholder}
          hint={field.helpText}
          {...register(field.id)}
        />
      );
  }
}
