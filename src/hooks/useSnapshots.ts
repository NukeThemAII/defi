import { useQuery, UseQueryResult } from "@tanstack/react-query";

export interface SnapshotRecord {
  id: string;
  platformId: string;
  takenAt: string;
  apy1d?: number | null;
  apy7d?: number | null;
  apy30d?: number | null;
  tvlUsd?: number | null;
  balanceUsd?: number | null;
  earningsToDate?: number | null;
  createdAt: string;
  platform?: {
    key: string;
    name: string;
    network: string;
  };
}

export interface SnapshotResponse {
  count: number;
  data: SnapshotRecord[];
  fetchedAt: number;
}

interface UseSnapshotsParams {
  limit?: number;
  platformKey?: string;
}

export function useSnapshots(params: UseSnapshotsParams): UseQueryResult<SnapshotResponse> {
  return useQuery({
    queryKey: ["snapshots", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.limit) {
        searchParams.set("limit", params.limit.toString());
      }
      if (params.platformKey) {
        searchParams.set("platformKey", params.platformKey);
      }
      const response = await fetch(`/api/snapshots?${searchParams.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load snapshots");
      }
      return (await response.json()) as SnapshotResponse;
    },
  });
}
