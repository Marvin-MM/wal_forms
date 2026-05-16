/**
 * Environment configuration with Zod validation.
 *
 * Philosophy:
 * - Required fields that have no safe default will fail fast on missing.
 * - External service keys (Sui wallet, API keys) have defaults so the server
 *   can start in degraded mode during local development without every key set.
 * - Sensitive defaults are clearly labelled as placeholders.
 */
import { z } from 'zod';

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalString = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());
const optionalBoolean = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);
  if (typeof normalized !== 'string') return normalized;

  const lower = normalized.toLowerCase();
  if (lower === 'true' || lower === '1') return true;
  if (lower === 'false' || lower === '0') return false;
  return normalized;
}, z.boolean().optional());

const envSchema = z.object({
  // ---------------------------------------------------------------------------
  // Server
  // ---------------------------------------------------------------------------
  SERVER_PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),

  // ---------------------------------------------------------------------------
  // Database — required; no sane default
  // ---------------------------------------------------------------------------
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ---------------------------------------------------------------------------
  // JWT — secret required at minimum 32 bytes
  // ---------------------------------------------------------------------------
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('walrus-forms'),
  JWT_AUDIENCE: z.string().default('walrus-forms-client'),

  // ---------------------------------------------------------------------------
  // Sui Blockchain
  // The private key is intentionally NOT required at startup — the SuiClient
  // will boot in degraded mode if it's missing/placeholder (see sui/client.ts).
  // ---------------------------------------------------------------------------
  SUI_RPC_ENDPOINT: z.string().url().default('https://fullnode.testnet.sui.io:443'),
  SUI_SERVER_WALLET_PRIVATE_KEY: z.string().default('suiprivkey1_CHANGE_ME'),
  SUI_MOVE_PACKAGE_ID: z.string().default('0x_CHANGE_ME'),
  SUI_MOVE_MODULE_NAME: z.string().default('walrus_forms'),

  // ---------------------------------------------------------------------------
  // Walrus Decentralized Storage
  // ---------------------------------------------------------------------------
  WALRUS_PUBLISHER_ENDPOINT: z.string().url().default('https://publisher.walrus-testnet.walrus.space'),
  WALRUS_AGGREGATOR_ENDPOINT: z.string().url().default('https://aggregator.walrus-testnet.walrus.space'),
  WALRUS_DEFAULT_EPOCHS: z.coerce.number().int().positive().default(5),

  // ---------------------------------------------------------------------------
  // Seal Threshold Encryption
  //
  // SEAL_KEY_SERVER_OBJECT_IDS — comma-separated Sui Object IDs of the Seal
  // key servers you want to use. These are NOT the same as your Move package.
  //
  // Testnet (Mysten Labs public servers):
  //   mysten-testnet-1: 0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75
  //   mysten-testnet-2: 0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8
  //
  // See: https://seal-docs.wal.app for mainnet provider Object IDs.
  // ---------------------------------------------------------------------------
  SEAL_KEY_SERVER_OBJECT_IDS: z
    .string()
    .default(
      '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75,' +
      '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8'
    ),

  // ---------------------------------------------------------------------------
  // Phase B: Notifications
  // ---------------------------------------------------------------------------
  RESEND_API_KEY: z.string().default('re_CHANGE_ME'),
  RESEND_FROM_EMAIL: z.string().email().default('noreply@walrusforms.com'),

  // ---------------------------------------------------------------------------
  // Google Gemini API Key
  // ---------------------------------------------------------------------------
  GEMINI_API_KEY: z.string().default('AIzaSy-CHANGE_ME'),

  // ---------------------------------------------------------------------------
  // Inngest Background Jobs
  // Local development should use INNGEST_DEV=true with the Inngest dev server.
  // Inngest Cloud requires real signing and event keys, plus a public HTTPS URL.
  // ---------------------------------------------------------------------------
  INNGEST_DEV: optionalBoolean,
  INNGEST_ENV: optionalString,
  INNGEST_SIGNING_KEY: optionalString,
  INNGEST_SIGNING_KEY_FALLBACK: optionalString,
  INNGEST_EVENT_KEY: optionalString,
  INNGEST_SERVE_ORIGIN: optionalUrl,
  INNGEST_SERVE_PATH: z.preprocess(emptyStringToUndefined, z.string().startsWith('/').default('/api/inngest')),

  // ---------------------------------------------------------------------------
  // Cloudflare Turnstile
  // Use the test secret key "1x0000000000000000000000000000000AA" for local dev.
  // It always passes validation without needing a real Cloudflare account.
  // ---------------------------------------------------------------------------
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z
    .string()
    .default('1x0000000000000000000000000000000AA'), // CF test key — always passes

  // ---------------------------------------------------------------------------
  // Rate Limiting (requests per minute per IP)
  // ---------------------------------------------------------------------------
  RATE_LIMIT_SUBMISSION: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_UPLOAD: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_AI: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_AUTH: z.coerce.number().int().positive().default(20),
}).transform((env, ctx) => {
  const inngestDev = env.INNGEST_DEV ?? (
    env.NODE_ENV !== 'production' &&
    !env.INNGEST_SIGNING_KEY &&
    !env.INNGEST_EVENT_KEY
  );

  if (env.NODE_ENV === 'production' && inngestDev) {
    ctx.addIssue({
      code: 'custom',
      path: ['INNGEST_DEV'],
      message: 'INNGEST_DEV cannot be true in production',
    });
  }

  if (!inngestDev) {
    if (!env.INNGEST_SIGNING_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['INNGEST_SIGNING_KEY'],
        message: 'INNGEST_SIGNING_KEY is required when using Inngest Cloud',
      });
    }

    if (env.INNGEST_SERVE_ORIGIN && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/.test(env.INNGEST_SERVE_ORIGIN)) {
      ctx.addIssue({
        code: 'custom',
        path: ['INNGEST_SERVE_ORIGIN'],
        message: 'Inngest Cloud needs a public URL, not localhost. Use a deployed URL or a tunnel URL.',
      });
    }
  }

  return {
    ...env,
    INNGEST_DEV: inngestDev,
  };
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Print human-readable errors before crashing
    console.error('\n❌ Invalid environment configuration:\n');
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'root';
      console.error(`  [${path}]: ${issue.message}`);
    }
    console.error('\nCheck your .env file against .env.example\n');
    process.exit(1);
  }

  const data = result.data;

  process.env.INNGEST_DEV = data.INNGEST_DEV ? 'true' : 'false';
  syncOptionalProcessEnv('INNGEST_ENV', data.INNGEST_ENV);
  syncOptionalProcessEnv('INNGEST_SIGNING_KEY', data.INNGEST_SIGNING_KEY);
  syncOptionalProcessEnv('INNGEST_SIGNING_KEY_FALLBACK', data.INNGEST_SIGNING_KEY_FALLBACK);
  syncOptionalProcessEnv('INNGEST_EVENT_KEY', data.INNGEST_EVENT_KEY);
  syncOptionalProcessEnv('INNGEST_SERVE_ORIGIN', data.INNGEST_SERVE_ORIGIN);
  process.env.INNGEST_SERVE_PATH = data.INNGEST_SERVE_PATH;

  return data;
}

function syncOptionalProcessEnv(key: string, value: string | undefined): void {
  if (value) {
    process.env[key] = value;
    return;
  }

  delete process.env[key];
}
