import { useQuery, UseQueryResult } from "@tanstack/react-query";

export interface SummaryVault {
  key: string;
  name: string;
  protocol: string;
  address: string;
  network: string;
  apy: Record<"1d" | "7d" | "30d", { base: number; reward: number; total: number }>;
  tvl: {
    usd: number;
    native: number;
  };
  asset: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    priceUsd?: number | null;
  };
  balanceUsd: number;
  weight: number;
  projections: Record<string, number>;
  position: {
    shares: {
      token: {
        address: string;
        decimals: number;
        symbol?: string;
        name?: string;
      };
      amount: {
        raw: string;
        decimals: number;
        formatted: string;
        value: number;
      };
    };
    underlying: {
      token: {
        address: string;
        decimals: number;
        symbol?: string;
        name?: string;
      };
      amount: {
        raw: string;
        decimals: number;
        formatted: string;
        value: number;
      };
    };
  } | null;
}

export interface SummaryResponse {
  wallet: string;
  compoundWeekly: boolean;
  totals: {
    balanceUsd: number;
    blendedApy: number;
    projections: Record<string, number>;
  };
  vaults: SummaryVault[];
  snapshotsPersisted: number;
  fetchedAt: number;
}

export function useSummary(wallet?: string, options?: { enabled?: boolean }): UseQueryResult<SummaryResponse> {
  return useQuery({
    queryKey: ["summary", wallet],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (wallet) {
        params.set("wallet", wallet);
      }
      const response = await fetch(`/api/summary?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load summary");
      }
      return (await response.json()) as SummaryResponse;
    },
    enabled: options?.enabled ?? true,
  });
}
