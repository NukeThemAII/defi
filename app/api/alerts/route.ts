import { NextRequest, NextResponse } from "next/server";

import { ensurePlatform } from "@/src/lib/platforms";
import { prisma } from "@/src/lib/prisma";
import { getTrackedVaultSummaries } from "@/src/lib/vaults";

function getNumberFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";
  const apyDeltaThreshold = getNumberFromEnv("THRESHOLD_APY_DELTA", 0.5);
  const tvlDropThreshold = getNumberFromEnv("THRESHOLD_TVL_DROP", 5);

  const summaries = await getTrackedVaultSummaries({ refresh });

  const alerts: Array<Record<string, unknown>> = [];

  for (const summary of summaries) {
    const platform = await ensurePlatform({
      key: summary.key,
      name: summary.name,
      network: summary.network,
      vaultAddr: summary.address,
    });

    const latestSnapshot = await prisma.snapshot.findFirst({
      where: { platformId: platform.id },
      orderBy: { takenAt: "desc" },
    });

    if (!latestSnapshot) {
      continue;
    }

    if (
      latestSnapshot.apy1d !== null &&
      latestSnapshot.apy1d !== undefined
    ) {
      const apyDelta = Math.abs(summary.apy["1d"].total - latestSnapshot.apy1d);
      if (apyDelta >= apyDeltaThreshold) {
        alerts.push({
          type: "apy_delta",
          platformKey: summary.key,
          level: apyDelta >= apyDeltaThreshold * 2 ? "high" : "medium",
          message: `APY changed by ${apyDelta.toFixed(2)}% (threshold ${apyDeltaThreshold}%)`,
          metrics: {
            previous: latestSnapshot.apy1d,
            current: summary.apy["1d"].total,
            delta: apyDelta,
          },
          snapshotTakenAt: latestSnapshot.takenAt,
        });
      }
    }

    if (
      latestSnapshot.tvlUsd !== null &&
      latestSnapshot.tvlUsd !== undefined &&
      latestSnapshot.tvlUsd > 0
    ) {
      const dropPercentage =
        ((latestSnapshot.tvlUsd - summary.tvlUsd) / latestSnapshot.tvlUsd) * 100;

      if (dropPercentage >= tvlDropThreshold) {
        alerts.push({
          type: "tvl_drop",
          platformKey: summary.key,
          level: dropPercentage >= tvlDropThreshold * 2 ? "high" : "medium",
          message: `TVL dropped by ${dropPercentage.toFixed(2)}% (threshold ${tvlDropThreshold}%)`,
          metrics: {
            previous: latestSnapshot.tvlUsd,
            current: summary.tvlUsd,
            dropPercentage,
          },
          snapshotTakenAt: latestSnapshot.takenAt,
        });
      }
    }
  }

  return NextResponse.json({
    count: alerts.length,
    alerts,
    fetchedAt: Date.now(),
    thresholds: {
      apyDelta: apyDeltaThreshold,
      tvlDrop: tvlDropThreshold,
    },
  });
}

