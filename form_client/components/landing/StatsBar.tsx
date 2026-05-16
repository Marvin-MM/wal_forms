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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="border-y border-[var(--border-default)] bg-[var(--bg-elevated)] py-4"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isHealthy ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`}
              aria-hidden
            />
            <span className="text-[var(--text-secondary)]">
              Network:{" "}
              <span className={`font-medium ${isHealthy ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>
                {health?.status ?? "—"}
              </span>
            </span>
          </div>
          <div className="text-[var(--text-secondary)]">
            Database:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {health?.services.database ?? "—"}
            </span>
          </div>
          <div className="text-[var(--text-secondary)]">
            Walrus:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {health?.services.walrus ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
