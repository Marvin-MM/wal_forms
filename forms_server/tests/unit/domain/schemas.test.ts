/**
 * Unit tests for domain Zod schemas.
 */
import { describe, expect, it } from 'bun:test';
import { FormSchemaDefinition, FormFieldSchema, FieldTypeEnum } from '../../../src/domain/schemas/form-schema.js';
import { CreateFormSchema, CreateSubmissionSchema, RequestNonceSchema, VerifySiWSSchema, GenerateSchemaSchema } from '../../../src/domain/schemas/request-schemas.js';

describe('FormSchemaDefinition', () => {
  it('should validate a complete form schema', () => {
    const validSchema = {
      title: 'Customer Feedback Form',
      description: 'Tell us about your experience',
      fields: [
        {
          id: 'name',
          type: 'text',
          label: 'Your Name',
          placeholder: 'John Doe',
          validation: { required: true, minLength: 2, maxLength: 100 },
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          validation: { required: true },
        },
        {
          id: 'rating',
          type: 'rating',
          label: 'How would you rate us?',
          validation: { required: true, min: 1, max: 5 },
        },
        {
          id: 'category',
          type: 'select',
          label: 'Category',
          options: [
            { label: 'Product', value: 'product' },
            { label: 'Service', value: 'service' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          id: 'feedback',
          type: 'textarea',
          label: 'Detailed Feedback',
          helpText: 'Please be as detailed as possible',
          validation: { maxLength: 5000 },
        },
      ],
      settings: {
        submitButtonText: 'Send Feedback',
        successMessage: 'Thanks for your feedback!',
        allowMultipleSubmissions: false,
      },
    };

    const result = FormSchemaDefinition.safeParse(validSchema);
    expect(result.success).toBe(true);
  });

  it('should reject a schema with no fields', () => {
    const invalid = { title: 'Empty', fields: [] };
    const result = FormSchemaDefinition.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject a schema with title too long', () => {
    const invalid = { title: 'A'.repeat(201), fields: [{ id: 'f1', type: 'text', label: 'Test' }] };
    const result = FormSchemaDefinition.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject an unknown field type', () => {
    const invalid = {
      title: 'Test',
      fields: [{ id: 'f1', type: 'unknown_type', label: 'Test' }],
    };
    const result = FormSchemaDefinition.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept a minimal schema', () => {
    const minimal = {
      title: 'Minimal',
      fields: [{ id: 'f1', type: 'text', label: 'Name' }],
    };
    const result = FormSchemaDefinition.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

describe('FormFieldSchema', () => {
  it('should validate a text field', () => {
    const field = { id: 'name', type: 'text', label: 'Name' };
    const result = FormFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });

  it('should validate a select field with options', () => {
    const field = {
      id: 'country',
      type: 'select',
      label: 'Country',
      options: [
        { label: 'USA', value: 'us' },
        { label: 'UK', value: 'uk' },
      ],
    };
    const result = FormFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });

  it('should reject a field with empty id', () => {
    const field = { id: '', type: 'text', label: 'Name' };
    const result = FormFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
  });
});

describe('FieldTypeEnum', () => {
  it('should accept all valid field types', () => {
    const validTypes = ['text', 'textarea', 'number', 'email', 'url', 'phone', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'radio', 'file', 'rating', 'scale'];
    for (const type of validTypes) {
      const result = FieldTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    }
  });
});

describe('Request Schemas', () => {
  it('should validate RequestNonceSchema', () => {
    expect(RequestNonceSchema.safeParse({ walletAddress: '0xabc' }).success).toBe(true);
    expect(RequestNonceSchema.safeParse({ walletAddress: '' }).success).toBe(false);
    expect(RequestNonceSchema.safeParse({}).success).toBe(false);
  });

  it('should validate VerifySiWSSchema', () => {
    const valid = {
      walletAddress: '0xabc',
      signedMessage: 'msg',
      signature: 'sig',
      nonce: 'n123',
    };
    expect(VerifySiWSSchema.safeParse(valid).success).toBe(true);
  });

  it('should validate CreateFormSchema', () => {
    const valid = {
      schema: {
        title: 'Test',
        fields: [{ id: 'f1', type: 'text', label: 'Name' }],
      },
      submissionIdentityMode: 'anonymous',
    };
    const result = CreateFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should validate CreateSubmissionSchema', () => {
    const valid = {
      identity_mode: 'anonymous',
      blobId: 'A'.repeat(43),
      turnstileToken: 'token123',
      isEncrypted: false,
    };
    const result = CreateSubmissionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject CreateSubmissionSchema without turnstile', () => {
    const invalid = { identity_mode: 'anonymous', blobId: 'A'.repeat(43), isEncrypted: false };
    const result = CreateSubmissionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate GenerateSchemaSchema', () => {
    expect(GenerateSchemaSchema.safeParse({ description: 'A feedback form for customers' }).success).toBe(true);
    expect(GenerateSchemaSchema.safeParse({ description: 'short' }).success).toBe(false);
  });
});
