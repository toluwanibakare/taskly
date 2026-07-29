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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const badgeId = searchParams.get('id') || 'pioneer';
    const badge = BADGES[badgeId] || BADGES.pioneer;

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
            padding: '60px',
            border: '12px solid #10b981',
          }}
        >
          {/* Logo Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <span style={{ fontSize: '32px', color: '#10b981', fontWeight: 'bold' }}>⚡ TEZRA ACHIEVEMENT</span>
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
          <span style={{ fontSize: '48px', fontWeight: '900', color: '#ffffff', marginBottom: '10px' }}>
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
              fontWeight: 'bold',
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
