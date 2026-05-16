/**
 * Analytics Snapshot domain entity.
 */
import { z } from 'zod';

export const AnalyticsResolutionEnum = z.enum(['hourly', 'daily', 'weekly', 'monthly']);
export type AnalyticsResolution = z.infer<typeof AnalyticsResolutionEnum>;

export const AnalyticsSnapshotSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  periodStart: z.union([z.string().datetime(), z.date()]),
  resolution: AnalyticsResolutionEnum,
  totalSubmissions: z.number().int().min(0),
  anonymousSubmissions: z.number().int().min(0),
  sponsoredSubmissions: z.number().int().min(0),
  selfPaidSubmissions: z.number().int().min(0),
});

export type AnalyticsSnapshot = z.infer<typeof AnalyticsSnapshotSchema>;
