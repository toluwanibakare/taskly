"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { 
  Zap, 
  ArrowRight, 
  Shield, 
  Coins, 
  Users, 
  CheckCircle2, 
  Layers, 
  MousePointerClick, 
  Sparkles,
  ExternalLink
} from "lucide-react";

// Tezra Logo Component matching the app theme
const TezraLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tezraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="50%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <rect x="15" y="15" width="70" height="70" rx="22" fill="url(#tezraGrad)" />
    <path d="M40 30L65 42L40 54V30Z" fill="white" />
    <path d="M60 70L35 58L60 46V70Z" fill="white" opacity="0.85" />
    <circle cx="50" cy="50" r="6" fill="#FBBF24" />
  </svg>
);

export default function LandingPage() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans relative overflow-x-hidden">
      
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <TezraLogo className="w-9 h-9 transition-transform group-hover:rotate-12 duration-300" />
            <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
              Tezra
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#categories" className="hover:text-white transition-colors">Categories</a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            {isConnected ? (
              <Link 
                href="/app" 
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg active:scale-95 uppercase tracking-wider"
              >
                Enter App
                <Zap className="w-3.5 h-3.5 fill-current" />
              </Link>
            ) : (
              <button
                onClick={openConnectModal}
                className="px-4.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Microwork marketplace for Celo & MiniPay
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white max-w-3xl mx-auto">
            Earn Stablecoins Instantly for{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Simple Tasks
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto font-medium leading-relaxed font-sans">
            Tezra connects creators and workers globally. Solve microtasks, test software, or complete social campaigns to get paid instantly in stablecoins directly to your MiniPay wallet.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link 
              href="/app"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-2xl text-sm font-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              Start Earning Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-1"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-12 px-6 border-y border-slate-900 bg-slate-950/40 relative">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "25,000+", label: "Tasks Completed", color: "text-blue-400" },
            { value: "$75,000+", label: "USDm Distributed", color: "text-emerald-400" },
            { value: "4,200+", label: "Active Workers", color: "text-sky-400" },
            { value: "100%", label: "Instant Escrow Settlement", color: "text-amber-400" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl backdrop-blur-sm space-y-1">
              <span className={`text-2xl sm:text-3xl font-black ${stat.color} block tracking-tight`}>
                {stat.value}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <span className="text-xs font-black uppercase text-emerald-400 tracking-widest block">Why Choose Tezra</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Smarter Microwork Platform</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Engineered for high performance, mobile responsiveness, and trustless decentralized settlement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Coins className="w-6 h-6 text-emerald-400" />,
              title: "Stablecoin Payouts",
              desc: "Say goodbye to token volatility. All tasks pay out in USDm (Celo-backed stablecoin) preserving your value."
            },
            {
              icon: <Shield className="w-6 h-6 text-blue-400" />,
              title: "Trustless Smart Escrow",
              desc: "Payments are held securely in escrow contracts and released instantly when proofs are verified by the creator."
            },
            {
              icon: <Zap className="w-6 h-6 text-amber-400" />,
              title: "MiniPay Integration",
              desc: "Optimized specifically for mobile browsers and MiniPay, enabling gasless, ultra-fast transaction flows."
            }
          ].map((feat, idx) => (
            <div key={idx} className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800 shadow-md">
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold text-white">{feat.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 border-y border-slate-900 bg-slate-950/20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <span className="text-xs font-black uppercase text-blue-400 tracking-widest block">Workflow System</span>
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Designed for both Workers and Campaign Creators
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed font-sans">
              Tezra provides a trustless marketplace. Complete tasks as a worker to earn instant micro-payouts, or launch your own campaigns as a creator to boost your project's metrics.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Select and Start a Campaign</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">Browse active campaigns matching your preferences and join instantly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Upload Completion Proof</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">Take screenshots or records verifying task execution and submit safely.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Get Paid Directly</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">Upon creator approval, stablecoin funds unlock from escrow to your wallet.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating graphic */}
          <div className="relative bg-gradient-to-br from-blue-900/10 to-emerald-900/10 border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">escrow_controller.sol</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/80 font-mono text-[10px] text-slate-400 space-y-2">
              <p className="text-emerald-400">// Release bounty reward to worker</p>
              <p>function releaseBounty(bytes32 taskId, address worker) external &#123;</p>
              <p className="pl-4 text-blue-400">require(msg.sender == campaigns[taskId].creator);</p>
              <p className="pl-4">uint256 reward = campaigns[taskId].rewardVal;</p>
              <p className="pl-4 text-emerald-400">stablecoin.transfer(worker, reward);</p>
              <p className="pl-4 text-yellow-400">emit BountyReleased(taskId, worker, reward);</p>
              <p>&#125;</p>
            </div>
            
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Smart Contract Verified</span>
              </div>
              <span className="text-[10px] text-slate-500 underline font-semibold flex items-center gap-0.5 cursor-pointer">
                View Contract <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section id="categories" className="py-24 px-6 max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <span className="text-xs font-black uppercase text-emerald-400 tracking-widest block">Available Roles</span>
          <h2 className="text-3xl font-extrabold text-white">Task Campaign Categories</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Tezra hosts a variety of microtasks matching your skills. Connect to start complete campaigns instantly.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Social Engagement",
              payout: "0.05 - 0.20 USDm",
              features: ["Follow, Retweet, Like on X", "LinkedIn connection boost", "YouTube video reviews"],
              icon: "📣"
            },
            {
              title: "Writing & Content",
              payout: "0.50 - 1.50 USDm",
              features: ["Write blog review posts", "Draft X educational threads", "Product feedback writeups"],
              icon: "✍️"
            },
            {
              title: "Beta Testing & Lab",
              payout: "0.75 - 2.50 USDm",
              features: ["Explore newly launched PWAs", "Report user experience bugs", "Provide screen recordings"],
              icon: "🧪"
            },
            {
              title: "Community & Groups",
              payout: "0.10 - 0.40 USDm",
              features: ["Join community Telegrams", "Enter discord networks", "Actively discuss stablecoins"],
              icon: "👥"
            }
          ].map((cat, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-900 p-5 rounded-3xl space-y-5 flex flex-col justify-between hover:border-slate-800 transition-colors">
              <div className="space-y-3">
                <span className="text-3xl block">{cat.icon}</span>
                <h3 className="text-base font-extrabold text-white">{cat.title}</h3>
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                  Earn {cat.payout}
                </span>
                <ul className="space-y-1.5 pt-2">
                  {cat.features.map((feat, fidx) => (
                    <li key={fidx} className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium leading-normal font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <Link 
                href="/app" 
                className="w-full py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-white rounded-xl text-[10px] font-extrabold text-center block transition-all active:scale-[0.98]"
              >
                Browse Tasks
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BOTTOM CARD */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-slate-950/20 backdrop-blur-[1px]" />
          <div className="relative space-y-6 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
              Ready to start earning stablecoins?
            </h2>
            <p className="text-blue-100 text-sm max-w-md mx-auto font-medium leading-relaxed font-sans">
              Connect your web3 wallet in seconds via MiniPay or Valora and unlock your first rewards on Celo instantly.
            </p>
            <div className="pt-2">
              <Link 
                href="/app"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-white hover:bg-slate-50 text-slate-950 rounded-2xl text-sm font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest"
              >
                Enter Tezra App
                <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950 px-6 text-center text-xs text-slate-500 font-semibold space-y-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TezraLogo className="w-6 h-6 grayscale opacity-60" />
            <span className="text-slate-400 font-bold">Tezra © 2026</span>
          </div>

          <div>
            <a 
              href="https://www.tmb.it.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Built by TMB
            </a>
          </div>

          <div className="flex gap-6 font-sans">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
