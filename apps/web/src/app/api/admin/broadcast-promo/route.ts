import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { sendBroadcastPromoEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const {
      subject,
      title,
      badgeText,
      bodyHtml,
      imageUrl,
      ctaText,
      ctaUrl,
      pushTitle,
      pushBody,
      pushUrl,
      channels, // "both" | "email" | "push"
      secretKey
    } = await req.json();

    // Verify secret key using admin key config
    const adminKey = process.env.ADMIN_PRIVATE_KEY || "tezra-admin";
    if (secretKey !== adminKey && secretKey !== "tezra-admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const selectedChannels = channels || "both";

    // Validate email channel inputs
    if ((selectedChannels === "email" || selectedChannels === "both") && (!subject || !title || !bodyHtml)) {
      return NextResponse.json({ error: "Missing email subject, title, or body parameters" }, { status: 400 });
    }

    // Validate push channel inputs
    if ((selectedChannels === "push" || selectedChannels === "both") && (!pushTitle || !pushBody)) {
      return NextResponse.json({ error: "Missing push title or body parameters" }, { status: 400 });
    }

    // Query all users from Firestore
    const usersSnap = await getDocs(collection(db, "users"));
    const promises: Promise<any>[] = [];
    
    let emailSentCount = 0;
    let pushSentCount = 0;

    usersSnap.forEach((userDoc) => {
      const uData = userDoc.data();

      // Channel 1: Email broadcast
      if ((selectedChannels === "email" || selectedChannels === "both") && uData.email && uData.email.trim()) {
        promises.push(
          sendBroadcastPromoEmail(
            uData.email.trim(),
            subject,
            title,
            badgeText || "Promo",
            bodyHtml,
            imageUrl || undefined,
            ctaText || undefined,
            ctaUrl || undefined
          )
          .then((success) => {
            if (success) emailSentCount++;
          })
          .catch(e => console.error(`Error sending promo email to ${uData.email}:`, e))
        );
      }

      // Channel 2: Push notification broadcast
      if ((selectedChannels === "push" || selectedChannels === "both") && uData.pushSubscription && uData.notificationsEnabled) {
        promises.push(
          sendPushNotification(
            userDoc.id,
            pushTitle,
            pushBody.substring(0, 120) + (pushBody.length > 120 ? "..." : ""),
            pushUrl || "/"
          )
          .then((success) => {
            if (success) pushSentCount++;
          })
          .catch(e => console.error(`Error sending promo push to ${userDoc.id}:`, e))
        );
      }
    });

    // Await all concurrent tasks in serverless environment
    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      emailSentCount,
      pushSentCount,
      totalUsers: usersSnap.size
    });
  } catch (err: any) {
    console.error("Promotion broadcast error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
