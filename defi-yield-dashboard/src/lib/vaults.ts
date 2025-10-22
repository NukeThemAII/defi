import { VaultsSdk } from '@vaultsfyi/sdk';
import { BASE_NETWORK_NAME, TRACKED_VAULTS, type VaultDefinition, type VaultKey } from '@config/vaults';

type VaultsListResponse = Awaited<ReturnType<VaultsSdk['getAllVaults']>>;
type VaultListItem = VaultsListResponse['data'][number];
type VaultDetailResponse = Awaited<ReturnType<VaultsSdk['getVault']>>;
type VaultHistoryResponse = Awaited<ReturnType<VaultsSdk['getVaultHistoricalData']>>;
type VaultNetworkName = VaultListItem['network']['name'];

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const DEFAULT_SUMMARY_TTL = 60_000; // 1 minute
const DEFAULT_HISTORY_TTL = 5 * 60_000; // 5 minutes

declare global {
  // eslint-disable-next-line no-var
  var __vaultsSdk: VaultsSdk | undefined;
  // eslint-disable-next-line no-var
  var __vaultsCache: Map<string, CacheEntry<unknown>> | undefined;
  // eslint-disable-next-line no-var
  var __vaultsPending: Map<string, Promise<unknown>> | undefined;
}

const cache: Map<string, CacheEntry<unknown>> = globalThis.__vaultsCache ?? new Map();
const pending: Map<string, Promise<unknown>> = globalThis.__vaultsPending ?? new Map();

if (!globalThis.__vaultsCache) {
  globalThis.__vaultsCache = cache;
}
if (!globalThis.__vaultsPending) {
  globalThis.__vaultsPending = pending;
}

function getVaultsSdk(): VaultsSdk {
  const apiKey = process.env.VAULTSFYI_API_KEY;
  if (!apiKey) {
    throw new Error('VAULTSFYI_API_KEY is required to query Vaults.fyi');
  }

  if (!globalThis.__vaultsSdk) {
    globalThis.__vaultsSdk = new VaultsSdk({ apiKey });
  }

  return globalThis.__vaultsSdk;
}

async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  { refresh = false }: { refresh?: boolean } = {},
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  if (!refresh && cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inflight = pending.get(key) as Promise<T> | undefined;
  if (inflight) {
    return inflight;
  }

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      pending.delete(key);
      return value;
    })
    .catch((error) => {
      pending.delete(key);
      throw error;
    });

  pending.set(key, promise);
  return promise;
}

export interface VaultApyBreakdown {
  base: number;
  reward: number;
  total: number;
}

export type VaultApyIntervals = Record<'1d' | '7d' | '30d', VaultApyBreakdown>;

export interface VaultAssetSummary {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd?: number | null;
  logoUrl?: string | null;
}

export interface VaultRewardSummary {
  asset: VaultAssetSummary;
  apy: VaultApyIntervals;
}

export interface VaultSummary {
  key: VaultKey;
  definition: VaultDefinition;
  address: string;
  network: VaultNetworkName;
  name: string;
  protocol: string;
  asset: VaultAssetSummary;
  apy: VaultApyIntervals;
  tvlUsd: number;
  tvlNative: number;
  rewards: VaultRewardSummary[];
  holders?: {
    totalCount?: number;
    totalBalance?: number;
    topHolders?: {
      address: string;
      lpTokenBalance: number;
    }[];
  };
  lpToken?: VaultAssetSummary;
  fetchedAt: number;
  raw: VaultListItem;
}

export interface VaultHistoricalPoint {
  timestamp: number;
  blockNumber: string;
  apy: VaultApyBreakdown;
  tvlUsd: number;
  tvlNative: number;
  sharePrice: number;
}

export interface VaultHistory {
  key: VaultKey;
  address: string;
  network: VaultNetworkName;
  points: VaultHistoricalPoint[];
  nextPage?: number;
  fetchedAt: number;
}

function mapApyInterval(data: VaultListItem['apy']): VaultApyIntervals {
  return {
    '1d': { base: data['1day'].base, reward: data['1day'].reward, total: data['1day'].total },
    '7d': { base: data['7day'].base, reward: data['7day'].reward, total: data['7day'].total },
    '30d': { base: data['30day'].base, reward: data['30day'].reward, total: data['30day'].total },
  };
}

function mapAssetSummary(asset: VaultListItem['asset']): VaultAssetSummary {
  return {
    address: asset.address,
    symbol: asset.symbol,
    name: asset.name,
    decimals: asset.decimals,
    priceUsd: asset.assetPriceInUsd ? Number(asset.assetPriceInUsd) : null,
    logoUrl: asset.assetLogo ?? null,
  };
}

function mapLpToken(lpToken: VaultListItem['lpToken']): VaultAssetSummary | undefined {
  if (!lpToken) {
    return undefined;
  }

  return {
    address: lpToken.address,
    symbol: lpToken.symbol,
    name: lpToken.name,
    decimals: lpToken.decimals,
    priceUsd: null,
    logoUrl: null,
  };
}

function mapRewards(rewards: VaultListItem['rewards']): VaultRewardSummary[] {
  if (!rewards) {
    return [];
  }

  return rewards.map((reward) => ({
    asset: mapAssetSummary(reward.asset),
    apy: {
      '1d': { base: 0, reward: reward.apy['1day'], total: reward.apy['1day'] },
      '7d': { base: 0, reward: reward.apy['7day'], total: reward.apy['7day'] },
      '30d': { base: 0, reward: reward.apy['30day'], total: reward.apy['30day'] },
    },
  }));
}

function mapHolders(holders?: VaultListItem['holdersData']) {
  if (!holders) {
    return undefined;
  }

  return {
    totalCount: holders.totalCount,
    totalBalance: holders.totalBalance ? Number(holders.totalBalance) : undefined,
    topHolders: holders.topHolders?.map((holder) => ({
      address: holder.address,
      lpTokenBalance: Number(holder.lpTokenBalance),
    })),
  };
}

function toSummary(definition: VaultDefinition, item: VaultListItem): VaultSummary {
  return {
    key: definition.key,
    definition,
    address: item.address,
    network: item.network.name,
    name: item.name,
    protocol: item.protocol.name,
    asset: mapAssetSummary(item.asset),
    apy: mapApyInterval(item.apy),
    tvlUsd: Number(item.tvl.usd),
    tvlNative: Number(item.tvl.native),
    rewards: mapRewards(item.rewards),
    holders: mapHolders(item.holdersData),
    lpToken: mapLpToken(item.lpToken),
    fetchedAt: Date.now(),
    raw: item,
  };
}

async function loadVaultList(network: VaultNetworkName, options?: { refresh?: boolean }): Promise<VaultsListResponse> {
  const sdk = getVaultsSdk();
  return withCache(
    `vaults:list:${network}`,
    () =>
      sdk.getAllVaults({
        query: {
          allowedNetworks: [network],
          perPage: 250,
        },
      }),
    DEFAULT_SUMMARY_TTL,
    options,
  );
}

function findVaultByDefinition(
  definition: VaultDefinition,
  data: VaultListItem[],
): VaultListItem {
  const match = data.find(
    (item) => item.name.toLowerCase() === definition.name.toLowerCase(),
  );

  if (!match) {
    throw new Error(`Vault "${definition.name}" not found in Vaults.fyi response`);
  }

  return match;
}

export async function getTrackedVaultSummaries(options?: { refresh?: boolean }): Promise<VaultSummary[]> {
  const { data } = await loadVaultList(BASE_NETWORK_NAME as VaultNetworkName, options);
  return TRACKED_VAULTS.map((definition) => toSummary(definition, findVaultByDefinition(definition, data)));
}

export async function getVaultSummaryByKey(
  key: VaultKey,
  options?: { refresh?: boolean },
): Promise<VaultSummary> {
  const definition = TRACKED_VAULTS.find((vault) => vault.key === key);
  if (!definition) {
    throw new Error(`Unknown vault key "${key}"`);
  }

  const { data } = await loadVaultList(definition.network as VaultNetworkName, options);
  return toSummary(definition, findVaultByDefinition(definition, data));
}

export async function getVaultDetail(
  network: VaultDetailResponse['network']['name'],
  address: string,
  options?: { refresh?: boolean },
): Promise<VaultDetailResponse> {
  const sdk = getVaultsSdk();
  return withCache(
    `vaults:detail:${network}:${address}`,
    () => sdk.getVault({ path: { network, vaultAddress: address } }),
    DEFAULT_SUMMARY_TTL,
    options,
  );
}

export interface VaultHistoryOptions {
  apyInterval?: '1day' | '7day' | '30day';
  granularity?: '1hour' | '1day' | '1week';
  fromTimestamp?: number;
  toTimestamp?: number;
  page?: number;
  perPage?: number;
  refresh?: boolean;
}

function mapHistoryPoints(response: VaultHistoryResponse): VaultHistoricalPoint[] {
  return response.data.map((point) => ({
    timestamp: point.timestamp * 1000,
    blockNumber: point.blockNumber,
    apy: {
      base: point.apy.base,
      reward: point.apy.reward,
      total: point.apy.total,
    },
    tvlUsd: Number(point.tvl.usd),
    tvlNative: Number(point.tvl.native),
    sharePrice: point.sharePrice,
  }));
}

export async function getVaultHistory(
  key: VaultKey,
  options: VaultHistoryOptions = {},
): Promise<VaultHistory> {
  const summary = await getVaultSummaryByKey(key, options.refresh ? { refresh: true } : undefined);
  const sdk = getVaultsSdk();

  const history = await withCache(
    `vaults:history:${summary.network}:${summary.address}:${options.apyInterval ?? '1day'}:${options.granularity ?? '1day'}:${options.page ?? 0}:${options.perPage ?? 200}`,
    () =>
      sdk.getVaultHistoricalData({
        path: {
          network: summary.network as VaultNetworkName,
          vaultAddress: summary.address,
        },
        query: {
          apyInterval: options.apyInterval,
          granularity: options.granularity,
          fromTimestamp: options.fromTimestamp,
          toTimestamp: options.toTimestamp,
          page: options.page,
          perPage: options.perPage,
        },
      }),
    DEFAULT_HISTORY_TTL,
    options,
  );

  return {
    key,
    address: summary.address,
    network: summary.network,
    points: mapHistoryPoints(history),
    nextPage: history.nextPage,
    fetchedAt: Date.now(),
  };
}

export async function refreshTrackedVaultCaches(): Promise<void> {
  await Promise.all(TRACKED_VAULTS.map((vault) => getVaultSummaryByKey(vault.key, { refresh: true })));
}

export type {
  VaultDefinition,
  VaultKey,
  VaultListItem,
  VaultDetailResponse,
  VaultHistoryResponse,
};

export default getTrackedVaultSummaries;
