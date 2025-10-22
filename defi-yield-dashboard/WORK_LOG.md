# WORK_LOG

## Session 2025-10-22 15:11
**Goal:** Initialize the Next.js scaffold and baseline tooling per project spec.
**Done:** Created Next.js app via create-next-app, copied project docs, added `.env.example`, installed core deps (Vaults SDK, wagmi, RainbowKit, React Query, Recharts, Prisma, Tailwind), switched to pnpm, pinned Next.js/React to 15.5.6/18.2.0 for compatibility, and applied Prisma schema with initial migration.
**Findings / Decisions:** Latest create-next-app defaults to Next 16/React 19, but wagmi peer deps prefer React 18; pinned framework packages to 15.5.6/18.2.0 and aligned TypeScript types. Continuing with pnpm for package management.
**Bugs / Blockers:** None.
**Next Steps:** Build Vaults and on-chain data libs, wire Prisma access patterns, and start implementing API routes `/api/vaults` and `/api/summary`.

## Session 2025-10-22 15:42
**Goal:** Implement data access layer for Vaults.fyi & Base on-chain reads, then expose `/api/vaults` and `/api/summary` endpoints.
**Done:** Added tracked-vault config, caching Vaults.fyi wrapper (`src/lib/vaults.ts`) with history helpers, built Base RPC helper library (`src/lib/onchain.ts`) with ERC-20/4626 balance + USD conversion, created projection math utilities, and shipped App Router handlers for `/api/vaults` (with optional history) and `/api/summary` (blended APY + wallet projections). Updated docs/env example for optional `BASE_RPC_URL`.
**Findings / Decisions:** Vault lookups key off vault names via detailed list to avoid hardcoding addresses; caching keeps repeated API hits down. Wallet summaries assume USD price from Vaults.fyi asset feed; added converter helper for easier reuse.
**Bugs / Blockers:** ESLint flat config still unhappy with plugin resolution—need to revisit config wiring after finishing core features.
**Next Steps:** Finish lint config cleanup, expand API surface (`/api/vault/[network]/[address]`, snapshots), and begin integrating Prisma persistence + background jobs.
