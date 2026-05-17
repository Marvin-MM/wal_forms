"use client";
import { CheckCircle2, Database, Lock, Zap, BarChart3 } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

const VisualOnChain = () => (
  <motion.div style={{ transformStyle: "preserve-3d" }} initial={{ rotateX: 60, rotateZ: -45 }} className="relative h-24 w-24">
    <motion.div animate={{ z: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] shadow-sm p-3">
      <div className="w-1/2 h-2 bg-[var(--border-strong)] rounded-full mb-3" />
      <div className="w-full h-2 bg-[var(--bg-muted)] rounded-full mb-2" />
      <div className="w-3/4 h-2 bg-[var(--bg-muted)] rounded-full" />
    </motion.div>
    <motion.div animate={{ z: [20, 35, 20] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute -right-6 -bottom-6 h-16 w-16 rounded-2xl bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)] border border-[var(--color-brand-300)] dark:border-[var(--color-brand-800)] shadow-2xl flex items-center justify-center">
      <div className="h-8 w-8 rounded-full bg-[var(--color-brand-500)] flex items-center justify-center shadow-lg">
        <CheckCircle2 className="h-5 w-5 text-white" />
      </div>
    </motion.div>
  </motion.div>
);

const VisualWalrus = () => (
  <motion.div style={{ transformStyle: "preserve-3d" }} initial={{ rotateX: 60, rotateZ: -45 }} className="relative h-20 w-20">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ z: [i * 15, i * 15 + 8, i * 15] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
        className="absolute inset-0 rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-bg)] shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center justify-center"
      >
        <Database className="h-6 w-6 text-[var(--color-success)] opacity-80" />
      </motion.div>
    ))}
  </motion.div>
);

const VisualEncryption = () => (
  <motion.div style={{ transformStyle: "preserve-3d" }} initial={{ rotateX: 60, rotateZ: -45 }} className="relative h-24 w-24">
    <motion.div animate={{ z: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-3 overflow-hidden">
      <div className="w-full h-1.5 bg-[var(--border-strong)] rounded-full mb-2" />
      <div className="w-3/4 h-1.5 bg-[var(--border-strong)] rounded-full mb-2" />
      <div className="w-5/6 h-1.5 bg-[var(--border-strong)] rounded-full" />
    </motion.div>
    <motion.div animate={{ z: [20, 25, 20] }} transition={{ duration: 4, repeat: Infinity, delay: 0.3 }} className="absolute -inset-4 rounded-3xl bg-[var(--color-info-bg)]/80 backdrop-blur-md border border-[var(--color-info)] shadow-2xl flex items-center justify-center">
      <Lock className="h-8 w-8 text-[var(--color-info)]" />
    </motion.div>
  </motion.div>
);

const VisualAIGeneration = () => (
  <motion.div style={{ transformStyle: "preserve-3d" }} initial={{ rotateX: 60, rotateZ: -45 }} className="relative h-24 w-28">
    <motion.div animate={{ z: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -top-6 -left-6 h-12 w-24 rounded-xl bg-[var(--color-warning-bg)] border border-[var(--color-warning)] shadow-lg flex items-center px-3 gap-2">
       <Zap className="h-4 w-4 text-[var(--color-warning)]" />
       <div className="w-8 h-2 bg-[var(--color-warning)] rounded-full opacity-60" />
    </motion.div>
    <motion.div animate={{ z: [15, 25, 15] }} transition={{ duration: 4, repeat: Infinity, delay: 0.4 }} className="absolute top-6 left-6 right-0 bottom-0 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-2xl p-3 space-y-3">
       <div className="w-full h-4 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)]" />
       <div className="w-full h-4 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)]" />
       <div className="w-2/3 h-4 rounded bg-[var(--color-brand-100)] border border-[var(--color-brand-300)]" />
    </motion.div>
  </motion.div>
);

const VisualDashboard = () => (
  <motion.div style={{ transformStyle: "preserve-3d" }} initial={{ rotateX: 60, rotateZ: -45 }} className="relative h-24 w-32">
    <motion.div animate={{ z: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)] shadow-lg p-2 flex gap-2">
       <div className="w-1/3 h-full rounded-lg bg-[var(--bg-elevated)] flex flex-col gap-1 p-1.5 shadow-sm border border-[var(--border-subtle)]">
          <div className="w-full h-1.5 bg-[var(--border-strong)] rounded-full" />
          <div className="w-full h-1.5 bg-[var(--border-strong)] rounded-full" />
          <div className="w-2/3 h-1.5 bg-[var(--border-strong)] rounded-full" />
       </div>
       <div className="flex-1 h-full rounded-lg bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] p-2 shadow-inner">
          <div className="w-full h-2 bg-[var(--color-brand-400)] rounded-sm mb-1.5" />
          <div className="w-3/4 h-2 bg-[var(--color-brand-400)] rounded-sm" />
       </div>
    </motion.div>
    <motion.div animate={{ z: [30, -5], opacity: [0, 1, 0], x: [40, 10], y: [-40, -10] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute top-0 right-0 h-4 w-4 rounded-full bg-[var(--color-brand-500)] shadow-[0_0_15px_var(--color-brand-500)]" />
  </motion.div>
);

const VisualAIAnalysis = () => (
  <motion.div style={{ transformStyle: "preserve-3d" }} initial={{ rotateX: 60, rotateZ: -45 }} className="relative h-24 w-24 flex items-end justify-center gap-2">
    {[1, 3, 2, 4].map((h, i) => (
      <motion.div
        key={i}
        animate={{ z: [0, h * 6, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
        className="w-5 rounded-t-md bg-gradient-to-t from-[var(--color-brand-600)] to-[var(--color-brand-300)] shadow-lg border-t border-white/30"
        style={{ height: `${h * 16}px` }}
      />
    ))}
    <motion.div animate={{ z: [35, 45, 35] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-8 -right-6 h-14 w-14 rounded-2xl bg-[var(--bg-elevated)] shadow-2xl border border-[var(--border-default)] flex items-center justify-center">
       <BarChart3 className="h-7 w-7 text-[var(--color-brand-600)]" />
    </motion.div>
  </motion.div>
);

const features = [
  {
    visual: VisualOnChain,
    title: "On-Chain Receipts",
    description: "Every submission mints a SubmissionReceipt object on Sui. Anyone can verify your form response exists — independently of WalrusForms infrastructure.",
    className: "md:col-span-2 lg:col-span-2",
  },
  {
    visual: VisualWalrus,
    title: "Walrus Storage",
    description: "Form schemas and submission content are stored on Walrus — a decentralized, censorship-resistant storage network purpose-built for the Sui ecosystem.",
    className: "md:col-span-1 lg:col-span-1",
  },
  {
    visual: VisualEncryption,
    title: "Seal Encryption",
    description: "Mark any form as private. Submissions are encrypted client-side using the Seal identity-based encryption protocol before upload. The server never sees plaintext.",
    className: "md:col-span-1 lg:col-span-1 lg:row-span-2",
  },
  {
    visual: VisualAIGeneration,
    title: "AI Form Generation",
    description: "Describe your form in plain English. AI generates the complete schema — fields, types, validation rules — which you can refine before publishing.",
    className: "md:col-span-2 lg:col-span-2",
  },
  {
    visual: VisualDashboard,
    title: "Real-Time Dashboard",
    description: "Submissions stream in via WebSocket as they arrive. Review, filter, annotate with priority and notes — all synced instantly across sessions.",
    className: "md:col-span-1 lg:col-span-1",
  },
  {
    visual: VisualAIAnalysis,
    title: "AI Analysis",
    description: "Trigger an AI analysis of all submissions to surface theme clusters, sentiment summary, and priority recommendations — without leaving the dashboard.",
    className: "md:col-span-1 lg:col-span-1",
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      className={`group relative rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 transition-colors hover:border-[var(--color-brand-400)] flex flex-col justify-between ${feature.className} overflow-hidden`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, var(--color-brand-500), transparent 40%)`,
          opacity: 0.04,
        }}
      />
      <div className="relative z-10 flex h-full flex-col">
        <div className="relative w-full h-40 mb-8 flex items-center justify-center perspective-[1500px]">
          <feature.visual />
        </div>
        <div className="mt-auto">
          <h3 className="mb-3 font-bold text-[var(--text-primary)] text-2xl tracking-tight">{feature.title}</h3>
          <p className="text-[var(--text-secondary)] leading-relaxed text-base">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function FeatureGrid() {
  return (
    <section className="relative py-32 px-4 sm:px-6 overflow-hidden" aria-labelledby="features-heading">
      {/* Minimalist Dot Grid Background */}
      <div 
        className="absolute inset-0 -z-20 h-full w-full bg-[var(--bg-subtle)]"
        style={{ backgroundImage: 'radial-gradient(var(--text-tertiary) 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.15 }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[var(--bg-base)]/50 to-[var(--bg-base)] pointer-events-none" />

      <div className="mx-auto max-w-7xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center max-w-3xl mx-auto"
        >
          <h2 id="features-heading" className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Everything you need for <br className="hidden sm:block" />
            <span className="text-[var(--color-brand-500)]">on-chain forms</span>
          </h2>
          <p className="mt-6 text-lg text-[var(--text-secondary)]">
            Production-grade infrastructure. No compromises on decentralization.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
