import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getForm } from "../../../lib/api/forms";
import { getFormBranding } from "../../../lib/api/branding";
import { getPublicAccessPolicy } from "../../../lib/api/access";
import { PublicFormClient } from "../../../components/public-form/PublicFormClient";
import {
  CountdownPage,
  FormClosedPage,
  FormFullPage,
} from "../../../components/public-form/AccessGatePages";

interface PublicFormPageProps {
  params: Promise<{ formId: string }>;
}

export async function generateMetadata({ params }: PublicFormPageProps): Promise<Metadata> {
  const { formId } = await params;
  try {
    const form = await getForm(formId);
    return {
      title: form.title,
      description:
        form.description ?? `Fill out ${form.title} — a verifiable on-chain form.`,
      openGraph: {
        title: form.title,
        description: form.description ?? undefined,
        type: "website",
      },
    };
  } catch {
    return { title: "Form not found" };
  }
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { formId } = await params;

  // Parallel data fetches — branding and access must never crash the form page
  let form;
  try {
    form = await getForm(formId);
  } catch {
    notFound();
  }
  if (form.isDeleted) notFound();

  const [branding, accessPolicy] = await Promise.all([
    getFormBranding(formId).catch(() => null),
    getPublicAccessPolicy(formId).catch(() => null),
  ]);

  const now = new Date();

  // ── Access gating checks ───────────────────────────────────────────────────

  // Form hasn't opened yet
  if (accessPolicy?.opensAt && new Date(accessPolicy.opensAt) > now) {
    return (
      <CountdownPage
        formTitle={form.title}
        formDescription={form.description}
        opensAt={new Date(accessPolicy.opensAt)}
      />
    );
  }

  // Form has closed
  if (accessPolicy?.closesAt && new Date(accessPolicy.closesAt) < now) {
    return (
      <FormClosedPage
        formTitle={form.title}
        closedAt={new Date(accessPolicy.closesAt)}
      />
    );
  }

  // Response limit reached
  if (
    accessPolicy?.hasResponseLimit &&
    accessPolicy.responseLimit !== null &&
    (accessPolicy.currentResponseCount ?? 0) >= accessPolicy.responseLimit
  ) {
    return <FormFullPage formTitle={form.title} />;
  }

  // Password protection and allowlist gating are handled client-side
  // (password stored in component state, allowlist checked after wallet connection)

  const identityMode =
    form.submissionIdentityMode ??
    form.denormalizedSchema.settings?.submissionIdentityMode ??
    "anonymous";

  // Apply background color from branding
  const bgStyle = branding?.backgroundColor
    ? { backgroundColor: branding.backgroundColor }
    : {};

  return (
    <div
      className="min-h-screen bg-[var(--bg-subtle)] py-12 px-4 sm:px-6"
      style={bgStyle}
    >
      <div className="mx-auto max-w-2xl">
        <PublicFormClient
          form={form}
          branding={branding}
          accessPolicy={accessPolicy}
          identityMode={identityMode}
        />
      </div>
    </div>
  );
}
