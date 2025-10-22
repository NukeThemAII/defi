# AGENTS.md — DeFi Yield Dashboard Agent (Next.js 15.x)

## 🧠 Agent Purpose

Build and maintain a **DeFi Yield Dashboard** that monitors live APY, TVL, and wallet performance for:

* **Gauntlet USD Alpha (Base)**
* **Superlend USDC SuperFund (Base)**

The app fetches data from **Vaults.fyi** (official SDK/API), reads on‑chain balances via **Base** RPC, and visualizes blended APY, daily/weekly/monthly USDC earnings, and vault metrics. It supports **WalletConnect (RainbowKit)** for read‑only wallet connection and snapshot history.

> **Version policy:** Use the **latest stable releases** only. For the web app scaffold, run `npx create-next-app@latest` (currently Next.js **15.x**). If a newer **stable** major is released, prefer that. Do **not** use beta/rc unless explicitly requested.

---

## 🎯 Agent Objectives

1. Integrate **Vaults.fyi API/SDK** to pull live vault data (APY 1d/7d/30d, TVL, allocations, historical series).
2. Read on‑chain balances (ERC‑20 & ERC‑4626) for wallet: `0x765B9b4D853427123e6eb1Af73Cb6c22D4dcfFd7`.
3. Compute blended APY and USDC earnings projections (daily/monthly/yearly) with optional weekly compounding.
4. Present data via a **Next.js (TypeScript)** web dashboard using **Tailwind + shadcn/ui + Recharts**.
5. Provide **WalletConnect** integration (RainbowKit) for optional real‑time wallet read.
6. Store historical snapshots via Prisma ORM (SQLite by default; Postgres ready).
7. Deploy on **AlmaLinux VPS** with **Node 20+**, **PM2**, **Nginx**, **certbot**.
8. Keep a persistent **WORK_LOG.md** documenting progress, design decisions, tasks, and bugs for continuity across sessions.

---

## 🧩 Core Features

* **Vaults API Integration**

  * Endpoints: `GET /v1/detailed/vaults`, `GET /v1/vaults/{network}/{address}`
  * SDK: `@vaultsfyi/sdk` (typed client)
  * Fields: APY (1d/7d/30d), TVL, allocations, historical data

* **On‑Chain Balance Tracking (Base)**

  * Provider: **Alchemy** (recommended) or direct RPC `https://mainnet.base.org`
  * Queries: ERC‑20 `balanceOf`, `decimals`; ERC‑4626 `convertToAssets`, `asset`
  * Optional BaseScan/Etherscan‑style API for transfers & events

* **UI Components**

  * Dashboard cards per vault (APY, TVL, earnings)
  * Blended APY summary
  * Charts: APY over time, TVL over time, Daily earnings
  * Snapshot history table (export CSV)
  * Settings: Alert thresholds (APY Δ≥0.5%, TVL drop ≥5%)

* **Wallet Integration**

  * RainbowKit + wagmi + WalletConnect
  * Read‑only; no private key access

* **Backend**

  * Next.js API routes (App Router) with edge‑safe handlers where possible
  * Prisma + SQLite (default)
  * Periodic refresh jobs (cron or PM2 schedule)

---

## ⚙️ Technical Stack (latest stable)

* **Frontend:** Next.js **15.x** (App Router) + TypeScript
* **UI:** Tailwind CSS + shadcn/ui + Lucide icons
* **Charts:** Recharts
* **State/Data:** React Query (TanStack Query) where helpful
* **Backend:** Next.js API routes, Node 20+
* **ORM/DB:** Prisma ORM with SQLite (default) / Postgres (optional)
* **Web3:** ethers v6, wagmi v2, RainbowKit (latest)
* **Providers:** Alchemy (Base) + fallback to public Base RPC
* **Third‑party:** `@vaultsfyi/sdk` for Vaults.fyi
* **Deploy:** AlmaLinux, PM2, Nginx, certbot

> **Templates:** You may start from a Vercel Next.js template if it does not conflict with requirements ([https://vercel.com/templates/next.js](https://vercel.com/templates/next.js)). If a template is used, document which and why in `WORK_LOG.md` and adapt to our stack.

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

| Route                            | Method | Description                                         |
| :------------------------------- | :----- | :-------------------------------------------------- |
| `/api/vaults`                    | GET    | Fetch vaults from Vaults.fyi (Gauntlet + Superlend) |
| `/api/vault/[network]/[address]` | GET    | Detailed vault info + historical series             |
| `/api/wallet/[address]`          | GET    | On‑chain wallet balances & vault share value        |
| `/api/snapshots`                 | GET/POST | List snapshots or add manual snapshot (zod‑validated) |
| `/api/summary`                   | GET    | Blended APY & earnings projections                  |
| `/api/alerts`                    | GET    | Threshold alerts (computed server‑side)             |

---

## 🧮 Calculations

* **Daily earnings** = `balanceUsd * (apy1d / 100) / 365`
* **Blended APY** = `Σ(weight_i * apy1d_i)` where `weight_i = balance_i / total_balance`
* **Projections**: daily/30d/90d/365d; **weekly compounding toggle** (compound every 7 days)

---

## 🧪 Tests

* Unit tests (Vitest) for math: blended APY, daily earnings, projections
* Smoke tests for `/api/vaults` & `/api/summary`

---

## 🧰 .env.example

```
# third‑party
VAULTSFYI_API_KEY=
ALCHEMY_API_KEY=
# database
DATABASE_URL=file:./dev.db
# alerts
THRESHOLD_APY_DELTA=0.5
THRESHOLD_TVL_DROP=5
# ui
TZ_DISPLAY=Asia/Bangkok
DEFAULT_WALLET=0x765B9b4D853427123e6eb1Af73Cb6c22D4dcfFd7
```

---

## 🚀 Deployment (AlmaLinux, latest stable)

1. Install Node.js 20+, pnpm, PM2, Nginx, certbot.
2. `npx create-next-app@latest` → incorporate code, libs, and pages per this spec.
3. `pnpm i` → `pnpm prisma migrate deploy` → `pnpm build`.
4. Run with PM2: `pm2 start pnpm --name defi-tracker -- start`.
5. Nginx reverse proxy to port 3000; enable HTTPS with certbot.
6. Add PM2 cron (or `node-cron`) for hourly refresh tasks.

---

## ✅ Acceptance Criteria

* Displays **live APY/TVL** from Vaults.fyi for Gauntlet & Superlend
* Reads wallet balances (Base) & computes **blended APY**
* Hourly refresh with **alert evaluation** (APY Δ≥0.5%, TVL drop ≥5%)
* Manual snapshots + CSV export; charts over time
* Deployed on AlmaLinux; no private keys stored; client never sees server API keys
* `WORK_LOG.md` maintained each session (done/next/bugs/decisions)

---

## 🔐 Security

* Read‑only wallet access; never request seed phrases or private keys
* Keep secrets server‑side; never expose in client bundle
* Implement request throttling and caching on API calls

---

## 🗂 Milestones (up‑to‑date)

**M1 — Scaffold (Next 15.x)**

* Create app via `npx create-next-app@latest` (TS, App Router)
* Add Tailwind, shadcn/ui, Recharts, Prisma
* Add `AGENTS.md`, `README.md`, `WORK_LOG.md`, `.env.example`

**M2 — Data Layer**

* `src/lib/vaults.ts`: wrap `@vaultsfyi/sdk` with caching
* `src/lib/onchain.ts`: ethers v6 + Alchemy provider; Base RPC fallback

**M3 — Prisma & API**

* Prisma models exactly as above; migrations
* API: `/api/vaults`, `/api/vault/[network]/[address]`, `/api/wallet/[address]`, `/api/snapshots`, `/api/summary`, `/api/alerts`

**M4 — UI**

* Pages: `/`, `/charts`, `/snapshots`, `/settings`
* Components: `VaultCard`, `SummaryCard`, `ChartPanel`, `SnapshotForm`
* WalletConnect via RainbowKit (read‑only)

**M5 — Jobs & Alerts**

* Hourly refresh (PM2 cron or node‑cron)
* Alert evaluation & exposure via `/api/alerts`

**M6 — Deploy**

* `docs/DEPLOY_ALMALINUX.md` with PM2, Nginx, certbot

---

# README.md — DeFi Yield Dashboard (Next.js 15.x)

A production‑ready dashboard tracking **Gauntlet USD Alpha** and **Superlend USDC SuperFund** (Base). It pulls live APY/TVL from **Vaults.fyi**, reads on‑chain balances, computes **blended APY** and **earnings projections**, and supports **WalletConnect**.

## ✨ Features

* Live **APY (1d/7d/30d)** & **TVL** via Vaults.fyi SDK/API
* On‑chain wallet tracking (Base) — ERC‑20 & ERC‑4626 read‑only
* Blended APY & earnings/day/month/year with optional weekly compounding
* Snapshot history + CSV export; Charts for APY/TVL/earnings
* Alerts: APY Δ≥0.5% or TVL drop ≥5%
* Deployable on AlmaLinux with PM2 + Nginx + SSL

## 🧰 Stack (latest stable)

* Next.js **15.x** (TypeScript, App Router)
* Tailwind + shadcn/ui + Lucide + Recharts
* Prisma ORM (SQLite default / Postgres optional)
* ethers v6 + wagmi v2 + RainbowKit (WalletConnect)
* `@vaultsfyi/sdk` + Alchemy (Base)

## 🚀 Quickstart

```bash
# 1) scaffold (latest stable)
npx create-next-app@latest defi-yield-dashboard
cd defi-yield-dashboard

# 2) install deps
pnpm add @vaultsfyi/sdk ethers @tanstack/react-query recharts \
  @prisma/client prisma tailwindcss postcss autoprefixer \
  class-variance-authority clsx lucide-react \
  wagmi @rainbow-me/rainbowkit viem

# 3) init prisma
echo 'DATABASE_URL="file:./dev.db"' >> .env
pnpm prisma init --datasource-provider sqlite

# 4) apply schema (paste Prisma models, then)
pnpm prisma migrate dev --name init

# 5) dev
pnpm dev
# optional sanity checks
pnpm lint
```

## 🔧 Configuration

* Copy `.env.example` → `.env` and set:

  * `VAULTSFYI_API_KEY`, `ALCHEMY_API_KEY`, `DATABASE_URL`
  * Optionally override `BASE_RPC_URL` (defaults to `https://mainnet.base.org`)
  * `THRESHOLD_APY_DELTA`, `THRESHOLD_TVL_DROP`, `TZ_DISPLAY`
  * `DEFAULT_WALLET=0x765B9b4D853427123e6eb1Af73Cb6c22D4dcfFd7`

## 📡 Data Sources

* Vaults.fyi API/SDK (vault metrics & history)
* Base RPC / Alchemy for on‑chain reads (ERC‑20, ERC‑4626)

## 📈 Pages

* `/` Dashboard — blended APY, per‑vault cards, earnings/day
* `/charts` — APY/TVL/earnings charts (1d/7d/30d ranges)
* `/snapshots` — history table + CSV export/import
* `/settings` — alert thresholds, timezone

## 🔔 Alerts

* Server job (hourly) pulls latest data and computes deltas.
* If APY change ≥ 0.5% or TVL drop ≥ 5%, expose an alert in `/api/alerts` and surface a badge in UI.

## 🔒 Security

* Read‑only wallet interactions. **Never** request seeds/keys.
* Keep API keys server‑side; do not leak to client bundle.

## 📦 Deploy (AlmaLinux)

* Build: `pnpm build`
* Run: `pm2 start pnpm --name defi-tracker -- start`
* Nginx reverse proxy to port 3000; HTTPS via certbot
* Optional hourly refresh with PM2 cron or node‑cron

## 🧪 Testing

* Vitest unit tests for calculations; smoke tests for `/api/vaults` & `/api/summary`
* Commands: `pnpm test`, `pnpm lint`

## 📝 Work Log

Maintain `WORK_LOG.md` each session:

* Done / Next / Bugs / Decisions / Open Questions

## 📎 Templates (optional)

You may start from a Vercel Next.js template ([https://vercel.com/templates/next.js](https://vercel.com/templates/next.js)) that matches this stack. If you do, record the choice and modifications in `WORK_LOG.md`.

## License

MIT
