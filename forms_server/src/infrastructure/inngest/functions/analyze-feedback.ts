/**
 * AI feedback analysis background job.
 * Triggered by forms/analysis.requested event.
 */
import { inngest } from '../client.js';
import { getDatabase } from '../../db/client.js';
import { submissions, analyses, forms } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { WalrusClient } from '../../walrus/client.js';
import { AIClient } from '../../ai/client.js';
import { logger } from '../../../shared/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const analyzeFeedback: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'analyze-feedback',
    retries: 2,
    triggers: [{ event: 'forms/analysis.requested' }],
  },
  async ({ event, step }: { event: { data: { formId: string; analysisId: string } }; step: any }) => {
    const { formId, analysisId } = event.data;
    const db = getDatabase();

    // Update status to running
    await step.run('update-status-running', async () => {
      await db.update(analyses).set({ jobStatus: 'running' }).where(eq(analyses.id, analysisId));
    });

    try {
      // Fetch form title
      const form = await step.run('fetch-form', async () => {
        const [f] = await db.select().from(forms).where(eq(forms.id, formId));
        return f;
      });

      if (!form) throw new Error(`Form not found: ${formId}`);

      // Fetch non-encrypted submission blobIds
      const subs = await step.run('fetch-submissions', async () => {
        return db
          .select({ walrusBlobId: submissions.walrusBlobId })
          .from(submissions)
          .where(and(eq(submissions.formId, formId), eq(submissions.isEncrypted, false)));
      });

      if (subs.length === 0) {
        await db.update(analyses).set({
          jobStatus: 'completed',
          result: { summary: 'No submissions to analyze', themes: [], sentimentSummary: {}, keyInsights: [] },
        }).where(eq(analyses.id, analysisId));
        return { status: 'completed', message: 'No submissions' };
      }

      // Fetch content from Walrus
      const walrusConfig = {
        publisherEndpoint: process.env['WALRUS_PUBLISHER_ENDPOINT']!,
        aggregatorEndpoint: process.env['WALRUS_AGGREGATOR_ENDPOINT']!,
        defaultEpochs: 5,
      };
      const walrus = new WalrusClient(walrusConfig);

      const contents: string[] = await step.run('fetch-blob-contents', async () => {
        const results: string[] = [];
        for (const sub of subs) {
          try {
            const data = await walrus.fetchBlobContent(sub.walrusBlobId);
            results.push(new TextDecoder().decode(data));
          } catch (error) {
            logger.warn({ blobId: sub.walrusBlobId, error }, '[Analysis] Failed to fetch blob');
          }
        }
        return results;
      });

      // Send to AI for analysis
      const aiClient = new AIClient({ apiKey: process.env['GEMINI_API_KEY']! });

      const result = await step.run('ai-analysis', async () => {
        return aiClient.analyzeSubmissions(form.title, contents);
      });

      // Write result
      await step.run('write-result', async () => {
        await db.update(analyses).set({
          jobStatus: 'completed',
          result: result as unknown as Record<string, unknown>,
        }).where(eq(analyses.id, analysisId));
      });

      return { status: 'completed', themes: result.themes.length };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await db.update(analyses).set({ jobStatus: 'failed', error: msg }).where(eq(analyses.id, analysisId));
      throw error;
    }
  }
);
