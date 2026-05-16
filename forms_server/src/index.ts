/**
 * Application entrypoint.
 *
 * Boot sequence:
 *   1. Validate environment variables
 *   2. Initialize database
 *   3. Initialize external service clients (degraded-safe)
 *   4. Create server
 *   5. Start listening
 *   6. Register graceful shutdown handlers
 */
import { validateEnv } from './shared/config/env.js';
import { logger, configStatus } from './shared/logger.js';
import { initDatabase, closeDatabase } from './infrastructure/db/client.js';
import { WalrusClient } from './infrastructure/walrus/client.js';
import { SuiBlockchainClient } from './infrastructure/sui/client.js';
import { SealClient } from './infrastructure/seal/client.js';
import { AIClient } from './infrastructure/ai/client.js';
import { JwtService } from './infrastructure/auth/jwt.js';

/** Serialize any thrown value to a human-readable string. */
function serializeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  if (typeof err === 'object' && err !== null) {
    try {
      return { message: JSON.stringify(err) };
    } catch {
      return { message: String(err) };
    }
  }
  return { message: String(err) };
}

async function main() {
  // -------------------------------------------------------------------------
  // 1. Environment
  // -------------------------------------------------------------------------
  const env = validateEnv();
  logger.info({ nodeEnv: env.NODE_ENV, port: env.SERVER_PORT }, '[Boot] Environment validated');

  // -------------------------------------------------------------------------
  // 2. Database
  // -------------------------------------------------------------------------
  const db = initDatabase(env.DATABASE_URL);
  logger.info('[Boot] Database connection pool initialized');

  // -------------------------------------------------------------------------
  // 3. External service clients
  //    Each is initialized independently so one failing does not block others.
  // -------------------------------------------------------------------------
  const walrus = new WalrusClient({
    publisherEndpoint: env.WALRUS_PUBLISHER_ENDPOINT,
    aggregatorEndpoint: env.WALRUS_AGGREGATOR_ENDPOINT,
    defaultEpochs: env.WALRUS_DEFAULT_EPOCHS,
  });

  // Sui client is degraded-safe: bad/placeholder key logs a warning but won't crash.
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

  // -------------------------------------------------------------------------
  // 4. Readiness summary
  // -------------------------------------------------------------------------
  logger.info({
    suiWallet: sui.isConfigured ? sui.getServerWalletAddress() : 'NOT CONFIGURED (degraded)',
    suiPackage: configStatus(env.SUI_MOVE_PACKAGE_ID),
    gemini: configStatus(env.GEMINI_API_KEY),
    inngestMode: env.INNGEST_DEV ? 'dev server' : 'cloud',
    inngestSigning: env.INNGEST_DEV ? 'not required' : configStatus(env.INNGEST_SIGNING_KEY ?? '', ''),
    inngestEventKey: env.INNGEST_DEV ? 'not required' : configStatus(env.INNGEST_EVENT_KEY ?? '', ''),
    inngestServeOrigin: env.INNGEST_SERVE_ORIGIN ?? 'request-derived',
    turnstile: env.CLOUDFLARE_TURNSTILE_SECRET_KEY === '1x0000000000000000000000000000000AA'
      ? 'test key (always passes)'
      : 'configured',
  }, '[Boot] Service readiness');

  // -------------------------------------------------------------------------
  // 5. Create and start server
  // -------------------------------------------------------------------------
  const { createServer } = await import('./server.js');
  const { app, setServer } = createServer({ env, db, walrus, sui, seal, ai, jwt });
  const bunServer = app.listen(env.SERVER_PORT);
  // Inject the live Bun server into rate limiters so they can read real client IPs.
  setServer(bunServer.server!);
  logger.info({ port: env.SERVER_PORT, url: `http://localhost:${env.SERVER_PORT}` }, '[Boot] WalrusForms server started');

  // -------------------------------------------------------------------------
  // 6. Graceful shutdown
  // -------------------------------------------------------------------------
  const shutdown = async (signal: string) => {
    logger.info({ signal }, '[Shutdown] Received signal, shutting down...');
    try {
      await closeDatabase();
      logger.info('[Shutdown] Database connection closed');
    } catch (err) {
      logger.error(serializeError(err), '[Shutdown] Error closing database');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason: serializeError(reason) }, '[Process] Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal(serializeError(err), '[Process] Uncaught exception');
    process.exit(1);
  });
}

main().catch((err: unknown) => {
  const serialized = serializeError(err);
  logger.fatal(serialized, '[Boot] Fatal error during startup');
  process.exit(1);
});
