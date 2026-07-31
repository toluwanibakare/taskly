import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { sendStreakEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceType = searchParams.get("forceType") as "2hour" | "30min" | null;

    // 1. Calculate time remaining in current UTC day
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const minutesSinceMidnight = utcHours * 60 + utcMinutes;
    const totalMinutesInDay = 24 * 60; // 1440
    const minutesRemaining = totalMinutesInDay - minutesSinceMidnight;

    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Decide which warning type is currently active based on time
    let activeWarningType: "2hour" | "30min" | null = null;

    if (forceType) {
      activeWarningType = forceType;
    } else {
      // 2 hours window: 1.5 to 2.5 hours left (90 to 150 minutes)
      if (minutesRemaining >= 90 && minutesRemaining <= 150) {
        activeWarningType = "2hour";
      }
      // 30 mins window: <= 45 minutes left
      else if (minutesRemaining <= 45 && minutesRemaining >= 0) {
        activeWarningType = "30min";
      }
    }

    if (!activeWarningType) {
      return NextResponse.json({
        message: "No streak warnings scheduled at this hour.",
        utcTime: `${utcHours}:${utcMinutes}`,
        minutesRemaining
      });
    }

    // 2. Fetch all users from Firestore
    const usersSnap = await getDocs(collection(db, "users"));
    let sentCount = 0;
    const processedUsers: string[] = [];

    for (const userDoc of usersSnap.docs) {
      const uData = userDoc.data();
      const email = uData.email;
      const streakCount = uData.streakCount || 0;
      const lastCompleted = uData.lastCompletedDate || "";

      if (!email || streakCount <= 0) continue;

      // If they completed a task today, their streak is safe
      if (lastCompleted === todayStr) continue;

      // Check if this type of warning was already sent today
      const warningKey = `${todayStr}-${activeWarningType}`;
      if (uData.lastStreakWarningSent === warningKey) continue;

      // Send the streak email
      try {
        const success = await sendStreakEmail(email, streakCount, true, activeWarningType);
        if (success) {
          // Send push alert too!
          const hoursStr = activeWarningType === "2hour" ? "2 hours" : "30 minutes";
          await sendPushNotification(
            userDoc.id,
            "Keep Your Streak Alive! 🔥",
            `You only have ${hoursStr} left to keep your ${streakCount}-day streak!`,
            "/"
          );

          // Update the user document to record that we sent the warning today
          const userRef = doc(db, "users", userDoc.id);
          await updateDoc(userRef, {
            lastStreakWarningSent: warningKey
          });
          sentCount++;
          processedUsers.push(email);
        }
      } catch (err) {
        console.error(`Failed to send streak reminder to ${email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      warningType: activeWarningType,
      sentCount,
      recipients: processedUsers,
      utcTime: `${utcHours}:${utcMinutes}`,
      minutesRemaining
    });

  } catch (err: any) {
    console.error("Streak cron error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
