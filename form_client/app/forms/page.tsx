import type { Metadata } from "next";
import { listForms } from "../../lib/api/forms";
import { Header } from "../../components/layout/Header";
import { FormsClient } from "../../components/forms/FormsClient";

export const metadata: Metadata = { title: "My Forms" };

export default async function FormsPage() {
  let initialForms = null;
  try {
    initialForms = await listForms({ page: 1, pageSize: 20 });
  } catch {
    // Will be fetched client-side
  }
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <FormsClient initialData={initialForms} />
      </main>
    </div>
  );
}
