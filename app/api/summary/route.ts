import { NextRequest, NextResponse } from 'next/server';

import { buildEarningsProjections, calculateBlendedApy, type ProjectionKey } from '@/src/lib/metrics';
import { getVaultPosition, toUsdValue, type TokenAmount } from '@/src/lib/onchain';
import { recordSnapshotForSummary } from '@/src/lib/snapshots';
import { getTrackedVaultSummaries, type VaultSummary } from '@/src/lib/vaults';

function serializeTokenAmount(amount: TokenAmount) {
  return {
    raw: amount.raw.toString(),
    decimals: amount.decimals,
    formatted: amount.formatted,
    value: amount.value,
  };
}

function serializeTokenMetadata(token: { address: string; decimals: number; symbol?: string; name?: string }) {
  return {
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name,
  };
}

interface SerializedTokenBalance {
  token: ReturnType<typeof serializeTokenMetadata>;
  amount: ReturnType<typeof serializeTokenAmount>;
}

interface PositionPayload {
  shares: SerializedTokenBalance;
  underlying: SerializedTokenBalance;
}

interface VaultSummaryWithBalance {
  summary: VaultSummary;
  balanceUsd: number;
  projections: ReturnType<typeof buildEarningsProjections>;
  position: PositionPayload | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const walletParam = searchParams.get('wallet') ?? process.env.DEFAULT_WALLET;
  const compoundWeekly = searchParams.get('compound') === 'weekly' || searchParams.get('weeklyCompounding') === 'true';
  const refresh = searchParams.get('refresh') === 'true';
  const persistSnapshots = searchParams.get('persist') !== 'false';

  if (!walletParam) {
    return NextResponse.json(
      { error: 'Wallet address required (set DEFAULT_WALLET or use ?wallet=...)' },
      { status: 400 },
    );
  }

  try {
    const summaries = await getTrackedVaultSummaries({ refresh });

    const vaultsWithBalances: VaultSummaryWithBalance[] = await Promise.all(
      summaries.map(async (summary) => {
        try {
          const position = await getVaultPosition(walletParam, summary.address);
          const balanceUsd = toUsdValue(position.underlying.amount, summary.asset.priceUsd);
          const projections = buildEarningsProjections(balanceUsd, summary.apy['1d'].total, compoundWeekly);

          return {
            summary,
            balanceUsd,
            projections,
            position: {
              shares: {
                token: serializeTokenMetadata(position.share.token),
                amount: serializeTokenAmount(position.share.amount),
              },
              underlying: {
                token: serializeTokenMetadata(position.underlying.token),
                amount: serializeTokenAmount(position.underlying.amount),
              },
            },
          };
        } catch (error) {
          console.warn(`Failed to read position for vault ${summary.address}`, error);
          return {
            summary,
            balanceUsd: 0,
            projections: buildEarningsProjections(0, summary.apy['1d'].total, compoundWeekly),
            position: null,
          };
        }
      }),
    );

    const totalBalanceUsd = vaultsWithBalances.reduce((acc, item) => acc + item.balanceUsd, 0);
    const blendedApy = calculateBlendedApy(
      vaultsWithBalances.map((item) => ({
        balanceUsd: item.balanceUsd,
        apyPercent: item.summary.apy['1d'].total,
      })),
    );

    const projectionKeys: ProjectionKey[] = ['1d', '7d', '30d', '90d', '365d'];
    const aggregatedProjections = projectionKeys.reduce<Record<ProjectionKey, number>>(
      (acc, key) => {
        acc[key] = vaultsWithBalances.reduce(
          (sum, item) => sum + (item.projections[key] ?? 0),
          0,
        );
        return acc;
      },
      { '1d': 0, '7d': 0, '30d': 0, '90d': 0, '365d': 0 },
    );

    const data = vaultsWithBalances.map(({ summary, balanceUsd, projections, position }) => {
      const weight = totalBalanceUsd > 0 ? balanceUsd / totalBalanceUsd : 0;
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
        weight,
        projections,
        position,
      };
    });

    let snapshotsPersisted = 0;
    if (persistSnapshots) {
      const snapshotResults = await Promise.allSettled(
        vaultsWithBalances.map((item) =>
          recordSnapshotForSummary(item.summary, {
            balanceUsd: item.balanceUsd,
          }),
        ),
      );

      snapshotsPersisted = snapshotResults.filter(
        (result) => result.status === 'fulfilled',
      ).length;
    }

    return NextResponse.json({
      wallet: walletParam,
      compoundWeekly,
      totals: {
        balanceUsd: totalBalanceUsd,
        blendedApy,
        projections: aggregatedProjections,
      },
      vaults: data,
      snapshotsPersisted,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to build summary', error);
    return NextResponse.json(
      { error: 'Failed to build summary' },
      { status: 500 },
    );
  }
}
