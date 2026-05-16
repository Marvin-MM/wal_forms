/**
 * Drizzle database client using postgres.js driver.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { logger } from '../../shared/logger.js';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

export function initDatabase(databaseUrl: string) {
  if (dbInstance) return dbInstance;

  const isProduction = process.env['NODE_ENV'] === 'production';

  sqlClient = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ...(isProduction && { ssl: 'require' }),
  });

  dbInstance = drizzle(sqlClient, { schema });
  logger.info('[Database] PostgreSQL connection pool initialized');
  return dbInstance;
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export async function closeDatabase() {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
    dbInstance = null;
    logger.info('[Database] Connection pool closed');
  }
}

export type Database = ReturnType<typeof initDatabase>;
