"use client";
import { cn } from "../../lib/utils";
import type { SubmissionPriority } from "../../shared/types/entities";

const priorityConfig: Record<SubmissionPriority, { label: string; classes: string }> = {
  low: {
    label: "Low",
    classes: "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30",
  },
  medium: {
    label: "Medium",
    classes: "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
  },
  high: {
    label: "High",
    classes: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  },
  urgent: {
    label: "Urgent",
    classes: "bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error)]/30",
  },
};

interface PriorityBadgeProps {
  priority: SubmissionPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "brand";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-default)]",
    success: "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30",
    warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
    error: "bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error)]/30",
    info: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]/30",
    brand: "bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)] border-[var(--color-brand-500)]/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
