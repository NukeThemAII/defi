import { NextRequest, NextResponse } from "next/server";

import { BASE_NETWORK_NAME } from "@config/vaults";
import { normalizeAddress } from "@/src/lib/onchain";
import {
  getTrackedVaultSummaries,
  getVaultDetail,
  getVaultHistory,
  type VaultHistoryOptions,
} from "@/src/lib/vaults";

type ApyInterval = NonNullable<VaultHistoryOptions["apyInterval"]>;
type Granularity = NonNullable<VaultHistoryOptions["granularity"]>;

function parseApyInterval(value: string | null): ApyInterval | undefined {
  if (value === "1day" || value === "7day" || value === "30day") {
    return value;
  }
  return undefined;
}

function parseGranularity(value: string | null): Granularity | undefined {
  if (value === "1hour" || value === "1day" || value === "1week") {
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

export async function GET(
  request: NextRequest,
  context: { params: { network: string; address: string } },
) {
  const { network, address } = context.params;
  const normalizedNetwork = network.toLowerCase();

  if (normalizedNetwork !== BASE_NETWORK_NAME) {
    return NextResponse.json(
      { error: `Unsupported network "${network}"` },
      { status: 400 },
    );
  }

  const { searchParams } = request.nextUrl;
  const includeSummary = searchParams.get("summary") !== "false";
  const includeHistory = searchParams.get("history") === "true";
  const refresh = searchParams.get("refresh") === "true";

  let checksum: string;
  try {
    checksum = normalizeAddress(address);
  } catch {
    return NextResponse.json(
      { error: "Invalid address" },
      { status: 400 },
    );
  }

  try {
    const detail = await getVaultDetail(normalizedNetwork as typeof BASE_NETWORK_NAME, checksum, {
      refresh,
    });

    const response: Record<string, unknown> = {
      detail,
    };

    if (includeSummary || includeHistory) {
      const summaries = await getTrackedVaultSummaries({ refresh });
      const summary = summaries.find(
        (item) => item.address.toLowerCase() === detail.address.toLowerCase(),
      );

      if (includeSummary) {
        response.summary = summary ?? null;
      }

      if (includeHistory) {
        if (!summary) {
          return NextResponse.json(
            { error: "History available only for tracked vaults" },
            { status: 404 },
          );
        }

        const history = await getVaultHistory(summary.key, {
          apyInterval: parseApyInterval(searchParams.get("apyInterval")),
          granularity: parseGranularity(searchParams.get("granularity")),
          fromTimestamp: parseIntOrUndefined(searchParams.get("fromTimestamp")),
          toTimestamp: parseIntOrUndefined(searchParams.get("toTimestamp")),
          page: parseIntOrUndefined(searchParams.get("page")),
          perPage: parseIntOrUndefined(searchParams.get("perPage")),
          refresh,
        });

        response.history = history;
      }
    }

    response.fetchedAt = Date.now();
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch vault detail", error);
    return NextResponse.json({ error: "Vault not found" }, { status: 404 });
  }
}

