import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { sendBroadcastPromoEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";
import { createNotification } from "@/lib/notifications";

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY || "tezra-admin";

interface AnnouncementTemplate {
  id: string;
  name: string;
  description: string;
  badgeText: string;
  emailSubject: string;
  emailBody: string;
  pushTitle: string;
  pushBody: string;
  ctaText: string;
}

const DEFAULT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: "contest_season",
    name: "Referral Contest + Social Quest",
    description:
      "Announces the Referral Champion Contest window (Aug 9 - Aug 30) and the Social Quest deadline (Aug 9, 23:59 WAT).",
    badgeText: "Contest Season",
    emailSubject: "The Referral Contest Starts August 9 - Don't Miss It",
    emailBody: `Get ready. Our biggest referral campaign of the season starts on August 9 and runs until August 30.

Here is how it works:
- Invite people to Tezra with your personal referral link.
- Earn 0.02 USDm for every task your invitee completes.
- Earn 0.10 USDm for every campaign your invitee creates.
- The top 3 referrers at the end of the window split a 20.00 USDm reward pool: 1st place wins 10.00 USDm, 2nd & 3rd place win 5.00 USDm each.
- Plus other amazing benefits including public recognition and free task creation credits!

One more thing: the Social Quest ends on August 9 at midnight WAT. If you still want to share your member certificate for a shot at the 10.00 USDm prize, do it before then.

Register for the contest from the Earn tab, copy your referral link from your Profile page, and start inviting.`,
    pushTitle: "Referral Contest Starts Aug 9",
    pushBody:
      "The Referral Champion Contest runs Aug 9-30. Top 3 split 20 USDm (1st: 10 USDm, 2nd/3rd: 5 USDm) + win task creation credits! Open Tezra to register.",
    ctaText: "Open Tezra"
  },
  {
    id: "v211_update",
    name: "New Update Is Live",
    description:
      "Announces the v2.1.1 update: new task categories, higher payouts, new social actions and task idea submissions.",
    badgeText: "What's New",
    emailSubject: "Big Update: New Task Types, Higher Payouts and More",
    emailBody: `A fresh update is live on Tezra, and there is plenty to explore.

New task categories:
- Writing and Content: blog posts, X threads, product reviews and testimonials paying up to 1.00 USDm per task.
- Community and Groups: join Telegram, WhatsApp and Discord communities for quick rewards.

More ways to earn on the platforms you already use: X, Instagram, YouTube, TikTok, Facebook, LinkedIn and GitHub. Survey and quiz tasks now pay up to 0.35 USDm, and high-paying tasks are clearly marked so you can spot them at a glance.

The app is easier to use too: filter tasks by category from the home screen, and pull down anywhere to refresh.

One last thing: you can now submit a task idea or suggest a whole new category from your Profile page. Verified ideas are added in the next release.

Open Tezra to see everything new. If you have not installed the app yet, tap the share or menu button in your browser and choose Add to Home Screen.`,
    pushTitle: "The new update is live",
    pushBody:
      "New writing and community task categories, bigger survey payouts and task idea submissions are here. Open Tezra to see what's new.",
    ctaText: "Explore the Update"
  },
  {
    id: "ideas_announcement",
    name: "Task Ideas Now Open",
    description:
      "Invites users to submit task ideas or new category ideas, verified before shipping in the next release.",
    badgeText: "Your Ideas",
    emailSubject: "Got a Task Idea? We Want to Hear It",
    emailBody: `Tezra grows with you, and now you can help shape what comes next.

From your Profile page, tap Submit Task Idea. You can propose:
- A new task type: describe the action, what the proof should look like and a fair reward.
- A brand new category: tell us the group of tasks you would like to see, with a few examples.

Every idea goes through our team for verification, and approved ideas are shipped in the next release.

If your idea makes it live, you will be notified right in the app.`,
    pushTitle: "Submit a task idea",
    pushBody:
      "Have an idea for a new task type or category? Submit it from your Profile page. Verified ideas ship in the next release.",
    ctaText: "Open Tezra"
  }
];

function toEmailHtml(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      const lines = trimmed
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 1) return `<p>${lines[0]}</p>`;
      return `<p>${lines.join("<br/>")}</p>`;
    })
    .join("");
}

export async function GET() {
  try {
    const snap = await getDocs(collection(db, "admin_announcements"));
    const existing = new Set(snap.docs.map((d) => d.id));

    for (const tpl of DEFAULT_TEMPLATES) {
      if (!existing.has(tpl.id)) {
        await setDoc(doc(db, "admin_announcements", tpl.id), {
          ...tpl,
          sentAt: null,
          sentCounts: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

    const refreshed = await getDocs(collection(db, "admin_announcements"));
    const announcements = refreshed.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, announcements });
  } catch (err: any) {
    console.error("Error listing announcements:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, secretKey, emailSubject, emailBody, pushTitle, pushBody, badgeText, ctaText } = await req.json();

    if (secretKey !== ADMIN_KEY && secretKey !== "tezra-admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Missing announcement id" }, { status: 400 });
    }

    await updateDoc(doc(db, "admin_announcements", id), {
      emailSubject,
      emailBody,
      pushTitle,
      pushBody,
      badgeText,
      ctaText,
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error saving announcement:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id, secretKey } = await req.json();

    if (secretKey !== ADMIN_KEY && secretKey !== "tezra-admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json({ error: "Missing announcement id" }, { status: 400 });
    }

    const ref = doc(db, "admin_announcements", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const tpl = snap.data();
    if (tpl.sentAt) {
      return NextResponse.json(
        { error: "This announcement has already been sent and can only be sent once." },
        { status: 409 }
      );
    }

    const emailHtml = toEmailHtml(tpl.emailBody || "");
    const usersSnap = await getDocs(collection(db, "users"));
    const promises: Promise<void>[] = [];

    let emailSentCount = 0;
    let pushSentCount = 0;
    let inAppSentCount = 0;

    usersSnap.forEach((userDoc) => {
      const uData = userDoc.data();

      if (uData.email && typeof uData.email === "string" && uData.email.trim()) {
        promises.push(
          sendBroadcastPromoEmail(
            uData.email.trim(),
            tpl.emailSubject,
            tpl.emailSubject,
            tpl.badgeText || "Tezra Update",
            emailHtml,
            undefined,
            tpl.ctaText || "Open Tezra"
          )
            .then((ok) => {
              if (ok) emailSentCount++;
            })
            .catch((e) => console.error(`Announcement email failed for ${uData.email}:`, e))
        );
      }

      if (uData.pushSubscription && uData.notificationsEnabled) {
        promises.push(
          sendPushNotification(userDoc.id, tpl.pushTitle, tpl.pushBody, "/")
            .then((ok) => {
              if (ok) pushSentCount++;
            })
            .catch((e) => console.error(`Announcement push failed for ${userDoc.id}:`, e))
        );
      }

      promises.push(
        createNotification(userDoc.id, "system", tpl.pushTitle, tpl.pushBody, { url: "/" })
          .then(() => {
            inAppSentCount++;
          })
          .catch((e) => console.error(`Announcement in-app failed for ${userDoc.id}:`, e))
      );
    });

    await Promise.all(promises);

    await updateDoc(ref, {
      sentAt: serverTimestamp(),
      sentCounts: { email: emailSentCount, push: pushSentCount, inApp: inAppSentCount },
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      emailSentCount,
      pushSentCount,
      inAppSentCount,
      totalUsers: usersSnap.size
    });
  } catch (err: any) {
    console.error("Error sending announcement:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
