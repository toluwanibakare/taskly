import { NextResponse } from "next/server";
import {
  sendWelcomeGiftEmail,
  sendAdminNewUserEmail,
  sendTaskCreatedEmail,
  sendSubmissionCreatedEmail,
  sendAdminTaskSubmittedEmail,
  sendTaskLiveEmail,
  sendTaskApprovalEmail,
  sendDisputeEmail,
  sendStreakEmail,
  sendBroadcastEmail,
  sendBadgeUnlockEmail,
  sendNewTaskBroadcastEmail,
  sendEmail,
  sendTaskIdeaApprovedEmail,
} from "@/lib/email";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { sendPushNotification } from "@/lib/push";

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
        const { creatorEmail, creatorWallet, taskTitle, taskId, paymentMethod, reward, status } = payload || {};
        if (creatorEmail && taskTitle && taskId) {
          await sendTaskCreatedEmail(creatorEmail, taskTitle, taskId);
        }
        if (creatorWallet && taskTitle && taskId) {
          await sendAdminTaskSubmittedEmail(creatorWallet, taskTitle, taskId, paymentMethod || "crypto");
          // Send push to admin/creator
          await sendPushNotification(creatorWallet, "Campaign Submitted", `Your campaign "${taskTitle}" is submitted and pending launch.`);
        }
        // Broadcast to all users if live immediately
        if (status !== "pending_payment" && taskTitle && taskId) {
          try {
            const usersSnap = await getDocs(collection(db, "users"));
            const promises: Promise<any>[] = [];
            usersSnap.forEach((userDoc) => {
              const uData = userDoc.data();
              const userEmail = uData.email;
              if (userEmail && userEmail.trim()) {
                promises.push(
                  sendNewTaskBroadcastEmail(userEmail.trim(), taskTitle, reward || "0.05 USDm", taskId)
                    .catch(e => console.error("Broadcast email error:", e))
                );
              }
              if (userDoc.id !== creatorWallet) {
                promises.push(
                  sendPushNotification(userDoc.id, "New Task Available", `Earn rewards on "${taskTitle}" now.`, `/?task=${taskId}`)
                    .catch(e => console.error("Broadcast push error:", e))
                );
              }
            });
            await Promise.all(promises);
          } catch (broadcastErr) {
            console.error("Failed to broadcast new task alerts:", broadcastErr);
          }
        }
        return NextResponse.json({ success: true });
      }

      case "submission_created": {
        const { creatorEmail, creatorWallet, taskTitle, taskId } = payload || {};
        if (creatorEmail && taskTitle && taskId) {
          await sendSubmissionCreatedEmail(creatorEmail, taskTitle, taskId);
        }
        if (creatorWallet && taskTitle) {
          await sendPushNotification(creatorWallet, "New Task Submission", `Someone just made a submission to your campaign "${taskTitle}".`);
        }
        return NextResponse.json({ success: true });
      }

      case "task_live": {
        const { creatorEmail, creatorWallet, taskTitle, taskId, paymentType, reward } = payload || {};
        if (creatorEmail && taskTitle && taskId) {
          await sendTaskLiveEmail(creatorEmail, taskTitle, taskId, paymentType || "Naira Automated");
        }
        if (creatorWallet && taskTitle) {
          await sendPushNotification(creatorWallet, "Campaign Live", `Congratulations! Your campaign "${taskTitle}" is now live and accepting workers.`);
        }
        if (taskTitle && taskId) {
          try {
            const usersSnap = await getDocs(collection(db, "users"));
            const promises: Promise<any>[] = [];
            usersSnap.forEach((userDoc) => {
              const uData = userDoc.data();
              const userEmail = uData.email;
              if (userEmail && userEmail.trim()) {
                promises.push(
                  sendNewTaskBroadcastEmail(userEmail.trim(), taskTitle, reward || "0.05 USDm", taskId)
                    .catch(e => console.error("Broadcast email error:", e))
                );
              }
              if (userDoc.id !== creatorWallet) {
                promises.push(
                  sendPushNotification(userDoc.id, "New Task Available", `Earn rewards on "${taskTitle}" now.`, `/?task=${taskId}`)
                    .catch(e => console.error("Broadcast push error:", e))
                );
              }
            });
            await Promise.all(promises);
          } catch (broadcastErr) {
            console.error("Failed to broadcast new task alerts:", broadcastErr);
          }
        }
        return NextResponse.json({ success: true });
      }

      case "task_approval": {
        const { workerEmail, workerWallet, taskTitle, reward, approved } = payload || {};
        if (workerEmail && taskTitle) {
          await sendTaskApprovalEmail(workerEmail, taskTitle, reward || "Reward", !!approved);
        }
        if (workerWallet && taskTitle) {
          if (approved) {
            await sendPushNotification(workerWallet, "Task Approved", `Your submission for "${taskTitle}" was approved. You earned ${reward || "0.05 USDm"}!`);
          } else {
            await sendPushNotification(workerWallet, "Submission Rejected", `Your submission for "${taskTitle}" was rejected. Tap to view details.`);
          }
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
        const { userEmail, userWallet, streakCount, isWarning, warningType } = payload || {};
        if (userEmail && streakCount) {
          await sendStreakEmail(userEmail, streakCount, !!isWarning, warningType);
        }
        if (userWallet && isWarning && streakCount) {
          const hoursStr = warningType === "2hour" ? "2 hours" : "30 minutes";
          await sendPushNotification(userWallet, "Keep Your Streak Alive! 🔥", `You only have ${hoursStr} left to keep your ${streakCount}-day streak!`);
        }
        return NextResponse.json({ success: true });
      }

      case "badge_unlock": {
        const { toEmail, recipientWallet, badgeName, badgeEmoji, badgeDescription, xpReward } = payload || {};
        if (toEmail && badgeName) {
          await sendBadgeUnlockEmail(toEmail, badgeName, badgeEmoji || "", badgeDescription || "", xpReward || 0);
        }
        if (recipientWallet && badgeName) {
          await sendPushNotification(recipientWallet, `Badge Unlocked: ${badgeName}! 🏆`, `Congratulations! You unlocked the ${badgeEmoji || "✨"} badge and earned +${xpReward || 0} XP.`);
        }
        return NextResponse.json({ success: true });
      }

      case "task_idea_approved": {
        const { toEmail, ideaTitle, kind, recipientWallet } = payload || {};
        if (toEmail && ideaTitle && kind) {
          await sendTaskIdeaApprovedEmail(toEmail, ideaTitle, kind);
        }
        if (recipientWallet && ideaTitle) {
          const kindLabel = kind === "category" ? "Category suggestion" : "Task Idea";
          await sendPushNotification(
            recipientWallet,
            "Idea Approved! 🎉",
            `Your ${kindLabel} "${ideaTitle}" has been approved! You received a 0.50 USDm credit.`
          );
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
