import { apiRequest } from "./client";
import type { FormSchemaType } from "../../shared/schemas/form-schema";

export async function generateSchema(description: string): Promise<FormSchemaType> {
  return apiRequest<FormSchemaType>("/ai/generate-schema", {
    method: "POST",
    body: { description },
  });
}
