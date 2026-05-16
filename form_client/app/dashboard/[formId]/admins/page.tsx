import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getForm } from "../../../../lib/api/forms";
import { Header } from "../../../../components/layout/Header";
import { AdminManagement } from "../../../../components/admins/AdminManagement";

interface AdminsPageProps {
  params: Promise<{ formId: string }>;
}

export async function generateMetadata({ params }: AdminsPageProps): Promise<Metadata> {
  const { formId } = await params;
  try {
    const form = await getForm(formId);
    return { title: `Admins · ${form.title}` };
  } catch { return { title: "Admin Management" }; }
}

export default async function AdminsPage({ params }: AdminsPageProps) {
  const { formId } = await params;
  let form;
  try { form = await getForm(formId); } catch { notFound(); }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <AdminManagement formId={form.id} formTitle={form.title} />
      </main>
    </div>
  );
}
