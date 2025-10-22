import {
  Contract,
  FallbackProvider,
  JsonRpcProvider,
  Provider,
  formatUnits,
  getAddress,
} from 'ethers';

import { BASE_CHAIN_ID } from '@config/vaults';

const DEFAULT_BASE_RPC_URL = 'https://mainnet.base.org';
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
] as const;

const ERC4626_ABI = [
  ...ERC20_ABI,
  'function asset() view returns (address)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
] as const;

export interface TokenMetadata {
  address: string;
  decimals: number;
  symbol?: string;
  name?: string;
}

export interface TokenAmount {
  raw: bigint;
  decimals: number;
  formatted: string;
  value: number;
}

export interface TokenBalance {
  token: TokenMetadata;
  wallet: string;
  amount: TokenAmount;
}

export interface VaultPosition {
  vaultAddress: string;
  wallet: string;
  share: {
    token: TokenMetadata;
    amount: TokenAmount;
  };
  underlying: TokenBalance;
}

declare global {
  // eslint-disable-next-line no-var
  var __baseProvider: Provider | undefined;
  // eslint-disable-next-line no-var
  var __tokenMetadataCache: Map<string, Promise<TokenMetadata>> | undefined;
  // eslint-disable-next-line no-var
  var __vaultAssetCache: Map<string, Promise<string>> | undefined;
}

const metadataCache: Map<string, Promise<TokenMetadata>> =
  globalThis.__tokenMetadataCache ?? new Map();
const assetCache: Map<string, Promise<string>> =
  globalThis.__vaultAssetCache ?? new Map();

if (!globalThis.__tokenMetadataCache) {
  globalThis.__tokenMetadataCache = metadataCache;
}
if (!globalThis.__vaultAssetCache) {
  globalThis.__vaultAssetCache = assetCache;
}

function createBaseProvider(): Provider {
  const providerConfigs = [];
  const alchemyKey = process.env.ALCHEMY_API_KEY;

  if (alchemyKey) {
    const alchemyRpcUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    providerConfigs.push(
      new JsonRpcProvider(alchemyRpcUrl, {
        chainId: BASE_CHAIN_ID,
        name: 'base',
      }),
    );
  }

  providerConfigs.push(
    new JsonRpcProvider(process.env.BASE_RPC_URL ?? DEFAULT_BASE_RPC_URL, {
      chainId: BASE_CHAIN_ID,
      name: 'base',
    }),
  );

  if (providerConfigs.length === 1) {
    return providerConfigs[0];
  }

  return new FallbackProvider(providerConfigs);
}

export function getBaseProvider(): Provider {
  if (!globalThis.__baseProvider) {
    globalThis.__baseProvider = createBaseProvider();
  }

  return globalThis.__baseProvider;
}

export function normalizeAddress(address: string): string {
  return getAddress(address);
}

function toTokenAmount(raw: bigint, decimals: number): TokenAmount {
  const formatted = formatUnits(raw, decimals);
  const value = Number(formatted);

  return {
    raw,
    decimals,
    formatted,
    value: Number.isNaN(value) ? 0 : value,
  };
}

export async function getTokenMetadata(tokenAddress: string): Promise<TokenMetadata> {
  const checksum = normalizeAddress(tokenAddress);
  const cached = metadataCache.get(checksum);
  if (cached) {
    return cached;
  }

  const provider = getBaseProvider();
  const contract = new Contract(checksum, ERC20_ABI, provider);

  const promise = Promise.all([
    contract.decimals().catch(() => 18),
    contract.symbol().catch(() => undefined),
    contract.name().catch(() => undefined),
  ]).then(([decimals, symbol, name]) => ({
    address: checksum,
    decimals: Number(decimals),
    symbol,
    name,
  }));

  metadataCache.set(checksum, promise);
  return promise;
}

export async function getErc20Balance(
  walletAddress: string,
  tokenAddress: string,
): Promise<TokenBalance> {
  const [wallet, token] = [walletAddress, tokenAddress].map(normalizeAddress);
  const provider = getBaseProvider();
  const contract = new Contract(token, ERC20_ABI, provider);

  const [rawBalance, metadata] = await Promise.all([
    contract.balanceOf(wallet) as Promise<bigint>,
    getTokenMetadata(token),
  ]);

  return {
    token: metadata,
    wallet,
    amount: toTokenAmount(rawBalance, metadata.decimals),
  };
}

async function getVaultAssetAddress(vaultAddress: string): Promise<string> {
  const checksum = normalizeAddress(vaultAddress);
  const cached = assetCache.get(checksum);
  if (cached) {
    return cached;
  }

  const provider = getBaseProvider();
  const contract = new Contract(checksum, ERC4626_ABI, provider);

  const promise = contract
    .asset()
    .then((address: string) => normalizeAddress(address));

  assetCache.set(checksum, promise);
  return promise;
}

export async function getVaultPosition(
  walletAddress: string,
  vaultAddress: string,
): Promise<VaultPosition> {
  const wallet = normalizeAddress(walletAddress);
  const vault = normalizeAddress(vaultAddress);
  const provider = getBaseProvider();
  const contract = new Contract(vault, ERC4626_ABI, provider);

  const [shareMetadata, rawShares, assetAddress] = await Promise.all([
    getTokenMetadata(vault),
    contract.balanceOf(wallet) as Promise<bigint>,
    getVaultAssetAddress(vault),
  ]);

  const [assetMetadata, rawAssets] = await Promise.all([
    getTokenMetadata(assetAddress),
    rawShares === 0n
      ? Promise.resolve<bigint>(0n)
      : (contract.convertToAssets(rawShares) as Promise<bigint>),
  ]);

  return {
    vaultAddress: vault,
    wallet,
    share: {
      token: shareMetadata,
      amount: toTokenAmount(rawShares, shareMetadata.decimals),
    },
    underlying: {
      token: assetMetadata,
      wallet,
      amount: toTokenAmount(rawAssets, assetMetadata.decimals),
    },
  };
}

export function toUsdValue(amount: TokenAmount, priceUsd?: number | null): number {
  if (!priceUsd || Number.isNaN(priceUsd)) {
    return 0;
  }

  return amount.value * priceUsd;
}

