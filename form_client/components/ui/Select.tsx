"use client";
import * as React from "react";
import { cn } from "../../lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
            {props.required && <span className="ml-1 text-[var(--color-error)]">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 w-full rounded-lg border px-3 py-2 text-sm appearance-none cursor-pointer",
            "bg-[var(--bg-elevated)] text-[var(--text-primary)]",
            "border-[var(--border-default)]",
            "transition-colors duration-[var(--duration-fast)]",
            "focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[var(--color-error)]",
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, description, disabled, id }: SwitchProps) {
  const switchId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-[var(--duration-base)] ease-[var(--ease-in-out)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[var(--color-brand-600)]" : "bg-[var(--border-strong)]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm",
            "transform transition-transform duration-[var(--duration-base)]",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
      {(label ?? description) && (
        <div>
          {label && (
            <label
              htmlFor={switchId}
              className="block cursor-pointer text-sm font-medium text-[var(--text-primary)]"
            >
              {label}
            </label>
          )}
          {description && <p className="text-xs text-[var(--text-tertiary)]">{description}</p>}
        </div>
      )}
    </div>
  );
}
