/**
 * Structured logger (Pino).
 *
 * Security rules:
 *   - Private keys, JWT secrets, and API keys are NEVER logged.
 *   - Wallet addresses are public and safe to log.
 *   - Redact paths cover the most common object shapes for sensitive fields.
 */
import pino from 'pino';

/** Fields that must never appear in log output. */
const REDACTED_PATHS = [
  // Top-level fields
  'password',
  'secret',
  'privateKey',
  'private_key',
  'apiKey',
  'api_key',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  // Nested under common wrappers
  'body.password',
  'body.secret',
  'body.privateKey',
  'req.headers.authorization',
  'request.headers.authorization',
  // Environment variable keys that might be logged accidentally
  'JWT_SECRET',
  'SUI_SERVER_WALLET_PRIVATE_KEY',
  'GEMINI_API_KEY',
  'INNGEST_SIGNING_KEY',
  'INNGEST_EVENT_KEY',
  'CLOUDFLARE_TURNSTILE_SECRET_KEY',
];

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug'),
  redact: {
    paths: REDACTED_PATHS,
    censor: '[REDACTED]',
  },
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss.l',
          },
        }
      : undefined,
  formatters: {
    level(label) {
      return { level: label.toUpperCase() };
    },
  },
});

/**
 * Mask a secret string for safe display in logs/readiness summaries.
 * Shows first 6 and last 4 characters with *** in between.
 * A value shorter than 12 chars is fully redacted.
 *
 * Usage: maskSecret('sk-ant-api03-abc...xyz') → 'sk-ant***...xyz'
 */
export function maskSecret(value: string): string {
  if (!value || value.length < 12) return '[REDACTED]';
  return `${value.slice(0, 6)}***${value.slice(-4)}`;
}

/**
 * Returns 'configured' if the value is non-empty and not a placeholder,
 * otherwise 'NOT CONFIGURED'. Safe to log anywhere.
 */
export function configStatus(value: string, placeholderSubstring = 'CHANGE_ME'): string {
  return value && !value.includes(placeholderSubstring) ? 'configured' : 'NOT CONFIGURED';
}
