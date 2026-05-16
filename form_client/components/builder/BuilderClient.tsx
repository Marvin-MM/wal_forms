"use client";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, PlusCircle, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useBuilderStore } from "../../store/builder";
import { AuthGuard } from "../layout/AuthGuard";
import { FieldPalette } from "./FieldPalette";
import { FormCanvas } from "./FormCanvas";
import { ConfigPanel } from "./ConfigPanel";
import { BuilderToolbar } from "./BuilderToolbar";
import { AIGenerationPanel } from "./AIGenerationPanel";
import { cn } from "../../lib/utils";
import type { FormSchemaType } from "../../shared/schemas/form-schema";

interface BuilderClientProps {
  initialForm?: {
    schema: FormSchemaType;
    formId: string;
    isPrivate: boolean;
  } | null;
}

export function BuilderClient({ initialForm }: BuilderClientProps) {
  const { initFromSchema, resetBuilder, updateSettings } = useBuilderStore();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"palette" | "canvas" | "config">("canvas");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (initialForm) {
      initFromSchema(initialForm.schema, initialForm.formId);
      updateSettings({ isPrivate: initialForm.isPrivate });
    } else {
      resetBuilder();
    }
  }, [initialForm, initFromSchema, resetBuilder, updateSettings]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      useBuilderStore.getState().reorderFields(String(active.id), String(over.id));
    }
  }

  return (
    <AuthGuard>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          {/* Left: Field palette (Desktop) or Mobile Tab */}
          <div className={cn(
            "lg:flex w-full lg:w-60 shrink-0 flex-col border-r border-[var(--border-default)] overflow-y-auto",
            mobileTab === "palette" ? "flex flex-1" : "hidden"
          )}>
            <FieldPalette />
          </div>

          {/* Center: Canvas + toolbar */}
          <div className={cn(
            "flex-1 flex-col overflow-hidden",
            mobileTab === "canvas" ? "flex" : "hidden lg:flex"
          )}>
            <BuilderToolbar
              formId={initialForm?.formId}
              onAIClick={() => setAiPanelOpen(true)}
            />
            <div className="flex-1 overflow-y-auto bg-[var(--bg-muted)]">
              <FormCanvas activeId={activeId} />
            </div>
          </div>

          {/* Right: Config panel */}
          <div className={cn(
            "xl:flex w-full xl:w-72 shrink-0 flex-col border-l border-[var(--border-default)] overflow-y-auto bg-[var(--bg-elevated)]",
            mobileTab === "config" ? "flex flex-1" : "hidden"
          )}>
            <ConfigPanel formId={initialForm?.formId} />
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden flex border-t border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0">
            <button
              onClick={() => setMobileTab("palette")}
              className={cn("flex-1 py-3 flex flex-col items-center gap-1 transition-colors", mobileTab === "palette" ? "text-[var(--color-brand-500)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}
            >
              <PlusCircle className="h-5 w-5" />
              <span className="text-[10px] font-medium">Add Fields</span>
            </button>
            <button
              onClick={() => setMobileTab("canvas")}
              className={cn("flex-1 py-3 flex flex-col items-center gap-1 transition-colors", mobileTab === "canvas" ? "text-[var(--color-brand-500)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-[10px] font-medium">Canvas</span>
            </button>
            <button
              onClick={() => setMobileTab("config")}
              className={cn("flex-1 py-3 flex flex-col items-center gap-1 transition-colors", mobileTab === "config" ? "text-[var(--color-brand-500)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-medium">Settings</span>
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeId && (
            <div className="rounded-xl border border-[var(--color-brand-500)] bg-[var(--bg-elevated)]/80 backdrop-blur-md p-4 shadow-[var(--shadow-xl)] opacity-100 ring-4 ring-[var(--color-brand-500)]/20 scale-105 transition-transform duration-200">
              <div className="h-4 w-32 rounded bg-[var(--bg-muted)] animate-pulse" />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* AI Generation Side Panel */}
      <AIGenerationPanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
    </AuthGuard>
  );
}
