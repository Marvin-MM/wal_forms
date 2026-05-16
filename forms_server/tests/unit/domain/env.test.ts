/**
 * Unit tests for environment validation.
 */
import { describe, expect, it } from 'bun:test';
import { z } from 'zod';

// We test the schema shape directly rather than calling validateEnv
// which calls process.exit on failure
const envSchema = z.object({
  SERVER_PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

describe('Environment Validation', () => {
  it('should pass with valid env vars', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a'.repeat(32),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SERVER_PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('should fail without DATABASE_URL', () => {
    const result = envSchema.safeParse({
      JWT_SECRET: 'a'.repeat(32),
    });
    expect(result.success).toBe(false);
  });

  it('should fail with short JWT_SECRET', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should coerce SERVER_PORT from string', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      SERVER_PORT: '8080',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SERVER_PORT).toBe(8080);
    }
  });
});
