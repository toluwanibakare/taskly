import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== "false"; // default true for 465
const SMTP_USER = process.env.SMTP_USER || "mosesbakare48@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mosesbakare48@gmail.com";
export const APP_URL = "https://taskly-celo-3022.firebaseapp.com";
export const TELEGRAM_URL = "https://t.me/taskly_community";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

interface EmailTemplateProps {
  title: string;
  preheader?: string;
  badgeText?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function generateTasklyEmailHtml({
  title,
  preheader = "Taskly Notification",
  badgeText = "Taskly Update",
  bodyHtml,
  ctaText,
  ctaUrl = APP_URL,
}: EmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f8fafc;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0f172a;
      padding: 32px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 600px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%);
      padding: 36px 32px;
      text-align: center;
    }
    .brand-title {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .brand-sub {
      font-size: 13px;
      color: #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 6px;
      font-weight: 600;
    }
    .content {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-size: 12px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #f8fafc;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    p, ul, ol {
      font-size: 15px;
      line-height: 1.6;
      color: #cbd5e1;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .highlight-box {
      background-color: #0f172a;
      border-left: 4px solid #10b981;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 16px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);
    }
    .footer {
      background-color: #0f172a;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #334155;
    }
    .footer p {
      font-size: 13px;
      color: #94a3b8;
      margin: 4px 0;
    }
    .footer a {
      color: #34d399;
      text-decoration: none;
      font-weight: 600;
    }
    .telegram-btn {
      display: inline-block;
      margin-top: 12px;
      font-size: 13px;
      color: #38bdf8 !important;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
      ${preheader}
    </div>
    <div class="card">
      <div class="header">
        <div class="brand-title">⚡ TASKLY</div>
        <div class="brand-sub">Micro-Tasks & Web3 Rewards</div>
      </div>
      <div class="content">
        <div class="badge">${badgeText}</div>
        <h1>${title}</h1>
        ${bodyHtml}
        ${
          ctaText
            ? `<div class="btn-container">
                <a href="${ctaUrl}" target="_blank" class="btn">${ctaText}</a>
               </div>`
            : ""
        }
      </div>
      <div class="footer">
        <p>From <a href="${APP_URL}" target="_blank">Taskly</a></p>
        <p>© 2026 Taskly. All rights reserved.</p>
        <p>
          <a href="${TELEGRAM_URL}" target="_blank" class="telegram-btn">
            ✈️ Join Taskly Telegram Channel for Updates & Giveaways
          </a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    if (!SMTP_PASS) {
      console.warn("SMTP_PASS is missing, skipping real email dispatch");
      return false;
    }
    const info = await transporter.sendMail({
      from: `"Taskly" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email successfully sent to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    return false;
  }
}

// Event Notification Trigger Handlers

export async function sendWelcomeGiftEmail(toEmail: string, isFirst10: boolean): Promise<boolean> {
  const giftDetails = isFirst10
    ? `🎁 <strong>SPECIAL BONUS UNLOCKED!</strong> You are one of our first 10 early members! You have received a <strong>$1.00 Task Creation Credit</strong>, <strong>50 XP</strong>, and the exclusive <strong>Pioneer Badge</strong>.`
    : `🎁 You have unlocked <strong>50 XP</strong> and the exclusive <strong>Pioneer Badge</strong>!`;

  const html = generateTasklyEmailHtml({
    title: "Welcome to Taskly! Claim Your Gift 🎁",
    preheader: "Your welcome gift is waiting for you on Taskly",
    badgeText: "Welcome Gift",
    bodyHtml: `
      <p>Hey there,</p>
      <p>Thank you for joining <strong>Taskly</strong> — the premier micro-tasking platform for web3 & crypto rewards!</p>
      <div class="highlight-box">
        <p style="margin:0;color:#f8fafc;">${giftDetails}</p>
      </div>
      <p>Log in to Taskly to see your Pioneer Badge, check your updated XP, and start completing tasks or launching your own campaigns.</p>
    `,
    ctaText: "Claim Gift on Taskly 🚀",
    ctaUrl: APP_URL,
  });

  return sendEmail({
    to: toEmail,
    subject: "🎁 Claim Your Taskly Welcome Gift!",
    html,
  });
}

export async function sendAdminNewUserEmail(userEmail: string, walletAddress: string, isFirst10: boolean): Promise<boolean> {
  const html = generateTasklyEmailHtml({
    title: "New User Registered 🚀",
    preheader: `New user ${userEmail} registered on Taskly`,
    badgeText: "Admin Alert",
    bodyHtml: `
      <p>A new user has registered their email on Taskly:</p>
      <ul>
        <li><strong>Email:</strong> ${userEmail}</li>
        <li><strong>Wallet:</strong> ${walletAddress}</li>
        <li><strong>Early 10 Reward Eligible:</strong> ${isFirst10 ? "YES ($1 Task Credit Granted)" : "No"}</li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      </ul>
    `,
    ctaText: "Open Admin Dashboard",
    ctaUrl: APP_URL,
  });

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `🔔 Admin Alert: New User ${userEmail} Registered`,
    html,
  });
}

export async function sendTaskCreatedEmail(creatorEmail: string, taskTitle: string, taskId: string): Promise<boolean> {
  const html = generateTasklyEmailHtml({
    title: "Campaign Submitted Successfully!",
    preheader: `Your task "${taskTitle}" has been created`,
    badgeText: "Campaign Created",
    bodyHtml: `
      <p>Hello Creator,</p>
      <p>Your campaign <strong>"${taskTitle}"</strong> has been successfully submitted to Taskly.</p>
      <div class="highlight-box">
        <p style="margin:0;">Task ID: <code>${taskId}</code></p>
      </div>
      <p>Once funded or verified, workers across Taskly will start completing your campaign!</p>
    `,
    ctaText: "View Your Campaign",
    ctaUrl: `${APP_URL}?task=${taskId}`,
  });

  return sendEmail({
    to: creatorEmail,
    subject: `🚀 Task Created: ${taskTitle}`,
    html,
  });
}

export async function sendAdminTaskSubmittedEmail(creatorWallet: string, taskTitle: string, taskId: string, paymentMethod: string): Promise<boolean> {
  const html = generateTasklyEmailHtml({
    title: "New Campaign Submitted for Review",
    preheader: `New campaign "${taskTitle}" by ${creatorWallet}`,
    badgeText: "Admin Alert",
    bodyHtml: `
      <p>A campaign has been created on Taskly:</p>
      <ul>
        <li><strong>Title:</strong> ${taskTitle}</li>
        <li><strong>Task ID:</strong> ${taskId}</li>
        <li><strong>Creator Wallet:</strong> ${creatorWallet}</li>
        <li><strong>Payment Method:</strong> ${paymentMethod}</li>
      </ul>
    `,
    ctaText: "Inspect Task",
    ctaUrl: `${APP_URL}?task=${taskId}`,
  });

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `📋 Admin Alert: Campaign Created - ${taskTitle}`,
    html,
  });
}

export async function sendTaskLiveEmail(creatorEmail: string, taskTitle: string, taskId: string, paymentType: string): Promise<boolean> {
  const html = generateTasklyEmailHtml({
    title: "Your Campaign is Now LIVE! 🎉",
    preheader: `Your campaign "${taskTitle}" is now active on Taskly`,
    badgeText: "Campaign Live",
    bodyHtml: `
      <p>Great news!</p>
      <p>Your campaign <strong>"${taskTitle}"</strong> has been funded via <strong>${paymentType}</strong> and is officially LIVE!</p>
      <p>Users can now perform actions, submit proof, and complete your task.</p>
    `,
    ctaText: "View Live Campaign ⚡",
    ctaUrl: `${APP_URL}?task=${taskId}`,
  });

  return sendEmail({
    to: creatorEmail,
    subject: `🎉 Campaign LIVE: ${taskTitle}`,
    html,
  });
}

export async function sendTaskApprovalEmail(workerEmail: string, taskTitle: string, reward: string, approved: boolean): Promise<boolean> {
  const title = approved ? "Submission Approved! 💰" : "Submission Needs Review ❌";
  const badgeText = approved ? "Approved" : "Rejected";
  const bodyHtml = approved
    ? `<p>Congratulations! Your proof submission for <strong>"${taskTitle}"</strong> was approved.</p>
       <div class="highlight-box"><p style="margin:0;">Reward: <strong>${reward}</strong> added to your balance!</p></div>`
    : `<p>Your submission for <strong>"${taskTitle}"</strong> was rejected by the campaign creator.</p>
       <p>If you believe this is an error, you can submit a dispute from your Taskly dashboard.</p>`;

  const html = generateTasklyEmailHtml({
    title,
    preheader: `Task submission update for ${taskTitle}`,
    badgeText,
    bodyHtml,
    ctaText: "Go to Taskly Dashboard",
    ctaUrl: APP_URL,
  });

  return sendEmail({
    to: workerEmail,
    subject: `${approved ? "✅ Approved" : "❌ Rejected"}: ${taskTitle}`,
    html,
  });
}

export async function sendDisputeEmail(toEmail: string, isAdmin: boolean, taskTitle: string, disputeReason: string): Promise<boolean> {
  const html = generateTasklyEmailHtml({
    title: isAdmin ? "New Dispute Raised ⚠️" : "Dispute Filed on Your Task ⚠️",
    preheader: `Dispute logged for ${taskTitle}`,
    badgeText: "Dispute Alert",
    bodyHtml: `
      <p>A dispute has been initiated regarding <strong>"${taskTitle}"</strong>.</p>
      <div class="highlight-box">
        <p style="margin:0;"><strong>Reason / Note:</strong> ${disputeReason}</p>
      </div>
      <p>${isAdmin ? "Please inspect the dispute in the Admin panel." : "Our admin team will review the dispute shortly."}</p>
    `,
    ctaText: "Review Dispute",
    ctaUrl: APP_URL,
  });

  return sendEmail({
    to: toEmail,
    subject: `⚠️ Taskly Dispute: ${taskTitle}`,
    html,
  });
}

export async function sendStreakEmail(userEmail: string, streakCount: number, isWarning = false): Promise<boolean> {
  const title = isWarning ? "Don't lose your Taskly Streak! 🔥" : `Streak Milestone: ${streakCount} Days! 🔥`;
  const bodyHtml = isWarning
    ? `<p>Your daily streak is about to reset!</p>
       <p>Complete at least 1 task today on Taskly to keep your <strong>${streakCount}-day streak</strong> alive and earn bonus XP rewards.</p>`
    : `<p>Awesome job!</p>
       <p>You've reached a <strong>${streakCount}-day activity streak</strong> on Taskly! Keep completing tasks to level up and unlock exclusive badges.</p>`;

  const html = generateTasklyEmailHtml({
    title,
    preheader: isWarning ? "Keep your Taskly streak alive" : `${streakCount} day streak achieved!`,
    badgeText: "Streak Alert",
    bodyHtml,
    ctaText: "Complete Task Now 🔥",
    ctaUrl: APP_URL,
  });

  return sendEmail({
    to: userEmail,
    subject: isWarning ? `🔥 Warning: Keep your ${streakCount}-day streak alive!` : `🔥 ${streakCount}-Day Streak Milestone!`,
    html,
  });
}

export async function sendBroadcastEmail(recipientEmails: string[], subject: string, messageContent: string): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (const email of recipientEmails) {
    const html = generateTasklyEmailHtml({
      title: subject,
      preheader: subject,
      badgeText: "Announcement",
      bodyHtml: `<p>${messageContent.replace(/\n/g, "<br/>")}</p>`,
      ctaText: "Explore Taskly ⚡",
      ctaUrl: APP_URL,
    });

    const sent = await sendEmail({ to: email, subject: `📢 Taskly Update: ${subject}`, html });
    if (sent) successCount++;
    else failureCount++;
  }

  return { successCount, failureCount };
}
