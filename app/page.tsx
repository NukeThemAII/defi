'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSummary } from '@/src/hooks/useSummary';
import { formatCurrency, formatDateTime, formatPercent } from '@/src/lib/format';

const PROJECTION_ORDER: { key: string; label: string }[] = [
  { key: '1d', label: 'Next 24h' },
  { key: '7d', label: 'Next 7d' },
  { key: '30d', label: 'Next 30d' },
  { key: '90d', label: 'Next 90d' },
  { key: '365d', label: 'Next 12m' },
];

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching, error } = useSummary();

  const projections = useMemo(() =>
    data ? PROJECTION_ORDER.map(({ key, label }) => ({
      key,
      label,
      value: data.totals.projections[key] ?? 0,
    })) : [],
  [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Summary unavailable</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'The summary endpoint is currently unreachable.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lastRefreshed = formatDateTime(data.fetchedAt);
  const totalBalance = formatCurrency(data.totals.balanceUsd);
  const blendedApy = formatPercent(data.totals.blendedApy);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Wallet</p>
          <h1 className="text-2xl font-semibold tracking-tight">{data.wallet}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="rounded-full border border-border px-3 py-1">
                  Fetched {lastRefreshed}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{data.snapshotsPersisted} snapshot(s) stored on last refresh.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => void refetch()} disabled={isFetching} variant="outline">
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Balance</CardDescription>
            <CardTitle className="text-3xl font-semibold">{totalBalance}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Blended APY</CardDescription>
            <CardTitle className="text-3xl font-semibold">{blendedApy}</CardTitle>
          </CardHeader>
        </Card>
        {projections.slice(0, 2).map((projection) => (
          <Card key={projection.key}>
            <CardHeader>
              <CardDescription>{projection.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold">
                {formatCurrency(projection.value, { compact: true })}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {projections.map((projection) => (
          <Card key={projection.key} className="xl:col-span-1">
            <CardHeader>
              <CardDescription>{projection.label}</CardDescription>
              <CardTitle className="text-xl font-medium">
                {formatCurrency(projection.value, { compact: true })}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Tracked vaults</h2>
            <p className="text-sm text-muted-foreground">
              Live APY, TVL and wallet exposure for Gauntlet USD Alpha and Superlend USDC SuperFund.
            </p>
          </div>
          <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/snapshots">
            View snapshot history
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.vaults.map((vault) => (
            <Card key={vault.key} className="flex flex-col justify-between">
              <CardHeader className="pb-4">
                <CardDescription className="uppercase text-xs tracking-wider">
                  {vault.protocol}
                </CardDescription>
                <CardTitle className="text-xl font-semibold">{vault.name}</CardTitle>
                <CardDescription className="text-xs">{vault.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">APY (1d)</span>
                  <span className="text-base font-semibold">{formatPercent(vault.apy['1d'].total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">TVL</span>
                  <span className="text-base font-semibold">{formatCurrency(vault.tvl.usd, { compact: true })}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Wallet exposure</span>
                  <span className="font-medium">{formatCurrency(vault.balanceUsd, { compact: true })}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Portfolio weight</span>
                  <span className="font-medium">{formatPercent(vault.weight * 100)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
