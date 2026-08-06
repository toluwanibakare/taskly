"use client";

import React, { useRef, useState } from "react";
import { Download, X } from "lucide-react";
import logoImg from "../../assets/logo.png";

const AVATAR_DESIGNS = [
  { bg1: "#059669", bg2: "#10b981", ring: "#34d399" },
  { bg1: "#7c3aed", bg2: "#a78bfa", ring: "#c4b5fd" },
  { bg1: "#d97706", bg2: "#f59e0b", ring: "#fcd34d" },
  { bg1: "#0284c7", bg2: "#38bdf8", ring: "#7dd3fc" },
];

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  walletAddress: string;
  avatarUrl?: string;
  avatarDesign?: number;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  displayName,
  walletAddress,
  avatarUrl,
  avatarDesign,
}) => {
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const formattedName = displayName.startsWith("@") ? displayName : `@${displayName}`;
  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  const drawCertificate = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 900, 600);

    // 2. Borders & Ornaments
    ctx.strokeStyle = "#10b981"; // Emerald
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 886, 586);

    ctx.strokeStyle = "#2563eb"; // Blue
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, 856, 556);

    // Corner Ornaments
    const drawCorner = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = "#10b981";
      ctx.fillRect(x, y, w, h);
    };
    drawCorner(22, 22, 30, 8);
    drawCorner(22, 22, 8, 30);
    drawCorner(848, 22, 30, 8);
    drawCorner(870, 22, 8, 30);
    drawCorner(22, 570, 30, 8);
    drawCorner(22, 548, 8, 30);
    drawCorner(848, 570, 30, 8);
    drawCorner(870, 548, 8, 30);

    // 3. Load & Draw Logo
    const logo = new Image();
    logo.src = logoImg.src;
    await new Promise((resolve) => {
      logo.onload = resolve;
      logo.onerror = resolve;
    });
    try {
      ctx.drawImage(logo, 425, 45, 50, 50);
    } catch (e) {
      console.error(e);
    }

    // 4. Texts
    ctx.textAlign = "center";
    
    // Header
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("TEZRA MEMBERSHIP NETWORK", 450, 125);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 32px Georgia, serif";
    ctx.fillText("OFFICIAL CERTIFICATE", 450, 175);

    ctx.fillStyle = "#64748b";
    ctx.font = "italic 16px sans-serif";
    ctx.fillText("This document proudly certifies that", 450, 225);

    // Username & Avatar centered at y=290
    const designIdx = avatarDesign !== undefined ? avatarDesign % 4 : 0;
    const design = AVATAR_DESIGNS[designIdx];
    const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

    const avatarSize = 60;
    const gap = 16;
    ctx.font = "900 52px sans-serif";
    const nameWidth = ctx.measureText(formattedName).width;
    const totalUserWidth = avatarSize + gap + nameWidth;
    const userStartX = (900 - totalUserWidth) / 2;

    const avatarX = userStartX;
    const avatarY = 290 - 48;

    // Draw avatar circle and content
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();

    // Background gradient for avatar
    const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    avatarGrad.addColorStop(0, design.bg1);
    avatarGrad.addColorStop(1, design.bg2);
    ctx.fillStyle = avatarGrad;
    ctx.fill();

    let imgDrawn = false;
    if (avatarUrl) {
      try {
        const avatarImg = new Image();
        avatarImg.crossOrigin = "anonymous";
        avatarImg.src = avatarUrl;
        await new Promise((resolve, reject) => {
          avatarImg.onload = resolve;
          avatarImg.onerror = reject;
        });
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        imgDrawn = true;
      } catch (e) {
        console.error("Failed to draw avatar image on certificate canvas:", e);
      }
    }

    ctx.restore();

    if (!imgDrawn) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      ctx.restore();
    }

    // Ring around avatar
    ctx.save();
    ctx.strokeStyle = design.ring;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 - 1.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Username (Gradient / Big)
    ctx.save();
    ctx.textAlign = "left";
    const grad = ctx.createLinearGradient(avatarX + avatarSize + gap, 0, avatarX + avatarSize + gap + nameWidth, 0);
    grad.addColorStop(0, "#2563eb");
    grad.addColorStop(1, "#10b981");
    ctx.fillStyle = grad;
    ctx.font = "900 52px sans-serif";
    ctx.fillText(formattedName, avatarX + avatarSize + gap, 290);
    ctx.restore();

    // Wallet address
    ctx.fillStyle = "#64748b";
    ctx.font = "normal 14px monospace";
    ctx.fillText(`Celo Wallet ID: ${shortAddress}`, 450, 325);

    // Description text
    ctx.fillStyle = "#334155";
    ctx.font = "normal 16px sans-serif";
    ctx.fillText("is a verified early pioneer of the Tezra microwork marketplace,", 450, 380);
    ctx.fillText("officially registered on the Celo blockchain for secure stablecoin rewards.", 450, 405);

    // Date
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`DATE OF REGISTRATION: ${today.toUpperCase()}`, 450, 460);

    // Signature
    ctx.fillStyle = "#1d4ed8"; // Ink blue signature color
    ctx.font = "italic 38px 'Brush Script MT', 'Lucida Handwriting', 'Segoe Script', cursive";
    ctx.fillText("TMB", 450, 502);

    // Footer signature line
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(350, 515);
    ctx.lineTo(550, 515);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("TEZRA ECOSYSTEM AUDIT", 450, 532);

    // 5. Verification Seal (Gold-like style at bottom right - bigger & further down-right)
    const sealX = 775;
    const sealY = 485;
    ctx.fillStyle = "#f59e0b"; // Gold
    ctx.beginPath();
    ctx.arc(sealX, sealY, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sealX, sealY, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("VERIFIED", sealX, sealY - 4);
    ctx.fillText("MEMBER", sealX, sealY + 8);

    return canvas;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await drawCertificate();
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `tezra_member_certificate_${displayName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate member certificate:", err);
    } finally {
      setDownloading(false);
    }
  };

  const shareText = `🏅 Verified Pioneer on @earnwithtezra, built on @Celo!\n\nEarn stablecoins on Minipay - no stablecoin experience needed.\n\nGet your certificate here 👇\nhttps://tezra.xyz\n\nCC: @0xTMB\n\n#TezraPioneerCampaign #Tezra #Minipay #Celo`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-slate-100 text-center animate-scale-up">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Member Certificate!</h2>
        <p className="text-slate-500 text-xs mt-1 mb-6">Download and share to participate in the <strong className="text-emerald-600">$10 Campaign</strong> — most engaged post wins!</p>

        {/* Certificate Display Mockup */}
        <div className="border-4 border-[#10b981] p-6 rounded-2xl bg-white shadow-md text-slate-950 font-sans max-w-sm mx-auto relative overflow-hidden mb-6">
          <div className="absolute top-2 right-2 text-[8px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase">
            Pioneer
          </div>
          <div className="w-8 h-8 mx-auto mb-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
            <img src={logoImg.src} alt="Tezra Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-[9px] font-bold text-slate-400 block tracking-widest uppercase">Tezra Member Certificate</span>
          <div className="flex items-center justify-center gap-2 mt-2.5 mb-1">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-slate-100 shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${AVATAR_DESIGNS[avatarDesign !== undefined ? avatarDesign % 4 : 0].bg1}, ${AVATAR_DESIGNS[avatarDesign !== undefined ? avatarDesign % 4 : 0].bg2})`,
                }}
              >
                {displayName ? displayName.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <h3 className="text-base font-black text-[#2563eb] tracking-tight">{formattedName}</h3>
          </div>
          <span className="text-[8px] text-slate-400 font-mono block mb-3">{shortAddress}</span>
          <p className="text-[10px] text-slate-600 leading-relaxed max-w-xs mx-auto">
            Is officially certified as a verified early pioneer. Earns stablecoins and participates in quests at <strong>tezra.xyz</strong>.
          </p>
        </div>

        {/* How to enter steps */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 mb-4 text-left space-y-1.5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">How to enter the campaign</p>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-4 h-4 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-[8px] font-black mt-0.5">1</span>
            <p className="text-[10px] text-slate-600 font-medium">Download your certificate below</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-4 h-4 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-[8px] font-black mt-0.5">2</span>
            <p className="text-[10px] text-slate-600 font-medium">Post on X with your certificate image attached</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[8px] font-black mt-0.5">3</span>
            <p className="text-[10px] text-emerald-700 font-bold">Tag <strong>@earnwithtezra</strong> & <strong>@0xTMB</strong> to qualify — most engaged wins!</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Generating..." : "Download Certificate"}</span>
          </button>
          
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-5 bg-black hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span>Post to X & Join Campaign</span>
          </a>
        </div>
      </div>
    </div>
  );
};
