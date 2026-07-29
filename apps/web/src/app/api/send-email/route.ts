import { NextResponse } from "next/server";
import {
  sendWelcomeGiftEmail,
  sendAdminNewUserEmail,
  sendTaskCreatedEmail,
  sendAdminTaskSubmittedEmail,
  sendTaskLiveEmail,
  sendTaskApprovalEmail,
  sendDisputeEmail,
  sendStreakEmail,
  sendBroadcastEmail,
  sendBadgeUnlockEmail,
  sendEmail,
} from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    switch (action) {
      case "welcome_gift": {
        const { toEmail, isFirst10, walletAddress, displayName } = payload || {};
        if (!toEmail) return NextResponse.json({ error: "Missing toEmail" }, { status: 400 });
        
        const success = await sendWelcomeGiftEmail(toEmail, !!isFirst10, displayName);
        if (walletAddress) {
          await sendAdminNewUserEmail(toEmail, walletAddress, !!isFirst10);
        }
        return NextResponse.json({ success });
      }

      case "task_created": {
        const { creatorEmail, creatorWallet, taskTitle, taskId, paymentMethod } = payload || {};
        if (creatorEmail && taskTitle && taskId) {
          await sendTaskCreatedEmail(creatorEmail, taskTitle, taskId);
        }
        if (creatorWallet && taskTitle && taskId) {
          await sendAdminTaskSubmittedEmail(creatorWallet, taskTitle, taskId, paymentMethod || "crypto");
        }
        return NextResponse.json({ success: true });
      }

      case "task_live": {
        const { creatorEmail, taskTitle, taskId, paymentType } = payload || {};
        if (creatorEmail && taskTitle && taskId) {
          await sendTaskLiveEmail(creatorEmail, taskTitle, taskId, paymentType || "Naira Automated");
        }
        return NextResponse.json({ success: true });
      }

      case "task_approval": {
        const { workerEmail, taskTitle, reward, approved } = payload || {};
        if (workerEmail && taskTitle) {
          await sendTaskApprovalEmail(workerEmail, taskTitle, reward || "Reward", !!approved);
        }
        return NextResponse.json({ success: true });
      }

      case "dispute": {
        const { userEmail, taskTitle, disputeReason } = payload || {};
        if (taskTitle && disputeReason) {
          // Send to Admin
          await sendDisputeEmail("", true, taskTitle, disputeReason);
          // Send to User if email available
          if (userEmail) {
            await sendDisputeEmail(userEmail, false, taskTitle, disputeReason);
          }
        }
        return NextResponse.json({ success: true });
      }

      case "streak": {
        const { userEmail, streakCount, isWarning } = payload || {};
        if (userEmail && streakCount) {
          await sendStreakEmail(userEmail, streakCount, !!isWarning);
        }
        return NextResponse.json({ success: true });
      }

      case "badge_unlock": {
        const { toEmail, badgeName, badgeEmoji, badgeDescription, xpReward } = payload || {};
        if (toEmail && badgeName) {
          await sendBadgeUnlockEmail(toEmail, badgeName, badgeEmoji || "", badgeDescription || "", xpReward || 0);
        }
        return NextResponse.json({ success: true });
      }

      case "custom": {
        const { to, subject, html } = payload || {};
        if (!to || !subject || !html) {
          return NextResponse.json({ error: "Missing custom email fields" }, { status: 400 });
        }
        const success = await sendEmail({ to, subject, html });
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Error in /api/send-email:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
