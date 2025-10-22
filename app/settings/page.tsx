'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ENV_HINTS: Array<{ key: string; description: string }> = [
  {
    key: 'DEFAULT_WALLET',
    description: 'Wallet used for projections and the hourly refresh worker.',
  },
  {
    key: 'VAULTSFYI_API_KEY',
    description: 'API key for Vaults.fyi requests. Required for production deployments.',
  },
  {
    key: 'ALCHEMY_API_KEY',
    description: 'Optional Base RPC provider for more reliable on-chain reads.',
  },
  {
    key: 'THRESHOLD_APY_DELTA',
    description: 'APY delta (%) that triggers an alert exposure from `/api/alerts`.',
  },
  {
    key: 'THRESHOLD_TVL_DROP',
    description: 'TVL drop (%) threshold used in `/api/alerts`.',
  },
];

export default function SettingsPage() {
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
          Configure env variables and refresh behavior before deploying to AlmaLinux or PM2 environments.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Environment variables</CardTitle>
          <CardDescription>
            Ensure these values are configured in production. Secrets must remain server-side; do not expose API keys in
            client bundles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">{envTable}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refresh worker</CardTitle>
          <CardDescription>
            Run `pnpm refresh` (or `pm2 start pnpm --name defi-refresh -- refresh`) to capture hourly snapshots and keep
            alerts up to date.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

