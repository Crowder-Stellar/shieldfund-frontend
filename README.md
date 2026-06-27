# ShieldFund Frontend

ZK-gated treasury dashboard for the Stellar / Soroban ecosystem. Manage multi-sig vaults, launch fundraising campaigns, stream payments to contributors, and submit zero-knowledge proofs — all from a single React interface connected to your Freighter wallet.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts + D3 |
| Animations | Motion (Framer) |
| Wallet | Stellar Freighter API |
| Stellar SDK | `@stellar/stellar-sdk` v16 |
| Tests | Vitest + Testing Library |
| Language | TypeScript 5.8 |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | bundled with Node |
| Freighter wallet | latest | [freighter.app](https://www.freighter.app) — Chrome / Firefox extension |

> **Freighter is required** to sign Soroban transactions. Install it and create or import a Stellar account before running the app.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Crowder-Stellar/shieldfund-frontend.git
cd shieldfund-frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in contract IDs (see Environment Variables below)

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_STELLAR_NETWORK` | Yes | `TESTNET` or `MAINNET` |
| `VITE_TREASURY_VAULT_CONTRACT_ID` | Yes | From shieldfund-contracts deploy |
| `VITE_STREAMING_CONTRACT_ID` | Yes | From shieldfund-contracts deploy |
| `VITE_PROOF_REGISTRY_CONTRACT_ID` | Yes | From shieldfund-contracts deploy |

Contract IDs are printed at the end of the [shieldfund-contracts](https://github.com/Crowder-Stellar/shieldfund-contracts) deploy script. The constants live in `src/lib/contracts.ts` — the only file you need to update after a deploy.

---

## Available Scripts

```bash
npm run dev           # Dev server → http://localhost:3000
npm run build         # Production build → dist/
npm run preview       # Preview the production build locally
npm run lint          # TypeScript type-check (no emit)
npm run test          # Run test suite once (CI mode)
npm run test:watch    # Watch mode for TDD
npm run test:ui       # Vitest browser UI
npm run clean         # Remove dist/
```

---

## Project Structure

```
shieldfund-frontend/
├── index.html                        # Vite HTML entry
├── vite.config.ts                    # Vite + Tailwind plugin config
├── tsconfig.json                     # TypeScript config
├── .env.example                      # Environment variable template
│
└── src/
    ├── main.tsx                      # React root — mounts <App />
    ├── App.tsx                       # Root component — tab routing & global state
    ├── types.ts                      # Shared TypeScript interfaces
    ├── initialData.ts                # Mock data for local dev (no live contracts needed)
    ├── index.css                     # Global styles + Tailwind directives
    │
    ├── components/                   # One file per UI section or modal
    │   ├── Header.tsx                # Top bar — logo, active tab, wallet button
    │   ├── Sidebar.tsx               # Left nav — tab switcher
    │   ├── TreasuryTab.tsx           # Vault balance, deposit / disburse controls
    │   ├── CampaignsTab.tsx          # Fundraising campaign list and detail view
    │   ├── StreamsTab.tsx            # Real-time payment stream list + live counter
    │   ├── ProofsTab.tsx             # ZK proof submission, status, and audit trail
    │   ├── AuditLogTab.tsx           # On-chain transaction history
    │   ├── WalletModal.tsx           # Freighter connect / account view
    │   ├── DepositModal.tsx          # Deposit USDC into the vault
    │   ├── DisburseModal.tsx         # Disburse from vault (admin + ZK-gated)
    │   ├── LaunchCampaignModal.tsx   # Create a new fundraising campaign
    │   ├── CreateStreamModal.tsx     # Create a new payment stream
    │   ├── ManualVerificationModal.tsx  # Override / manual proof verification
    │   ├── NotificationsPanel.tsx    # Real-time event notifications
    │   └── EmptyState.tsx            # Reusable empty-list placeholder
    │
    ├── lib/
    │   ├── contracts.ts              # ← Edit after deploy: contract IDs + network config
    │   └── stellar.ts                # Soroban invocation helpers (deposit, disburse, etc.)
    │
    ├── assets/
    │   └── images/                   # Static images (logo, etc.)
    │
    └── test/
        ├── setup.ts                  # Vitest global setup (DOM, mocks)
        ├── App.test.tsx              # Smoke-test: app renders without crashing
        ├── contracts.config.test.ts  # Validates contract ID format / network config
        └── stellar.helpers.test.ts   # Unit tests for Stellar SDK helper functions
```

---

## Connecting to Live Contracts

1. Deploy from [shieldfund-contracts](https://github.com/Crowder-Stellar/shieldfund-contracts) — the deploy script prints contract IDs.
2. Open `src/lib/contracts.ts` and fill in `CONTRACT_IDS.TESTNET`:

```ts
export const CONTRACT_IDS: Record<Network, ContractSet> = {
  TESTNET: {
    TREASURY_VAULT:  'C...',   // paste from deploy output
    STREAMING:       'C...',
    PROOF_REGISTRY:  'C...',
    USDC_SAC:        'CBIELTK6YBZJU5UP2WWQEQZMYJMZROFZKYPVCCNWY5TU4BOQ3EOWXPD',
  },
  // ...
};
```

3. Set `ACTIVE_NETWORK = 'TESTNET'` (already the default).
4. Restart the dev server — the app now reads live contract state.

---

## Wallet Flow

1. Click **Connect Wallet** in the header
2. Freighter prompts you to approve the connection
3. The app reads your public key and fetches your on-chain USDC balance
4. Every transaction (deposit, disburse, stream claim, proof submit) is signed inside Freighter — the app **never** handles your secret key

---

## Running Tests

```bash
npm run test
```

Tests use Vitest + Testing Library. They mock Freighter and the Stellar SDK so no live network is required. The test suite covers:

- App renders without crashing
- Contract config contains valid Stellar contract ID format
- `stellarToDisplay` / `displayToStroops` conversion helpers
- Network switching (TESTNET ↔ MAINNET)

---

## Building for Production

```bash
npm run build
# Output: dist/index.html + dist/assets/
```

The output is a static site — deploy to any CDN (Vercel, Netlify, Cloudflare Pages, etc.) with no server required.

---

## Related Repos

- [shieldfund-contracts](https://github.com/Crowder-Stellar/shieldfund-contracts) — Soroban smart contracts (deploy these first)
- [shieldfund-backend](https://github.com/Crowder-Stellar/shieldfund-backend) — Express.js API for off-chain indexing and proof pre-verification
