import type { Metadata } from "next";
import { getForm } from "../../../lib/api/forms";
import { Header } from "../../../components/layout/Header";
import { BuilderClient } from "../../../components/builder/BuilderClient";
import { FormSchemaDefinition } from "../../../shared/schemas/form-schema";

interface EditBuilderPageProps {
  params: Promise<{ formId: string }>;
}

export async function generateMetadata({ params }: EditBuilderPageProps): Promise<Metadata> {
  const { formId } = await params;
  try {
    const form = await getForm(formId);
    return { title: `Edit · ${form.title}` };
  } catch {
    return { title: "Edit Form" };
  }
}

export default async function EditBuilderPage({ params }: EditBuilderPageProps) {
  const { formId } = await params;
  let initialForm = null;
  try {
    const form = await getForm(formId);
    const parsed = FormSchemaDefinition.safeParse(form.denormalizedSchema);
    if (parsed.success) {
      initialForm = {
        schema: parsed.data,
        formId,
        isPrivate: form.isPrivate,
        submissionIdentityMode: form.submissionIdentityMode,
      };
    }
  } catch {
    // fall through to empty builder
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header />
      <BuilderClient initialForm={initialForm} />
    </div>
  );
}
