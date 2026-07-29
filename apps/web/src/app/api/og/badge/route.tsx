import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

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

const AVATAR_DESIGNS = [
  { bg1: "#059669", bg2: "#10b981", ring: "#34d399" },
  { bg1: "#7c3aed", bg2: "#a78bfa", ring: "#c4b5fd" },
  { bg1: "#d97706", bg2: "#f59e0b", ring: "#fcd34d" },
  { bg1: "#0284c7", bg2: "#38bdf8", ring: "#7dd3fc" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const badgeId = searchParams.get('id') || 'pioneer';
    const badge = BADGES[badgeId] || BADGES.pioneer;

    const rawName = searchParams.get('name') || '';
    const displayName = rawName ? (rawName.startsWith('@') ? rawName : `@${rawName}`) : '';
    const designIdxStr = searchParams.get('design') || '0';
    const designIdx = parseInt(designIdxStr, 10) % 4;
    const design = AVATAR_DESIGNS[designIdx];
    const initial = displayName ? (displayName.startsWith('@') ? displayName.charAt(1).toUpperCase() : displayName.charAt(0).toUpperCase()) : '?';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            position: 'relative',
            border: '12px solid #10b981',
          }}
        >
          {/* User Avatar + Name (top-right) */}
          {displayName && (
            <div
              style={{
                position: 'absolute',
                top: '24px',
                right: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '16px', color: '#cbd5e1', fontWeight: 500 }}>
                {displayName}
              </span>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${design.bg1}, ${design.bg2})`,
                  border: `3px solid ${design.ring}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {initial}
              </div>
            </div>
          )}

          {/* Logo Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #059669, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 800,
                color: '#ffffff',
              }}
            >
              T
            </div>
            <span style={{ fontSize: '28px', color: '#10b981', fontWeight: 700, letterSpacing: '1px' }}>
              TEZRA ACHIEVEMENT
            </span>
          </div>

          {/* Badge Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '180px',
              height: '180px',
              borderRadius: '32px',
              background: 'linear-gradient(to bottom right, #10b981, #0d9488)',
              fontSize: '100px',
              color: '#ffffff',
              marginBottom: '30px',
            }}
          >
            {badge.emoji}
          </div>

          {/* Title */}
          <span style={{ fontSize: '48px', fontWeight: 900, color: '#ffffff', marginBottom: '10px' }}>
            {badge.name}
          </span>

          {/* Description */}
          <span style={{ fontSize: '24px', color: '#cbd5e1', textAlign: 'center', maxWidth: '600px', marginBottom: '30px' }}>
            {badge.description}
          </span>

          {/* Reward */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '2px solid #f59e0b',
              padding: '10px 30px',
              borderRadius: '20px',
              fontSize: '24px',
              color: '#f59e0b',
              fontWeight: 700,
              marginBottom: '40px',
            }}
          >
            🏆 +{badge.xp} XP Unlocked
          </div>

          {/* Footer */}
          <span style={{ fontSize: '18px', color: '#94a3b8' }}>
            Earn stablecoins & complete quests at tezra.xyz
          </span>
        </div>
      ),
      {
        width: 800,
        height: 800,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
