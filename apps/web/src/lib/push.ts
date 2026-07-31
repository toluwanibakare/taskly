import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import webpush from "web-push";

// Initialize VAPID settings using keys persisted in Firestore
async function initWebPush() {
  const keysRef = doc(db, "admin", "vapid_keys");
  const keysSnap = await getDoc(keysRef);
  if (!keysSnap.exists()) {
    // Generate fallback keys dynamically if subscribe endpoint hasn't run yet
    const newKeys = webpush.generateVAPIDKeys();
    await doc(db, "admin", "vapid_keys");
    webpush.setVapidDetails(
      "mailto:support@tezra.xyz",
      newKeys.publicKey,
      newKeys.privateKey
    );
    return;
  }
  const keys = keysSnap.data() as { publicKey: string; privateKey: string };
  
  webpush.setVapidDetails(
    "mailto:support@tezra.xyz",
    keys.publicKey,
    keys.privateKey
  );
}

export async function sendPushNotification(
  walletAddress: string,
  title: string,
  body: string,
  url = "/"
): Promise<boolean> {
  try {
    if (!walletAddress) return false;
    const userRef = doc(db, "users", walletAddress.toLowerCase());
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;

    const uData = userSnap.data();
    if (!uData.pushSubscription || !uData.notificationsEnabled) return false;

    const subscription = JSON.parse(uData.pushSubscription);
    await initWebPush();

    const payload = JSON.stringify({
      title,
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      url
    });

    await webpush.sendNotification(subscription, payload);
    return true;
  } catch (err) {
    console.error(`Failed to send web push to ${walletAddress}:`, err);
    return false;
  }
}
