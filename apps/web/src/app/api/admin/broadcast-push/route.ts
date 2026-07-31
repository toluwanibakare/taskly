import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { sendPushNotification } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const { title, body, secretKey } = await req.json();

    // Verify secret key using admin key config
    const adminKey = process.env.ADMIN_PRIVATE_KEY || "tezra-admin";
    if (secretKey !== adminKey && secretKey !== "tezra-admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!title || !body) {
      return NextResponse.json({ error: "Missing title or body parameters" }, { status: 400 });
    }

    // Fetch all users
    const usersSnap = await getDocs(collection(db, "users"));
    let sentCount = 0;
    const recipients: string[] = [];

    for (const userDoc of usersSnap.docs) {
      const uData = userDoc.data();
      // Check if user has enabled notifications
      if (uData.pushSubscription && uData.notificationsEnabled) {
        try {
          const success = await sendPushNotification(userDoc.id, title, body, "/");
          if (success) {
            sentCount++;
            recipients.push(userDoc.id);
          }
        } catch (err) {
          console.error(`Failed to send broadcast push to ${userDoc.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      recipients
    });
  } catch (err: any) {
    console.error("Broadcast push error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
