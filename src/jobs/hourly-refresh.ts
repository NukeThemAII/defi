import cron from "node-cron";

import { getVaultPosition, toUsdValue } from "@/src/lib/onchain";
import { recordSnapshotForSummary } from "@/src/lib/snapshots";
import { prisma } from "@/src/lib/prisma";
import { getTrackedVaultSummaries } from "@/src/lib/vaults";

export async function runRefreshCycle(): Promise<void> {
  const summaries = await getTrackedVaultSummaries({ refresh: true });
  const wallet = process.env.DEFAULT_WALLET;
  const takenAt = new Date();

  await Promise.allSettled(
    summaries.map(async (summary) => {
      let balanceUsd: number | undefined;

      if (wallet) {
        try {
          const position = await getVaultPosition(wallet, summary.address);
          balanceUsd = toUsdValue(position.underlying.amount, summary.asset.priceUsd);
        } catch (error) {
          console.warn(
            `Failed to fetch wallet position for ${wallet} in ${summary.address}`,
            error,
          );
        }
      }

      await recordSnapshotForSummary(summary, {
        takenAt,
        balanceUsd,
      });
    }),
  );
}

export function startHourlyRefresh(cronExpression = "0 * * * *") {
  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        await runRefreshCycle();
        console.info(`[refresh] Snapshot cycle completed at ${new Date().toISOString()}`);
      } catch (error) {
        console.error("[refresh] Snapshot cycle failed", error);
      }
    },
    { scheduled: false },
  );

  void task.start();
  console.info(`[refresh] Hourly refresh scheduled with cron "${cronExpression}"`);
  return task;
}

export async function shutdownRefreshJob() {
  await prisma.$disconnect();
}
