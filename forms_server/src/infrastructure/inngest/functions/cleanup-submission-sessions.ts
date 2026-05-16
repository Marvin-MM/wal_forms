/**
 * Inngest job: cleanup-expired-submission-sessions
 *
 * Runs every hour. Marks submission sessions past their TTL as 'expired'.
 * Prevents the submission_sessions table from growing indefinitely.
 *
 * Trigger: cron '0 * * * *' (every hour on the hour)
 */
import { inngest } from '../client.js';
import { getDatabase } from '../../db/client.js';
import { submissionSessions } from '../../db/schema.js';
import { eq, lt, and } from 'drizzle-orm';
import { logger } from '../../../shared/logger.js';

export const cleanupExpiredSubmissionSessions: ReturnType<typeof inngest.createFunction> = inngest.createFunction(
  {
    id: 'cleanup-expired-submission-sessions',
    name: 'Cleanup Expired Submission Sessions',
    triggers: [{ cron: '0 * * * *' }], // every hour on the hour
  },
  async ({ step }: { step: any }) => {
    const expired = await step.run('mark-expired-sessions', async () => {
      const db = getDatabase();
      const now = new Date();
      const result = await db
        .update(submissionSessions)
        .set({ status: 'expired' })
        .where(
          and(
            eq(submissionSessions.status, 'pending'),
            lt(submissionSessions.expiresAt, now)
          )
        )
        .returning({ id: submissionSessions.id });

      logger.info({ count: result.length }, '[Inngest] Expired submission sessions cleaned up');
      return { expiredCount: result.length };
    });

    return expired;
  }
);
