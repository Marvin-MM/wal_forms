/**
 * AI use case: generate form schema from natural language.
 */
import type { AIClient } from '../../infrastructure/ai/client.js';
import type { FormSchemaType } from '../../domain/schemas/form-schema.js';

export async function generateSchema(
  description: string,
  aiClient: AIClient
): Promise<FormSchemaType> {
  return aiClient.generateFormSchema(description);
}
