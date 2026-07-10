# Taskly: Celo Grant Readiness Checklist

> Last updated: July 2026

---

## 📱 1. MiniPay Technical & UX Compliance

- [x] **Zero-Click Auto-Connect** — Wallet connects automatically when opened inside MiniPay browser. ✅ Verified
- [x] **Stablecoin Native Flow** — App uses `USDm` (+ Naira display) as core unit of account.
- [x] **Mobile-Responsive UI** — Fully optimized for low-end mobile devices.
- [ ] **No `personal_sign` Calls** — Verify no arbitrary message-signing popups are triggered for auth flows. _(Low risk — app uses wallet address directly, but worth auditing)_
- [ ] **Fee Abstraction (Gasless)** — Transactions pay gas in stablecoins or are sponsored. _(Nice-to-have for grant bonus points, not blocking)_

---

## ⛓️ 2. Smart Contract & Web3 Integration

- [x] **Deployed on Celo Mainnet** — Escrow contract live at `0x89ebD3C199456E1C25A42B5D393C6249b1233713`. ✅ Verified
- [x] **On-Chain Escrow Security** — `refundCampaign`, `releasePayout` execute trustlessly via smart contract.
- [x] **On-Chain Event Tracking** — Key state transitions emit on-chain events for indexing.

---

## 📈 3. Growth & Ecosystem Alignment

- [x] **Gamification System** — XP, Level-Up, Streaks, and Achievement Badges drive retention.
- [x] **Referral System & Leaderboard** — Viral invite-and-earn mechanism boosts Celo active wallet count.
- [x] **RWA & Financial Inclusion** — Micro-labor payouts to underbanked users in emerging markets (core Celo mission).
- [x] **Contest System** — Active referral contest with prize pool and live leaderboard.

---

## 🛠️ 4. Production Readiness

- [x] **No Placeholder Assets** — Real assets and fully functional UI flows implemented.
- [x] **Verified Mainnet Deployment** — Contract deployed and live on Celo Mainnet.
- [x] **Sentry Error Tracking** — `@sentry/nextjs` installed and configured with:
  - `sentry.client.config.ts` — client-side error + session replay capture
  - `sentry.server.config.ts` — server-side error capture
  - `sentry.edge.config.ts` — edge runtime error capture
  - `global-error.tsx` — automatic crash reporting boundary
  - `next.config.js` — wrapped with `withSentryConfig` for source maps

> ⚠️ **Action Required:** Create a free account at [sentry.io](https://sentry.io), create a project called `taskly`, and paste the DSN into `NEXT_PUBLIC_SENTRY_DSN` in your `.env` file to activate live error tracking.

---

## ✅ Summary

| Category | Status |
|---|---|
| MiniPay Compliance | 3/5 core items ✅ |
| Smart Contract | 3/3 ✅ |
| Growth & Ecosystem | 4/4 ✅ |
| Production Readiness | 3/3 ✅ |

**You are ready to apply for Prezenti, Celo Builder Fund, and GoodBuilders grants.** The only remaining optional items are fee abstraction (gasless transactions) and a formal `personal_sign` audit — neither are blockers for grant applications.
