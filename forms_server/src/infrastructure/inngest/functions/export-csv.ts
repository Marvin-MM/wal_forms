/**
 * CSV export background job.
 * Triggered by forms/export.requested event.
 */
import { inngest } from '../client.js';
import { getDatabase } from '../../db/client.js';
import { submissions, exportJobs, forms } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { WalrusClient } from '../../walrus/client.js';
import { logger } from '../../../shared/logger.js';
import { validateEnv } from '../../../shared/config/env.js';
import { roomManager } from '../../../interface/ws/room-manager.js';
import { WsEventType } from '../../../shared/types/index.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const exportCsv: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'export-csv',
    retries: 2,
    triggers: [{ event: 'forms/export.requested' }],
  },
  async ({ event, step }: { event: { data: { formId: string; exportId: string } }; step: any }) => {
    const { formId, exportId } = event.data;
    const env = validateEnv();
    const db = getDatabase();

    await step.run('update-status-running', async () => {
      await db.update(exportJobs).set({ status: 'running' }).where(eq(exportJobs.id, exportId));
    });

    try {
      // Fetch form
      const form = await step.run('fetch-form', async () => {
        const [f] = await db.select().from(forms).where(eq(forms.id, formId));
        return f;
      });
      if (!form) throw new Error(`Form not found: ${formId}`);

      // Fetch all submissions
      const subs = await step.run('fetch-submissions', async () => {
        return db.select().from(submissions).where(eq(submissions.formId, formId));
      });

      // Fetch content where possible
      const walrus = new WalrusClient({
        publisherEndpoint: env.WALRUS_PUBLISHER_ENDPOINT,
        aggregatorEndpoint: env.WALRUS_AGGREGATOR_ENDPOINT,
        defaultEpochs: env.WALRUS_DEFAULT_EPOCHS,
      });

      const rows: string[][] = await step.run('build-csv-rows', async () => {
        const csvRows: string[][] = [];
        // Header
        csvRows.push(['ID', 'Created At', 'Priority', 'Reviewed', 'Encrypted', 'Submitter', 'Content']);

        for (const sub of subs) {
          let content = '';
          if (!sub.isEncrypted) {
            try {
              const data = await walrus.fetchBlobContent(sub.walrusBlobId);
              content = new TextDecoder().decode(data);
            } catch {
              content = '[fetch failed]';
            }
          } else {
            content = '[encrypted]';
          }

          csvRows.push([
            sub.id,
            sub.createdAt.toISOString(),
            sub.priority,
            String(sub.isReviewed),
            String(sub.isEncrypted),
            sub.submitterWallet ?? 'anonymous',
            content,
          ]);
        }

        return csvRows;
      });

      // Format as CSV
      const csvContent = rows
        .map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Publish CSV to Walrus
      const { blobId } = await step.run('publish-csv', async () => {
        return walrus.publishBlob(csvContent);
      });

      // Write result
      await step.run('write-result', async () => {
        await db.update(exportJobs).set({
          status: 'completed',
          resultBlobId: blobId,
        }).where(eq(exportJobs.id, exportId));
      });

      roomManager.broadcast(formId, {
        type: WsEventType.EXPORT_COMPLETE,
        formId,
        payload: { exportId, blobId },
        timestamp: new Date().toISOString(),
      });

      await inngest.send({
        name: 'forms/export.completed',
        data: { formId, exportId, blobId },
      });

      logger.info({ exportId, blobId, rowCount: rows.length - 1 }, '[Export] CSV export completed');
      return { status: 'completed', blobId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await db.update(exportJobs).set({ status: 'failed', error: msg }).where(eq(exportJobs.id, exportId));
      throw error;
    }
  }
);
