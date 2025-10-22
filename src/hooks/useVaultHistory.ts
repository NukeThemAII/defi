import { useQueries, UseQueryResult } from "@tanstack/react-query";

import type { SummaryVault } from "@/src/hooks/useSummary";

export interface VaultHistoryPoint {
  timestamp: number;
  blockNumber: string;
  apy: {
    base: number;
    reward: number;
    total: number;
  };
  tvlUsd: number;
  tvlNative: number;
  sharePrice: number;
}

export interface VaultHistoryResponse {
  key: string;
  address: string;
  network: string;
  points: VaultHistoryPoint[];
  fetchedAt: number;
}

interface HistoryParams {
  apyInterval?: "1day" | "7day" | "30day";
  granularity?: "1hour" | "1day" | "1week";
  perPage?: number;
}

export function useVaultHistories(
  vaults: SummaryVault[] | undefined,
  params: HistoryParams,
): UseQueryResult<VaultHistoryResponse>[] {
  return useQueries({
    queries: (vaults ?? []).map((vault) => ({
      queryKey: ["vault-history", vault.key, params.apyInterval, params.granularity, params.perPage],
      enabled: Boolean(vault),
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        searchParams.set("history", "true");
        if (params.apyInterval) {
          searchParams.set("apyInterval", params.apyInterval);
        }
        if (params.granularity) {
          searchParams.set("granularity", params.granularity);
        }
        if (params.perPage) {
          searchParams.set("perPage", params.perPage.toString());
        }

        const response = await fetch(
          `/api/vault/${vault.network}/${vault.address}?${searchParams.toString()}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Failed to load history for ${vault.name}`);
        }

        const payload = (await response.json()) as { history?: VaultHistoryResponse };
        if (!payload.history) {
          throw new Error("History unavailable");
        }
        return payload.history;
      },
    })),
  });
}

