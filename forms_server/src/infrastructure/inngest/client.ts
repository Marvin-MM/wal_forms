/**
 * Inngest client instance.
 */
import { Inngest } from 'inngest';

function optionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function booleanEnv(key: string): boolean | undefined {
  const value = optionalEnv(key)?.toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

const signingKey = optionalEnv('INNGEST_SIGNING_KEY');
const eventKey = optionalEnv('INNGEST_EVENT_KEY');
const isDev = booleanEnv('INNGEST_DEV') ?? (
  process.env['NODE_ENV'] !== 'production' &&
  !signingKey &&
  !eventKey
);

export const inngest = new Inngest({
  id: 'walrus-forms',
  isDev,
  env: optionalEnv('INNGEST_ENV'),
  eventKey,
  signingKey,
  signingKeyFallback: optionalEnv('INNGEST_SIGNING_KEY_FALLBACK'),
});
