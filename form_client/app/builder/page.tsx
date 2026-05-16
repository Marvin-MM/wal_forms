import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { BuilderClient } from "../../components/builder/BuilderClient";

export const metadata: Metadata = { title: "Form Builder" };

export default function BuilderPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-base)]">
      <Header />
      <BuilderClient />
    </div>
  );
}
