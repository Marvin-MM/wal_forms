/**
 * Storage monitor background jobs.
 */
import { inngest } from '../client.js';
import { getDatabase } from '../../db/client.js';
import { walrusBlobs } from '../../db/schema.js';
import { eq, lte, and } from 'drizzle-orm';
import { logger } from '../../../shared/logger.js';
import { WalrusClient } from '../../walrus/client.js';
import { validateEnv } from '../../../shared/config/env.js';

export const storageRenewalMonitor: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'storage-renewal-monitor',
    name: 'Storage Renewal Monitor',
    triggers: [{ cron: '0 0 * * *' }], // Run daily at midnight
  },
  async ({ step }) => {
    const env = validateEnv();
    const expiredCount = await step.run('check-expiring-blobs', async () => {
      const db = getDatabase();
      const walrus = new WalrusClient({
        publisherEndpoint: env.WALRUS_PUBLISHER_ENDPOINT,
        aggregatorEndpoint: env.WALRUS_AGGREGATOR_ENDPOINT,
        defaultEpochs: env.WALRUS_DEFAULT_EPOCHS,
      });

      // Use days since Unix epoch as a stable proxy for Sui epochs in the stub
      const currentEpoch = Math.floor(Date.now() / 86400000);
      const thresholdEpoch = currentEpoch + 7; // expiring within 7 days
      
      const expiringBlobs = await db
        .select()
        .from(walrusBlobs)
        .where(
          and(
            eq(walrusBlobs.status, 'active'),
            lte(walrusBlobs.expiresAtEpoch, thresholdEpoch)
          )
        );

      logger.info({ count: expiringBlobs.length }, '[StorageMonitor] Found expiring blobs');

      for (const blob of expiringBlobs) {
        // Auto renew for 30 epochs
        await walrus.renewBlobStorage(blob.id, 30);
        await db.update(walrusBlobs).set({ 
          expiresAtEpoch: currentEpoch + 30, 
          status: 'active' 
        }).where(eq(walrusBlobs.id, blob.id));
      }

      return expiringBlobs.length;
    });

    return { expiredCount };
  }
);
