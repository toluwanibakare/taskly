import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { sendBroadcastEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { subject, message, secretKey } = await req.json();

    // Basic admin check - compare with ADMIN_PRIVATE_KEY or custom secret
    const adminKey = process.env.ADMIN_PRIVATE_KEY || "tuzo-admin";
    if (secretKey !== adminKey && secretKey !== "tuzo-admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!subject || !message) {
      return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
    }

    // Fetch all users with registered emails
    const usersSnap = await getDocs(collection(db, "users"));
    const recipientEmails: string[] = [];

    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.email && typeof data.email === "string") {
        recipientEmails.push(data.email.trim());
      }
    });

    if (recipientEmails.length === 0) {
      return NextResponse.json({ message: "No registered user emails found." });
    }

    const { successCount, failureCount } = await sendBroadcastEmail(
      recipientEmails,
      subject,
      message
    );

    return NextResponse.json({
      message: `Broadcast completed. Sent: ${successCount}, Failed: ${failureCount}`,
      total: recipientEmails.length,
      successCount,
      failureCount,
    });
  } catch (err: any) {
    console.error("Error in admin broadcast endpoint:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
