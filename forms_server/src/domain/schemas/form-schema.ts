/**
 * FormSchema & FormField Zod types — the single source of truth for form definitions.
 * These schemas are exported to the frontend via the shared package.
 *
 * Change 8 additions:
 *   - ConditionRule: field visibility conditions
 *   - FormFieldSchema: gains optional visibilityCondition
 *   - FormPageSchema: groups fields into pages for multi-step forms
 *   - FormSchemaDefinition: now accepts pages (multi-step) OR flat fields (single-step)
 *
 * Backward compatibility: a flat fields array is still accepted and treated as
 * a single-page form. The normalized form always has pages internally.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Field types supported by the form builder
// ---------------------------------------------------------------------------
export const FieldTypeEnum = z.enum([
  'text',
  'textarea',
  'number',
  'email',
  'url',
  'phone',
  'date',
  'datetime',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'file',
  'rating',
  'scale',
]);

export type FieldType = z.infer<typeof FieldTypeEnum>;

// ---------------------------------------------------------------------------
// Condition Rule — controls field visibility (Change 8)
// ---------------------------------------------------------------------------
export const ConditionOperatorEnum = z.enum([
  'equals',
  'not_equals',
  'contains',
  'is_empty',
  'is_not_empty',
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorEnum>;

/**
 * A single visibility condition referencing another field's value.
 * The field this is attached to is shown ONLY when the condition is true.
 *
 * For is_empty / is_not_empty operators, `value` is ignored.
 */
export const ConditionRuleSchema = z.object({
  /** The id of the field whose current value is evaluated. */
  sourceFieldId: z.string().min(1).max(100),
  operator: ConditionOperatorEnum,
  /** The value to compare against. Ignored for is_empty/is_not_empty. */
  value: z.string().max(500).nullish().transform(v => v ?? undefined),
});

export type ConditionRule = z.infer<typeof ConditionRuleSchema>;

// ---------------------------------------------------------------------------
// Validation rules per field
// ---------------------------------------------------------------------------
export const FieldValidationSchema = z.object({
  required: z.boolean().nullish().transform(v => v ?? false),
  minLength: z.number().int().positive().nullish().transform(v => v ?? undefined),
  maxLength: z.number().int().positive().nullish().transform(v => v ?? undefined),
  min: z.number().nullish().transform(v => v ?? undefined),
  max: z.number().nullish().transform(v => v ?? undefined),
  pattern: z.string().nullish().transform(v => v ?? undefined),
  patternMessage: z.string().nullish().transform(v => v ?? undefined),
  allowedFileTypes: z.array(z.string()).nullish().transform(v => v ?? undefined),
  maxFileSize: z.number().int().positive().nullish().transform(v => v ?? undefined),
}).strict();

// ---------------------------------------------------------------------------
// Option for select, multiselect, radio fields
// ---------------------------------------------------------------------------
export const FieldOptionSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
});

// ---------------------------------------------------------------------------
// Individual form field
// ---------------------------------------------------------------------------
export const FormFieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: FieldTypeEnum,
  label: z.string().min(1).max(500),
  placeholder: z.string().max(500).nullish().transform(v => v ?? undefined),
  helpText: z.string().max(1000).nullish().transform(v => v ?? undefined),
  validation: FieldValidationSchema.nullish().transform(v => v ?? undefined),
  options: z.array(FieldOptionSchema).nullish().transform(v => v ?? undefined),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).nullish().transform(v => v ?? undefined),
  /**
   * When set, this field is hidden unless the condition evaluates to true.
   * A hidden field is never required regardless of its validation.required flag.
   * Values submitted for hidden fields are stripped before storage.
   */
  visibilityCondition: ConditionRuleSchema.nullish().transform(v => v ?? undefined),
});

export type FormField = z.infer<typeof FormFieldSchema>;

// ---------------------------------------------------------------------------
// Form Page — groups fields for multi-step forms (Change 8)
// ---------------------------------------------------------------------------
export const FormPageSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(200).nullish().transform(v => v ?? undefined),
  description: z.string().max(1000).nullish().transform(v => v ?? undefined),
  fields: z.array(FormFieldSchema).min(1).max(100),
});

export type FormPage = z.infer<typeof FormPageSchema>;

// ---------------------------------------------------------------------------
// Complete form schema
// ---------------------------------------------------------------------------
export const FormSchemaDefinition = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish().transform(v => v ?? undefined),
  /**
   * Multi-step: provide pages (each containing fields).
   * Single-step: provide fields directly — normalized to a single page.
   * At least one of pages or fields must be present.
   */
  pages: z.array(FormPageSchema).min(1).max(20).nullish().transform(v => v ?? undefined),
  /** Flat field list for single-step forms. Normalized to pages[0] internally. */
  fields: z.array(FormFieldSchema).min(1).max(100).nullish().transform(v => v ?? undefined),
  settings: z.object({
    submitButtonText: z.string().max(100).nullish().transform(v => v ?? 'Submit'),
    successMessage: z.string().max(1000).nullish().transform(v => v ?? 'Thank you for your submission!'),
    allowMultipleSubmissions: z.boolean().nullish().transform(v => v ?? true),
    requireAuthentication: z.boolean().nullish().transform(v => v ?? false),
  }).nullish().transform(v => v ?? undefined),
}).superRefine((data, ctx) => {
  if (!data.pages && !data.fields) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Form schema must include either pages (multi-step) or fields (single-step)',
    });
  }
  if (data.pages && data.fields) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either pages or fields, not both',
    });
  }
});

export type FormSchemaType = z.infer<typeof FormSchemaDefinition>;

/**
 * Normalize a FormSchemaType to always have pages (never flat fields).
 * Called during form creation and schema validation so all downstream
 * logic can assume the pages array exists.
 */
export function normalizeFormSchema(schema: FormSchemaType): FormSchemaType & { pages: FormPage[] } {
  if (schema.pages) {
    return schema as FormSchemaType & { pages: FormPage[] };
  }
  return {
    ...schema,
    fields: undefined,
    pages: [
      {
        id: 'page_1',
        title: schema.title,
        description: undefined,
        fields: schema.fields ?? [],
      },
    ],
  };
}

/** Flatten a multi-page schema into a single array of all fields. */
export function getAllFields(schema: FormSchemaType): FormField[] {
  if (schema.fields) return schema.fields;
  return (schema.pages ?? []).flatMap((p) => p.fields);
}
