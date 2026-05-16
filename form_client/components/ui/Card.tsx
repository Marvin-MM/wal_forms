"use client";
import { cn } from "../../lib/utils";
import * as React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-[var(--bg-elevated)] p-6",
        "border-[var(--border-default)]",
        "transition-all duration-[var(--duration-base)]",
        hover && "cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-base font-semibold text-[var(--text-primary)]", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mt-1 text-sm text-[var(--text-secondary)]", className)}>{children}</p>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4", className)}>
      {children}
    </div>
  );
}
