'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSummary } from '@/src/hooks/useSummary';
import { useVaultHistories } from '@/src/hooks/useVaultHistory';
import { formatCurrency, formatDateTime, formatPercent } from '@/src/lib/format';

const GRANULARITY_OPTIONS: Array<{
  label: string;
  granularity: '1day' | '1week';
  apyInterval: '1day' | '7day';
}> = [
  { label: 'Daily', granularity: '1day', apyInterval: '1day' },
  { label: 'Weekly', granularity: '1week', apyInterval: '7day' },
];

interface ChartDatum {
  timestamp: number;
  apy: number;
  tvl: number;
}

export default function ChartsPage() {
  const [selectedOption, setSelectedOption] = useState(GRANULARITY_OPTIONS[0]);
  const { data: summary } = useSummary();

  const historyQueries = useVaultHistories(summary?.vaults, {
    apyInterval: selectedOption.apyInterval,
    granularity: selectedOption.granularity,
    perPage: 200,
  });

  const isLoading = historyQueries.some((query) => query.isLoading);
  const hasError = historyQueries.some((query) => query.isError);

  const charts = useMemo(() => {
    if (!summary?.vaults) {
      return [];
    }

    return summary.vaults.map((vault, index) => {
      const history = historyQueries[index]?.data;
      const chartData: ChartDatum[] =
        history?.points
          ?.slice()
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((point) => ({
            timestamp: point.timestamp,
            apy: point.apy.total,
            tvl: point.tvlUsd,
          })) ?? [];

      return {
        vault,
        history,
        chartData,
        query: historyQueries[index],
      };
    });
  }, [summary?.vaults, historyQueries]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Charts</h1>
          <p className="text-sm text-muted-foreground">
            Visualize APY and TVL trends for tracked vaults. Historical data is captured hourly—view raw entries on the{' '}
            <Link href="/snapshots" className="underline-offset-4 hover:underline">
              snapshots
            </Link>{' '}
            page.
          </p>
        </div>
        <div className="flex gap-2">
          {GRANULARITY_OPTIONS.map((option) => (
            <Button
              key={option.label}
              variant={option.granularity === selectedOption.granularity ? 'default' : 'outline'}
              onClick={() => setSelectedOption(option)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </header>

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-[360px]" />
          ))}
        </div>
      )}

      {hasError && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Unable to load charts</CardTitle>
            <CardDescription>
              Historical data could not be retrieved. Try refreshing the dashboard or verifying Vaults.fyi availability.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {charts.map(({ vault, history, chartData, query }) => (
          <Card key={vault.key}>
            <CardHeader>
              <CardTitle>{vault.name}</CardTitle>
              <CardDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>{vault.protocol} • {vault.network}</span>
                {query?.data && (
                  <span className="text-muted-foreground">
                    Updated {formatDateTime(query.data.fetchedAt)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {chartData.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                  No history available for the selected range.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">APY trend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id={`apy-${vault.key}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--muted))" strokeOpacity={0.2} vertical={false} />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value)}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          tickFormatter={(value) => `${value.toFixed(1)}%`}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatPercent(value)}
                          labelFormatter={(value: number) => formatDateTime(value)}
                        />
                        <Area
                          type="monotone"
                          dataKey="apy"
                          stroke="hsl(var(--primary))"
                          fill={`url(#apy-${vault.key})`}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">TVL trend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <CartesianGrid stroke="hsl(var(--muted))" strokeOpacity={0.2} vertical={false} />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value)}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          tickFormatter={(value) => formatCurrency(value, { compact: true })}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(value: number) => formatDateTime(value)}
                        />
                        <Line
                          type="monotone"
                          dataKey="tvl"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
