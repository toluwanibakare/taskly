import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Trophy, Sparkles, User } from 'lucide-react';
import { headers } from 'next/headers';

const BADGES: Record<string, { name: string; description: string; emoji: string; xp: number }> = {
  pioneer: {
    name: "Early Pioneer",
    description: "Claimed welcome gift and pioneer badge reward",
    emoji: "🎖️",
    xp: 50,
  },
  genesis_creator: {
    name: "Genesis Creator",
    description: "First user to launch a campaign on Celo Mainnet",
    emoji: "🚀",
    xp: 200,
  },
  sold_out: {
    name: "Sold Out",
    description: "First creator to get all slots filled in a campaign",
    emoji: "✅",
    xp: 150,
  },
  task_machine: {
    name: "Task Machine",
    description: "Complete 20 tasks in a single day",
    emoji: "🤖",
    xp: 200,
  },
  speed_run: {
    name: "Speed Run",
    description: "Submit proof within 3 minutes of opening a task",
    emoji: "⚡",
    xp: 100,
  },
  pioneer_earner: {
    name: "Pioneer Earner",
    description: "Reach a total earnings of 10.00 USDm",
    emoji: "💰",
    xp: 250,
  },
  first_payout: {
    name: "First Withdraw",
    description: "First worker to request and complete a payout withdrawal",
    emoji: "💸",
    xp: 100,
  }
};

const AVATAR_DESIGNS = [
  { bg1: "#059669", bg2: "#10b981", ring: "#34d399" },
  { bg1: "#7c3aed", bg2: "#a78bfa", ring: "#c4b5fd" },
  { bg1: "#d97706", bg2: "#f59e0b", ring: "#fcd34d" },
  { bg1: "#0284c7", bg2: "#38bdf8", ring: "#7dd3fc" },
];

function getShortWallet(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

async function getUserInfo(wallet: string): Promise<{ name: string; design: number }> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!projectId || !apiKey) throw new Error("Firebase config missing");
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${wallet.toLowerCase()}?key=${apiKey}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error("User not found");
    const data = await res.json();
    const fields = data.fields || {};
    const displayName = fields.displayName?.stringValue || "";
    const avatarDesign = fields.avatarDesign?.integerValue
      ? parseInt(fields.avatarDesign.integerValue, 10)
      : parseInt(wallet.slice(-2), 16) % 4;
    const name = displayName ? (displayName.startsWith("@") ? displayName : `@${displayName}`) : `@${getShortWallet(wallet)}`;
    return { name, design: avatarDesign };
  } catch (err) {
    return { name: `@${getShortWallet(wallet)}`, design: parseInt(wallet.slice(-2), 16) % 4 };
  }
}

type Props = {
  params: { badgeId: string };
  searchParams: { wallet?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const badgeId = params.badgeId;
  const badge = BADGES[badgeId] || BADGES.pioneer;
  const wallet = searchParams.wallet || "";

  const headersList = headers();
  const host = headersList.get('host') || 'tezra.xyz';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const shareUrl = `${protocol}://${host}/share/${badgeId}${wallet ? `?wallet=${wallet}` : ''}`;

  let imageUrl = `${protocol}://${host}/api/og/badge?id=${badgeId}`;

  if (wallet) {
    const userInfo = await getUserInfo(wallet);
    imageUrl += `&name=${encodeURIComponent(userInfo.name)}&design=${userInfo.design}`;
  }

  return {
    title: `Tezra Achievement: ${badge.name}`,
    description: `I just unlocked the ${badge.name} badge on Tezra! Complete tasks and earn stablecoins.`,
    openGraph: {
      title: `Tezra Achievement: ${badge.name}`,
      description: `I just unlocked the ${badge.name} badge on Tezra! Complete tasks and earn stablecoins.`,
      url: shareUrl,
      siteName: 'Tezra',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: `${badge.name} Achievement Card`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Tezra Achievement: ${badge.name}`,
      description: `I just unlocked the ${badge.name} badge on Tezra!`,
      images: [imageUrl],
    },
  };
}

export default async function ShareBadgePage({ params, searchParams }: Props) {
  const badgeId = params.badgeId;
  const badge = BADGES[badgeId] || BADGES.pioneer;
  const wallet = searchParams.wallet || "";
  let userInfo = { name: "", design: 0 };

  if (wallet) {
    userInfo = await getUserInfo(wallet);
  }

  const design = AVATAR_DESIGNS[userInfo.design % 4];
  const cleanName = userInfo.name.startsWith("@") ? userInfo.name.slice(1) : userInfo.name;
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* User info bar */}
        {userInfo.name && (
          <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-xs text-slate-400 font-medium truncate max-w-[160px]">
              {userInfo.name}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, ${design.bg1}, ${design.bg2})`,
                border: `2px solid ${design.ring}`,
              }}
            >
              {initial}
            </div>
          </div>
        )}

        {/* Top Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Badge Achievement</span>
        </div>

        <div className="relative mx-auto mb-6 w-28 h-28 flex items-center justify-center bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 rounded-3xl p-1 shadow-lg shadow-emerald-500/25">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-6xl">
            {badge.emoji}
          </div>
        </div>

        <h2 className="text-3xl font-black text-white tracking-tight">{badge.name}</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">{badge.description}</p>

        <div className="inline-flex items-center gap-2 mt-4 mb-6 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-amber-400 font-bold text-sm">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>+{badge.xp} XP Unlocked</span>
        </div>

        <Link
          href="/"
          className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-95 text-sm"
        >
          <span>Claim Yours on Tezra</span>
          <ArrowRight className="w-4.5 h-4.5" />
        </Link>
      </div>

      <div className="mt-8 text-center text-slate-500 text-xs font-medium">
        ⚡ TEZRA • Micro-Tasks & Stablecoin Rewards
      </div>
    </div>
  );
}
