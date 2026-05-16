/**
 * CSV Export background job.
 */
import { inngest } from '../client.js';
import { getDatabase } from '../../db/client.js';
import { exportJobs, submissions, forms } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../../shared/logger.js';
import { WalrusClient } from '../../walrus/client.js';
import { validateEnv } from '../../../shared/config/env.js';

export const generateCsvExport: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'generate-csv-export',
    name: 'Generate CSV Export',
    triggers: [{ cron: '* * * * *' }], // Run every minute to check for pending exports
  },
  async ({ step }) => {
    const env = validateEnv();
    const processedJobs = await step.run('process-pending-exports', async () => {
      const db = getDatabase();
      const walrus = new WalrusClient({
        publisherEndpoint: env.WALRUS_PUBLISHER_ENDPOINT,
        aggregatorEndpoint: env.WALRUS_AGGREGATOR_ENDPOINT,
        defaultEpochs: env.WALRUS_DEFAULT_EPOCHS,
      });

      // Find pending jobs
      const pendingJobs = await db
        .select()
        .from(exportJobs)
        .where(eq(exportJobs.status, 'pending'))
        .limit(5);

      if (pendingJobs.length === 0) return 0;

      for (const job of pendingJobs) {
        try {
          // 1. Fetch form
          const [form] = await db.select().from(forms).where(eq(forms.id, job.formId));
          if (!form) throw new Error('Form not found');

          // 2. Fetch all submissions
          const allSubmissions = await db
            .select()
            .from(submissions)
            .where(eq(submissions.formId, job.formId));

          // 3. Generate CSV (in-memory string for simplicity)
          // In a production scenario, we would stream this for large datasets,
          // but for Phase C we are focusing on the infrastructure pipeline.
          let csv = 'id,created_at,identity_mode,is_anonymous,is_sponsored\n';
          for (const sub of allSubmissions) {
            csv += `"${sub.id}","${sub.createdAt.toISOString()}","${sub.submissionIdentityMode}",${sub.isAnonymous},${sub.isSponsored}\n`;
          }

          // 4. Publish CSV to Walrus
          const result = await walrus.publishBlob(csv);

          // 5. Update job with Walrus Blob ID
          await db
            .update(exportJobs)
            .set({ status: 'completed', resultBlobId: result.blobId, updatedAt: new Date() })
            .where(eq(exportJobs.id, job.id));

          logger.info({ jobId: job.id, blobId: result.blobId }, '[Export] CSV generated and published to Walrus');
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error({ jobId: job.id, error: msg }, '[Export] Failed to generate CSV');
          await db
            .update(exportJobs)
            .set({ status: 'failed', error: msg, updatedAt: new Date() })
            .where(eq(exportJobs.id, job.id));
        }
      }

      return pendingJobs.length;
    });

    return { processedJobs };
  }
);
