# Changes Summary - Badge Sharing & Profile System

## Overview
Three features implemented:
1. **Badge image sharing via Web Share API** — share badge image with text/link
2. **Badge email notifications** — email sent when any badge is unlocked
3. **Profile system** — display name, avatar, wallet-based badge card personalization

---

## Files Modified

### 1. `apps/web/src/components/BadgeUnlockModal.tsx`
- Extracted `drawBadgeCanvas()` into a standalone async function
- Added `drawBadgeCanvas()` params: `displayName`, `avatarUrl`, `avatarDesign`, `walletAddress`
- Canvas now renders: avatar circle (top-right) + display name + Tezra logo
- Added `handleShareWithImage()` using `navigator.share({ files, text, url })` (Web Share API)
- Added "Share" button (visible only when browser supports file sharing)
- Share URLs now include `?wallet=0x...` query param
- Added `AVATAR_DESIGNS` constant (4 gradient color schemes)

**Props added to component:**
```typescript
displayName?: string;
avatarUrl?: string;
avatarDesign?: number;
walletAddress?: string;
```

### 2. `apps/web/src/app/page.tsx`
#### Profile Edit System
- Added state: `showProfileEdit`, `profileEditName`, `profileEditEmail`, `profileEditAvatar`, `profileEditAvatarPreview`, `profileSaving`
- Added "Edit Profile" button in the profile sidebar (between Achievements and Referral sections)
- Added Profile Edit Modal with:
  - Avatar display with file upload (to Firebase Storage `avatars/{walletAddress}`)
  - Display name text input (max 20 chars)
  - Email text input
  - Save button (uploads avatar to Storage, updates Firestore doc)
- Auto-assigns `avatarDesign` on user creation: `parseInt(activeAddress.slice(-2), 16) % 4`
- Passes `displayName`, `avatarUrl`, `avatarDesign`, `walletAddress` to `BadgeUnlockModal`

#### Badge Sorting
- Achievements modal now sorts badges: unlocked (acquired) first, then locked

### 3. `apps/web/src/app/api/og/badge/route.tsx`
- Replaced `⚡ TEZRA ACHIEVEMENT` emoji with proper Tezra logo (green "T" square + "TEZRA ACHIEVEMENT" text)
- Added `displayName` avatar display in top-right corner:
  - Accepts `name` and `design` query params
  - Renders avatar circle with gradient + first letter of display name
  - Renders display name text next to avatar
- `AVATAR_DESIGNS` constant matches the client-side designs

**Query params:** `?id={badgeId}&name={displayName}&design={avatarDesignIndex}`

### 4. `apps/web/src/app/share/[badgeId]/page.tsx`
- Accepts `searchParams.wallet` from URL query string
- Fetches user data from Firestore REST API when wallet is provided:
  ```typescript
  GET https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/users/{wallet}?key={API_KEY}
  ```
- Extracts `displayName` (or generates short wallet `0x1234...5678`) and `avatarDesign`
- Passes `name` and `design` to the OG image URL
- Displays user avatar + name on the share page
- Graceful fallback: if fetch fails, uses short wallet address

### 5. `apps/web/src/lib/email.ts`
- Added `sendBadgeUnlockEmail(toEmail, badgeName, badgeEmoji, badgeDescription, xpReward)` function
- HTML email template with badge emoji, name, description, XP

### 6. `apps/web/src/app/api/send-email/route.ts`
- Added `badge_unlock` action handler

### 7. `firestore.rules` — No changes needed (existing rules allow the new fields)

### 8. `storage.rules`
- Added avatar storage rules:
  - Path: `/avatars/{allPaths=**}`
  - Max size: 5MB
  - Allowed types: png, jpeg, jpg, webp
  - Read: public; Write: authenticated (via Firebase Auth/request)

---

## Firebase Data Model Changes

### New fields on `/users/{walletAddress}` document:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | string | No | User's chosen display name (max 20 chars) |
| `avatarUrl` | string (URL) | No | Firebase Storage download URL for uploaded avatar |
| `avatarDesign` | number (0-3) | Auto-assigned | Which of 4 gradient designs to use as fallback avatar |

### Storage path for avatars:
- `avatars/{walletAddress}` (lowercase wallet, overwritten on re-upload)

---

## Badge Email Flow

When a badge is awarded client-side in `page.tsx`, a `fetch()` call is made:

```typescript
fetch("/api/send-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "badge_unlock",
    payload: {
      toEmail: userEmail,
      badgeName: "...",
      badgeEmoji: "...",
      badgeDescription: "...",
      xpReward: 0,
    },
  }),
});
```

**Trigger points (all in page.tsx):**
1. `genesis_creator` — after Firestore updateDoc, uses `uData.email`
2. `sold_out` (two locations) — after updateDoc, uses `cData.email`
3. `speed_run` — after transaction completes, uses `workerEmail` (captured inside transaction)
4. `task_machine` — same as above
5. `pioneer_earner` — same as above
6. `first_payout` — after updateDoc, uses `recipientData.email`

Note: The pioneer badge email is already handled by `EmailModal.tsx` via `welcome_gift` action.

---

## Share URL Format

```
https://tezra.xyz/share/{badgeId}?wallet=0x{walletAddress}
```

The OG image URL becomes:
```
https://tezra.xyz/api/og/badge?id={badgeId}&name={displayName}&design={avatarDesign}
```

---

## Avatar Designs (4 variants)

| Index | Theme | Gradient | Ring Color |
|-------|-------|----------|------------|
| 0 | Emerald | `#059669 → #10b981` | `#34d399` |
| 1 | Cosmic | `#7c3aed → #a78bfa` | `#c4b5fd` |
| 2 | Sunset | `#d97706 → #f59e0b` | `#fcd34d` |
| 3 | Ocean | `#0284c7 → #38bdf8` | `#7dd3fc` |

Assigned via: `parseInt(walletAddress.slice(-2), 16) % 4`

---

## Things to Verify

1. **Firestore REST API access**: The share page fetches user data using the Firebase Web API key via:
   `https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/users/{wallet}?key={API_KEY}`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_API_KEY` must be set in `.env`
   - This works because the Firestore rules allow public read on `/users/{wallet}`

2. **Storage rules**: Updated `storage.rules` to allow avatar uploads at `/avatars/` path. The rules check file size (5MB) and content type.

3. **SMTP config**: `SMTP_PASS` and `SMTP_USER` must be set for emails to actually send. Missing SMTP_PASS gracefully skips sending (already handled).

4. **OG image Edge Runtime**: The OG route uses `export const runtime = 'edge'`. No server-side Firestore access needed since user info is passed via query params.

5. **Avatar upload flow**: User selects file → preview shown → on save → upload to Firebase Storage → download URL saved to Firestore → image displayed via `avatarUrl` field.
