/**
 * evaluateFormVisibility — single source of truth for conditional field logic.
 *
 * Exported from the shared package and used by both:
 *   - Backend: submission validation (strip / skip invisible fields)
 *   - Frontend: form renderer (show/hide fields in real time)
 *
 * This function is intentionally pure with no side effects.
 * All conditional evaluation logic lives here exclusively.
 */
import type { FormSchemaType, ConditionRule, FormField } from './form-schema.js';
import { getAllFields } from './form-schema.js';

/** Submitted values keyed by field ID. Values are whatever the user entered. */
export type SubmissionValues = Record<string, unknown>;

/**
 * Evaluate whether a single condition rule is satisfied given current values.
 */
function evaluateCondition(rule: ConditionRule, values: SubmissionValues): boolean {
  const sourceValue = values[rule.sourceFieldId];

  switch (rule.operator) {
    case 'equals':
      return String(sourceValue ?? '') === String(rule.value ?? '');

    case 'not_equals':
      return String(sourceValue ?? '') !== String(rule.value ?? '');

    case 'contains':
      return String(sourceValue ?? '').includes(rule.value ?? '');

    case 'is_empty':
      return sourceValue === undefined || sourceValue === null || sourceValue === '';

    case 'is_not_empty':
      return sourceValue !== undefined && sourceValue !== null && sourceValue !== '';

    default:
      // Unknown operators default to visible (safe fallback)
      return true;
  }
}

/**
 * Compute the set of visible field IDs for a given schema + current values.
 *
 * A field is visible when:
 *   - It has no visibilityCondition, OR
 *   - Its visibilityCondition evaluates to true given the current values
 *
 * Note: conditions are evaluated against `values` as-is. The caller is
 * responsible for providing a consistent snapshot of values.
 *
 * @param schema - The full form schema (pages or flat fields)
 * @param values - The current submitted/entered values
 * @returns Set of field IDs that should be visible
 */
export function evaluateFormVisibility(
  schema: FormSchemaType,
  values: SubmissionValues
): Set<string> {
  const allFields: FormField[] = getAllFields(schema);
  const visibleFieldIds = new Set<string>();

  for (const field of allFields) {
    if (!field.visibilityCondition) {
      // No condition — always visible
      visibleFieldIds.add(field.id);
    } else if (evaluateCondition(field.visibilityCondition, values)) {
      // Condition satisfied — visible
      visibleFieldIds.add(field.id);
    }
    // else: condition not satisfied — excluded from visible set
  }

  return visibleFieldIds;
}

/**
 * Strip values for invisible fields from a submission payload.
 *
 * Called before storing submission content. Invisible field values are
 * silently removed rather than rejected — prevents frontend/backend desync
 * when a user's browser state differs from the server's evaluation.
 *
 * @param schema - The full form schema
 * @param values - Raw submitted values (may include values for invisible fields)
 * @returns Cleaned values containing only visible field data
 */
export function stripInvisibleFields(
  schema: FormSchemaType,
  values: SubmissionValues
): SubmissionValues {
  const visibleIds = evaluateFormVisibility(schema, values);
  const cleaned: SubmissionValues = {};

  for (const [fieldId, value] of Object.entries(values)) {
    if (visibleIds.has(fieldId)) {
      cleaned[fieldId] = value;
    }
    // else: silently strip — not an error
  }

  return cleaned;
}

/**
 * Validate required fields respecting visibility conditions.
 *
 * Returns an array of field IDs that are visible AND required AND missing a value.
 * Invisible fields are never required regardless of their validation.required flag.
 */
export function findMissingRequiredFields(
  schema: FormSchemaType,
  values: SubmissionValues
): string[] {
  const visibleIds = evaluateFormVisibility(schema, values);
  const allFields = getAllFields(schema);
  const missing: string[] = [];

  for (const field of allFields) {
    if (!visibleIds.has(field.id)) continue; // invisible → skip
    if (!field.validation?.required) continue; // not required → skip

    const value = values[field.id];
    const isEmpty = value === undefined || value === null || value === '';

    if (isEmpty) {
      missing.push(field.id);
    }
  }

  return missing;
}
