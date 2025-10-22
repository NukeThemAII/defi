import { NextRequest, NextResponse } from "next/server";

import { normalizeAddress, toUsdValue } from "@/src/lib/onchain";
import { getTrackedVaultSummaries, type VaultSummary } from "@/src/lib/vaults";
import { getVaultPosition } from "@/src/lib/onchain";

function serializeVaultPosition(
  summary: VaultSummary,
  balanceUsd: number,
  position: Awaited<ReturnType<typeof getVaultPosition>> | null,
) {
  return {
    key: summary.key,
    name: summary.name,
    protocol: summary.protocol,
    address: summary.address,
    network: summary.network,
    apy: summary.apy,
    tvl: {
      usd: summary.tvlUsd,
      native: summary.tvlNative,
    },
    asset: summary.asset,
    balanceUsd,
    position: position
      ? {
          shares: {
            token: position.share.token,
            amount: {
              raw: position.share.amount.raw.toString(),
              decimals: position.share.amount.decimals,
              formatted: position.share.amount.formatted,
              value: position.share.amount.value,
            },
          },
          underlying: {
            token: position.underlying.token,
            amount: {
              raw: position.underlying.amount.raw.toString(),
              decimals: position.underlying.amount.decimals,
              formatted: position.underlying.amount.formatted,
              value: position.underlying.amount.value,
            },
          },
        }
      : null,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: { address: string } },
) {
  const { address } = context.params;
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  let wallet: string;
  try {
    wallet = normalizeAddress(address);
  } catch {
    return NextResponse.json(
      { error: "Invalid address" },
      { status: 400 },
    );
  }

  try {
    const summaries = await getTrackedVaultSummaries({ refresh });

    const vaults = await Promise.all(
      summaries.map(async (summary) => {
        try {
          const position = await getVaultPosition(wallet, summary.address);
          const balanceUsd = toUsdValue(position.underlying.amount, summary.asset.priceUsd);
          return serializeVaultPosition(summary, balanceUsd, position);
        } catch (error) {
          console.warn(
            `Failed to load position for wallet ${wallet} in vault ${summary.address}`,
            error,
          );
          return serializeVaultPosition(summary, 0, null);
        }
      }),
    );

    const totals = vaults.reduce(
      (acc, vault) => {
        acc.balanceUsd += vault.balanceUsd;
        return acc;
      },
      { balanceUsd: 0 },
    );

    return NextResponse.json({
      wallet,
      totals,
      vaults,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to fetch wallet balances", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet balances" },
      { status: 500 },
    );
  }
}

