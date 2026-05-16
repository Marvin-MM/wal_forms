import { createServer } from '../src/server.js';
import { validateEnv } from '../src/shared/config/env.js';
import { initDatabase } from '../src/infrastructure/db/client.js';
import { WalrusClient } from '../src/infrastructure/walrus/client.js';
import { SuiBlockchainClient } from '../src/infrastructure/sui/client.js';
import { SealClient } from '../src/infrastructure/seal/client.js';
import { AIClient } from '../src/infrastructure/ai/client.js';
import { JwtService } from '../src/infrastructure/auth/jwt.js';
import type { IncomingMessage, ServerResponse } from 'http';

// -----------------------------------------------------------------------------
// Vercel Serverless Entrypoint
// This module runs in Vercel's Node.js runtime. It translates Node's incoming
// HTTP messages to Web Standard Requests that Elysia natively understands.
// -----------------------------------------------------------------------------

// Initialize services once per cold start
const env = validateEnv();
const db = initDatabase(env.DATABASE_URL);
const walrus = new WalrusClient({
  publisherEndpoint: env.WALRUS_PUBLISHER_ENDPOINT,
  aggregatorEndpoint: env.WALRUS_AGGREGATOR_ENDPOINT,
  defaultEpochs: env.WALRUS_DEFAULT_EPOCHS,
});
const sui = new SuiBlockchainClient({
  rpcEndpoint: env.SUI_RPC_ENDPOINT,
  serverWalletPrivateKey: env.SUI_SERVER_WALLET_PRIVATE_KEY,
  movePackageId: env.SUI_MOVE_PACKAGE_ID,
  moveModuleName: env.SUI_MOVE_MODULE_NAME,
});
const seal = new SealClient({
  keyServerObjectIds: env.SEAL_KEY_SERVER_OBJECT_IDS,
  packageId: env.SUI_MOVE_PACKAGE_ID,
});
const ai = new AIClient({ apiKey: env.GEMINI_API_KEY });
const jwt = new JwtService({
  secret: env.JWT_SECRET,
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
});

const { app } = createServer({ env, db, walrus, sui, seal, ai, jwt });

function getRequestUrl(req: IncomingMessage): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}${req.url}`;
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = getRequestUrl(req);

    const headers = new Headers();
    for (const [key, raw] of Object.entries(req.headers)) {
      if (!raw) continue;
      if (Array.isArray(raw)) {
        headers.set(key, raw.join(', '));
      } else {
        headers.set(key, raw);
      }
    }

    const bodyBuffer = await readBody(req);
    const request = new Request(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : new Uint8Array(bodyBuffer),
    });

    // Delegate to Elysia's request handler
    // Elysia exposes `handle(request)` which returns a standard Response.
    const response = await app.handle(request);

    // Proxy response back to Node's ServerResponse
    res.statusCode = response.status;
    response.headers.forEach((value, name) => res.setHeader(name, value));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (err) {
    console.error('[Vercel] Error handling request', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    const message = err instanceof Error ? err.message : String(err);
    res.end(JSON.stringify({ success: false, error: { message } }));
  }
}
