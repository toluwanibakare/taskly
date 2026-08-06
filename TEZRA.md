# TEZRA

**Microwork for Stablecoins.**

Tezra is a decentralized micro-task marketplace built on the Celo blockchain. It connects people who need small online jobs done (campaigns, social engagement, surveys, app testing) with people who want to earn real money for doing them — paid in USDm stablecoin, no crypto experience required.

> One-liner: **Do small tasks. Get paid in stablecoins.**

---

## 1. What is Tezra?

Tezra is a mobile-first, MiniPay-powered microwork platform where:

- **Earners** complete micro-tasks (follow, like, comment, share, survey, test apps) and earn **USDm** stablecoin rewards, secured in a smart-contract escrow.
- **Creators** launch paid campaigns with a few taps, fund them with crypto **or plain Naira via card/bank transfer**, and only pay for verified work.
- **Everyone wins** because payouts are protected by an on-chain escrow contract — no middleman to ghost you, no "payment pending forever."

The name Tezra pairs a "T" icon with a blue-to-green gradient (the blue of the internet/web3, the green of money and growth). It sounds friendly, global, and financial without being corporate.

## 2. The Problem & The Solution

### The problem
- Millions of people in emerging markets (especially Nigeria) are excluded from global digital earnings. They have phones, but no bank card, no US bank account, and no experience with crypto.
- On the flip side, creators, brands, and indie builders need real engagement — follows, reviews, shares, app tests, feedback — but can't reach the people who will do it.
- Existing microwork sites either don't support African users, pay peanuts into accounts people can't use, or hold earnings hostage.

### The solution
- **Stablecoin payouts on Celo:** Earnings are paid in **USDm (Mento Dollar)**, a dollar-pegged stablecoin, delivered straight to a self-custody wallet via **MiniPay** — works on any Android phone, zero crypto knowledge needed.
- **Naira fiat on-ramp:** Creators without crypto can fund campaigns with **NGN via Korapay** (cards/bank transfer); the platform auto-converts and funds the escrow on-chain.
- **On-chain escrow:** Every campaign's budget is locked in the **TasklyEscrow smart contract**. Workers are paid from the escrow, and creators get refunds for unfilled slots. Trust by default.
- **Fun by design:** XP, levels, badges, daily streaks and contests make earning feel like a game, not a gig.

## 3. How It Works

### For Earners (workers)
1. Open tezra.xyz on your phone (MiniPay or any wallet — you can even paste in a wallet address).
2. Browse tasks by category (Social Media, Surveys & Quizzes, Beta Lab, Writing & Content, Community & Groups).
3. Open a task, follow the steps (e.g. "follow @x on X"), submit proof (screenshot, link, or screen recording).
4. Reward is auto-approved (or manually verified within ~24h) and paid into your wallet balance.
5. Withdraw to your wallet at any time (min 1.00 USDm) — payouts process off-chain from the escrow within 24 hours to keep gas fees near zero.

### For campaign creators (advertisers)
1. Pick a platform and action (X, Instagram, YouTube, TikTok, surveys, app testing, GitHub, community groups, content — 11 platforms, ~60 pre-made actions with suggested prices).
2. Set slots and reward per slot; pay with **Web3 wallet (USDm)** or **Naira transfer (NGN)**.
3. Your budget goes into the smart-contract escrow. Review submissions, approve the good ones, reject the bad.
4. Unfilled slots are refundable after expiry — or reopen the campaign by re-depositing.

### Platform & admin
Tezra keeps things running with a fair **2% platform fee** taken on campaign creation. Admins handle disputes (uphold or overturn rejections), process withdrawals, moderate task ideas, broadcast announcements/promos, run contests, and manage the contract.

## 4. Core Product Features

- **Task marketplace** — 11 platforms, ~60 micro-actions (follow, like, comment, share, subscribe, survey, review, test, star a GitHub repo, join a community), each with instructions, proof requirements and suggested payouts.
- **Smart-contract escrow** — `TasklyEscrow.sol` on Celo Mainnet locks campaign funds; payouts and refunds execute on-chain. 2% platform fee.
- **Naira fiat in-ramp (Korapay)** — pay for campaigns with NGN cards/transfers; the platform auto-funds the USDm escrow (webhook-verified).
- **USDm-native** — rewards are paid in Mento Dollar (USDm); gas can be paid in USDm via Celo fee-currency, so users never need CELO.
- **Gamification** — XP & levels, 7 achievement badges with shareable canvas cards, daily streaks (Snapchat-style fire counter), level-up celebrations, and a "Verified Member" certificate.
- **Referral program** — private 6-character referral links; earn 0.02 USDm per referred earner's first task and 0.10 USDm per referred creator's first campaign.
- **Contests & quests** — live referral leaderboard contests, badge-collector sprints, and social quests with prize pools.
- **Task idea queue** — users can submit new task types/categories; approved ideas earn a 0.50 USDm credit.
- **PWA app** — installable, standalone, push notifications, pull-to-refresh, offline-friendly; built MiniPay-first.
- **Admin suite** — dashboard (users, tasks, payouts, fees, on-chain escrow stats), dispute resolution, withdrawal processing, promo builder (email + push + in-app), announcement templates, users directory.

## 5. Gamification & Rewards (quick reference)

| System | Rules |
|---|---|
| XP & Levels | Start at 500 XP (= Level 5). +10 XP per approved task, -10 XP per rejection. Level = XP / 100. |
| Lockout | 3 consecutive rejections or XP < 200 triggers a 24-hour task lockout; after expiry XP resets to 350. |
| Badges | 7 badges: Early Pioneer (50 XP), Genesis Creator (200 XP), Sold Out (150 XP), Task Machine (200 XP), Speed Run (100 XP), Pioneer Earner (250 XP), First Withdraw (100 XP). |
| Streaks | Daily completion streak (fire counter); reminder emails/pushes 2h and 30min before midnight; milestone celebrations. |
| Referrals | 0.02 USDm per referred earner's first approved task; 0.10 USDm per referred creator's first campaign. |
| Credits | 1.00 USDm welcome credit (first users); 0.50 USDm per approved task idea. |

## 6. Live Campaigns (August 2026)

| Campaign | Prize | Status |
|---|---|---|
| Membership Certificate Share | 10.00 USDm — most engaged tweet tagging @earnwithtezra + @0xTMB | Active (ends Aug 9, 23:59 WAT) |
| Referral Champion Contest | 20.00 USDm pool — top 3 referrers (10 / 5 / 5) + recognition + task credits | Registration open (Aug 9 - Aug 30, 2026) |
| Badge Collector Sprint | 15.00 USDm — most badges shared with proper tagging | Coming soon |

## 7. Technology & Architecture

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, RainbowKit, Wagmi, Viem, Lucide |
| Smart contracts | Solidity 0.8.20 (TasklyEscrow.sol), Hardhat, Ethers.js |
| Backend/data | Firebase (Firestore + Storage), Next.js API routes |
| Blockchain | Celo Mainnet & Alfajores/Sepolia testnets; USDm (Mento Dollar) stablecoin |
| Payments | Korapay Collections (NGN) with webhook HMAC verification |
| Email/Push | cPanel SMTP gateway + Resend; VAPID web push via service worker |
| Monitoring | Sentry (client, server, edge) |
| Infra | Monorepo (pnpm + turbo) — `apps/web` (dApp) + `apps/contracts` (escrow) |

**Escrow contract:** `TasklyEscrow.sol` — per-campaign escrow keyed by task ID; functions `createCampaign`, `payoutWorker`, `refundCampaign`; emits CampaignCreated / WorkerPaid / CampaignRefunded / FeeCollected. Live on Celo Mainnet at `0x89ebD3C199456E1C25A42B5D393C6249b1233713`.

**Gas optimization:** Rewards accrue off-chain (Firestore balances) with batched withdrawals, so workers pay near-zero gas.

**Celo/MiniPay compliance:** auto-connect inside MiniPay, no personal_sign popups, fee-currency gas payments in USDm, mobile-first UI for low-end devices — ready for Celo Builder Fund / Prezenti / GoodBuilders grants.

## 8. Brand Identity

### Brand snapshot
- **Name:** Tezra
- **Tagline:** "Microwork for Stablecoins"
- **Short description:** "Earn stablecoins instantly by completing micro-tasks, social engagements, surveys, and app testing."
- **Category:** Web3 / Fintech / Gig & Micro-labor
- **Platform feel:** Mobile-first, playful, trustworthy, green-money vibes with a modern web3 edge.

### Logo
- **Icon:** Rounded-square green "T" mark (see `apps/web/public/icon.png` / `logo.png`).
- **Wordmark:** "Tezra" in extra-bold (weight 900), tight letter-spacing (-1), filled with the blue-to-green brand gradient.
- **Tagline lockup:** "Microwork for Stablecoins" below the wordmark in slate gray (weight 600).
- **Usage:** Icon alone (avatar, favicon, badge marks) or full lockup (headers, emails, certificates). On dark backgrounds use the white/light variant; on light backgrounds the gradient version.

### Color palette

| Token | Hex | Usage |
|---|---|---|
| Brand Blue | `#2563EB` | Gradient start, primary accent, browser theme bar |
| Brand Green | `#10B981` | Gradient end, success, earnings |
| Tezra Green | `#07955F` | Primary buttons / CTA |
| Slate Text | `#64748B` | Secondary text, tagline |
| Dark | `#2A2C34` | Secondary surfaces / dark elements |
| Dark Text | `#0F172A` | Headings |
| Background | `#F9FAFB` / `#FAFAFC` | App background (near-white) |
| White | `#FFFFFF` | Cards, surfaces |

**Signature gradient (blue → green):** `linear-gradient(90deg, #2563EB, #10B981)` — used for the wordmark, banners, promo CTAs, and the button gradient. The blue-to-green flow is Tezra's signature visual identity.

**Avatar gradients (user fallback avatars):**

| Design | Gradient | Ring |
|---|---|---|
| Emerald | `#059669 → #10B981` | `#34D399` |
| Cosmic | `#7C3AED → #A78BFA` | `#C4B5FD` |
| Sunset | `#D97706 → #F59E0B` | `#FCD34D` |
| Ocean | `#0284C7 → #38BDF8` | `#7DD3FC` |

### Typography
- **UI font:** Inter (Google Fonts).
- **Wordmark/display:** system-ui stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`), weight 900, letter-spacing -1px.
- **Headings:** bold/800, dark slate; **body:** regular, slate. Rounded corners (radius 0.5rem base) throughout for a friendly feel.

### Tone of voice
- Friendly, energetic, encouraging ("Earn stablecoins instantly", "Do small tasks. Get paid.").
- Gamified and playful (sparkles, fire streaks, confetti, achievement celebrations).
- Trust-forward (escrow, transparency, "secured by Celo & MiniPay").
- Simple — speaks to people with zero crypto experience.

## 9. Official Links & Socials

| Channel | Handle / Link |
|---|---|
| Website | https://tezra.xyz |
| Telegram (official channel) | https://t.me/tezra_updates |
| X / Twitter | @earnwithtezra |
| Founder | @0xTMB |
| WhatsApp support | https://wa.me/12272143646 |
| Support email | support@tezra.xyz |
| Sender email | noreply@tezra.xyz |

**Recommended hashtags:** #Tezra #Celo #Web3 #MiniPay #Stablecoins #Microwork #EarnCrypto

**SEO keywords:** Celo, MiniPay, Stablecoins, Microwork, Earn Crypto, Micro-tasks, USDm, Valora, Opera Mini, earn money online Nigeria.

## 10. Target Audience & Positioning

- **Primary:** Mobile-first users in Nigeria and other emerging markets — students, freelancers, anyone with a smartphone who wants dollar earnings. No bank card and no crypto knowledge required.
- **Secondary:** Brands, creators, indie builders, and crypto founders who need cheap, verifiable micro-engagement (social growth, reviews, app beta testing, community building).
- **Positioning:** "Fiverr meets Celo for micro-tasks" — smaller than a gig, bigger than a survey site, paid in a stablecoin you can actually spend.

## 11. Current Status

- **Version:** 2.1.1 (active development; regular releases)
- **Blockchain:** Live on Celo Mainnet (escrow verified), testnets for dev
- **Infrastructure:** PWA + web; Firebase backend; Sentry monitoring
- **Grants:** MiniPay technical & UX compliance checklist complete — ready for Celo Builder Fund, Prezenti, and GoodBuilders applications
- **Community:** Growing Telegram community with giveaways and contests; Pioneer Certificate campaign live

## 12. Credits

Tezra is built by **TMB** (@0xTMB) — designer, developer, and founder.
Author site: https://www.tmb.it.com

---

*This file is the one-stop reference for Tezra — for humans and AIs. Use it for pitch decks, brand guidelines, social media designs, blog posts, or onboarding new teammates. For deeper technical detail, see `README.md`, `CHANGES_SUMMARY.md`, and `Grant_Readiness_Checklist.md` in this repository.*
