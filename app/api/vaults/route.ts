import { NextRequest, NextResponse } from 'next/server';

import {
  getTrackedVaultSummaries,
  getVaultHistory,
  type VaultHistory,
  type VaultHistoryOptions,
  type VaultSummary,
} from '@/src/lib/vaults';

type ApyInterval = NonNullable<VaultHistoryOptions['apyInterval']>;
type Granularity = NonNullable<VaultHistoryOptions['granularity']>;

function parseApyInterval(value: string | null): ApyInterval {
  if (value === '1day' || value === '7day' || value === '30day') {
    return value;
  }
  return undefined;
}

function parseGranularity(value: string | null): Granularity {
  if (value === '1hour' || value === '1day' || value === '1week') {
    return value;
  }
  return undefined;
}

function parseIntOrUndefined(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function serializeSummary(summary: VaultSummary) {
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
    rewards: summary.rewards,
    holders: summary.holders,
    lpToken: summary.lpToken,
    fetchedAt: summary.fetchedAt,
  };
}

function serializeHistory(history: VaultHistory) {
  return {
    points: history.points,
    nextPage: history.nextPage,
    fetchedAt: history.fetchedAt,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const includeHistory = searchParams.get('history') === 'true';
  const refresh = searchParams.get('refresh') === 'true';

  const apyInterval = parseApyInterval(searchParams.get('apyInterval'));
  const granularity = parseGranularity(searchParams.get('granularity'));
  const page = parseIntOrUndefined(searchParams.get('page'));
  const perPage = parseIntOrUndefined(searchParams.get('perPage'));

  try {
    const summaries = await getTrackedVaultSummaries({ refresh });

    let historyByKey: Record<string, ReturnType<typeof serializeHistory>> | undefined;
    if (includeHistory) {
      const histories = await Promise.all(
        summaries.map((summary) =>
          getVaultHistory(summary.key, {
            apyInterval,
            granularity,
            page,
            perPage,
            refresh,
          }).then(serializeHistory),
        ),
      );

      historyByKey = histories.reduce<Record<string, ReturnType<typeof serializeHistory>>>(
        (acc, history, index) => {
          acc[summaries[index].key] = history;
          return acc;
        },
        {},
      );
    }

    const data = summaries.map((summary) => ({
      ...serializeSummary(summary),
      history: historyByKey?.[summary.key],
    }));

    return NextResponse.json({
      data,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to fetch vaults', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault data' },
      { status: 500 },
    );
  }
}
