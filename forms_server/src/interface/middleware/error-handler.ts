/**
 * Global error handler for Elysia.
 *
 * Covers four error classes in priority order:
 *   1. Elysia internal codes (NOT_FOUND, VALIDATION, METHOD_NOT_ALLOWED, etc.)
 *   2. Domain AppError subclasses → correct HTTP status codes
 *   3. Zod validation errors → 400 with per-field details
 *   4. Unknown errors → 500 (internals hidden in production)
 */
import Elysia from 'elysia';
import { ZodError } from 'zod';
import { AppError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger.js';
import type { ApiResponse } from '../../shared/types/index.js';

/** Error code strings emitted by Elysia's internal router */
const ELYSIA_NOT_FOUND_CODE = 'NOT_FOUND';
const ELYSIA_VALIDATION_CODE = 'VALIDATION';
const ELYSIA_PARSE_CODE = 'PARSE';
const ELYSIA_METHOD_NOT_ALLOWED_CODE = 'NOT_ALLOWED';
const ELYSIA_UNKNOWN_CODE = 'UNKNOWN';

export const errorHandler = new Elysia({ name: 'error-handler' })
  .onError({ as: 'global' }, ({ error, set, request }) => {
    const method = request.method;
    const path = new URL(request.url).pathname;

    // -----------------------------------------------------------------------
    // 1. Elysia internal errors (NOT_FOUND, VALIDATION, etc.)
    //    These have a string `.code` property set by the framework.
    // -----------------------------------------------------------------------
    if (typeof (error as { code?: unknown }).code === 'string') {
      const code = (error as { code: string }).code;

      if (code === ELYSIA_NOT_FOUND_CODE) {
        set.status = 404;
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Route not found: ${method} ${path}` },
        } satisfies ApiResponse;
      }

      if (code === ELYSIA_METHOD_NOT_ALLOWED_CODE) {
        set.status = 405;
        return {
          success: false,
          error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${method} not allowed on ${path}` },
        } satisfies ApiResponse;
      }

      if (code === ELYSIA_VALIDATION_CODE || code === ELYSIA_PARSE_CODE) {
        set.status = 400;
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
        } satisfies ApiResponse;
      }

      if (code === ELYSIA_UNKNOWN_CODE) {
        // Fall through to section 4 below
      }
    }

    // -----------------------------------------------------------------------
    // 2. Domain / application errors → mapped HTTP status codes
    // -----------------------------------------------------------------------
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined && { details: error.details }),
        },
      } satisfies ApiResponse;
    }

    // -----------------------------------------------------------------------
    // 3. Zod validation errors → 400 with per-field detail
    // -----------------------------------------------------------------------
    if (error instanceof ZodError) {
      set.status = 400;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.') || 'root',
            message: issue.message,
          })),
        },
      } satisfies ApiResponse;
    }

    // -----------------------------------------------------------------------
    // 4. Unhandled errors → 500, internals hidden in production
    // -----------------------------------------------------------------------
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Only log truly unexpected errors — not framework NOT_FOUND etc.
    logger.error(
      { path, method, error: msg, stack },
      '[ErrorHandler] Unhandled error'
    );

    set.status = 500;
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : msg,
      },
    } satisfies ApiResponse;
  });

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}
