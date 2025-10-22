import type { Snapshot } from "@prisma/client";

import { ensurePlatform } from "./platforms";
import { prisma } from "./prisma";
import type { VaultSummary } from "./vaults";

export interface SnapshotOverrides {
  takenAt?: Date;
  apy1d?: number | null;
  apy7d?: number | null;
  apy30d?: number | null;
  tvlUsd?: number | null;
  balanceUsd?: number | null;
  earningsToDate?: number | null;
}

export async function recordSnapshotForSummary(
  summary: VaultSummary,
  overrides: SnapshotOverrides = {},
): Promise<Snapshot> {
  const platform = await ensurePlatform({
    key: summary.key,
    name: summary.name,
    network: summary.network,
    vaultAddr: summary.address,
  });

  return prisma.snapshot.create({
    data: {
      platformId: platform.id,
      takenAt: overrides.takenAt ?? new Date(),
      apy1d: overrides.apy1d ?? summary.apy["1d"].total,
      apy7d: overrides.apy7d ?? summary.apy["7d"].total,
      apy30d: overrides.apy30d ?? summary.apy["30d"].total,
      tvlUsd: overrides.tvlUsd ?? summary.tvlUsd,
      balanceUsd:
        overrides.balanceUsd !== undefined ? overrides.balanceUsd : null,
      earningsToDate:
        overrides.earningsToDate !== undefined ? overrides.earningsToDate : null,
    },
  });
}

