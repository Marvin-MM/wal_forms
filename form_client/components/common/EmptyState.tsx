"use client";
import { type LucideIcon } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-16 text-center", className)}>
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-default)]">
          <Icon className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm mx-auto">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} variant="primary" size="md">
          {action.label}
        </Button>
      )}
    </div>
  );
}
