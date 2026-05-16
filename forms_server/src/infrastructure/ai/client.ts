/**
 * Google Gemini AI client.
 * Powers form generation and feedback analysis.
 */
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { FormSchemaDefinition, type FormSchemaType } from '../../domain/schemas/form-schema.js';
import { logger } from '../../shared/logger.js';
import { ExternalServiceError } from '../../shared/errors/index.js';

export interface AIClientConfig {
  apiKey: string;
}

export interface AnalysisResult {
  themes: Array<{ name: string; count: number; description: string }>;
  sentimentSummary: { positive: number; neutral: number; negative: number; overall: string };
  priorityRecommendations: Array<{ submissionId: string; reason: string; suggestedPriority: string }>;
  summary: string;
  keyInsights: string[];
}

export class AIClient {
  private readonly client: GoogleGenAI;

  constructor(config: AIClientConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  /**
   * Generate a form schema from a natural language description.
   * Uses a fast model with constrained JSON output.
   */
  async generateFormSchema(description: string): Promise<FormSchemaType> {
    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{
              text: `You are a form builder AI. Given the following description, generate a structured form schema as JSON.

The JSON must match this exact structure:
{
  "title": "string (1-200 chars)",
  "description": "string (optional, max 2000 chars)",
  "fields": [
    {
      "id": "unique_field_id",
      "type": "text|textarea|number|email|url|phone|date|datetime|select|multiselect|checkbox|radio|file|rating|scale",
      "label": "Field Label",
      "placeholder": "optional placeholder",
      "helpText": "optional help text",
      "validation": {
        "required": true/false,
        "minLength": number (optional),
        "maxLength": number (optional),
        "min": number (optional),
        "max": number (optional)
      },
      "options": [{"label": "Option Label", "value": "option_value"}] (for select/multiselect/radio only)
    }
  ],
  "settings": {
    "submitButtonText": "Submit",
    "successMessage": "Thank you!",
    "allowMultipleSubmissions": true,
    "requireAuthentication": false
  }
}

Return ONLY the JSON object, no markdown, no preamble, no explanation.

Form description: ${description}`
            }]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('No text content in AI response');
      }

      // Clean potential markdown wrapper (Gemini shouldn't with responseMimeType, but just in case)
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);
      const validated = FormSchemaDefinition.parse(parsed);
      const fieldCount = validated.fields?.length ?? validated.pages?.reduce((acc, p) => acc + p.fields.length, 0) ?? 0;

      logger.info({ title: validated.title, fieldCount }, '[AI] Form schema generated');
      return validated;
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: msg }, '[AI] Form schema generation failed');
      throw new ExternalServiceError('Google Gemini', `Schema generation failed: ${msg}`);
    }
  }

  /**
   * Analyze submission feedback using a more capable model.
   * Used by the background job for thorough analysis.
   */
  async analyzeSubmissions(
    formTitle: string,
    submissions: string[]
  ): Promise<AnalysisResult> {
    try {
      const submissionBlock = submissions
        .map((s, i) => `--- Submission ${i + 1} ---\n${s}`)
        .join('\n\n');

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          themes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                count: { type: Type.INTEGER },
                description: { type: Type.STRING },
              },
              required: ["name", "count", "description"]
            }
          },
          sentimentSummary: {
            type: Type.OBJECT,
            properties: {
              positive: { type: Type.INTEGER },
              neutral: { type: Type.INTEGER },
              negative: { type: Type.INTEGER },
              overall: { type: Type.STRING }
            },
            required: ["positive", "neutral", "negative", "overall"]
          },
          priorityRecommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                submissionId: { type: Type.STRING },
                reason: { type: Type.STRING },
                suggestedPriority: { type: Type.STRING }
              },
              required: ["submissionId", "reason", "suggestedPriority"]
            }
          },
          summary: { type: Type.STRING },
          keyInsights: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["themes", "sentimentSummary", "priorityRecommendations", "summary", "keyInsights"]
      };

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{
              text: `You are a feedback analyst. Analyze the following form submissions for "${formTitle}" and return a structured JSON analysis.

Submissions to analyze:

${submissionBlock}`
            }]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.2,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('No text content in AI response');
      }

      const result = JSON.parse(text) as AnalysisResult;
      logger.info({ themes: result.themes.length, insights: result.keyInsights.length }, '[AI] Feedback analysis complete');
      return result;
    } catch (error) {
      if (error instanceof ExternalServiceError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: msg }, '[AI] Feedback analysis failed');
      throw new ExternalServiceError('Google Gemini', `Analysis failed: ${msg}`);
    }
  }
}
