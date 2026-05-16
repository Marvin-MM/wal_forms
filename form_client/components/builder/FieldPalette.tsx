"use client";
import {
  Type, AlignLeft, Hash, Mail, Link2, Phone, Calendar, CalendarClock,
  ChevronDown, CheckSquare, CheckCircle, Star, Upload, Sliders, List,
} from "lucide-react";
import { useBuilderStore } from "../../store/builder";
import type { FieldType } from "../../shared/schemas/form-schema";
import { cn } from "../../lib/utils";

interface FieldTypeConfig {
  type: FieldType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const FIELD_TYPES: FieldTypeConfig[] = [
  { type: "text", label: "Short Text", icon: Type, description: "Single-line input" },
  { type: "textarea", label: "Long Text", icon: AlignLeft, description: "Multi-line rich text" },
  { type: "number", label: "Number", icon: Hash, description: "Numeric value" },
  { type: "email", label: "Email", icon: Mail, description: "Email address" },
  { type: "url", label: "URL", icon: Link2, description: "Web address" },
  { type: "phone", label: "Phone", icon: Phone, description: "Phone number" },
  { type: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { type: "datetime", label: "Date & Time", icon: CalendarClock, description: "Date and time" },
  { type: "select", label: "Dropdown", icon: ChevronDown, description: "Single choice" },
  { type: "multiselect", label: "Multi-select", icon: List, description: "Multiple choices" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Single toggle" },
  { type: "radio", label: "Radio", icon: CheckCircle, description: "Single choice radio" },
  { type: "file", label: "File Upload", icon: Upload, description: "Images, video, docs" },
  { type: "rating", label: "Star Rating", icon: Star, description: "1–5 stars" },
  { type: "scale", label: "Scale", icon: Sliders, description: "Numeric scale" },
];

export function FieldPalette() {
  const { addField } = useBuilderStore();

  return (
    <div className="p-3">
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
        Fields
      </p>
      <div className="space-y-0.5">
        {FIELD_TYPES.map(({ type, label, icon: Icon, description }) => (
          <button
            key={type}
            onClick={() => addField(type)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
              "text-[var(--text-secondary)] border border-transparent",
              "hover:bg-[var(--bg-elevated)] hover:border-[var(--border-default)] hover:shadow-sm hover:text-[var(--text-primary)]",
              "active:scale-95 transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--color-brand-400)] transition-colors" />
            <div className="min-w-0">
              <div className="text-xs font-medium leading-none">{label}</div>
              <div className="mt-0.5 truncate text-[10px] text-[var(--text-tertiary)]">{description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
