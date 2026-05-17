"use client";
import { motion } from "framer-motion";
import type { HealthResponse } from "../../shared/types/api";

interface StatsBarProps {
  health: HealthResponse | null;
}

export function StatsBar({ health }: StatsBarProps) {
  const isHealthy = health?.status === "healthy";
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="inline-flex w-max items-center gap-4 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 px-4 py-1.5 shadow-sm backdrop-blur-md mb-8"
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${isHealthy ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`}
          aria-hidden
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
          Network <span className={`ml-1 ${isHealthy ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>{health?.status ?? "—"}</span>
        </span>
      </div>
      <div className="h-3 w-px bg-[var(--border-default)]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
        Walrus <span className="ml-1 text-[var(--text-primary)]">{health?.services.walrus ?? "—"}</span>
      </span>
      <div className="h-3 w-px bg-[var(--border-default)]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
        Sui <span className="ml-1 text-[var(--text-primary)]">{health?.services.database ?? "—"}</span>
      </span>
    </motion.div>
  );
}
