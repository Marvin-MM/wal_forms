/**
 * Unit tests for shared error classes.
 */
import { describe, expect, it } from 'bun:test';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  TurnstileError,
} from '../../../src/shared/errors/index.js';

describe('Error Hierarchy', () => {
  it('should create ValidationError with correct properties', () => {
    const err = new ValidationError('Invalid input', { field: 'name' });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid input');
    expect(err.details).toEqual({ field: 'name' });
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('should create AuthenticationError with 401', () => {
    const err = new AuthenticationError();
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.statusCode).toBe(401);
  });

  it('should create AuthorizationError with 403', () => {
    const err = new AuthorizationError();
    expect(err.code).toBe('AUTHORIZATION_ERROR');
    expect(err.statusCode).toBe(403);
  });

  it('should create NotFoundError with resource name and id', () => {
    const err = new NotFoundError('Form', '123');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Form not found: 123');
  });

  it('should create NotFoundError without id', () => {
    const err = new NotFoundError('Upload session');
    expect(err.message).toBe('Upload session not found');
  });

  it('should create ConflictError with 409', () => {
    const err = new ConflictError('Already exists');
    expect(err.code).toBe('CONFLICT');
    expect(err.statusCode).toBe(409);
  });

  it('should create RateLimitError with 429', () => {
    const err = new RateLimitError();
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.statusCode).toBe(429);
  });

  it('should create ExternalServiceError with service name', () => {
    const err = new ExternalServiceError('Walrus', 'Connection refused');
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(err.statusCode).toBe(502);
    expect(err.message).toBe('Walrus: Connection refused');
  });

  it('should create TurnstileError with 403', () => {
    const err = new TurnstileError();
    expect(err.code).toBe('TURNSTILE_FAILED');
    expect(err.statusCode).toBe(403);
  });
});
