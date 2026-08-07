/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
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
  ExternalLink,
  Sparkles,
  Megaphone,
  PenTool,
  FlaskConical,
  ChevronRight,
  ChevronDown,
  Info,
  Layers,
  ArrowUpRight
} from "lucide-react";
import logoImg from "../../assets/logo.png";

// TezraLogo Component matching app structure
const TezraLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <img src={logoImg.src} alt="Tezra Logo" className="object-contain w-full h-full" />
  </div>
);

// Custom SVG Icons for WhatsApp, Telegram, X
const TelegramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.82-1.07 4.8-1.55 7.15-.2.95-.55 1.27-.88 1.3-.73.07-1.29-.48-2-.95-1.12-.74-1.75-1.19-2.83-1.9-1.25-.82-.44-1.28.27-2.02.19-.19 3.42-3.13 3.48-3.4.01-.03.01-.15-.06-.21s-.18-.04-.26-.02c-.11.02-1.88 1.19-5.32 3.52-.5.35-.96.52-1.37.51-.45-.01-1.32-.26-1.97-.47-.8-.26-1.43-.4-1.37-.85.03-.23.35-.47.95-.71 3.71-1.61 6.19-2.67 7.42-3.18 3.52-1.46 4.25-1.71 4.73-1.72.11 0 .35.03.5.16.13.11.17.26.18.37.01.08.02.26.01.43z"/>
  </svg>
);

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01C17.18 3.03 14.69 2 12.04 2zm5.8 14.17c-.24.68-1.2 1.23-1.66 1.28-.46.05-.91.07-2.93-.72-2.58-1.02-4.24-3.65-4.37-3.82-.13-.17-1.07-1.43-1.07-2.73 0-1.3.68-1.94.92-2.2.24-.26.54-.33.72-.33h.52c.16 0 .37-.02.57.45.2.49.68 1.66.74 1.79.06.13.1.28.02.44s-.12.26-.24.4l-.4.49c-.12.15-.26.31-.11.57.15.26.68 1.12 1.46 1.81.99.88 1.83 1.15 2.09 1.28.26.13.41.11.57-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14s1.53.72 1.79.85c.26.13.43.2.49.31.06.11.06.63-.18 1.31z"/>
  </svg>
);

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function LandingPage() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-slate-800 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden flex flex-col">
      
      {/* Decorative Blob Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/10 to-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] -left-20 w-[450px] h-[450px] bg-gradient-to-tr from-emerald-400/10 to-teal-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#FAFAFC]/80 backdrop-blur-md border-b border-slate-100/80 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group active:scale-95 transition-all">
            <div className="w-10 h-10 p-1.5 bg-white rounded-2xl shadow-md border border-slate-50 flex items-center justify-center">
              <TezraLogo className="w-full h-full" />
            </div>
            {/* Tezra Title exactly matching Splash screen */}
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Tezra
            </span>
          </Link>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500">
            <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-950 transition-colors">How It Works</a>
            <a href="#categories" className="hover:text-slate-950 transition-colors">Categories</a>
            <a href="#faq" className="hover:text-slate-950 transition-colors">User Guide & FAQ</a>
          </nav>

          {/* Launch App Button in Navbar */}
          <div>
            <Link
              href="/app"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 uppercase tracking-wide"
            >
              Launch App
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-24 px-6 text-center max-w-5xl mx-auto flex-grow flex flex-col justify-center">
        <div className="space-y-7 max-w-3xl mx-auto">
          {/* Subtitle Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-100 rounded-full text-blue-600 text-xs font-black tracking-wide shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Microwork Platform for Stablecoins</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-slate-900">
            Earn Stablecoins Instantly for{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              Completing Microtasks
            </span>
          </h1>

          {/* Explainer Paragraph */}
          <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto font-medium leading-relaxed font-sans">
            Tezra connects campaign creators and earners. Solve tasks, test software, or engage with communities to receive instant crypto rewards paid in USDm stablecoins directly to your wallet.
          </p>

          {/* Action CTAs: Wallet Connection and Launch App */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 max-w-md mx-auto">
            {isConnected ? (
              <div className="w-full space-y-3">
                <div className="px-5 py-3.5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-extrabold text-slate-700">{formatAddress(address!)}</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Connected
                  </span>
                </div>
                <Link 
                  href="/app"
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-blue-500/10 hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  Enter App Dashboard
                  <Zap className="w-4 h-4 fill-current" />
                </Link>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-blue-500/10 hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  Connect Wallet
                  <Zap className="w-4 h-4 fill-current" />
                </button>
                <Link 
                  href="/app"
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 uppercase tracking-widest"
                >
                  Launch App
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="py-12 px-6 border-y border-slate-100 bg-white/60 relative">
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

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 px-6 max-w-5xl mx-auto space-y-14">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest block">Safe Ecosystem</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Audited Escrow Settlement</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            All campaign funds are secured inside on-chain smart contracts, providing reliable payouts for completed work.
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

      {/* HOW IT WORKS SECTION (DETAILED COPY FROM ABOUT PAGE) */}
      <section id="how-it-works" className="py-24 px-6 border-y border-slate-100 bg-white/40">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest block">System Flow</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Platform Roles & Architecture</h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Tezra supports earners with fee-saving off-chain treasury systems and creators with automated Naira funding.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* For Earners (Workers) */}
            <div className="bg-white border border-slate-100 p-7 rounded-3xl shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">For Earners & Workers</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Solve tasks & accumulate crypto</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">
                Browse campaigns on your dashboard, check instruction requirements, perform the actions, and upload completion proof. 
              </p>
              <div className="pt-2 border-t border-slate-50 space-y-3">
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] text-slate-600 font-medium font-sans leading-normal">
                    <strong>Off-Chain Balance System</strong>: Accumulate stablecoin rewards securely off-chain.
                  </span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] text-slate-600 font-medium font-sans leading-normal">
                    <strong>Zero-Gas Withdrawals</strong>: Request withdrawals when your balance reaches <strong>1.00 USDm</strong>. Admin batch transfers cover network gas.
                  </span>
                </div>
              </div>
            </div>

            {/* For Creators */}
            <div className="bg-white border border-slate-100 p-7 rounded-3xl shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">For Campaign Creators</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Launch campaigns & boost engagement</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">
                Launch microtask campaigns targeting X actions, software testers, or forms. Fund budgets and review proof screenshots to release rewards.
              </p>
              <div className="pt-2 border-t border-slate-50 space-y-3">
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] text-slate-600 font-medium font-sans leading-normal">
                    <strong>Naira (NGN) Instant Funding</strong>: Deposit instantly using Naira cards or bank transfers via Korapay. The system auto-deposits USDm on-chain.
                  </span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] text-slate-600 font-medium font-sans leading-normal">
                    <strong>Refund Safety</strong>: Expired campaigns release remaining unused escrow budget instantly back to your wallet.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TASK CATEGORIES PREVIEW (WITH ICONS, NO EMOJIS) */}
      <section id="categories" className="py-24 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest block">Available Quests</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Supported Microwork Types</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Tezra lists diverse campaigns verified on the Celo network. Get paid inside your MiniPay browser.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: "Social Quests",
              payout: "0.05 - 0.20 USDm",
              features: ["Follow or retweet on X", "LinkedIn profile boost", "YouTube video reviews"],
              icon: <Megaphone className="w-5 h-5 text-blue-600" />,
              color: "bg-blue-50 border-blue-100/50 text-blue-700"
            },
            {
              title: "Writing & Content",
              payout: "0.50 - 1.50 USDm",
              features: ["Draft review articles", "Write educational threads", "Product feedback writeups"],
              icon: <PenTool className="w-5 h-5 text-emerald-600" />,
              color: "bg-emerald-50 border-emerald-100/50 text-emerald-700"
            },
            {
              title: "Beta Software Testing",
              payout: "0.75 - 2.50 USDm",
              features: ["Explore newly launched webapps", "Identify layout issues", "Provide video records"],
              icon: <FlaskConical className="w-5 h-5 text-indigo-600" />,
              color: "bg-indigo-50 border-indigo-100/50 text-indigo-700"
            },
            {
              title: "Community & Groups",
              payout: "0.10 - 0.40 USDm",
              features: ["Join community Telegrams", "Enter discord networks", "Actively discuss projects"],
              icon: <Users className="w-5 h-5 text-amber-600" />,
              color: "bg-amber-50 border-amber-100/50 text-amber-800"
            }
          ].map((cat, idx) => (
            <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4 flex flex-col justify-between hover:border-slate-200 transition-colors shadow-sm">
              <div className="space-y-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color} border shadow-inner`}>
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
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 hover:text-slate-950 rounded-xl text-[10px] font-extrabold text-center block transition-all active:scale-[0.98] uppercase tracking-wider"
              >
                Browse Tasks
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* USER GUIDE & FAQ ACCORDIONS (DIRECT FROM ABOUT TAB) */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest block">Guidebook</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Get clear info on how to connect your wallet, create campaigns, or withdraw rewards.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              id: "wallet",
              title: "🔌 How to Connect Your Wallet",
              content: "Tap the Connect Wallet button inside the Tezra App header or on the landing page hero section. Choose your preferred Web3 provider (such as MetaMask, Valora, or MiniPay). Make sure your network is Celo Mainnet. Your wallet details and USDm balance will load automatically."
            },
            {
              id: "create-task",
              title: "📢 How to Create a Task (Creators)",
              content: "Launch the Tezra App and tap the floating + button on the feed homepage. Fill in the title, description, instructions, slot limit, and payout value per worker. Secure the budget using USDm stablecoins on-chain, or fund it with bank transfer/cards in Naira (NGN) via Korapay."
            },
            {
              id: "complete-task",
              title: "💰 How to Complete Tasks & Earn",
              content: "Browse the live campaign feed on the homepage and select any task. Read the requirements, follow the target links, execute the task (e.g. follow, comment, download, test), take a screenshot proof, upload it in the proof form, and submit."
            },
            {
              id: "refund",
              title: "🔄 How to Request Escrow Refunds",
              content: "If a campaign you created expires and still has remaining slots left, go to the Profile tab, tap Manage Campaigns, find the target campaign, and tap Refund Escrow. The remaining budget releases back to your address instantly."
            },
            {
              id: "dispute",
              title: "⚖️ How to Open a Dispute",
              content: "If your proof gets rejected by a creator but you followed all task parameters correctly, navigate to your Profile tab, view your rejected submissions list, and tap Dispute Rejection. Admins will manually evaluate your screenshot proof and render a fair final verdict."
            }
          ].map((faq) => {
            const isOpen = openAccordion === faq.id;
            return (
              <div key={faq.id} className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                <button
                  type="button"
                  onClick={() => setOpenAccordion(isOpen ? null : faq.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                >
                  <span>{faq.title}</span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 font-sans font-medium">
                    {faq.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* COMMUNITY UPDATE & SOCIALS CHANNELS SECTION */}
      <section className="py-16 px-6 max-w-5xl mx-auto w-full border-t border-slate-100">
        <div className="grid md:grid-cols-2 gap-10 items-center bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center">
              <TelegramIcon className="w-5 h-5 text-sky-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Join the Tezra Community</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">
              Stay in the loop with active task updates, platform announcements, and community support channels. Follow us or chat with helpdesk directly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-start sm:justify-end items-center">
            {/* Telegram Channel */}
            <a 
              href="https://t.me/tezra_updates"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <TelegramIcon className="w-4 h-4" />
              Telegram Channel
            </a>

            {/* WhatsApp Group */}
            <a 
              href="https://wa.me/12272143646"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <WhatsAppIcon className="w-4 h-4" />
              WhatsApp Support
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-100 bg-white px-6 text-center text-xs text-slate-400 font-bold mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 p-1 border border-slate-100 rounded-lg bg-white shadow-sm flex items-center justify-center">
              <TezraLogo className="w-full h-full grayscale opacity-60" />
            </div>
            <span className="text-slate-500 font-black">Tezra © 2026</span>
          </div>

          {/* Social X Twitter Logo Link */}
          <div className="flex items-center gap-4">
            <a 
              href="https://x.com/tezra_app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-center transition-all active:scale-95 shadow-sm"
              title="Follow Tezra on X"
            >
              <XIcon className="w-4 h-4" />
            </a>
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
