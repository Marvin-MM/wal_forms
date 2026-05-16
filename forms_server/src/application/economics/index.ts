/**
 * Economics application layer.
 * Manages platform accounts, credits, and cost events.
 */
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../../infrastructure/db/client.js';
import { platformAccounts, costEvents } from '../../infrastructure/db/schema.js';
import { logger } from '../../shared/logger.js';
import type { CostEventType } from '../../domain/entities/economics-entities.js';

export interface EconomicsDeps {
  db: Database;
}

export async function getPlatformAccount(walletAddress: string, deps: EconomicsDeps) {
  const [account] = await deps.db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.walletAddress, walletAddress));

  if (!account) {
    // Return a default empty account state if none exists yet
    return {
      walletAddress,
      availableCredits: 0,
      totalSpent: 0,
    };
  }

  return account;
}

export async function recordCostEvent(
  walletAddress: string,
  formId: string | null,
  type: CostEventType,
  amount: number,
  description: string | null,
  deps: EconomicsDeps
) {
  return await deps.db.transaction(async (tx) => {
    // 1. Ensure account exists or create it
    await tx
      .insert(platformAccounts)
      .values({ walletAddress })
      .onConflictDoNothing();

    if (type === 'deposit') {
      // Add credits
      await tx
        .update(platformAccounts)
        .set({
          availableCredits: sql`${platformAccounts.availableCredits} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(platformAccounts.walletAddress, walletAddress));
    } else {
      // Deduct credits
      const [account] = await tx
        .select({ availableCredits: platformAccounts.availableCredits })
        .from(platformAccounts)
        .where(eq(platformAccounts.walletAddress, walletAddress));

      if (!account || account.availableCredits < amount) {
        throw new Error(`Insufficient credits. Required: ${amount}, Available: ${account?.availableCredits ?? 0}`);
      }

      await tx
        .update(platformAccounts)
        .set({
          availableCredits: sql`${platformAccounts.availableCredits} - ${amount}`,
          totalSpent: sql`${platformAccounts.totalSpent} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(platformAccounts.walletAddress, walletAddress));
    }

    // 2. Insert cost event record
    const [event] = await tx
      .insert(costEvents)
      .values({
        walletAddress,
        formId,
        type,
        amount,
        description,
      })
      .returning();

    logger.info({ walletAddress, type, amount }, '[Economics] Cost event recorded');
    return event!;
  });
}
