"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowRight, Trophy, User, Sparkles } from "lucide-react";

interface OnboardingTourProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [step, setStep] = useState(0); // 0 = not started, 1 = earn tab, 2 = profile tab, 3 = finished
  const [highlightCoords, setHighlightCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const resizeTimeout = useRef<any>(null);

  // Check if onboarding was completed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("tezra_onboarding_completed");
      if (!completed) {
        // Wait 2.5 seconds after page loads to start tour automatically
        const timer = setTimeout(() => {
          setStep(1);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Update target bounding box coordinates dynamically
  const updateHighlight = () => {
    const targetId = step === 1 ? "nav-tab-earn" : step === 2 ? "nav-tab-profile" : null;
    if (!targetId) {
      setHighlightCoords(null);
      return;
    }

    const el = document.getElementById(targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlightCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  useEffect(() => {
    updateHighlight();

    // Re-calculate on resize
    const handleResize = () => {
      clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(updateHighlight, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", updateHighlight);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", updateHighlight);
    };
  }, [step, activeTab]);

  if (step === 0 || step === 3) return null;

  const handleNext = () => {
    if (step === 1) {
      // Transition to profile highlight step
      setStep(2);
    } else if (step === 2) {
      // Complete tour
      localStorage.setItem("tezra_onboarding_completed", "true");
      setStep(3);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("tezra_onboarding_completed", "true");
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Dimmed background overlay */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] transition-all" />

      {/* Highlight cutout ring */}
      {highlightCoords && (
        <div
          className="absolute rounded-2xl border-4 border-emerald-400 bg-white/10 shadow-lg shadow-emerald-400/40 animate-pulse transition-all duration-300 pointer-events-none"
          style={{
            top: `${highlightCoords.top - 8}px`,
            left: `${highlightCoords.left - 8}px`,
            width: `${highlightCoords.width + 16}px`,
            height: `${highlightCoords.height + 16}px`,
          }}
        />
      )}

      {/* Tooltip Card */}
      {highlightCoords && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl animate-scale-up text-white"
          style={{
            top: `${highlightCoords.top - 200}px`, // Place above the target nav element
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            {step === 1 ? (
              <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
            ) : (
              <User className="w-5 h-5 text-blue-400" />
            )}
            <h3 className="font-extrabold text-sm tracking-tight text-white uppercase">
              {step === 1 ? "🚀 New: Earn Rewards Page" : "📂 Unified control center"}
            </h3>
          </div>

          {/* Description */}
          <p className="text-slate-300 text-xs leading-relaxed font-medium">
            {step === 1
              ? "We've added an Earn rewards hub! Click here to participate in referral contests, sign-up giveaways, and collector sprints."
              : "Your Task History and Transaction Logs have been merged directly into your Profile page for a cleaner layout."}
          </p>

          {/* Navigation controls */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs">
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white font-bold"
            >
              Skip Tour
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold">
                Step {step} of 2
              </span>
              <button
                onClick={handleNext}
                className="py-1.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-lg flex items-center gap-1 active:scale-95 transition"
              >
                <span>{step === 1 ? "Next" : "Finish"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
