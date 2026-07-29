"use client";

import React, { useState } from "react";
import { Mail, Gift, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, setDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";
import { BadgeUnlockInfo } from "./BadgeUnlockModal";

interface EmailModalProps {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (badge: BadgeUnlockInfo) => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  walletAddress,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalizedAddress = walletAddress.toLowerCase();
      const userRef = doc(db, "users", normalizedAddress);
      const userSnap = await getDoc(userRef);

      // Check how many users already have an email registered to determine if this user is in first 10
      const usersSnap = await getDocs(collection(db, "users"));
      let emailUserCount = 0;
      usersSnap.forEach((uDoc) => {
        if (uDoc.data().email) emailUserCount++;
      });

      const isFirst10 = emailUserCount < 10;
      const taskCreditAmount = isFirst10 ? 1.0 : 0.0;

      const timestamp = new Date().toISOString();

      if (userSnap.exists()) {
        const currentBadges = userSnap.data()?.badges || {};
        currentBadges.pioneer = timestamp;

        await updateDoc(userRef, {
          email: email.trim().toLowerCase(),
          xp: increment(50),
          badges: currentBadges,
          taskCredit: increment(taskCreditAmount),
          emailSubmittedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          walletAddress: normalizedAddress,
          email: email.trim().toLowerCase(),
          xp: 50,
          badges: { pioneer: timestamp },
          taskCredit: taskCreditAmount,
          createdAt: serverTimestamp(),
          emailSubmittedAt: serverTimestamp(),
        });
      }

      // Trigger email send via API
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "welcome_gift",
            payload: {
              toEmail: email.trim().toLowerCase(),
              walletAddress: normalizedAddress,
              isFirst10,
            },
          }),
        });
      } catch (err) {
        console.error("Failed to trigger welcome email API call:", err);
      }

      setLoading(false);
      onClose();

      // Trigger badge unlock animation modal!
      onSuccess({
        id: "pioneer",
        title: isFirst10 ? "Early Pioneer + $1 Task Credit!" : "Early Pioneer Badge",
        description: isFirst10
          ? "You are one of our first 10 members! You got 50 XP, the Pioneer Badge, and $1 Task Creation Credit!"
          : "You claimed your welcome gift! You unlocked 50 XP and the exclusive Pioneer Badge.",
        icon: "🎖️",
        xpReward: 50,
      });
    } catch (err: any) {
      console.error("Error saving email:", err);
      setError(err.message || "Failed to save email. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Claim Your Welcome Gift!</h2>
            <p className="text-xs text-slate-400">Add your email to claim your pioneer rewards</p>
          </div>
        </div>

        {/* Reward Summary Card */}
        <div className="my-4 p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs space-y-2 text-slate-300">
          <div className="flex items-center gap-2 font-medium text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Instant Rewards for Email Registration:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
            <li>
              <strong className="text-amber-300">First 10 Users:</strong> Get <strong>$1.00 Task Creation Credit</strong> (usable for campaign fees)!
            </li>
            <li>
              <strong className="text-white">All Members:</strong> Receive <strong>50 XP</strong> & unlock <strong>Pioneer Badge 🎖️</strong>.
            </li>
            <li>Receive task updates, withdrawal notifications, & streak alerts.</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="order-2 sm:order-1 sm:w-1/3 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition whitespace-nowrap"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={loading}
              className="order-1 sm:order-2 sm:w-2/3 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <span>Claim Gift & Unlock</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
