/**
 * Inngest serve handler for Elysia.
 * Mounts at /api/inngest.
 */
import { serve } from 'inngest/bun';
import { inngest } from './client.js';
import { analyzeFeedback } from './functions/analyze-feedback.js';
import { cleanupExpiredSubmissionSessions } from './functions/cleanup-submission-sessions.js';
import { exportCsv } from './functions/export-csv.js';
import { sendSubmissionNotification, sendDigestNotifications } from './functions/notifications.js';
import { storageRenewalMonitor } from './functions/storage-monitor.js';
import { computeFormAnalytics } from './functions/analytics-snapshot.js';

function optionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export const inngestHandler = serve({
  client: inngest,
  serveOrigin: optionalEnv('INNGEST_SERVE_ORIGIN'),
  servePath: optionalEnv('INNGEST_SERVE_PATH') ?? '/api/inngest',
  functions: [
    analyzeFeedback,
    cleanupExpiredSubmissionSessions,
    exportCsv,
    sendSubmissionNotification,
    sendDigestNotifications,
    storageRenewalMonitor,
    computeFormAnalytics,
  ],
});
