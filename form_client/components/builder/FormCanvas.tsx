"use client";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy, ChevronRight } from "lucide-react";
import { useBuilderStore } from "../../store/builder";
import type { FormField } from "../../shared/schemas/form-schema";
import { cn } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";
import { FormSettings } from "./FormSettings";
import { Layers } from "lucide-react";

interface FormCanvasProps {
  activeId: string | null;
}

export function FormCanvas({ activeId }: FormCanvasProps) {
  const { fields, selectedFieldId, selectField } = useBuilderStore();

  if (fields.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <FormSettings />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="rounded-3xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]/50 p-12 text-center transition-colors hover:border-[var(--color-brand-500)]/50 hover:bg-[var(--bg-subtle)]">
            <EmptyState
              icon={Layers}
              title="No fields yet"
              description="Click a field type from the left panel or use AI generation to build your form."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <FormSettings />

      <div className="space-y-1 mt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
          Fields ({fields.length})
        </p>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {fields.map((field) => (
            <SortableFieldCard
              key={field.id}
              field={field}
              isSelected={selectedFieldId === field.id}
              isDragging={activeId === field.id}
              onClick={() => selectField(field.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface SortableFieldCardProps {
  field: FormField;
  isSelected: boolean;
  isDragging: boolean;
  onClick: () => void;
}

function SortableFieldCard({ field, isSelected, isDragging, onClick }: SortableFieldCardProps) {
  const { removeField, duplicateField } = useBuilderStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-4 cursor-pointer",
        "bg-[var(--bg-elevated)] transition-all duration-300 ease-out",
        isSelected
          ? "border-[var(--color-brand-500)] shadow-[0_4px_20px_-4px_var(--color-brand-500)/20] ring-1 ring-[var(--color-brand-500)]/50"
          : "border-[var(--border-default)] hover:border-[var(--color-brand-300)]/40 hover:shadow-md",
        isDragging && "shadow-2xl ring-2 ring-[var(--color-brand-500)] scale-[1.02] bg-[var(--bg-subtle)]/90 backdrop-blur-sm z-10"
      )}
      onClick={onClick}
      aria-label={`${field.label} field. Click to configure.`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">{field.label}</span>
          {field.validation?.required && (
            <span className="shrink-0 text-[10px] font-medium text-[var(--color-error)] uppercase">Required</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] capitalize">{field.type}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          aria-label="Duplicate field"
          onClick={(e) => { e.stopPropagation(); duplicateField(field.id); }}
          className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Remove field"
          onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
          className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <ChevronRight className={cn("h-4 w-4 text-[var(--text-tertiary)] transition-transform", isSelected && "rotate-90")} />
      </div>
    </div>
  );
}
