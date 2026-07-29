"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { X, Share2, Send, Download, Check, Sparkles, Trophy } from "lucide-react";
import logoImg from "../assets/logo.png";

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
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (badge) {
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

  const appUrl = "https://tuzo.xyz";
  const shareText = `I just unlocked the "${badge.title}" badge on Tuzo! 🏆 Earn crypto rewards by completing micro-tasks.`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(appUrl);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=Tuzo,Celo,Web3,CryptoRewards`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;

  // Dynamically render and download the Badge Image card using Canvas API
  const handleDownloadBadge = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not get canvas context");

      // Load logo image asynchronously
      const logo = new Image();
      logo.src = logoImg.src;
      await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = resolve; // fallback if logo loading fails
      });

      // 1. Draw elegant background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 800);

      // 2. Draw stylish glowing border
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 784, 784);

      // Draw subtle inner border
      ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, 752, 752);

      // 3. Draw Tuzo Brand Logo and Header
      try {
        ctx.drawImage(logo, 375, 48, 50, 50);
      } catch (err) {
        console.error("Failed to draw logo on canvas:", err);
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("TUZO ACHIEVEMENT", 400, 130);

      // 4. Draw Glowing Badge Icon Backdrop
      const auraGrad = ctx.createRadialGradient(400, 310, 0, 400, 310, 160);
      auraGrad.addColorStop(0, "rgba(16, 185, 129, 0.25)");
      auraGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(400, 310, 160, 0, Math.PI * 2);
      ctx.fill();

      // Draw Icon emoji
      ctx.fillStyle = "#ffffff";
      ctx.font = "110px sans-serif";
      ctx.fillText(badge.icon || "🏆", 400, 350);

      // 5. Draw Title & Description
      ctx.fillStyle = "#ffffff";
      ctx.font = "black 46px sans-serif";
      ctx.fillText(badge.title, 400, 505);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "normal 22px sans-serif";
      
      // Helper function to wrap text on canvas
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(" ");
        let line = "";
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + " ";
            y += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, y);
      };

      wrapText(badge.description, 400, 555, 600, 32);

      // 6. Draw XP Reward Box
      ctx.fillStyle = "rgba(245, 158, 11, 0.1)";
      ctx.beginPath();
      ctx.roundRect(250, 640, 300, 50, 12);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`🏆 +${badge.xpReward} XP Unlocked`, 400, 672);

      // 7. Footer
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 18px sans-serif";
      ctx.fillText("Earn stablecoins & complete quests at tuzo.xyz", 400, 735);

      // Trigger actual download link
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `tuzo_badge_${badge.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating badge image:", err);
    } finally {
      setDownloading(false);
    }
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
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-755 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group"
              title="Share on X (formerly Twitter)"
            >
              {/* Modern X Logo */}
              <svg className="w-5 h-5 text-slate-100 group-hover:scale-110 transition-transform fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-[10px] mt-1.5 font-medium whitespace-nowrap">Share on X</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-755 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group"
              title="Share on Telegram"
            >
              <Send className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] mt-1.5 font-medium whitespace-nowrap">Telegram</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-755 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group"
              title="Share on WhatsApp"
            >
              {/* Modern WhatsApp Logo */}
              <svg className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-[10px] mt-1.5 font-medium whitespace-nowrap">WhatsApp</span>
            </a>

            <button
              onClick={handleDownloadBadge}
              disabled={downloading}
              className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-755 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition group disabled:opacity-50"
              title="Download Badge Image"
            >
              <Download className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] mt-1.5 font-medium whitespace-nowrap">
                {downloading ? "..." : "Download"}
              </span>
            </button>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition transform active:scale-95 whitespace-nowrap"
        >
          Awesome! Continue
        </button>
      </div>
    </div>
  );
};
