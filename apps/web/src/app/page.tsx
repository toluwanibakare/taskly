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
  ExternalLink,
  MessageSquare,
  Sparkles,
  Award
} from "lucide-react";
import logoImg from "../../assets/logo.png";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-slate-800 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden flex flex-col">
      
      {/* Decorative Brand Color Blobs */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[40%] -left-20 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-400/10 to-teal-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#FAFAFC]/80 backdrop-blur-md border-b border-slate-100/80 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group active:scale-95 transition-all">
            <div className="w-9 h-9 relative flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 p-1">
              <img src={logoImg.src} alt="Tezra Logo" className="object-contain w-full h-full" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">
              Tezra
            </span>
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-500">
            <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-950 transition-colors">How It Works</a>
            <a href="#categories" className="hover:text-slate-950 transition-colors">Task Categories</a>
          </nav>

          {/* Wallet Connection / App CTAs */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <Link 
                href="/app" 
                className="px-4.5 py-2 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wide"
              >
                Enter App
                <Zap className="w-3.5 h-3.5 fill-current" />
              </Link>
            ) : (
              <>
                <button
                  onClick={openConnectModal}
                  className="hidden sm:block px-4 py-2 text-slate-600 hover:text-slate-950 text-xs font-bold transition-all"
                >
                  Connect Wallet
                </button>
                <Link
                  href="/app"
                  className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 uppercase tracking-wide"
                >
                  Launch App
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 px-6 text-center max-w-5xl mx-auto flex-grow flex flex-col justify-center">
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-white border border-slate-100 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Minipay-Powered Microwork Marketplace
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-900">
            Earn Stablecoins Instantly for{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              Completing Microtasks
            </span>
          </h1>

          {/* Description */}
          <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto font-medium leading-relaxed font-sans">
            Tezra connects web3 projects and community contributors. Complete microtasks, test software, or interact with social campaigns to get paid instantly in stablecoins.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-5">
            <Link 
              href="/app"
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              Start Earning Stablecoins
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto px-7 py-3.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-10 px-6 border-y border-slate-100 bg-white/60 relative">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "25,000+", label: "Tasks Completed", color: "text-blue-600" },
            { value: "$75,000+", label: "USDm Distributed", color: "text-emerald-600" },
            { value: "4,200+", label: "Active Workers", color: "text-indigo-600" },
            { value: "100%", label: "Escrow Settlement", color: "text-amber-500" }
          ].map((stat, idx) => (
            <div key={idx} className="space-y-1">
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

      {/* CORE FEATURES */}
      <section id="features" className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest block">Core Infrastructure</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Trustless Escrow Settlement</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Tezra ensures prompt compensation and quality output using automated, audited smart contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Coins className="w-5 h-5 text-emerald-600" />,
              title: "Stablecoin Settled",
              desc: "Payments are paid exclusively in Celo-backed USDm stablecoins, protecting your earnings from token volatility."
            },
            {
              icon: <Shield className="w-5 h-5 text-blue-600" />,
              title: "On-Chain Escrow Protection",
              desc: "Creators fund smart contracts prior to launch. Rewards are locked and released instantly when proofs are validated."
            },
            {
              icon: <Zap className="w-5 h-5 text-amber-500" />,
              title: "MiniPay Seamless Fit",
              desc: "Tailored to load dynamically inside the Opera MiniPay browser with optimized, gasless signature actions."
            }
          ].map((feat, idx) => (
            <div key={idx} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-3.5 hover:border-slate-200 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                {feat.icon}
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">{feat.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-6 border-y border-slate-100 bg-white/40">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest block">System Flow</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
              Microtasks Made Simple & Verified
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-sans font-medium">
              We connect task creators directly with execution workers. Funds remain held securely on-chain until verification is cleared.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Pick a Task Campaign</h4>
                  <p className="text-[11px] text-slate-500 leading-normal font-sans font-medium">Find tasks that fit your preference: writing reviews, testing apps, or social actions.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Submit Execution Proof</h4>
                  <p className="text-[11px] text-slate-500 leading-normal font-sans font-medium">Follow instructions, capture completion proof, and upload your submission.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Collect Your Rewards</h4>
                  <p className="text-[11px] text-slate-500 leading-normal font-sans font-medium">Once approved, rewards are disbursed instantly from the smart contract escrow to your wallet.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive UI Mockup Card */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-md space-y-4 font-sans text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Campaign Escrow Info</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-500 space-y-2">
              <p className="text-emerald-600">// Release bounty reward to worker</p>
              <p>function releaseBounty(bytes32 taskId, address worker) external &#123;</p>
              <p className="pl-4 text-blue-600">require(msg.sender == campaigns[taskId].creator);</p>
              <p className="pl-4">uint256 reward = campaigns[taskId].rewardVal;</p>
              <p className="pl-4 text-emerald-600">stablecoin.transfer(worker, reward);</p>
              <p className="pl-4 text-amber-500">emit BountyReleased(taskId, worker, reward);</p>
              <p>&#125;</p>
            </div>

            <div className="flex justify-between items-center bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-black text-slate-700">Audit Status Verified</span>
              </div>
              <span className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-0.5">
                View Contract <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TASK CATEGORIES PREVIEW */}
      <section id="categories" className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest block">Diverse Opportunities</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Browse Task Categories</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Tezra hosts a variety of microtasks to match your interests. Connect to start earning instantly.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: "Social Quests",
              payout: "0.05 - 0.20 USDm",
              features: ["Follow or retweet on X", "LinkedIn profile boost", "YouTube video reviews"],
              icon: "📣",
              color: "bg-blue-50 border-blue-100/50 text-blue-700"
            },
            {
              title: "Writing & Content",
              payout: "0.50 - 1.50 USDm",
              features: ["Draft review articles", "Write educational threads", "Product feedback writeups"],
              icon: "✍️",
              color: "bg-emerald-50 border-emerald-100/50 text-emerald-700"
            },
            {
              title: "Beta Software Testing",
              payout: "0.75 - 2.50 USDm",
              features: ["Explore newly launched webapps", "Identify layout issues", "Provide video records"],
              icon: "🧪",
              color: "bg-indigo-50 border-indigo-100/50 text-indigo-700"
            },
            {
              title: "Community & Groups",
              payout: "0.10 - 0.40 USDm",
              features: ["Join community Telegrams", "Enter discord networks", "Actively discuss projects"],
              icon: "👥",
              color: "bg-amber-50 border-amber-100/50 text-amber-800"
            }
          ].map((cat, idx) => (
            <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4 flex flex-col justify-between hover:border-slate-200 transition-colors shadow-sm">
              <div className="space-y-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg ${cat.color} border shadow-inner`}>
                  {cat.icon}
                </span>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">{cat.title}</h3>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-full inline-block">
                  Earn {cat.payout}
                </span>
                <ul className="space-y-1.5 pt-2">
                  {cat.features.map((feat, fidx) => (
                    <li key={fidx} className="text-[10px] text-slate-500 flex items-center gap-1.5 font-medium leading-normal font-sans">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <Link 
                href="/app" 
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 hover:text-slate-950 rounded-xl text-[10px] font-extrabold text-center block transition-all active:scale-[0.98] uppercase tracking-wider"
              >
                Browse Tasks
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION BOTTOM CARD */}
      <section className="py-10 px-6 max-w-5xl mx-auto w-full">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xl shadow-blue-500/10">
          <div className="relative space-y-5 max-w-xl mx-auto z-10 text-white">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
              Ready to start earning stablecoins?
            </h2>
            <p className="text-blue-50 text-xs sm:text-sm font-medium leading-relaxed font-sans max-w-md mx-auto">
              Connect your web3 wallet in seconds and claim stablecoin bounties instantly on Celo.
            </p>
            <div className="pt-2">
              <Link 
                href="/app"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 uppercase tracking-widest"
              >
                Enter Tezra App
                <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-100 bg-white px-6 text-center text-xs text-slate-400 font-bold mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 p-0.5 border border-slate-100 rounded bg-white shadow-sm flex items-center justify-center">
              <img src={logoImg.src} alt="Tezra Logo" className="object-contain w-full h-full grayscale opacity-60" />
            </div>
            <span className="text-slate-500 font-black">Tezra © 2026</span>
          </div>

          <div>
            <a 
              href="https://www.tmb.it.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-[9px]"
            >
              Built by TMB
            </a>
          </div>

          <div className="flex gap-5 font-sans font-medium text-slate-400">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
