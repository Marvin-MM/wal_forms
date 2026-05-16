/**
 * Analytics snapshot background jobs.
 */
import { inngest } from '../client.js';
import { getDatabase } from '../../db/client.js';
import { analyticsSnapshots, submissions, forms } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../../../shared/logger.js';

export const computeFormAnalytics: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'compute-form-analytics',
    name: 'Compute Form Analytics',
    triggers: [{ cron: '0 0 * * *' }], // Nightly run
  },
  async ({ step }) => {
    await step.run('compute-snapshots', async () => {
      const db = getDatabase();
      const allForms = await db.select({ id: forms.id }).from(forms);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      for (const form of allForms) {
        // Simple aggregate stub
        const [stats] = await db
          .select({
            total: sql<number>`count(*)`,
            anonymous: sql<number>`count(*) filter (where is_anonymous = true)`,
            sponsored: sql<number>`count(*) filter (where is_sponsored = true)`,
          })
          .from(submissions)
          .where(eq(submissions.formId, form.id));

        await db.insert(analyticsSnapshots).values({
          formId: form.id,
          periodStart: yesterday,
          resolution: 'daily',
          totalSubmissions: Number(stats?.total || 0),
          anonymousSubmissions: Number(stats?.anonymous || 0),
          sponsoredSubmissions: Number(stats?.sponsored || 0),
          selfPaidSubmissions: Number(stats?.total || 0) - Number(stats?.anonymous || 0) - Number(stats?.sponsored || 0),
        }).onConflictDoNothing();
      }

      logger.info({ formsProcessed: allForms.length }, '[Analytics] Snapshots computed');
    });
  }
);
