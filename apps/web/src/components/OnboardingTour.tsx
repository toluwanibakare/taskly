"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowRight, Trophy, User } from "lucide-react";

interface OnboardingTourProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [step, setStep] = useState(0); // 0 = not started, 1 = earn tab, 2 = profile tab, 3 = finished
  const [highlightCoords, setHighlightCoords] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const resizeTimeout = useRef<any>(null);

  // Lock body scroll when tour is active
  useEffect(() => {
    if (step === 1 || step === 2) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [step]);

  // Check if onboarding was completed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("tezra_onboarding_completed");
      if (!completed) {
        const timer = setTimeout(() => {
          setStep(1);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Update target bounding box coordinates dynamically
  const updateHighlight = () => {
    const targetId =
      step === 1 ? "nav-tab-earn" : step === 2 ? "nav-tab-profile" : null;
    if (!targetId) {
      setHighlightCoords(null);
      return;
    }
    const el = document.getElementById(targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlightCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  useEffect(() => {
    updateHighlight();
    const handleResize = () => {
      clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(updateHighlight, 80);
    };
    window.addEventListener("resize", handleResize);
    // Don't listen to scroll (body is locked)
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [step, activeTab]);

  if (step === 0 || step === 3) return null;

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      localStorage.setItem("tezra_onboarding_completed", "true");
      setStep(3);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("tezra_onboarding_completed", "true");
    setStep(3);
  };

  // Build SVG cutout spotlight
  const W = typeof window !== "undefined" ? window.innerWidth : 390;
  const H = typeof window !== "undefined" ? window.innerHeight : 844;
  const pad = 10;
  const rx = 14; // border radius of spotlight hole

  const spotlightPath = highlightCoords
    ? `M 0 0 H ${W} V ${H} H 0 Z
       M ${highlightCoords.left - pad} ${highlightCoords.top - pad}
       Q ${highlightCoords.left - pad} ${highlightCoords.top - pad - rx}
         ${highlightCoords.left - pad + rx} ${highlightCoords.top - pad - rx}
       H ${highlightCoords.left + highlightCoords.width + pad - rx}
       Q ${highlightCoords.left + highlightCoords.width + pad} ${highlightCoords.top - pad - rx}
         ${highlightCoords.left + highlightCoords.width + pad} ${highlightCoords.top - pad}
       V ${highlightCoords.top + highlightCoords.height + pad - rx}
       Q ${highlightCoords.left + highlightCoords.width + pad} ${highlightCoords.top + highlightCoords.height + pad}
         ${highlightCoords.left + highlightCoords.width + pad - rx} ${highlightCoords.top + highlightCoords.height + pad}
       H ${highlightCoords.left - pad + rx}
       Q ${highlightCoords.left - pad} ${highlightCoords.top + highlightCoords.height + pad}
         ${highlightCoords.left - pad} ${highlightCoords.top + highlightCoords.height + pad - rx}
       Z`
    : `M 0 0 H ${W} V ${H} H 0 Z`;

  // Tooltip position: above the highlight area, or below if near top
  const tooltipTop = highlightCoords
    ? highlightCoords.top - pad > 220
      ? highlightCoords.top - pad - 200
      : highlightCoords.top + highlightCoords.height + pad + 12
    : H / 2 - 80;

  return (
    <div className="fixed inset-0 z-[999] pointer-events-auto">
      {/* SVG spotlight overlay - dims everything except the hole */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ position: "fixed" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White = visible (dimmed). Black = transparent (bright hole) */}
            <rect width={W} height={H} fill="white" />
            {highlightCoords && (
              <rect
                x={highlightCoords.left - pad}
                y={highlightCoords.top - pad}
                width={highlightCoords.width + pad * 2}
                height={highlightCoords.height + pad * 2}
                rx={rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay with cutout */}
        <rect
          width={W}
          height={H}
          fill="rgba(2,6,23,0.82)"
          mask="url(#spotlight-mask)"
        />
        {/* Glowing emerald ring around spotlight */}
        {highlightCoords && (
          <rect
            x={highlightCoords.left - pad}
            y={highlightCoords.top - pad}
            width={highlightCoords.width + pad * 2}
            height={highlightCoords.height + pad * 2}
            rx={rx}
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            opacity="0.9"
          />
        )}
      </svg>

      {/* Click interceptor on dimmed region — clicking outside = skip */}
      <div
        className="absolute inset-0"
        onClick={handleSkip}
        style={{ pointerEvents: "auto" }}
      />

      {/* Tooltip Card — above/below spotlight */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[88%] max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-2xl text-white pointer-events-auto"
        style={{ top: `${tooltipTop}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {step === 1 ? (
            <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
          ) : (
            <User className="w-5 h-5 text-blue-400" />
          )}
          <h3 className="font-extrabold text-sm tracking-tight text-white uppercase">
            {step === 1 ? "🚀 New: Earn Rewards Page" : "📂 Unified Control Center"}
          </h3>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-xs leading-relaxed font-medium">
          {step === 1
            ? "We've added an Earn rewards hub! Tap here to participate in referral contests, social quests, and collector sprints."
            : "Your Task History and Transaction Logs have been merged directly into your Profile page for a cleaner layout."}
        </p>

        {/* Arrow pointing down toward the highlighted nav item */}
        <div className="flex justify-center mt-3">
          <span className="text-emerald-400 text-lg animate-bounce">↓</span>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-white font-bold transition"
          >
            Skip Tour
          </button>
          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${step === 1 ? "bg-emerald-400" : "bg-slate-600"}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${step === 2 ? "bg-emerald-400" : "bg-slate-600"}`} />
            </div>
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
    </div>
  );
};
