import Link from "next/link";
import { FileX } from "lucide-react";
import { Header } from "../components/layout/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Header />
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-default)]">
          <FileX className="h-10 w-10 text-[var(--text-tertiary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Page not found</h1>
          <p className="mt-2 text-[var(--text-secondary)]">The page you're looking for doesn't exist or has been removed.</p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-500)] transition-colors"
        >
          Go home
        </Link>
      </main>
    </div>
  );
}
