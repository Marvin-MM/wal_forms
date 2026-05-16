import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getForm } from "../../../lib/api/forms";
import { listSubmissions } from "../../../lib/api/submissions";
import { Header } from "../../../components/layout/Header";
import { DashboardClient } from "../../../components/dashboard/DashboardClient";

interface DashboardPageProps {
  params: Promise<{ formId: string }>;
}

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
  const { formId } = await params;
  try {
    const form = await getForm(formId);
    return { title: `Dashboard · ${form.title}` };
  } catch { return { title: "Dashboard" }; }
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { formId } = await params;
  let form;
  try { form = await getForm(formId); } catch { notFound(); }

  let initialSubmissions = null;
  try { initialSubmissions = await listSubmissions(formId, { page: 1, pageSize: 25 }); } catch {}

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header />
      <main className="flex-1 overflow-hidden">
        <DashboardClient form={form} initialSubmissions={initialSubmissions} />
      </main>
    </div>
  );
}
