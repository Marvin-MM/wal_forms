"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, description, children, width = "max-w-2xl" }: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-[var(--duration-slow)]",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="drawer-title"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col w-full shadow-[var(--shadow-xl)]",
          "bg-[var(--bg-elevated)] border-l border-[var(--border-default)]",
          "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]",
          width,
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-default)] p-6">
          <div>
            <h2 id="drawer-title" className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="shrink-0 rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}
