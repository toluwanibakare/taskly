import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import webpush from "web-push";

// Helper to fetch or generate VAPID keys from Firestore for persistence
async function getVapidKeys() {
  const keysRef = doc(db, "admin", "vapid_keys");
  const keysSnap = await getDoc(keysRef);

  if (keysSnap.exists()) {
    return keysSnap.data() as { publicKey: string; privateKey: string };
  }

  // Generate new keys if they don't exist
  const newKeys = webpush.generateVAPIDKeys();
  await setDoc(keysRef, newKeys);
  return newKeys;
}

// GET: Retrieve the VAPID Public Key for client subscription
export async function GET() {
  try {
    const keys = await getVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (err: any) {
    console.error("Vapid key fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Subscribe a user's device (saves the pushSubscription to their Firestore profile)
export async function POST(req: Request) {
  try {
    const { walletAddress, subscription } = await req.json();

    if (!walletAddress || !subscription) {
      return NextResponse.json({ error: "Missing walletAddress or subscription details" }, { status: 400 });
    }

    const userRef = doc(db, "users", walletAddress.toLowerCase());
    await updateDoc(userRef, {
      pushSubscription: JSON.stringify(subscription),
      notificationsEnabled: true,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Subscription update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
