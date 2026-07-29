"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { X, Share2, Twitter, Send, MessageSquare, Check, Sparkles, Trophy } from "lucide-react";

export interface BadgeUnlockInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

interface BadgeUnlockModalProps {
  badge: BadgeUnlockInfo | null;
  onClose: () => void;
}

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({ badge, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (badge) {
      // Fire confetti when badge modal opens
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"],
        });
      } catch (err) {
        console.error("Confetti trigger error:", err);
      }
    }
  }, [badge]);

  if (!badge) return null;

  const appUrl = "https://taskly-celo-3022.firebaseapp.com";
  const shareText = `I just unlocked the "${badge.title}" badge on Tuzo! 🚀 Earn crypto rewards by completing micro-tasks.`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(appUrl);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=Tuzo,Celo,Web3,CryptoRewards`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;

  const handleCopyLink = () => {
    const copyContent = `${shareText} ${appUrl}`;
    navigator.clipboard.writeText(copyContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center transform transition-all animate-scale-up">
        {/* Ambient Glow background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Badge Unlocked!</span>
        </div>

        {/* Animated Badge Icon Container */}
        <div className="relative mx-auto my-4 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 rounded-3xl p-1 shadow-lg shadow-emerald-500/25 animate-pulse">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-5xl sm:text-6xl">
            {badge.icon || "🏆"}
          </div>
        </div>

        {/* Title & XP */}
        <h2 className="text-2xl font-black text-white tracking-tight mt-2">{badge.title}</h2>
        <p className="text-slate-300 text-sm mt-1">{badge.description}</p>

        <div className="inline-flex items-center gap-2 my-4 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-amber-400 font-bold text-sm">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>+{badge.xpReward} XP Earned</span>
        </div>

        {/* Share Section for Giveaways */}
        <div className="mt-4 pt-4 border-t border-slate-800 text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            📢 Share your badge to participate in Giveaways!
          </p>

          <div className="grid grid-cols-4 gap-2">
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group"
              title="Share on X / Twitter"
            >
              <Twitter className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] mt-1 font-medium">X / Twitter</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group"
              title="Share on Telegram"
            >
              <Send className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] mt-1 font-medium">Telegram</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group"
              title="Share on WhatsApp"
            >
              <MessageSquare className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] mt-1 font-medium">WhatsApp</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group"
              title="Copy Share Link"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Share2 className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[11px] mt-1 font-medium">{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
        >
          Awesome! Continue 🚀
        </button>
      </div>
    </div>
  );
};
