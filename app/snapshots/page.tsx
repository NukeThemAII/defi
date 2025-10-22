'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSnapshots } from '@/src/hooks/useSnapshots';
import { formatCurrency, formatDateTime, formatPercent } from '@/src/lib/format';

const LIMIT_OPTIONS = [25, 50, 100, 200];

export default function SnapshotsPage() {
  const [limit, setLimit] = useState(50);
  const { data, isLoading, isError, refetch, isFetching } = useSnapshots({ limit });

  const snapshots = useMemo(() => data?.data ?? [], [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Snapshot history</h1>
          <p className="text-sm text-muted-foreground">
            Hourly snapshots captured from Vaults.fyi and Prisma. Use them to track APY or TVL changes.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Showing latest {limit} entries</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={limit}
            onChange={(event) => setLimit(Number.parseInt(event.target.value, 10))}
          >
            {LIMIT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Recent snapshots</CardTitle>
          <CardDescription>
            {isError
              ? 'Failed to load snapshot history.'
              : data
                ? `Last updated ${formatDateTime(data.fetchedAt)}`
                : 'Loading snapshot history…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14" />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="grid gap-3 p-4 md:grid-cols-5 md:items-center">
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium">{snapshot.platform?.name ?? snapshot.platformId}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(snapshot.takenAt)} · {snapshot.platform?.network ?? 'base'}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">APY (1d)</span>
                    <div className="font-semibold">
                      {formatPercent(snapshot.apy1d ?? null)}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">TVL USD</span>
                    <div className="font-semibold">{formatCurrency(snapshot.tvlUsd ?? null, { compact: true })}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Balance USD</span>
                    <div className="font-semibold">
                      {formatCurrency(snapshot.balanceUsd ?? null, { compact: true })}
                    </div>
                  </div>
                </div>
              ))}
              {snapshots.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">No snapshots recorded yet.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
