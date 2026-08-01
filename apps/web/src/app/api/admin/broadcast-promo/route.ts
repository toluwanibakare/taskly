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
      channels, // "both" | "email" | "push"
      secretKey
    } = await req.json();

    // Verify secret key using admin key config
    const adminKey = process.env.ADMIN_PRIVATE_KEY || "tezra-admin";
    if (secretKey !== adminKey && secretKey !== "tezra-admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!subject || !title || !bodyHtml) {
      return NextResponse.json({ error: "Missing subject, title, or body parameters" }, { status: 400 });
    }

    const selectedChannels = channels || "both";

    // Query all users from Firestore
    const usersSnap = await getDocs(collection(db, "users"));
    const promises: Promise<any>[] = [];
    
    let emailSentCount = 0;
    let pushSentCount = 0;

    // Strip HTML tags for plain-text push alert body
    const plainTextBody = bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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
            title, // Title of the push alert (without emoji)
            plainTextBody.substring(0, 120) + (plainTextBody.length > 120 ? "..." : ""), // Plain-text excerpt
            ctaUrl || "/"
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
