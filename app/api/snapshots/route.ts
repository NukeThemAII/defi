import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { TRACKED_VAULTS, type VaultKey } from "@config/vaults";
import { ensurePlatform } from "@/src/lib/platforms";
import { prisma } from "@/src/lib/prisma";
import { getVaultSummaryByKey } from "@/src/lib/vaults";

const platformKeyEnum = z.enum(TRACKED_VAULTS.map((vault) => vault.key) as [VaultKey, ...VaultKey[]]);

const snapshotInputSchema = z.object({
  platformKey: platformKeyEnum,
  takenAt: z.coerce.date().optional(),
  apy1d: z.number().optional(),
  apy7d: z.number().optional(),
  apy30d: z.number().optional(),
  tvlUsd: z.number().optional(),
  balanceUsd: z.number().optional(),
  earningsToDate: z.number().optional(),
});

export async function GET(request: NextRequest) {
  const platformKeyParam = request.nextUrl.searchParams.get("platformKey");
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
  const take = Number.isNaN(limit) ? 50 : Math.min(Math.max(limit, 1), 200);

  let where: { platform: { key: VaultKey } } | undefined;

  if (platformKeyParam) {
    const parsedKey = platformKeyEnum.safeParse(platformKeyParam);
    if (!parsedKey.success) {
      return NextResponse.json(
        { error: "Invalid platformKey" },
        { status: 400 },
      );
    }

    where = {
      platform: {
        key: parsedKey.data,
      },
    };
  }

  const snapshots = await prisma.snapshot.findMany({
    where,
    orderBy: { takenAt: "desc" },
    take,
    include: {
      platform: true,
    },
  });

  return NextResponse.json({
    count: snapshots.length,
    data: snapshots,
    fetchedAt: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as unknown;
  const parsed = snapshotInputSchema.parse(body);

  const summary = await getVaultSummaryByKey(parsed.platformKey, {
    refresh: request.nextUrl.searchParams.get("refresh") === "true",
  });

  const platform = await ensurePlatform({
    key: summary.key,
    name: summary.name,
    network: summary.network,
    vaultAddr: summary.address,
  });

  const snapshot = await prisma.snapshot.create({
    data: {
      platformId: platform.id,
      takenAt: parsed.takenAt ?? new Date(),
      apy1d: parsed.apy1d ?? summary.apy["1d"].total,
      apy7d: parsed.apy7d ?? summary.apy["7d"].total,
      apy30d: parsed.apy30d ?? summary.apy["30d"].total,
      tvlUsd: parsed.tvlUsd ?? summary.tvlUsd,
      balanceUsd: parsed.balanceUsd ?? null,
      earningsToDate: parsed.earningsToDate ?? null,
    },
    include: {
      platform: true,
    },
  });

  return NextResponse.json(
    {
      snapshot,
      createdAt: Date.now(),
    },
    { status: 201 },
  );
}
