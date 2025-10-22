# AGENTS.md — DeFi Yield Dashboard Agent

## 🧠 Agent Purpose

This agent builds and maintains a **DeFi Yield Dashboard** that monitors live APY, TVL, and wallet performance for:

* **Gauntlet USD Alpha (Base)**
* **Superlend USDC SuperFund (Base)**

It fetches data from **Vaults.fyi** (official SDK + API), tracks on-chain balances via **Base network RPC**, and visualizes blended APY, daily/weekly/monthly USDC earnings, and vault metrics. It supports **WalletConnect (RainbowKit)** for read-only wallet connection and snapshot history.

---

## 🎯 Agent Objectives

1. Integrate **Vaults.fyi API/SDK** to pull live vault data (APY 1d/7d/30d, TVL, allocations, historical series).
2. Read on-chain balances (ERC20 & ERC4626) for wallet: `0x765B9b4D853427123e6eb1Af73Cb6c22D4dcfFd7`.
3. Compute blended APY and USDC earnings projections (daily/monthly/yearly).
4. Present data via a **Next.js (TypeScript)** web dashboard using **Tailwind + shadcn/ui + Recharts**.
5. Provide **WalletConnect** integration (RainbowKit) for optional real-time wallet read.
6. Store historical snapshots via Prisma ORM (SQLite or Postgres).
7. Deploy on **AlmaLinux VPS** with **Node 20+, PM2, Nginx, SSL (certbot)**.

---

## 🧩 Core Features

* **Vaults API Integration**

  * Endpoint: `GET /v1/detailed/vaults`, `GET /v1/vaults/{network}/{address}`
  * SDK: `@vaultsfyi/sdk` (typed client)
  * Fields: APY (1d/7d/30d), TVL, allocations, historical data.

* **On-Chain Balance Tracking (Base)**

  * Provider: Alchemy or direct RPC `https://mainnet.base.org`
  * Queries: ERC20 `balanceOf`, ERC4626 `convertToAssets`
  * Optional BaseScan API for transaction history.

* **UI Components**

  * Dashboard cards per vault (APY, TVL, earnings)
  * Blended APY summary
  * Charts: APY over time, TVL over time, Daily earnings
  * Snapshot history table (export CSV)
  * Settings: Alert thresholds (APY Δ≥0.5%, TVL drop ≥5%)

* **Wallet Integration**

  * RainbowKit + wagmi + WalletConnect
  * Read-only; no private key access

* **Backend**

  * Next.js API routes or Express server
  * Prisma + SQLite (default)
  * Periodic refresh jobs (cron or PM2 schedule)

---

## ⚙️ Technical Stack

* **Frontend:** Next.js 14 (TypeScript, App Router)
* **Backend:** Node 20, Prisma ORM
* **UI:** Tailwind CSS + shadcn/ui + Recharts
* **API:** @vaultsfyi/sdk + ethers.js
* **DB:** SQLite / Postgres (configurable)
* **Wallet:** wagmi + RainbowKit
* **Deploy:** AlmaLinux, PM2, Nginx

---

## 📊 Data Model (Prisma)

```prisma
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

model Platform {
  id        String   @id @default(cuid())
  key       String   @unique
  name      String
  vaultAddr String?
  network   String
  createdAt DateTime @default(now())
  snapshots Snapshot[]
}

model Snapshot {
  id             String   @id @default(cuid())
  platformId     String
  platform       Platform @relation(fields: [platformId], references: [id])
  takenAt        DateTime
  apy1d          Float?
  apy7d          Float?
  apy30d         Float?
  tvlUsd         Float?
  balanceUsd     Float?
  earningsToDate Float?
  createdAt      DateTime @default(now())
}
```

---

## 🔌 API Endpoints

| Route                          | Method | Description                              |
| :----------------------------- | :----- | :--------------------------------------- |
| `/api/vaults`                  | GET    | Fetch all vaults from Vaults.fyi         |
| `/api/vault/:network/:address` | GET    | Fetch detailed vault info                |
| `/api/wallet/:address`         | GET    | On-chain wallet balances                 |
| `/api/snapshots`               | POST   | Add manual snapshot                      |
| `/api/summary`                 | GET    | Return blended APY + earnings projection |

---

## 🧮 Example Code

```ts
import { VaultsClient } from '@vaultsfyi/sdk';
import { ethers } from 'ethers';

const vaults = new VaultsClient({ apiKey: process.env.VAULTSFYI_API_KEY });
const provider = new ethers.providers.AlchemyProvider('base', process.env.ALCHEMY_API_KEY);

// Example: Get vault data
const gauntlet = await vaults.getVault({ network: 'base', vaultAddress: '0x000000000001CdB57E58Fa75Fe420a0f4D6640D5' });

// Example: Get wallet balance
const erc20Abi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
const usdc = new ethers.Contract('0x...', erc20Abi, provider);
const bal = await usdc.balanceOf('0x765B9b4D853427123e6eb1Af73Cb6c22D4dcfFd7');
```

---

## 🚀 Deployment Steps (AlmaLinux)

1. Install Node.js 20, pnpm, PM2, Nginx, Certbot.
2. Clone repo → `pnpm i` → `pnpm build`.
3. Run migrations: `pnpm prisma migrate deploy`.
4. Start: `pm2 start pnpm --name defi-tracker -- start`.
5. Configure Nginx reverse proxy (port 3000 → HTTPS).
6. Set cron (or PM2 schedule) for hourly vault refresh.

---

## 🧰 .env.example

```
VAULTSFYI_API_KEY=your_api_key_here
ALCHEMY_API_KEY=your_alchemy_key_here
DATABASE_URL=file:./dev.db
THRESHOLD_APY_DELTA=0.5
THRESHOLD_TVL_DROP=5
TZ_DISPLAY=Asia/Bangkok
```

---

## ✅ Acceptance Criteria

* [ ] Displays live APY/TVL from Vaults.fyi for Gauntlet & Superlend.
* [ ] Tracks wallet balance & computes blended APY.
* [ ] Updates data hourly.
* [ ] Allows manual snapshot entry/export.
* [ ] Deploys successfully on AlmaLinux with PM2.
* [ ] Stores no private keys.

---

# README.md

## DeFi Yield Dashboard — Gauntlet & Superlend

This project tracks real-time DeFi yield performance for **Gauntlet USD Alpha** and **Superlend USDC SuperFund** on Base network. It aggregates data from **Vaults.fyi** and on-chain sources, calculating blended APY, projected USDC earnings, and vault risk exposure.

### ✨ Features

* Live APY & TVL via Vaults.fyi API/SDK
* Real-time wallet tracking (via WalletConnect or address)
* Blended APY calculator
* Snapshot history with CSV export
* Deployment-ready for AlmaLinux VPS

### ⚙️ Stack

* Next.js 14 + TypeScript + Tailwind + shadcn/ui
* Prisma ORM (SQLite/Postgres)
* Ethers.js + Vaults.fyi SDK
* RainbowKit + wagmi for WalletConnect

### 📦 Setup

```bash
git clone https://github.com/youruser/defi-yield-dashboard.git
cd defi-yield-dashboard
pnpm install
cp .env.example .env
# add your API keys
pnpm dev
```

### 🚀 Deployment

```bash
pnpm build
pm2 start pnpm --name defi-tracker -- start
sudo certbot --nginx -d your.domain.com
```

### 🧠 Data Sources

* [Vaults.fyi API](https://vaults.fyi)
* [Gauntlet USD Alpha Vault (Base)](https://app.vaults.fyi/opportunity/base/0x000000000001CdB57E58Fa75Fe420a0f4D6640D5)
* [Superlend USDC SuperFund](https://app.superlend.xyz)

### 🔒 Security

* Read-only wallet access (no private keys)
* Environment variables stored securely
* HTTPS enforced via Nginx + Certbot

### 👤 Maintainer

Agent maintains vault fetch tasks, snapshot integrity, and daily reports.

---

### 🪄 Example Usage

* **View dashboard:** `/` (shows blended APY & charts)
* **Add snapshot:** `/snapshots/new`
* **Connect wallet:** Click “Connect Wallet” → Rainbow → auto-fetch balances.

---

**License:** MIT

---

> ⚠️ This dashboard is for monitoring only. Never share private keys or seed phrases. All API and wallet data are read-only.
