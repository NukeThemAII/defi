import type { Platform } from "@prisma/client";

import { TRACKED_VAULTS } from "@config/vaults";

import { prisma } from "./prisma";

export type PlatformKey = (typeof TRACKED_VAULTS)[number]["key"];

interface EnsurePlatformOptions {
  key: PlatformKey;
  name: string;
  network: string;
  vaultAddr?: string | null;
}

export async function ensurePlatform({
  key,
  name,
  network,
  vaultAddr,
}: EnsurePlatformOptions): Promise<Platform> {
  const updateData: {
    name: string;
    network: string;
    vaultAddr?: string | null;
  } = {
    name,
    network,
  };

  if (vaultAddr !== undefined) {
    updateData.vaultAddr = vaultAddr ?? null;
  }

  return prisma.platform.upsert({
    where: { key },
    create: {
      key,
      name,
      network,
      vaultAddr: vaultAddr ?? null,
    },
    update: updateData,
  });
}

export async function ensureTrackedPlatforms(): Promise<Platform[]> {
  return Promise.all(
    TRACKED_VAULTS.map((vault) =>
      ensurePlatform({
        key: vault.key,
        name: vault.name,
        network: vault.network,
      }),
    ),
  );
}

export async function getPlatformByKey(key: PlatformKey): Promise<Platform | null> {
  return prisma.platform.findUnique({
    where: { key },
  });
}

export async function getPlatformOrThrow(key: PlatformKey): Promise<Platform> {
  const platform = await getPlatformByKey(key);
  if (!platform) {
    return ensureTrackedPlatforms().then(() =>
      prisma.platform.findUniqueOrThrow({
        where: { key },
      }),
    );
  }

  return platform;
}

export async function listPlatforms(): Promise<Platform[]> {
  return prisma.platform.findMany({
    orderBy: { createdAt: "asc" },
  });
}
