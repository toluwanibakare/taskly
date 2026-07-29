import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Trophy, Sparkles } from 'lucide-react';

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

type Props = {
  params: { badgeId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const badgeId = params.badgeId;
  const badge = BADGES[badgeId] || BADGES.pioneer;
  const imageUrl = `https://tezra.xyz/api/og/badge?id=${badgeId}`;

  return {
    title: `Tezra Achievement: ${badge.name}`,
    description: `I just unlocked the ${badge.name} badge on Tezra! Complete tasks and earn stablecoins.`,
    openGraph: {
      title: `Tezra Achievement: ${badge.name}`,
      description: `I just unlocked the ${badge.name} badge on Tezra! Complete tasks and earn stablecoins.`,
      url: `https://tezra.xyz/share/${badgeId}`,
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

export default function ShareBadgePage({ params }: Props) {
  const badgeId = params.badgeId;
  const badge = BADGES[badgeId] || BADGES.pioneer;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      
      {/* Background glow effects */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Top Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Badge Achievement</span>
        </div>

        {/* Animated Badge Icon Container */}
        <div className="relative mx-auto mb-6 w-28 h-28 flex items-center justify-center bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 rounded-3xl p-1 shadow-lg shadow-emerald-500/25">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-6xl">
            {badge.emoji}
          </div>
        </div>

        {/* Title & XP */}
        <h2 className="text-3xl font-black text-white tracking-tight">{badge.name}</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">{badge.description}</p>

        <div className="inline-flex items-center gap-2 mt-4 mb-6 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-amber-400 font-bold text-sm">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>+{badge.xp} XP Unlocked</span>
        </div>

        {/* Action Button */}
        <Link 
          href="/"
          className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-95 text-sm"
        >
          <span>Claim Yours on Tezra</span>
          <ArrowRight className="w-4.5 h-4.5" />
        </Link>
      </div>
      
      {/* Brand footer */}
      <div className="mt-8 text-center text-slate-500 text-xs font-medium">
        ⚡ TEZRA • Micro-Tasks & Stablecoin Rewards
      </div>
    </div>
  );
}
