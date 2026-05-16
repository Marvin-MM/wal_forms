"use client";
/**
 * Form Builder Zustand store.
 * Manages the work-in-progress form schema in the builder.
 */
import { create } from "zustand";
import { generateId } from "../lib/utils";
import type { FormField, FormSchemaType } from "../shared/schemas/form-schema";

export interface BuilderFormSettings {
  title: string;
  description: string;
  isPrivate: boolean;
  requireAuthentication: boolean;
  submissionIdentityMode: "anonymous" | "optional_connected" | "required_connected";
  submitButtonText: string;
  successMessage: string;
}

interface BuilderState {
  fields: FormField[];
  settings: BuilderFormSettings;
  selectedFieldId: string | null;
  isDirty: boolean;
  formId: string | null; // null = new form, string = editing existing

  // Field actions
  addField: (type: FormField["type"], position?: number) => void;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  reorderFields: (activeId: string, overId: string) => void;
  selectField: (fieldId: string | null) => void;
  duplicateField: (fieldId: string) => void;

  // Settings actions
  updateSettings: (updates: Partial<BuilderFormSettings>) => void;

  // State actions
  initFromSchema: (schema: FormSchemaType, formId: string) => void;
  resetBuilder: () => void;
  setDirty: (dirty: boolean) => void;

  // Computed
  getSchema: () => FormSchemaType;
}

const defaultSettings: BuilderFormSettings = {
  title: "Untitled Form",
  description: "",
  isPrivate: false,
  requireAuthentication: false,
  submissionIdentityMode: "anonymous",
  submitButtonText: "Submit",
  successMessage: "Thank you for your submission!",
};

const defaultFieldByType: Record<FormField["type"], Partial<FormField>> = {
  text: { label: "Short Text", placeholder: "Enter text..." },
  textarea: { label: "Long Text", placeholder: "Enter your response..." },
  number: { label: "Number", placeholder: "0" },
  email: { label: "Email Address", placeholder: "email@example.com" },
  url: { label: "URL", placeholder: "https://..." },
  phone: { label: "Phone Number", placeholder: "+1 (555) 000-0000" },
  date: { label: "Date" },
  datetime: { label: "Date & Time" },
  select: {
    label: "Dropdown",
    options: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
    ],
  },
  multiselect: {
    label: "Multi-select",
    options: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
    ],
  },
  checkbox: { label: "Checkbox" },
  radio: {
    label: "Radio Group",
    options: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
    ],
  },
  file: { label: "File Upload" },
  rating: { label: "Star Rating", validation: { required: false, min: 1, max: 5 } },
  scale: { label: "Scale", validation: { required: false, min: 1, max: 10 } },
};

export const useBuilderStore = create<BuilderState>()((set, get) => ({
  fields: [],
  settings: defaultSettings,
  selectedFieldId: null,
  isDirty: false,
  formId: null,

  addField: (type, position) => {
    const id = generateId();
    const defaults = defaultFieldByType[type] ?? {};
    const newField: FormField = {
      id,
      type,
      label: defaults.label ?? "New Field",
      placeholder: defaults.placeholder,
      helpText: undefined,
      validation: defaults.validation ?? { required: false },
      options: defaults.options,
    };

    set((state) => {
      const fields = [...state.fields];
      const insertAt = position !== undefined ? position : fields.length;
      fields.splice(insertAt, 0, newField);
      return { fields, selectedFieldId: id, isDirty: true };
    });
  },

  removeField: (fieldId) => {
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== fieldId),
      selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
      isDirty: true,
    }));
  },

  updateField: (fieldId, updates) => {
    set((state) => ({
      fields: state.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      isDirty: true,
    }));
  },

  reorderFields: (activeId, overId) => {
    set((state) => {
      const fields = [...state.fields];
      const activeIndex = fields.findIndex((f) => f.id === activeId);
      const overIndex = fields.findIndex((f) => f.id === overId);
      if (activeIndex === -1 || overIndex === -1) return state;
      const [moved] = fields.splice(activeIndex, 1);
      if (moved) fields.splice(overIndex, 0, moved);
      return { fields, isDirty: true };
    });
  },

  selectField: (fieldId) => set({ selectedFieldId: fieldId }),

  duplicateField: (fieldId) => {
    set((state) => {
      const index = state.fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return state;
      const original = state.fields[index];
      if (!original) return state;
      const clone: FormField = { ...original, id: generateId(), label: `${original.label} (copy)` };
      const fields = [...state.fields];
      fields.splice(index + 1, 0, clone);
      return { fields, selectedFieldId: clone.id, isDirty: true };
    });
  },

  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
      isDirty: true,
    }));
  },

  initFromSchema: (schema, formId) => {
    set({
      fields: schema.fields,
      settings: {
        title: schema.title,
        description: schema.description ?? "",
        isPrivate: false,
        requireAuthentication: schema.settings?.requireAuthentication ?? false,
        submissionIdentityMode: schema.settings?.submissionIdentityMode ?? "anonymous",
        submitButtonText: schema.settings?.submitButtonText ?? "Submit",
        successMessage: schema.settings?.successMessage ?? "Thank you for your submission!",
      },
      formId,
      isDirty: false,
      selectedFieldId: null,
    });
  },

  resetBuilder: () => {
    set({
      fields: [],
      settings: defaultSettings,
      selectedFieldId: null,
      isDirty: false,
      formId: null,
    });
  },

  setDirty: (dirty) => set({ isDirty: dirty }),

  getSchema: (): FormSchemaType => {
    const { fields, settings } = get();
    return {
      title: settings.title,
      description: settings.description || undefined,
      fields,
      settings: {
        submitButtonText: settings.submitButtonText,
        successMessage: settings.successMessage,
        allowMultipleSubmissions: true,
        requireAuthentication: settings.requireAuthentication,
        submissionIdentityMode: settings.submissionIdentityMode,
      },
    };
  },
}));
