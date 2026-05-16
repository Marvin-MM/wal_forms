/**
 * FormSchema & FormField Zod types — mirrors the backend's domain/schemas/form-schema.ts.
 * Single source of truth for form definitions shared between builder, public form, and dashboard.
 */
import { z } from "zod";

export const FieldTypeEnum = z.enum([
  "text",
  "textarea",
  "number",
  "email",
  "url",
  "phone",
  "date",
  "datetime",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "file",
  "rating",
  "scale",
]);
export type FieldType = z.infer<typeof FieldTypeEnum>;

// ── Submission Identity Mode ───────────────────────────────────────────────────

export const SubmissionIdentityModeEnum = z.enum([
  "anonymous",
  "optional_connected",
  "required_connected",
]);
export type SubmissionIdentityMode = z.infer<typeof SubmissionIdentityModeEnum>;

// ── Conditional Rules ─────────────────────────────────────────────────────────

export const ConditionalOperatorEnum = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "is_empty",
  "is_not_empty",
]);

export const ConditionalRuleSchema = z.object({
  sourceFieldId: z.string(),
  operator: ConditionalOperatorEnum,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type ConditionalRule = z.infer<typeof ConditionalRuleSchema>;

// ── Field Sub-schemas ─────────────────────────────────────────────────────────

export const FieldValidationSchema = z.object({
  required: z.boolean().default(false),
  minLength: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().int().positive().optional(),
});

export const FieldOptionSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
});

export const FormFieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: FieldTypeEnum,
  label: z.string().min(1).max(500),
  placeholder: z.string().max(500).optional(),
  helpText: z.string().max(1000).optional(),
  validation: FieldValidationSchema.optional(),
  options: z.array(FieldOptionSchema).optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  /** Conditional visibility — field shown only when all/any conditions are met */
  conditions: z.array(ConditionalRuleSchema).optional(),
  conditionsOperator: z.enum(["and", "or"]).default("and").optional(),
  /** Which page this field belongs to (0-indexed) */
  pageIndex: z.number().int().nonnegative().default(0).optional(),
});

export type FormField = z.infer<typeof FormFieldSchema>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type FieldValidation = z.infer<typeof FieldValidationSchema>;

// ── Page ─────────────────────────────────────────────────────────────────────

export const FormPageSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
});
export type FormPage = z.infer<typeof FormPageSchema>;

// ── Top-Level Form Schema ─────────────────────────────────────────────────────

export const FormSchemaDefinition = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  fields: z.array(FormFieldSchema).min(1).max(100),
  /** Multi-step pages. If absent, all fields render on a single page. */
  pages: z.array(FormPageSchema).optional(),
  settings: z
    .object({
      submitButtonText: z.string().max(100).default("Submit"),
      successMessage: z.string().max(1000).default("Thank you for your submission!"),
      allowMultipleSubmissions: z.boolean().default(true),
      requireAuthentication: z.boolean().default(false),
      submissionIdentityMode: SubmissionIdentityModeEnum.default("anonymous"),
    })
    .optional(),
});

export type FormSchemaType = z.infer<typeof FormSchemaDefinition>;
