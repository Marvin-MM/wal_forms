"use client";
import { LinkIcon, Database, Lock, Zap, Eye, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: LinkIcon,
    title: "On-Chain Receipts",
    description:
      "Every submission mints a SubmissionReceipt object on Sui. Anyone can verify your form response exists — independently of WalrusForms infrastructure.",
    color: "text-[var(--color-brand-400)]",
    bg: "bg-[var(--color-brand-500)]/10",
  },
  {
    icon: Database,
    title: "Walrus Storage",
    description:
      "Form schemas and submission content are stored on Walrus — a decentralized, censorship-resistant storage network purpose-built for the Sui ecosystem.",
    color: "text-[oklch(62%_0.18_155)]",
    bg: "bg-[oklch(62%_0.18_155)]/10",
  },
  {
    icon: Lock,
    title: "Seal Encryption",
    description:
      "Mark any form as private. Submissions are encrypted client-side using the Seal identity-based encryption protocol before upload. The server never sees plaintext.",
    color: "text-[oklch(65%_0.2_290)]",
    bg: "bg-[oklch(65%_0.2_290)]/10",
  },
  {
    icon: Zap,
    title: "AI Form Generation",
    description:
      "Describe your form in plain English. AI generates the complete schema — fields, types, validation rules — which you can refine before publishing.",
    color: "text-[oklch(72%_0.18_75)]",
    bg: "bg-[oklch(72%_0.18_75)]/10",
  },
  {
    icon: Eye,
    title: "Real-Time Dashboard",
    description:
      "Submissions stream in via WebSocket as they arrive. Review, filter, annotate with priority and notes — all synced instantly across sessions.",
    color: "text-[oklch(62%_0.16_240)]",
    bg: "bg-[oklch(62%_0.16_240)]/10",
  },
  {
    icon: BarChart3,
    title: "AI Analysis",
    description:
      "Trigger an AI analysis of all submissions to surface theme clusters, sentiment summary, and priority recommendations — without leaving the dashboard.",
    color: "text-[oklch(66%_0.2_40)]",
    bg: "bg-[oklch(66%_0.2_40)]/10",
  },
];

export function FeatureGrid() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-[var(--bg-subtle)]" aria-labelledby="features-heading">
      <div className="mx-auto max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Everything you need for on-chain forms
          </h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            Production-grade infrastructure. No compromises on decentralization.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, color, bg }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 transition-colors hover:border-[var(--color-brand-500)]/40 hover:shadow-xl hover:shadow-[var(--color-brand-500)]/10"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${bg} transition-transform group-hover:scale-110`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">{title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
