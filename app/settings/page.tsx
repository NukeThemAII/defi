"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/src/lib/format";

const ENV_HINTS: Array<{ key: string; description: string }> = [
  {
    key: "DEFAULT_WALLET",
    description: "Wallet used for projections and the hourly refresh worker.",
  },
  {
    key: "VAULTSFYI_API_KEY",
    description: "API key for Vaults.fyi requests. Required for production deployments.",
  },
  {
    key: "ALCHEMY_API_KEY",
    description: "Optional Base RPC provider for more reliable on-chain reads.",
  },
  {
    key: "THRESHOLD_APY_DELTA",
    description: "APY delta (%) that triggers alert exposure from `/api/alerts`.",
  },
  {
    key: "THRESHOLD_TVL_DROP",
    description: "TVL drop (%) threshold used in `/api/alerts`.",
  },
];

interface AlertsResponse {
  thresholds: {
    apyDelta: number;
    tvlDrop: number;
  };
  fetchedAt: number;
  count: number;
}

export default function SettingsPage() {
  const { data: alerts, isLoading, refetch, isFetching } = useQuery<AlertsResponse>({
    queryKey: ["alerts-thresholds"],
    queryFn: async () => {
      const response = await fetch("/api/alerts");
      if (!response.ok) {
        throw new Error("Failed to fetch alert thresholds");
      }
      return (await response.json()) as AlertsResponse;
    },
  });

  const envTable = useMemo(
    () => (
      <div className="space-y-2">
        {ENV_HINTS.map((hint) => (
          <div key={hint.key} className="rounded-md border px-3 py-2">
            <p className="font-medium">{hint.key}</p>
            <p className="text-sm text-muted-foreground">{hint.description}</p>
          </div>
        ))}
      </div>
    ),
    [],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure environment variables and background refresh behavior before deploying to AlmaLinux or PM2
          environments.
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Environment variables</CardTitle>
          <CardDescription>
            Ensure these values are configured in production. Secrets must remain server-side; do not expose API keys in
            client bundles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">{envTable}</CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Alert thresholds</CardTitle>
          <CardDescription>
            These values come from `/api/alerts`. Adjust them via environment variables and restart the worker to apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-20" />
          ) : alerts ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border px-4 py-3">
                <p className="text-sm text-muted-foreground">APY delta threshold</p>
                <p className="text-lg font-semibold">{formatPercent(alerts.thresholds.apyDelta)}</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-sm text-muted-foreground">TVL drop threshold</p>
                <p className="text-lg font-semibold">{formatPercent(alerts.thresholds.tvlDrop)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load alert thresholds right now.</p>
          )}
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh thresholds"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Refresh worker</CardTitle>
          <CardDescription>
            Run <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm refresh</code> locally, or{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">pm2 start pnpm --name defi-refresh -- refresh</code>{" "}
            in production, to capture hourly snapshots and keep alerts in sync.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
