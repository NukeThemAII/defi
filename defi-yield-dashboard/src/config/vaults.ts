export type VaultKey = 'gauntlet-usd-alpha' | 'superlend-usdc-superfund';

export interface VaultDefinition {
  key: VaultKey;
  /** Human-friendly vault name used by Vaults.fyi */
  name: string;
  /** Owning protocol or curator */
  protocol: string;
  /** Network identifier accepted by Vaults.fyi and ethers */
  network: 'base';
  /** Optional slug used for routing (defaults to key) */
  slug?: string;
}

export const TRACKED_VAULTS: VaultDefinition[] = [
  {
    key: 'gauntlet-usd-alpha',
    name: 'Gauntlet USD Alpha',
    protocol: 'Gauntlet',
    network: 'base',
  },
  {
    key: 'superlend-usdc-superfund',
    name: 'Superlend USDC SuperFund',
    protocol: 'Superlend',
    network: 'base',
  },
];

export const BASE_CHAIN_ID = 8453;
export const BASE_NETWORK_NAME = 'base';

