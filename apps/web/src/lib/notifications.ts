import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";

export type NotificationType =
  | "submission_approved"
  | "submission_rejected"
  | "withdrawal_completed"
  | "badge_unlocked"
  | "level_up"
  | "streak_milestone"
  | "streak_reminder"
  | "new_tasks_available"
  | "referral_reward"
  | "campaign_created"
  | "task_reminder"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  data?: Record<string, unknown>;
}

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  submission_approved: "✅",
  submission_rejected: "❌",
  withdrawal_completed: "💰",
  badge_unlocked: "🏆",
  level_up: "⭐",
  streak_milestone: "🔥",
  streak_reminder: "🔔",
  new_tasks_available: "📋",
  referral_reward: "🎁",
  campaign_created: "🚀",
  task_reminder: "⏰",
  system: "ℹ️",
};

const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  submission_approved: "Submission Approved!",
  submission_rejected: "Submission Rejected",
  withdrawal_completed: "Withdrawal Completed",
  badge_unlocked: "Badge Unlocked!",
  level_up: "Level Up!",
  streak_milestone: "Streak Milestone!",
  streak_reminder: "Streak Reminder",
  new_tasks_available: "New Tasks Available",
  referral_reward: "Referral Reward Earned",
  campaign_created: "Campaign Created",
  task_reminder: "Task Reminder",
  system: "Notification",
};

export const getNotifIcon = (type: NotificationType): string => NOTIFICATION_ICONS[type] || "ℹ️";
export const getNotifTitle = (type: NotificationType): string => NOTIFICATION_TITLES[type] || "Notification";

export const createNotification = async (
  walletAddress: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<string | null> => {
  try {
    const ref = collection(db, "users", walletAddress.toLowerCase(), "notifications");
    const docRef = await addDoc(ref, {
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      data: data || {},
    });
    return docRef.id;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
};

export const markNotifAsRead = async (walletAddress: string, notifId: string): Promise<void> => {
  try {
    const ref = doc(db, "users", walletAddress.toLowerCase(), "notifications", notifId);
    await updateDoc(ref, { read: true });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
};

export const markAllNotifsAsRead = async (walletAddress: string): Promise<void> => {
  try {
    const ref = collection(db, "users", walletAddress.toLowerCase(), "notifications");
    const q = query(ref, where("read", "==", false));
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) => updateDoc(d.ref, { read: true }));
    await Promise.all(updates);
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
  }
};

export const getUnreadCount = (notifications: AppNotification[]): number => {
  return notifications.filter((n) => !n.read).length;
};
