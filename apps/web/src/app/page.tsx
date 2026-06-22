"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useConnect, useWriteContract, useChainId, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { getEscrowAddress, formatTaskIdToBytes32 } from "../hooks/useEscrow";
import { ESCROW_ABI } from "../lib/escrowAbi";
import { db, storage } from "../lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  runTransaction
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Instagram,
  Youtube,
  Cpu,
  ClipboardList,
  UploadCloud,
  ExternalLink,
  Check,
  Plus,
  Minus,
  ArrowLeft,
  History,
  User,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  X,
  Wallet,
  Facebook,
  Linkedin,
  Github,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  RotateCw,
  Undo2,
  RefreshCw,
  LogOut,
  TrendingUp
} from "lucide-react";

// Platform Type definition
type Platform = "instagram" | "x" | "youtube" | "tiktok" | "survey" | "testing" | "facebook" | "linkedin" | "github";

// Task structure definition
interface Task {
  id: string;
  platform: Platform;
  title: string;
  amount: string;
  description: string;
  type: string;
  slotsRemaining: number;
  slotsTotal: number;
  instructions: string[];
  proofRequirements: string;
  link: string;
  expiryHours: number;
  isUserCreated?: boolean;
  proofType?: "screenshot" | "text" | "both" | "screen-recording";
  createdByWallet?: string;
  status?: string;
  expiresAt?: string;
}

interface TaskTemplate {
  title: string;
  platform: Platform;
  type: string;
  payout: number;
  description: string;
  instructions: string;
  proofRequirements: string;
  proofType: "screenshot" | "text" | "both" | "screen-recording";
  link: string;
}

const TEMPLATE_PRESETS: Record<string, TaskTemplate> = {
  x_follow: {
    title: "Follow @YourUsername on X",
    platform: "x",
    type: "Social Follow",
    payout: 0.02,
    description: "Grow our community presence on X (Twitter). Follow the official handle for instant updates.",
    instructions: "Click the link to open the profile on X.\nClick the 'Follow' button.\nTake a screenshot showing you followed.\nEnter your X username in the proof field.",
    proofRequirements: "Screenshot of following status & your X handle (@username)",
    proofType: "both",
    link: "https://x.com/"
  },
  x_like_retweet: {
    title: "Like & Retweet Pinned Post on X",
    platform: "x",
    type: "Social Engagement",
    payout: 0.02,
    description: "Help boost the visibility of our latest announcement on X by liking and retweeting.",
    instructions: "Open the post link.\nClick the Like (heart) button.\nClick the Repost/Retweet button.\nTake a screenshot showing your engagement.",
    proofRequirements: "Screenshot showing your like/retweet and your X username.",
    proofType: "screenshot",
    link: "https://x.com/"
  },
  x_promo: {
    title: "Create X Post Promoting Taskly",
    platform: "x",
    type: "Content Sharing",
    payout: 0.50,
    description: "Write a unique, organic post on your personal X profile promoting Taskly for micro-jobs in Nigeria.",
    instructions: "Compose a tweet describing how Taskly helps Nigerians earn cUSD.\nInclude the hashtags #Taskly and #Celo.\nPost the tweet.\nCopy the link of your published tweet.",
    proofRequirements: "Provide the direct URL of your published X post.",
    proofType: "text",
    link: "https://x.com/compose/post"
  },
  instagram_follow: {
    title: "Follow @YourUsername on Instagram",
    platform: "instagram",
    type: "Social Follow",
    payout: 0.02,
    description: "Follow our page on Instagram to help us reach more people with our creative design templates.",
    instructions: "Open the Instagram profile link.\nClick 'Follow'.\nTake a screenshot of the page showing you are following.",
    proofRequirements: "Screenshot of the Instagram profile showing the 'Following' button.",
    proofType: "screenshot",
    link: "https://instagram.com/"
  },
  instagram_engagement: {
    title: "Like & Comment on Instagram Post",
    platform: "instagram",
    type: "Social Engagement",
    payout: 0.03,
    description: "Engage with our latest post by liking it and dropping a supportive, organic comment.",
    instructions: "Open the post link.\nDouble-tap to Like the post.\nDrop a friendly comment related to the content.\nScreenshot the post showing your comment and like status.",
    proofRequirements: "Screenshot of your comment on the post.",
    proofType: "screenshot",
    link: "https://instagram.com/"
  },
  instagram_story: {
    title: "Share Instagram Post to Story",
    platform: "instagram",
    type: "Content Sharing",
    payout: 0.05,
    description: "Re-share our product showcase post to your active Instagram story to help boost organic reach.",
    instructions: "Open the Instagram post link.\nTap the share paper plane icon.\nSelect 'Add post to your story'.\nKeep the story active for at least 12 hours.\nTake a screenshot of the active story.",
    proofRequirements: "Screenshot of your Instagram story displaying the shared post + your Instagram handle.",
    proofType: "both",
    link: "https://instagram.com/"
  },
  youtube_subscribe: {
    title: "Subscribe to YouTube Channel",
    platform: "youtube",
    type: "Social Follow",
    payout: 0.04,
    description: "Subscribe to our channel to help us unlock creator benefits and share educational web3 videos.",
    instructions: "Open the YouTube channel link.\nClick the red 'Subscribe' button.\nTurn on notifications (optional but appreciated!).\nScreenshot showing your subscribed status.",
    proofRequirements: "Screenshot showing you subscribed to the channel.",
    proofType: "screenshot",
    link: "https://youtube.com/"
  },
  youtube_engage: {
    title: "Watch 2 mins, Like & Comment YouTube Video",
    platform: "youtube",
    type: "Social Engagement",
    payout: 0.05,
    description: "Help our educational video push through the YouTube algorithm by watching, liking and commenting.",
    instructions: "Open the video link.\nWatch for at least 2 minutes (crucial for YouTube retention).\nLike the video and leave a relevant comment.\nTake a screenshot of the video showing the watch progress, like, and comment.",
    proofRequirements: "Screenshot showing watch progress bar (2 mins+) and your comment.",
    proofType: "screenshot",
    link: "https://youtube.com/"
  },
  youtube_share: {
    title: "Share YouTube Video to WhatsApp Group",
    platform: "youtube",
    type: "Content Sharing",
    payout: 0.05,
    description: "Spread our video tutorial into local developer communities by sharing the video link.",
    instructions: "Open the YouTube video link.\nClick 'Share' and copy the link.\nForward the video link to a relevant developer WhatsApp group.\nTake a screenshot of your shared message in the WhatsApp group.",
    proofRequirements: "Screenshot of the shared YouTube video link inside the WhatsApp group.",
    proofType: "screenshot",
    link: "https://youtube.com/"
  },
  tiktok_follow: {
    title: "Follow @YourUsername on TikTok",
    platform: "tiktok",
    type: "Social Follow",
    payout: 0.02,
    description: "Join our TikTok community to catch short, educational videos about crypto and tech.",
    instructions: "Open the TikTok profile link.\nClick the 'Follow' button.\nTake a screenshot showing you are following.",
    proofRequirements: "Screenshot showing the TikTok profile with the 'Following' status.",
    proofType: "screenshot",
    link: "https://tiktok.com/"
  },
  tiktok_engage: {
    title: "Like & Favorite TikTok Video",
    platform: "tiktok",
    type: "Social Engagement",
    payout: 0.03,
    description: "Boost our latest TikTok tutorial. Like it, add it to your favorites, and screenshot it.",
    instructions: "Open the TikTok video.\nLike (heart) and favorite the video.\nScreenshot the video page showing the red heart and favorite flag.\nEnter your TikTok handle.",
    proofRequirements: "Screenshot of the liked & favorited TikTok video + your TikTok username.",
    proofType: "both",
    link: "https://tiktok.com/"
  },
  facebook_follow: {
    title: "Like & Follow Facebook Page",
    platform: "facebook",
    type: "Social Follow",
    payout: 0.02,
    description: "Follow our business page on Facebook to help local customers see our latest products.",
    instructions: "Open the Facebook Page link.\nClick the 'Like' or 'Follow' button.\nTake a screenshot of the page showing you followed.",
    proofRequirements: "Screenshot showing the Page as liked or followed.",
    proofType: "screenshot",
    link: "https://facebook.com/"
  },
  facebook_share: {
    title: "Share Facebook Post to Profile",
    platform: "facebook",
    type: "Social Engagement",
    payout: 0.03,
    description: "Help share our Celo MiniPay tutorial with your Facebook friends and followers.",
    instructions: "Open the Facebook post link.\nClick the 'Share' button and select 'Share Now (Public)'.\nTake a screenshot of the post displayed on your profile timeline.",
    proofRequirements: "Screenshot of the shared post on your public Facebook profile timeline.",
    proofType: "screenshot",
    link: "https://facebook.com/"
  },
  linkedin_follow: {
    title: "Follow Company on LinkedIn",
    platform: "linkedin",
    type: "Social Follow",
    payout: 0.04,
    description: "Follow our professional page on LinkedIn. Best for active professional accounts.",
    instructions: "Open the LinkedIn page link.\nClick the '+ Follow' button.\nCopy your LinkedIn profile URL.\nTake a screenshot showing you follow.",
    proofRequirements: "Screenshot showing the LinkedIn page as 'Following' + Your Profile URL.",
    proofType: "both",
    link: "https://linkedin.com/company/"
  },
  linkedin_engage: {
    title: "Like & Comment on LinkedIn Post",
    platform: "linkedin",
    type: "Social Engagement",
    payout: 0.05,
    description: "Engage with our LinkedIn announcement by liking it and adding an insightful comment about stablecoins.",
    instructions: "Open the LinkedIn post link.\nClick the Like button.\nWrite a relevant, insightful comment about Celo L2 or MiniPay.\nTake a screenshot of your comment on the post.",
    proofRequirements: "Screenshot of your comment + your LinkedIn profile username.",
    proofType: "both",
    link: "https://linkedin.com/"
  },
  survey_feedback: {
    title: "Complete UX Feedback Survey",
    platform: "survey",
    type: "Survey / Feedback",
    payout: 0.15,
    description: "Help us refine our web application by completing a short 5-minute usability survey.",
    instructions: "Click the Google Form survey link.\nAnswer all questions honestly (invalid submissions will be rejected).\nCopy the submission completion code or input your wallet address.\nScreenshot the final confirmation screen.",
    proofRequirements: "Screenshot of the confirmation screen (e.g. 'Your response has been recorded') and your survey email/code.",
    proofType: "both",
    link: "https://forms.gle/"
  },
  survey_product: {
    title: "Complete Product Market Survey",
    platform: "survey",
    type: "Survey / Feedback",
    payout: 0.20,
    description: "Participate in our marketing research questionnaire regarding mobile wallets and saving habits in Nigeria.",
    instructions: "Open the survey link.\nComplete the 15-question research form.\nScreenshot the final confirmation page.\nProvide your email address for validation.",
    proofRequirements: "Screenshot of final survey screen + your email address.",
    proofType: "both",
    link: "https://forms.gle/"
  },
  testing_app: {
    title: "Download Android App & Sign Up",
    platform: "testing",
    type: "Application Testing",
    payout: 0.40,
    description: "Download our beta Android application, create a user profile, and test the homepage features.",
    instructions: "Click the Play Store link to download/install the app.\nOpen the app and sign up using your email.\nNavigate to the dashboard and screenshot it.\nProvide the registered email address for database verification.",
    proofRequirements: "Screenshot of the app dashboard showing you logged in + your registration email.",
    proofType: "both",
    link: "https://play.google.com/store/apps/"
  },
  testing_web: {
    title: "Beta Test Web Dashboard UI",
    platform: "testing",
    type: "Application Testing",
    payout: 0.30,
    description: "Explore our newly released web dashboard prototype, verify buttons work, and report speed.",
    instructions: "Open the web beta dashboard URL.\nCreate a test workspace/project.\nVerify that elements render correctly without layout breaks.\nScreenshot your created workspace dashboard.",
    proofRequirements: "Screenshot of the created workspace dashboard + a short text feedback on usability.",
    proofType: "both",
    link: "https://beta.dashboard.io/"
  },
  github_star: {
    title: "Star a GitHub Repository",
    platform: "github",
    type: "Developer Support",
    payout: 0.05,
    description: "Star our official open-source repository on GitHub to show support for the development team.",
    instructions: "Click the repository link to open it on GitHub.\nLog in to your GitHub account.\nClick the 'Star' button at the top right of the repository page.\nTake a screenshot showing that the repository is starred.",
    proofRequirements: "Screenshot showing the repository as 'Starred' with your GitHub username visible.",
    proofType: "both",
    link: "https://github.com/"
  },
  github_fork: {
    title: "Fork a GitHub Repository",
    platform: "github",
    type: "Developer Support",
    payout: 0.06,
    description: "Fork our repository to your GitHub account and help build our developer network.",
    instructions: "Open the repository link on GitHub.\nLog in to your GitHub account.\nClick the 'Fork' button at the top right.\nConfirm the fork creation.\nTake a screenshot of the forked repository under your profile.",
    proofRequirements: "Screenshot of the forked repository under your account + link to your fork.",
    proofType: "both",
    link: "https://github.com/"
  },
  github_follow: {
    title: "Follow Developer Account on GitHub",
    platform: "github",
    type: "Developer Support",
    payout: 0.04,
    description: "Follow our lead developer profile on GitHub to stay updated with code updates and releases.",
    instructions: "Open the developer's GitHub profile link.\nLog in to your GitHub account.\nClick the 'Follow' button under the profile avatar.\nTake a screenshot showing the 'Unfollow' button (indicating you follow).",
    proofRequirements: "Screenshot showing you are following the GitHub profile + your GitHub handle.",
    proofType: "both",
    link: "https://github.com/"
  }
};

interface PlatformAction {
  value: string;
  label: string;
  basePrice: number;
}

const FALLBACK_CUSD_TO_NGN_RATE = 1403;

const PLATFORM_ACTIONS: Record<Platform, PlatformAction[]> = {
  x: [
    { value: "follow", label: "Follow Profile", basePrice: 0.02 },
    { value: "like", label: "Like Post", basePrice: 0.01 },
    { value: "repost", label: "Repost (Retweet)", basePrice: 0.01 },
    { value: "comment", label: "Reply / Comment", basePrice: 0.02 },
    { value: "tweet", label: "Write Custom Tweet", basePrice: 0.10 }
  ],
  instagram: [
    { value: "follow", label: "Follow Profile", basePrice: 0.02 },
    { value: "like", label: "Like Post", basePrice: 0.01 },
    { value: "comment", label: "Comment on Post", basePrice: 0.02 },
    { value: "story", label: "Share Post to Story", basePrice: 0.05 }
  ],
  youtube: [
    { value: "subscribe", label: "Subscribe to Channel", basePrice: 0.03 },
    { value: "like", label: "Like Video", basePrice: 0.01 },
    { value: "comment", label: "Comment on Video", basePrice: 0.02 },
    { value: "watch", label: "Watch Video (2 min+)", basePrice: 0.03 }
  ],
  tiktok: [
    { value: "follow", label: "Follow Profile", basePrice: 0.02 },
    { value: "like", label: "Like Video", basePrice: 0.01 },
    { value: "favorite", label: "Save to Favorites", basePrice: 0.02 }
  ],
  facebook: [
    { value: "follow_page", label: "Like & Follow Page", basePrice: 0.02 },
    { value: "like_post", label: "Like Post", basePrice: 0.01 },
    { value: "share_post", label: "Share Post", basePrice: 0.03 }
  ],
  linkedin: [
    { value: "follow_company", label: "Follow Company Page", basePrice: 0.03 },
    { value: "like_post", label: "Like Post", basePrice: 0.01 },
    { value: "comment", label: "Comment on Post", basePrice: 0.03 }
  ],
  survey: [
    { value: "google_form", label: "Google Form UX Survey", basePrice: 0.15 },
    { value: "product_market", label: "Product Market Survey", basePrice: 0.20 }
  ],
  testing: [
    { value: "android_signup", label: "Android App Download & Signup", basePrice: 0.30 },
    { value: "web_dashboard", label: "Web Dashboard Usability Test", basePrice: 0.25 }
  ],
  github: [
    { value: "github_star", label: "Star Repository", basePrice: 0.03 },
    { value: "github_fork", label: "Fork Repository", basePrice: 0.04 },
    { value: "github_follow", label: "Follow Profile", basePrice: 0.02 }
  ]
};

const ACTION_INSTRUCTIONS: Record<string, string[]> = {
  follow: ["Open the profile link.", "Click the Follow button."],
  like: ["Open the post link.", "Click the Like (heart) button."],
  repost: ["Open the post link.", "Click Repost / Retweet."],
  comment: ["Open the post link.", "Leave a constructive, friendly comment."],
  tweet: ["Compose a tweet matching the instructions.", "Publish the tweet to your profile."],
  subscribe: ["Open the YouTube channel link.", "Click the Subscribe button."],
  watch: ["Open the video link.", "Watch the video for at least 2 minutes."],
  story: ["Open the Instagram post.", "Share the post to your Story, keeping it active for 12 hours."],
  favorite: ["Open the TikTok video.", "Add the video to your Favorites list."],
  follow_page: ["Open the Facebook Page.", "Click Like and Follow."],
  like_post: ["Open the post link.", "Click Like."],
  share_post: ["Open the post link.", "Share the post publicly to your timeline."],
  follow_company: ["Open the LinkedIn Company page.", "Click the Follow button."],
  google_form: ["Click the survey link.", "Complete all required questionnaire fields honestly."],
  product_market: ["Click the market survey link.", "Fill out the 15 saving-habits questions."],
  android_signup: ["Click Play Store link to download/install the APK.", "Register an account using your email address."],
  web_dashboard: ["Open the web dashboard link.", "Register and create a new workspace to test UI layouts."],
  github_star: ["Open the repository link.", "Click the Star button at the top right."],
  github_fork: ["Open the repository link.", "Click the Fork button at the top right.", "Create the fork under your account."],
  github_follow: ["Open the GitHub profile link.", "Click the Follow button under the user avatar."]
};

const ACTION_PROOF_PRESETS: Record<string, string[]> = {
  follow: ["Screenshot showing 'Following' status", "Your profile handle (@username)"],
  like: ["Screenshot showing the post liked"],
  repost: ["Screenshot of repost on timeline", "Link to your retweet/repost"],
  comment: ["Screenshot of your comment", "Text of comment left"],
  tweet: ["Link to your published tweet", "Screenshot of published tweet"],
  subscribe: ["Screenshot showing channel as Subscribed", "YouTube username"],
  watch: ["Screenshot showing watch progress bar (2 mins+)", "YouTube username"],
  story: ["Screenshot of story status showing shared post", "Your Instagram handle"],
  favorite: ["Screenshot showing video added to Favorites", "TikTok handle"],
  follow_page: ["Screenshot of Page showing liked/followed", "Profile link"],
  like_post: ["Screenshot of liked post"],
  share_post: ["Screenshot of shared post on timeline", "Link to shared post"],
  follow_company: ["Screenshot of Company page showing Following", "LinkedIn profile link"],
  google_form: ["Screenshot of Google Form thank you/completion screen", "Survey completion code"],
  product_market: ["Screenshot of survey confirmation screen", "Registered survey email"],
  android_signup: ["Screenshot of in-app dashboard showing login profile", "Signup email address"],
  web_dashboard: ["Screenshot of created dashboard workspace", "Short usability text review"],
  github_star: ["Screenshot showing the repository as Starred", "Your GitHub username"],
  github_fork: ["Screenshot of the forked repository in your profile", "Link to your forked repository", "Your GitHub username"],
  github_follow: ["Screenshot showing the 'Unfollow' button on the profile", "Your GitHub username"]
};

const PLATFORM_ESCROW_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET || "0x9335E6F2eDA0d96E0B88c104d39a221DF001e475";
const PLATFORM_FEE_PERCENTAGE = 2; // 2% platform fee

const CUSD_ADDRESSES: Record<number, `0x${string}`> = {
  42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo Mainnet
  44787: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Celo Sepolia
};

const getCusdAddress = (chainId: number): `0x${string}` => {
  return CUSD_ADDRESSES[chainId] || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
};

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

// Worker Submission for Tasks Created by User
interface CreatorSubmission {
  id: string;
  taskId: string;
  workerAddress: string;
  proofLink?: string;
  proofText?: string;
  proofImageName?: string;
  status: "pending" | "approved" | "rejected" | "disputed" | "rejected-final";
  date: string;
  rejectionCategory?: string;
  rejectionReason?: string;
  disputeReason?: string;
  disputedAt?: string;
}

// User's own submissions
interface Submission {
  id: string;
  taskTitle: string;
  platform: Platform;
  amount: string;
  status: "pending" | "approved" | "rejected" | "disputed" | "rejected-final";
  date: string;
  proofLink?: string;
  proofImageName?: string;
  proofText?: string;
  rejectionCategory?: string;
  rejectionReason?: string;
  disputeReason?: string;
  disputedAt?: string;
}

// Custom SVG Icons for X (Twitter) and TikTok to make the UI look premium
const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.86 1.09 2.05 1.86 3.37 2.22.01 1.28.01 2.56 0 3.84-1.39-.03-2.78-.45-3.95-1.22-.38-.25-.74-.53-1.07-.85-.01 1.63.01 3.26-.01 4.89-.09 2.56-1.19 5.07-3.17 6.75-2.07 1.81-4.99 2.51-7.66 1.89-2.88-.63-5.38-2.84-6.26-5.69-1.02-3.13-.17-6.83 2.21-9.06C5.07 5.61 7.26 4.63 9.58 4.67c.01 1.34 0 2.68.01 4.02-1.3-.06-2.65.41-3.48 1.44-.97 1.15-1.12 2.91-.38 4.22.68 1.29 2.14 2.14 3.6 2.08 1.58-.02 3.04-1.14 3.42-2.67.17-.61.16-1.26.16-1.89V.02z" />
  </svg>
);

import logoImg from "../../assets/logo.png";

const TasklyLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <img src={logoImg.src} alt="Taskly Logo" className="object-contain w-full h-full" />
  </div>
);

export default function Home() {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [CUSD_TO_NGN_RATE, setCusdToNgnRate] = useState<number>(FALLBACK_CUSD_TO_NGN_RATE);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates && data.rates.NGN) {
            const fetchedRate = Math.round(data.rates.NGN);
            console.log("Fetched live NGN rate:", fetchedRate);
            setCusdToNgnRate(fetchedRate);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live exchange rate, using fallback:", err);
      }
    };
    fetchRate();
  }, []);

  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "naira">("wallet");
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const isMiniPayApp = useMemo(() => {
    if (typeof window === "undefined") return false;
    const win = window as any;
    return !!(win.ethereum && win.ethereum.isMiniPay);
  }, []);

  const activeAddress = useMemo(() => {
    return (wagmiAddress || "").toLowerCase();
  }, [wagmiAddress]);

  const isUserConnected = useMemo(() => {
    return isConnected;
  }, [isConnected]);
  const { connectAsync, connectors } = useConnect();
  const connectModal = useConnectModal();
  const openConnectModal = connectModal ? connectModal.openConnectModal : undefined;
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();

  // Screen state routing
  // "splash" | "main" (with nested tabs) | "task-details" | "submit-proof" | "create-task" | "success-celebration"
  const [screen, setScreen] = useState<"splash" | "main" | "task-details" | "submit-proof" | "create-task" | "success-celebration">("splash");
  
  // Bottom navigation tab state
  // "home" | "history" | "profile" | "about"
  const [activeTab, setActiveTab] = useState<"home" | "history" | "profile" | "about">("home");

  // Profile Sub-Screen for Creator Dashboard
  // "profile-main" | "created-tasks" | "manage-submissions" | "admin-disputes" | "admin-withdrawals"
  const [profileSubScreen, setProfileSubScreen] = useState<"profile-main" | "created-tasks" | "manage-submissions" | "admin-disputes" | "admin-campaigns" | "admin-withdrawals">("profile-main");

  // Selected task for Details and Submission
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Selected created task to view submissions
  const [selectedCreatedTask, setSelectedCreatedTask] = useState<Task | null>(null);

  // Sorting popover state
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState<"payout-desc" | "payout-asc" | "recency-desc" | "recency-asc">("recency-desc");

  // Available Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);

  // Submissions received by tasks created by the user (Firestore synced)
  const [creatorSubmissions, setCreatorSubmissions] = useState<CreatorSubmission[]>([]);

  // Filter selection state
  const [activeFilter, setActiveFilter] = useState<string>("All");

  // Currency Preference: "cUSD" | "NGN"
  const [currencyPreference, setCurrencyPreference] = useState<"cUSD" | "NGN">("cUSD");

  // Platform Administrator stats (from Firestore database stats doc)
  const [platformAdminStats, setPlatformAdminStats] = useState({
    feesCollected: 0.09,
    lockedEscrow: 1.50,
  });
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);

  // Deriving User's own Submissions History from the global submissions database
  const history = useMemo(() => {
    if (!activeAddress) return [];
    return creatorSubmissions
      .filter((sub) => sub.workerAddress.toLowerCase() === activeAddress)
      .map((sub) => {
        const t = tasks.find((tk) => tk.id === sub.taskId);
        return {
          id: sub.id,
          taskTitle: t ? t.title : "Celo Task",
          platform: t ? t.platform : ("x" as Platform),
          amount: t ? t.amount : "0.05 cUSD",
          status: sub.status,
          date: sub.date.split("T")[0],
          proofLink: sub.proofLink,
          proofImageName: sub.proofImageName,
          rejectionCategory: sub.rejectionCategory,
          rejectionReason: sub.rejectionReason,
          disputeReason: sub.disputeReason,
          disputedAt: sub.disputedAt
        };
      });
  }, [creatorSubmissions, tasks, activeAddress]);

  // Web3 Transaction Overlay state
  interface ActiveTransaction {
    status: "confirm-deposit" | "naira-checkout" | "sending-escrow" | "confirm-release" | "releasing-escrow" | "confirm-refund" | "refunding-escrow" | "confirm-reopen" | "reopening-campaign" | "confirm-withdrawal" | "processing-withdrawal" | "success";
    title: string;
    amount: string;
    step?: number;
    txHash?: string;
    onClose?: () => void;
  }
  const [activeTransaction, setActiveTransaction] = useState<ActiveTransaction | null>(null);

  interface PendingTxData {
    newTask?: Task;
    subId?: string;
    taskId?: string;
    withdrawal?: any;
  }
  const [pendingTxData, setPendingTxData] = useState<PendingTxData | null>(null);

  // Firestore user balance and withdrawals
  const [dbUserBalance, setDbUserBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Format amount based on user currency preference
  const formatCurrency = (amountStr: string) => {
    if (!amountStr) return "";
    const val = parseFloat(amountStr.replace(/[^\d.]/g, ""));
    if (isNaN(val)) return amountStr;
    if (currencyPreference === "NGN") {
      return `₦${Math.round(val * CUSD_TO_NGN_RATE).toLocaleString()}`;
    }
    return `${val.toFixed(2)} cUSD`;
  };

  const formatCurrencyVal = (val: number) => {
    if (currencyPreference === "NGN") {
      return `₦${Math.round(val * CUSD_TO_NGN_RATE).toLocaleString()}`;
    }
    return `${val.toFixed(2)} cUSD`;
  };

  // Checked checklist actions for the selected platform
  const [checkedActions, setCheckedActions] = useState<string[]>(["follow"]);

  // Helper to compute combined base price of selected actions
  const getBasePrice = (platform: Platform, checked: string[]) => {
    let total = 0;
    checked.forEach((actVal) => {
      const act = PLATFORM_ACTIONS[platform]?.find((a) => a.value === actVal);
      if (act) {
        total += act.basePrice;
      }
    });
    return parseFloat(total.toFixed(2));
  };

  // Create Task Form State
  const [payoutValue, setPayoutValue] = useState<number>(0.05);
  const [slotsValue, setSlotsValue] = useState<number>(50);
  const [payoutInput, setPayoutInput] = useState<string>("0.05");
  const [slotsInput, setSlotsInput] = useState<string>("50");
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectionCategory, setRejectionCategory] = useState<string>("invalid screenshot");
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");

  const [disputingSubId, setDisputingSubId] = useState<string | null>(null);
  const [disputeReasonInput, setDisputeReasonInput] = useState<string>("");

  // Media Viewer Modal state
  const [mediaViewerUrl, setMediaViewerUrl] = useState<string | null>(null);
  const [mediaViewerType, setMediaViewerType] = useState<"image" | "video">("image");
  const [createTaskForm, setCreateTaskForm] = useState({
    title: "",
    platform: "x" as Platform, // Default to X
    description: "",
    type: "Social Follow",
    instructionsText: "",
    proofRequirements: "",
    link: "",
    proofType: "screenshot" as "screenshot" | "text" | "both" | "screen-recording"
  });

  // Auto-update payout when selected actions change
  useEffect(() => {
    const base = getBasePrice(createTaskForm.platform, checkedActions);
    setPayoutValue(base);
    setPayoutInput(base.toFixed(2));
  }, [checkedActions, createTaskForm.platform]);

  // Auto-update form texts based on checklist actions
  useEffect(() => {
    if (checkedActions.length === 0) return;

    // 1. Generate Title (e.g. "Follow & Like on X")
    const actionLabels = checkedActions.map((actVal) => {
      const act = PLATFORM_ACTIONS[createTaskForm.platform]?.find((a) => a.value === actVal);
      return act ? act.label : "";
    }).filter(Boolean);

    let generatedTitle = "";
    const platformLabel = createTaskForm.platform === "x" ? "X" : 
                         createTaskForm.platform.charAt(0).toUpperCase() + createTaskForm.platform.slice(1);
    
    if (actionLabels.length === 1) {
      generatedTitle = `${actionLabels[0]} on ${platformLabel}`;
    } else if (actionLabels.length === 2) {
      generatedTitle = `${actionLabels[0]} & ${actionLabels[1]} on ${platformLabel}`;
    } else if (actionLabels.length > 2) {
      generatedTitle = `${actionLabels.slice(0, -1).join(", ")} & ${actionLabels[actionLabels.length - 1]} on ${platformLabel}`;
    }

    // 2. Generate Instructions (One per line)
    const instList: string[] = [];
    checkedActions.forEach((actVal) => {
      const steps = ACTION_INSTRUCTIONS[actVal] || [];
      instList.push(...steps);
    });
    // Append link usage step
    instList.unshift("Open the target link.");
    // Append screenshot request step
    instList.push("Provide the required completion proof.");
    const generatedInstructionsText = instList.join("\n");

    // 3. Generate Proof Requirements
    const proofList: string[] = [];
    checkedActions.forEach((actVal) => {
      const proofs = ACTION_PROOF_PRESETS[actVal] || [];
      proofs.forEach((p) => {
        if (!proofList.includes(p)) {
          proofList.push(p);
        }
      });
    });
    const generatedProofRequirements = proofList.length > 0 
      ? proofList.join(" & ") 
      : "Submit screenshot showing completion.";

    // 4. Update state (avoiding resetting other fields like link and description)
    setCreateTaskForm((prev) => ({
      ...prev,
      title: generatedTitle,
      instructionsText: generatedInstructionsText,
      proofRequirements: generatedProofRequirements,
      type: checkedActions.includes("follow") || checkedActions.includes("subscribe") || checkedActions.includes("follow_page") || checkedActions.includes("follow_company") ? "Social Follow" : "Social Engagement"
    }));
  }, [checkedActions, createTaskForm.platform]);

  // Proof submission form state
  const [proofForm, setProofForm] = useState({
    screenshot: null as File | null,
    screenRecording: null as File | null,
    proofLink: ""
  });

  // Auto-navigation for Splash Screen
  useEffect(() => {
    if (screen === "splash") {
      const timer = setTimeout(() => {
        setScreen("main");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Auto-connect wallet in MiniPay after splash screen closes
  useEffect(() => {
    if (screen === "main") {
      const win = typeof window !== "undefined" ? (window as any) : null;
      const isMinipay = !!(win && win.ethereum && win.ethereum.isMiniPay);
      if (isMinipay && !isConnected) {
        const injectedConnector = connectors.find((c) => c.id === "injected") || connectors[0];
        if (injectedConnector) {
          connectAsync({ connector: injectedConnector }).catch((err) => {
            console.error("Auto-connect failed in MiniPay", err);
          });
        }
      }
    }
  }, [screen, isConnected, connectors, connectAsync]);

  // Load or create user document on connection (WAGMI or Manual)
  useEffect(() => {
    if (activeAddress) {
      const userDocRef = doc(db, "users", activeAddress);
      getDoc(userDocRef).then((docSnap) => {
        if (!docSnap.exists()) {
          setDoc(userDocRef, {
            wallet_address: activeAddress,
            total_earnings: 0,
            tasks_completed: 0,
            total_submissions: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).catch((err) => console.error("Error creating user doc:", err));
        }
      }).catch((err) => console.error("Error getting user doc:", err));
    }
  }, [activeAddress]);

  // Synchronize tasks, submissions, and admin stats from Firestore (with automatic seeding if empty)
  useEffect(() => {
    // Ensure admin_wallet is synced in admin/stats
    const statsRef = doc(db, "admin", "stats");
    setDoc(statsRef, {
      admin_wallet: PLATFORM_ESCROW_WALLET.toLowerCase()
    }, { merge: true }).catch((err) => console.error("Error setting admin wallet:", err));

    const unsubscribeTasks = onSnapshot(collection(db, "tasks"), async (snapshot) => {
      // Ensure admin stats document exists even if tasks are empty
      const adminStatsRef = doc(db, "admin", "stats");
      const adminStatsSnap = await getDoc(adminStatsRef);
      if (!adminStatsSnap.exists()) {
        await setDoc(adminStatsRef, {
          feesCollected: 0.00,
          lockedEscrow: 0.00,
          admin_wallet: PLATFORM_ESCROW_WALLET.toLowerCase()
        });
      }

      const loadedTasks: Task[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        loadedTasks.push({
          id: d.id,
          platform: data.platform,
          title: data.title,
          amount: data.reward_amount,
          description: data.description,
          type: data.task_type,
          slotsRemaining: data.slots_remaining,
          slotsTotal: data.total_slots,
          instructions: data.instructions || [],
          proofRequirements: data.proof_requirements,
          link: data.task_link,
          expiryHours: data.expiry_hours || 24,
          isUserCreated: !!(activeAddress && data.created_by_wallet && data.created_by_wallet.toLowerCase() === activeAddress),
          proofType: data.proof_type,
          createdByWallet: data.created_by_wallet,
          status: data.status || "active",
          expiresAt: data.expires_at || null,
        });
      });
      setTasks(loadedTasks);
    });

    const unsubscribeSubs = onSnapshot(collection(db, "submissions"), (snapshot) => {
      const subs: CreatorSubmission[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        subs.push({
          id: d.id,
          taskId: data.task_id,
          workerAddress: data.wallet_address,
          proofLink: data.proof_url || "",
          proofText: data.proof_text || "",
          proofImageName: data.proof_url ? (data.proof_type === "screen-recording" ? "screen_recording.webm" : "proof_screenshot.png") : undefined,
          status: data.status,
          date: data.submitted_at,
          rejectionCategory: data.rejection_category || "",
          rejectionReason: data.rejection_reason || "",
          disputeReason: data.dispute_reason || "",
          disputedAt: data.disputed_at || "",
        });
      });
      setCreatorSubmissions(subs);
    });

    const unsubscribeAdmin = onSnapshot(doc(db, "admin", "stats"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlatformAdminStats({
          feesCollected: data.feesCollected || 0,
          lockedEscrow: data.lockedEscrow || 0,
        });
      }
    });

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setTotalUsersCount(snapshot.size);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeSubs();
      unsubscribeAdmin();
      unsubscribeUsers();
    };
  }, []);

  // Real-time listener for current user document to track balance
  useEffect(() => {
    if (!activeAddress) {
      setDbUserBalance(0);
      return;
    }
    const userDocRef = doc(db, "users", activeAddress);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setDbUserBalance(docSnap.data().balance || 0);
      } else {
        setDbUserBalance(0);
      }
    });
    return () => unsubscribeUser();
  }, [activeAddress]);

  // Load withdrawals (Admin only)
  useEffect(() => {
    const isAdmin = activeAddress === PLATFORM_ESCROW_WALLET.toLowerCase();
    if (!isAdmin) {
      setWithdrawals([]);
      return;
    }
    const unsubscribeWithdrawals = onSnapshot(collection(db, "withdrawals"), (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach((d) => {
        loaded.push(d.data());
      });
      setWithdrawals(loaded);
    });
    return () => unsubscribeWithdrawals();
  }, [activeAddress]);

  // Auto-approval scan on database update (writing updates to Firestore)
  useEffect(() => {
    const scanAutoApproval = async () => {
      const now = Date.now();
      const pendingSubs = creatorSubmissions.filter((sub) => sub.status === "pending");
      
      for (const sub of pendingSubs) {
        const subTime = new Date(sub.date).getTime();
        const hoursDiff = (now - subTime) / (1000 * 60 * 60);
        if (hoursDiff >= 24) {
          console.log(`Auto-approving submission ${sub.id}...`);
          
          const tk = tasks.find((t) => t.id === sub.taskId);
          const payoutVal = tk ? parseFloat(tk.amount.replace(/[^\d.]/g, "")) : 0.05;

          try {
            const subRef = doc(db, "submissions", sub.id);
            const taskRef = doc(db, "tasks", sub.taskId);
            const statsRef = doc(db, "admin", "stats");

            await updateDoc(subRef, {
              status: "approved",
              reviewed_at: new Date().toISOString(),
              reviewer_wallet: "system-auto-approval",
              transaction_hash: "0x_auto_approved",
              proof_url: "",
              proof_text: ""
            });

            if (tk) {
              await updateDoc(taskRef, {
                slots_remaining: Math.max(0, tk.slotsRemaining - 1),
                updated_at: new Date().toISOString()
              });
            }

            if (payoutVal > 0) {
              await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(statsRef);
                const currentEscrow = sfDoc.exists() ? sfDoc.data().lockedEscrow || 0 : 0;
                transaction.set(statsRef, {
                  lockedEscrow: Math.max(0, parseFloat((currentEscrow - payoutVal).toFixed(2)))
                }, { merge: true });
              });
            }

            const workerUserRef = doc(db, "users", sub.workerAddress.toLowerCase());
            await runTransaction(db, async (transaction) => {
              const workerDoc = await transaction.get(workerUserRef);
              const currentEarnings = workerDoc.exists() ? workerDoc.data().total_earnings || 0 : 0;
              const currentBalance = workerDoc.exists() ? workerDoc.data().balance || 0 : 0;
              const completedCount = workerDoc.exists() ? workerDoc.data().tasks_completed || 0 : 0;
              transaction.set(workerUserRef, {
                balance: parseFloat((currentBalance + payoutVal).toFixed(2)),
                total_earnings: parseFloat((currentEarnings + payoutVal).toFixed(2)),
                tasks_completed: completedCount + 1,
                updated_at: new Date().toISOString()
              }, { merge: true });
            });

          } catch (err) {
            console.error(`Auto-approval failed for submission ${sub.id}:`, err);
          }
        }
      }
    };

    if (creatorSubmissions.length > 0 && tasks.length > 0) {
      scanAutoApproval();
    }
  }, [creatorSubmissions, tasks]);

  // Derived user statistics from history
  const stats = useMemo(() => {
    const approved = history.filter((s) => s.status === "approved");
    const totalEarned = approved.reduce((acc, curr) => {
      const val = parseFloat(curr.amount.split(" ")[0]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    return {
      completed: approved.length,
      earnings: `${totalEarned.toFixed(2)} cUSD`
    };
  }, [history]);

  // Filter chips list (includes new Facebook & LinkedIn platforms)
  const filterChips = ["All", "Instagram", "X", "YouTube", "TikTok", "Facebook", "LinkedIn", "GitHub", "Survey", "Testing"];

  // Filtered & Sorted tasks logic
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter out completed, expired, refunded, or pending payment tasks
    result = result.filter((t) => {
      const isCompleted = t.slotsRemaining <= 0;
      const isExpired = t.expiresAt && new Date(t.expiresAt).getTime() < Date.now();
      const isRefunded = t.status === "refunded";
      const isPending = t.status === "pending_payment";
      if (isCompleted || isExpired || isRefunded || isPending || t.status === "expired") return false;
      return true;
    });

    // Filter out user's own tasks from feed, and tasks they have already submitted proof for
    if (activeAddress) {
      const addressLower = activeAddress;
      result = result.filter((t) => {
        // Exclude own tasks
        if (t.createdByWallet?.toLowerCase() === addressLower) return false;
        
        // Exclude tasks already completed/submitted by the worker (unless they were rejected and can be resubmitted)
        const hasSubmittedActive = creatorSubmissions.some(
          (sub) => sub.taskId === t.id && sub.workerAddress?.toLowerCase() === addressLower && sub.status !== "rejected"
        );
        if (hasSubmittedActive) return false;

        return true;
      });
    }
    
    // Filter
    if (activeFilter !== "All") {
      result = result.filter((t) => t.platform.toLowerCase() === activeFilter.toLowerCase());
    }

    // Sort
    return [...result].sort((a, b) => {
      const valA = parseFloat(a.amount.split(" ")[0]);
      const valB = parseFloat(b.amount.split(" ")[0]);
      
      switch (sortBy) {
        case "payout-desc":
          return valB - valA;
        case "payout-asc":
          return valA - valB;
        case "recency-desc":
          return parseInt(b.id) - parseInt(a.id);
        case "recency-asc":
          return parseInt(a.id) - parseInt(b.id);
        default:
          return 0;
      }
    });
  }, [tasks, activeFilter, sortBy, wagmiAddress, creatorSubmissions]);

  // Function to resolve platform icons (includes Facebook & LinkedIn)
  const getPlatformIcon = (platform: Platform, className = "w-5 h-5") => {
    switch (platform) {
      case "instagram":
        return <Instagram className={`${className} text-pink-500`} />;
      case "x":
        return <XIcon className={`${className} text-slate-800`} />;
      case "youtube":
        return <Youtube className={`${className} text-red-500`} />;
      case "tiktok":
        return <TikTokIcon className={`${className} text-slate-900`} />;
      case "survey":
        return <ClipboardList className={`${className} text-emerald-500`} />;
      case "testing":
        return <Cpu className={`${className} text-blue-500`} />;
      case "facebook":
        return <Facebook className={`${className} text-blue-600`} />;
      case "linkedin":
        return <Linkedin className={`${className} text-[#0a66c2]`} />;
      case "github":
        return <Github className={`${className} text-slate-900`} />;
      default:
        return <FileText className={`${className} text-slate-500`} />;
    }
  };

  // Adjusters for Created Task Steppers
  const adjustPayout = (val: number) => {
    setPayoutValue((prev) => {
      const minPrice = getBasePrice(createTaskForm.platform, checkedActions);
      const newVal = Math.max(minPrice, parseFloat((prev + val).toFixed(2)));
      setPayoutInput(newVal.toFixed(2));
      return newVal;
    });
  };

  const adjustSlots = (val: number) => {
    setSlotsValue((prev) => {
      const newVal = Math.max(5, prev + val);
      setSlotsInput(String(newVal));
      return newVal;
    });
  };

  // Helper to run action only if authenticated/connected
  const handleAuthAction = async (action: () => void) => {
    if (isUserConnected) {
      action();
      return;
    }

    try {
      const win = window as any;
      const isMinipay = !!(win.ethereum && win.ethereum.isMiniPay);
      
      if (isMinipay) {
        const injectedConnector = connectors.find((c) => c.id === "injected") || connectors[0];
        if (injectedConnector) {
          await connectAsync({ connector: injectedConnector });
          setTimeout(() => {
            action();
          }, 200);
        } else {
          alert("Injected wallet connector not found.");
        }
      } else {
        if (openConnectModal) {
          openConnectModal();
        } else {
          const injectedConnector = connectors.find((c) => c.id === "injected");
          if (injectedConnector) {
            await connectAsync({ connector: injectedConnector });
          }
        }
      }
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  };

  // Launch Korapay Checkout inline modal
  const payWithKorapay = () => {
    if (!activeTransaction || !pendingTxData?.newTask) return;
    const task = pendingTxData.newTask;
    const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
    const baseNairaAmount = Math.round(amountNum * CUSD_TO_NGN_RATE);
    
    // Kora fee (1.5%) + Flat gas fee buffer (₦150)
    const koraFee = Math.round(baseNairaAmount * 0.015);
    const gasBuffer = 150;
    const finalNairaAmount = baseNairaAmount + koraFee + gasBuffer;

    if (finalNairaAmount < 100) {
      alert("The minimum payment amount allowed by Korapay is ₦100. Please increase your campaign budget.");
      return;
    }

    const korapayKey = process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY || "pk_live_Q8YucBLGXAKq3z23CBLa79Jv95brJLcwxvd9XUDM";

    if (typeof window !== "undefined" && (window as any).Korapay) {
      (window as any).Korapay.initialize({
        key: korapayKey,
        reference: `${task.id}_${Date.now()}`,
        amount: finalNairaAmount,
        currency: "NGN",
        customer: {
          name: "Taskly Creator",
          email: "creator@taskly.app"
        },
        onClose: () => {
          console.log("Korapay modal closed");
        },
        onSuccess: (response: any) => {
          console.log("Korapay payment successful:", response);
          setActiveTransaction({
            status: "success",
            title: task.title,
            amount: activeTransaction.amount,
            txHash: response.reference || "korapay-auto",
            onClose: () => {
              setActiveTransaction(null);
            }
          });
          alert("Naira payment successful! The platform is automatically creating and funding your campaign on Celo Mainnet via the smart contract. Check the feed shortly!");
        }
      });
    } else {
      alert("Korapay payment script is still loading. Please wait a moment and try again.");
    }
  };

  // Create Task Action
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let description = createTaskForm.description;
    const isSimpleTask = createTaskForm.type.toLowerCase().includes("follow") || 
                         createTaskForm.type.toLowerCase().includes("like") ||
                         createTaskForm.title.toLowerCase().includes("follow") ||
                         createTaskForm.title.toLowerCase().includes("like");
                         
    if (!description && isSimpleTask) {
      description = createTaskForm.title;
    }

    if (!createTaskForm.title || !description) return;

    const instructionsArray = createTaskForm.instructionsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const newTask: Task = {
      id: String(tasks.length + 10), // ensures higher ID for recency sorting
      platform: createTaskForm.platform,
      title: createTaskForm.title,
      amount: `${payoutValue.toFixed(2)} cUSD`,
      description: description,
      type: createTaskForm.type,
      slotsRemaining: slotsValue,
      slotsTotal: slotsValue,
      instructions: instructionsArray.length > 0 ? instructionsArray : ["Open the link.", "Complete requirements.", "Upload screenshot."],
      proofRequirements: createTaskForm.proofRequirements || "Submit screenshot showing completion.",
      link: createTaskForm.link || "https://celo.org",
      expiryHours: expiryHours,
      isUserCreated: true,
      proofType: createTaskForm.proofType
    };

    const budget = payoutValue * slotsValue;
    const fee = budget * (PLATFORM_FEE_PERCENTAGE / 100);
    const total = budget + fee;

    const escrowContractAddress = getEscrowAddress(chainId);
    const hasContract = escrowContractAddress && escrowContractAddress !== "0x0000000000000000000000000000000000000000";
    const isAdminCreating = wagmiAddress?.toLowerCase() === PLATFORM_ESCROW_WALLET.toLowerCase();
    
    if (isAdminCreating && !hasContract) {
      try {
        setPendingTxData({ newTask });
        await saveNewTask(newTask);
        setPendingTxData(null);
        setActiveTransaction({
          status: "success",
          title: newTask.title,
          amount: `${total.toFixed(2)} cUSD`,
          txHash: undefined,
          onClose: () => {
            setActiveTransaction(null);
          }
        });
      } catch (err: any) {
        console.error("Admin task creation failed:", err);
        alert("Failed to create task: " + (err.message || err));
        setPendingTxData(null);
        setActiveTransaction(null);
      }
      return;
    }

    setPendingTxData({ newTask });
    setActiveTransaction({
      status: "confirm-deposit",
      title: newTask.title,
      amount: `${total.toFixed(2)} cUSD`,
      onClose: () => {
        setActiveTransaction(null);
        setPendingTxData(null);
      }
    });
  };

  // Save new task after successful transaction
  const saveNewTask = async (newTask: Task) => {
    const taskData = {
      title: newTask.title,
      description: newTask.description,
      platform: newTask.platform,
      task_type: newTask.type,
      reward_amount: newTask.amount,
      total_slots: newTask.slotsTotal,
      slots_remaining: newTask.slotsRemaining,
      proof_type: newTask.proofType || "screenshot",
      task_link: newTask.link,
      status: newTask.status || "active",
      created_by_wallet: activeAddress || "unknown",
      expires_at: new Date(Date.now() + (newTask.expiryHours || 24) * 3600 * 1000).toISOString(),
      expiry_hours: newTask.expiryHours || 24,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_budget: parseFloat(newTask.amount.replace(/[^\d.]/g, "")) * newTask.slotsTotal,
      transaction_hash: activeTransaction?.txHash || (newTask as any).transactionHash || "0x",
      payout_currency: "cUSD"
    };

    try {
      await setDoc(doc(db, "tasks", newTask.id), taskData);

      await setDoc(doc(db, "payments", `pay-${newTask.id}-${Date.now()}`), {
        task_id: newTask.id,
        wallet_address: activeAddress || "unknown",
        amount: taskData.total_budget,
        currency: "cUSD",
        transaction_hash: activeTransaction?.txHash || (newTask as any).transactionHash || "0x",
        payment_status: taskData.status === "pending_payment" ? "pending" : "paid",
        created_at: new Date().toISOString()
      });

      const statsRef = doc(db, "admin", "stats");
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(statsRef);
        const currentFees = sfDoc.exists() ? sfDoc.data().feesCollected || 0 : 0;
        const currentEscrow = sfDoc.exists() ? sfDoc.data().lockedEscrow || 0 : 0;
        const fee = taskData.total_budget * (PLATFORM_FEE_PERCENTAGE / 100);
        
        transaction.set(statsRef, {
          feesCollected: parseFloat((currentFees + fee).toFixed(2)),
          lockedEscrow: parseFloat((currentEscrow + taskData.total_budget).toFixed(2))
        }, { merge: true });
      });

    } catch (err) {
      console.error("Firestore save task failed:", err);
    }

    setPayoutValue(0.05);
    setPayoutInput("0.05");
    setSlotsValue(50);
    setSlotsInput("50");
    setCheckedActions(["follow"]);
    setCreateTaskForm({
      title: "",
      platform: "instagram",
      description: "",
      type: "Social Follow",
      instructionsText: "",
      proofRequirements: "",
      link: "",
      proofType: "screenshot"
    });

    setScreen("main");
    setActiveTab("home");
  };

  // Submit Proof Action (with Firebase Storage upload)
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!wagmiAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    if (selectedTask.createdByWallet?.toLowerCase() === wagmiAddress.toLowerCase()) {
      alert("You cannot submit proof for a task you created.");
      return;
    }

    const existingSubmission = creatorSubmissions.find(
      (sub) => sub.taskId === selectedTask.id && sub.workerAddress?.toLowerCase() === wagmiAddress.toLowerCase()
    );
    if (existingSubmission && existingSubmission.status !== "rejected") {
      alert("You have already submitted proof for this task.");
      return;
    }

    try {
      setIsSubmittingProof(true);
      let fileUrl = "";

      if (proofForm.screenshot) {
        const fileRef = ref(storage, `proofs/screenshots/sub-${Date.now()}-${proofForm.screenshot.name}`);
        const uploadResult = await uploadBytes(fileRef, proofForm.screenshot);
        fileUrl = await getDownloadURL(uploadResult.ref);
      } 
      else if (proofForm.screenRecording) {
        const fileRef = ref(storage, `proofs/recordings/sub-${Date.now()}-${proofForm.screenRecording.name}`);
        const uploadResult = await uploadBytes(fileRef, proofForm.screenRecording);
        fileUrl = await getDownloadURL(uploadResult.ref);
      }

      const submissionId = existingSubmission ? existingSubmission.id : `sub-${Date.now()}`;
      const submissionData = {
        task_id: selectedTask.id,
        wallet_address: wagmiAddress.toLowerCase(),
        proof_url: fileUrl,
        proof_text: proofForm.proofLink || "",
        proof_type: selectedTask.proofType || "screenshot",
        status: "pending",
        submitted_at: new Date().toISOString(),
        transaction_hash: "",
        rejection_category: "",
        rejection_reason: "",
        dispute_reason: "",
        disputed_at: ""
      };

      await setDoc(doc(db, "submissions", submissionId), submissionData);

      setProofForm({
        screenshot: null,
        screenRecording: null,
        proofLink: ""
      });

      setIsSubmittingProof(false);
      setScreen("success-celebration");

    } catch (err: any) {
      setIsSubmittingProof(false);
      console.error("Firestore submission failed:", err);
      alert("Error submitting proof: " + (err.message || err));
    }
  };

  // Creator Action: Approve Worker Submission (triggers escrow release transaction)
  const handleApproveSubmission = (subId: string, taskId: string) => {
    const tk = tasks.find((t) => t.id === taskId);
    const payoutStr = tk ? tk.amount : "1.50 cUSD";
    
    setPendingTxData({ subId, taskId });
    setActiveTransaction({
      status: "confirm-release",
      title: tk ? tk.title : "Release Escrow",
      amount: payoutStr,
      onClose: () => {
        setActiveTransaction(null);
        setPendingTxData(null);
      }
    });
  };

  // Perform approved release from platform escrow
  const saveApproveSubmission = async (subId: string, taskId: string) => {
    try {
      const tk = tasks.find((t) => t.id === taskId);
      const payoutVal = tk ? parseFloat(tk.amount.replace(/[^\d.]/g, "")) : 0.05;

      const subRef = doc(db, "submissions", subId);
      const taskRef = doc(db, "tasks", taskId);
      const statsRef = doc(db, "admin", "stats");

      await updateDoc(subRef, {
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewer_wallet: wagmiAddress?.toLowerCase() || "unknown",
        transaction_hash: activeTransaction?.txHash || "0x",
        proof_url: "",
        proof_text: ""
      });

      if (tk) {
        await updateDoc(taskRef, {
          slots_remaining: Math.max(0, tk.slotsRemaining - 1),
          updated_at: new Date().toISOString()
        });
      }

      if (payoutVal > 0) {
        await runTransaction(db, async (transaction) => {
          const sfDoc = await transaction.get(statsRef);
          const currentEscrow = sfDoc.exists() ? sfDoc.data().lockedEscrow || 0 : 0;
          transaction.set(statsRef, {
            lockedEscrow: Math.max(0, parseFloat((currentEscrow - payoutVal).toFixed(2)))
          }, { merge: true });
        });
      }

      const subDocSnap = await getDoc(subRef);
      if (subDocSnap.exists()) {
        const workerWallet = subDocSnap.data().wallet_address;
        if (workerWallet) {
          const workerUserRef = doc(db, "users", workerWallet.toLowerCase());
          await runTransaction(db, async (transaction) => {
            const workerDoc = await transaction.get(workerUserRef);
            const currentEarnings = workerDoc.exists() ? workerDoc.data().total_earnings || 0 : 0;
            const currentBalance = workerDoc.exists() ? workerDoc.data().balance || 0 : 0;
            const completedCount = workerDoc.exists() ? workerDoc.data().tasks_completed || 0 : 0;
            transaction.set(workerUserRef, {
              balance: parseFloat((currentBalance + payoutVal).toFixed(2)),
              total_earnings: parseFloat((currentEarnings + payoutVal).toFixed(2)),
              tasks_completed: completedCount + 1,
              updated_at: new Date().toISOString()
            }, { merge: true });
          });
        }
      }

    } catch (err) {
      console.error("Firestore approve submission failed:", err);
    }
  };

  // Calculate if rejection rate cap is reached (Max 40% rejection rate for a task)
  const isRejectionCapReached = (taskId: string): boolean => {
    const taskSubs = creatorSubmissions.filter(s => s.taskId === taskId);
    const approvedCount = taskSubs.filter(s => s.status === "approved").length;
    const rejectedCount = taskSubs.filter(s => s.status === "rejected" || s.status === "rejected-final" || s.status === "disputed").length;
    const totalReviewed = approvedCount + rejectedCount;
    
    // We only enforce the 40% cap after at least 3 reviewed submissions
    if (totalReviewed >= 3) {
      const proposedRejectionRate = ((rejectedCount + 1) / (totalReviewed + 1)) * 100;
      if (proposedRejectionRate > 40) {
        return true;
      }
    }
    return false;
  };

  const triggerRejectDialog = (subId: string, taskId: string) => {
    if (isRejectionCapReached(taskId)) {
      alert("Rejection rate limit reached (Max 40% for this task). You must approve this submission.");
      return;
    }
    setRejectingSubId(subId);
    setRejectingTaskId(taskId);
    setRejectionCategory("invalid screenshot");
    setRejectionReasonInput("");
  };

  // Creator Action: Reject Worker Submission
  const handleRejectSubmission = async (subId: string, category: string, reason: string) => {
    try {
      const subRef = doc(db, "submissions", subId);
      await updateDoc(subRef, {
        status: "rejected",
        rejection_category: category,
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewer_wallet: wagmiAddress?.toLowerCase() || "unknown"
      });
      setRejectingSubId(null);
      setRejectingTaskId(null);
    } catch (err) {
      console.error("Firestore reject submission failed:", err);
    }
  };

  // Worker Action: Dispute Rejection
  const handleDisputeRejection = async (subId: string, reason: string) => {
    try {
      const subRef = doc(db, "submissions", subId);
      await updateDoc(subRef, {
        status: "disputed",
        dispute_reason: reason,
        disputed_at: new Date().toISOString()
      });
      setDisputingSubId(null);
      setDisputeReasonInput("");
      alert("Your dispute has been logged successfully. The platform administrator will verify the details.");
    } catch (err) {
      console.error("Firestore dispute submission failed:", err);
    }
  };

  // Admin Action: Uphold Rejection
  const handleAdminApproveRejection = async (subId: string) => {
    try {
      const subRef = doc(db, "submissions", subId);
      await updateDoc(subRef, {
        status: "rejected-final",
        reviewed_at: new Date().toISOString(),
        reviewer_wallet: wagmiAddress?.toLowerCase() || "unknown"
      });
      alert("Rejection upheld. The dispute has been finalized.");
    } catch (err) {
      console.error("Firestore admin reject dispute failed:", err);
    }
  };

  // Admin Action: Pay Worker (Reuses the existing release transaction modal)
  const handleAdminPayWorker = (subId: string, taskId: string) => {
    const tk = tasks.find((t) => t.id === taskId);
    if (!tk) return;
    const payoutVal = parseFloat(tk.amount.replace(/[^\d.]/g, "")) || 0.05;

    setPendingTxData({ subId, taskId });
    setActiveTransaction({
      status: "confirm-release",
      title: "Resolve Dispute: Payout Worker",
      amount: `${payoutVal.toFixed(2)} cUSD`,
      onClose: () => {
        setActiveTransaction(null);
        setPendingTxData(null);
      }
    });
  };

  // Admin Action: Delete Campaign
  const handleDeleteCampaign = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign? This action is permanent and cannot be undone.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      alert("Campaign deleted successfully from Firestore.");
    } catch (err: any) {
      console.error("Delete campaign failed:", err);
      alert("Failed to delete campaign: " + err.message);
    }
  };

  // Admin Action: Reset Database
  const handleResetDatabase = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete all users, campaigns, submissions, payments, and disputes? This is a complete database reset and cannot be undone.")) {
      return;
    }
    try {
      const collectionsToClear = ["users", "tasks", "submissions", "payments", "disputes", "withdrawals"];
      for (const colName of collectionsToClear) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletePromises);
      }
      alert("Database has been reset successfully! All users, campaigns, submissions, and disputes have been cleared.");
      window.location.reload();
    } catch (err: any) {
      console.error("Reset database failed:", err);
      alert("Failed to reset database: " + err.message);
    }
  };

  // Worker Action: Request Withdrawal of earned balance
  const handleRequestWithdrawal = async () => {
    if (!wagmiAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    if (dbUserBalance < 1.00) {
      alert("Minimum withdrawable amount is 1 cUSD.");
      return;
    }
    if (!window.confirm(`Are you sure you want to withdraw ${dbUserBalance.toFixed(2)} cUSD? This will request a payout to your connected wallet address ${wagmiAddress}.`)) {
      return;
    }

    try {
      const amountToWithdraw = dbUserBalance;
      const userDocRef = doc(db, "users", wagmiAddress.toLowerCase());
      await updateDoc(userDocRef, {
        balance: 0,
        updated_at: new Date().toISOString()
      });

      const wRef = doc(collection(db, "withdrawals"));
      await setDoc(wRef, {
        id: wRef.id,
        workerAddress: wagmiAddress.toLowerCase(),
        amount: amountToWithdraw,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      alert(`Withdrawal request of ${amountToWithdraw.toFixed(2)} cUSD submitted successfully! It is pending platform admin payout.`);
    } catch (err: any) {
      console.error("Withdrawal request failed:", err);
      alert("Failed to submit withdrawal request: " + err.message);
    }
  };

  // Admin Action: Initiate On-chain Payout for Withdrawal Request
  const handleProcessWithdrawal = (withdrawal: any) => {
    setPendingTxData({ withdrawal });
    setActiveTransaction({
      status: "confirm-withdrawal",
      title: "Process Worker Withdrawal",
      amount: `${withdrawal.amount.toFixed(2)} cUSD`,
      onClose: () => {
        setActiveTransaction(null);
        setPendingTxData(null);
      }
    });
  };

  // Creator Action: Claim Escrow Refund for Expired Task
  const handleClaimRefund = async (taskId: string) => {
    const tk = tasks.find((t) => t.id === taskId);
    if (!tk) return;
    const payoutVal = parseFloat(tk.amount.replace(/[^\d.]/g, "")) || 0.05;
    const refundVal = tk.slotsRemaining * payoutVal;
    
    setPendingTxData({ taskId });
    setActiveTransaction({
      status: "confirm-refund",
      title: "Claim Escrow Refund",
      amount: `${refundVal.toFixed(2)} cUSD`,
      onClose: () => {
        setActiveTransaction(null);
        setPendingTxData(null);
      }
    });
  };

  const executeRefund = async (taskId: string) => {
    try {
      const tk = tasks.find((t) => t.id === taskId);
      if (!tk) return;
      const payoutVal = parseFloat(tk.amount.replace(/[^\d.]/g, "")) || 0.05;
      const refundVal = tk.slotsRemaining * payoutVal;

      const taskRef = doc(db, "tasks", taskId);
      const statsRef = doc(db, "admin", "stats");

      // Set state to refunding
      setActiveTransaction((prev) => prev ? { ...prev, status: "refunding-escrow" } : null);

      // Simulate a small delay for blockchain experience
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update task status to "refunded"
      await updateDoc(taskRef, {
        status: "refunded",
        updated_at: new Date().toISOString()
      });

      // Update admin stats
      if (refundVal > 0) {
        await runTransaction(db, async (transaction) => {
          const sfDoc = await transaction.get(statsRef);
          const currentEscrow = sfDoc.exists() ? sfDoc.data().lockedEscrow || 0 : 0;
          transaction.set(statsRef, {
            lockedEscrow: Math.max(0, parseFloat((currentEscrow - refundVal).toFixed(2)))
          }, { merge: true });
        });
      }

      // Transition to success
      setActiveTransaction((prev) => prev ? { 
        ...prev, 
        status: "success", 
        txHash: `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`
      } : null);

    } catch (err: any) {
      console.error("Firestore refund failed:", err);
      alert("Refund failed: " + (err.message || err));
      setActiveTransaction(null);
      setPendingTxData(null);
    }
  };

  // Creator Action: Reopen Campaign
  const handleReopenTask = async (taskId: string) => {
    const tk = tasks.find((t) => t.id === taskId);
    if (!tk) return;

    const payoutVal = parseFloat(tk.amount.replace(/[^\d.]/g, "")) || 0.05;
    const budget = payoutVal * tk.slotsTotal;
    const fee = budget * (PLATFORM_FEE_PERCENTAGE / 100);
    const total = budget + fee;

    setPendingTxData({ taskId });
    setActiveTransaction({
      status: "confirm-reopen",
      title: "Reopen Campaign",
      amount: `${total.toFixed(2)} cUSD`,
      onClose: () => {
        setActiveTransaction(null);
        setPendingTxData(null);
      }
    });
  };

  const executeReopen = async (taskId: string) => {
    try {
      const tk = tasks.find((t) => t.id === taskId);
      if (!tk) return;

      const payoutVal = parseFloat(tk.amount.replace(/[^\d.]/g, "")) || 0.05;
      const budget = payoutVal * tk.slotsTotal;
      const fee = budget * (PLATFORM_FEE_PERCENTAGE / 100);
      const total = budget + fee;

      // Transition to sending state
      setActiveTransaction((prev) => prev ? { ...prev, status: "reopening-campaign" } : null);

      // 1. Write the blockchain transaction (same token transfer as task creation)
      const amountWei = parseEther(total.toFixed(18));
      const cusdAddress = getCusdAddress(chainId);
      const txHash = await writeContractAsync({
        address: cusdAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [PLATFORM_ESCROW_WALLET as `0x${string}`, amountWei],
        type: "legacy",
      });

      // 2. Update the task doc in Firestore
      const taskRef = doc(db, "tasks", taskId);
      const updatedExpiry = new Date(Date.now() + (tk.expiryHours || 24) * 3600 * 1000).toISOString();
      await updateDoc(taskRef, {
        status: "active",
        slots_remaining: tk.slotsTotal,
        expires_at: updatedExpiry,
        updated_at: new Date().toISOString(),
        transaction_hash: txHash
      });

      // 3. Create a payment record
      await setDoc(doc(db, "payments", `pay-${taskId}-reopen-${Date.now()}`), {
        task_id: taskId,
        wallet_address: wagmiAddress?.toLowerCase() || "unknown",
        amount: budget,
        currency: "cUSD",
        transaction_hash: txHash,
        payment_status: "paid",
        created_at: new Date().toISOString()
      });

      // 4. Update admin stats
      const statsRef = doc(db, "admin", "stats");
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(statsRef);
        const currentFees = sfDoc.exists() ? sfDoc.data().feesCollected || 0 : 0;
        const currentEscrow = sfDoc.exists() ? sfDoc.data().lockedEscrow || 0 : 0;
        
        transaction.set(statsRef, {
          feesCollected: parseFloat((currentFees + fee).toFixed(2)),
          lockedEscrow: parseFloat((currentEscrow + budget).toFixed(2))
        }, { merge: true });
      });

      // Transition to success
      setActiveTransaction((prev) => prev ? { 
        ...prev, 
        status: "success", 
        txHash
      } : null);

    } catch (err: any) {
      console.error("Campaign reopening deposit failed:", err);
      alert("Transaction failed or rejected: " + (err.message || err));
      setActiveTransaction(null);
      setPendingTxData(null);
    }
  };

  // Filter creator submissions for selected created task
  const activeCreatorSubmissions = useMemo(() => {
    if (!selectedCreatedTask) return [];
    return creatorSubmissions.filter((sub) => sub.taskId === selectedCreatedTask.id);
  }, [creatorSubmissions, selectedCreatedTask]);

  // Count pending submissions for each task
  const getPendingCount = (taskId: string) => {
    return creatorSubmissions.filter((sub) => sub.taskId === taskId && sub.status === "pending").length;
  };

  // Helper to format wallet address
  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleLogout = () => {
    if (isConnected) {
      try {
        disconnect();
      } catch (e) {
        console.error(e);
      }
    }
    // Refresh to clear cache
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const displayAddress = useMemo(() => {
    return activeAddress || "0x8F5c42E9D479E3129031023a1a9eCe9FbcE0E912";
  }, [activeAddress]);

  const renderConnectPrompt = (title: string, subtitle: string) => {
    const win = typeof window !== "undefined" ? (window as any) : null;
    const isMinipay = !!(win && win.ethereum && win.ethereum.isMiniPay);

    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-5 animate-fade-in mt-4">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm">
          <Wallet className="w-7 h-7 text-blue-600 animate-pulse" />
        </div>
        <div className="space-y-1.5 max-w-[280px]">
          <h3 className="text-base font-bold text-slate-950">
            {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
            {isMinipay ? "Connecting automatically to your MiniPay wallet..." : subtitle}
          </p>
        </div>
        {!isMinipay && (
          <div className="w-full max-w-[280px] pt-4 border-t border-slate-100 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleAuthAction(() => {})}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-xl text-xs font-bold hover:from-blue-700 hover:to-emerald-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Web3 Wallet
            </button>
          </div>
        )}
        {isMinipay && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            Connecting MiniPay...
          </div>
        )}
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block pt-2">
          Secured by Celo & MiniPay
        </span>
      </div>
    );
  };

  const getProofPresetOptions = (platform: Platform, checked: string[]) => {
    const options: string[] = [];
    const allProofs: string[] = [];
    checked.forEach((actVal) => {
      const proofs = ACTION_PROOF_PRESETS[actVal] || [];
      proofs.forEach((p) => {
        if (!allProofs.includes(p)) {
          allProofs.push(p);
        }
      });
    });

    if (allProofs.length > 0) {
      options.push(allProofs.join(" & "));
      allProofs.forEach((p) => {
        if (!options.includes(p)) {
          options.push(p);
        }
      });
    }
    return options;
  };

  const getRemainingTimeText = (dateStr: string) => {
    const subTime = new Date(dateStr).getTime();
    const expiresAt = subTime + 24 * 60 * 60 * 1000;
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      return "Auto-approved";
    }
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Auto-approves in: ${remainingHours}h ${remainingMins}m`;
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#FAFAFC] text-[#1E293B] flex flex-col relative shadow-xl overflow-hidden font-sans border-x border-slate-100">
      
      {/* 1. SPLASH SCREEN */}
      {screen === "splash" && (
        <div className="absolute inset-0 z-50 bg-[#FAFAFC] flex flex-col items-center justify-between py-12 px-6 animate-fade-in">
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Steady Logo (no bouncing) */}
            <div className="mb-6 p-4 bg-white rounded-3xl shadow-md border border-slate-50 flex items-center justify-center">
              <TasklyLogo className="w-16 h-16 animate-pulse" />
            </div>
            
            {/* Taskly Gradient Text */}
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Taskly
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide">
              Microwork for Stablecoins
            </p>

            {/* Spinner Loading Animation */}
            <div className="mt-8 w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>

          {/* Footer Info */}
          <div className="text-center">
            <a
              href="https://www.tmb.it.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold tracking-wider text-slate-400 hover:text-slate-600 active:scale-95 transition-all uppercase block"
            >
              Built by TMB
            </a>
            <span className="text-xs text-slate-300 block mt-1 font-medium">
              v1.0.0
            </span>
          </div>
        </div>
      )}

      {/* 2. MAIN NAVIGATION CONTAINER (HOME, HISTORY, PROFILE, ABOUT) */}
      {screen === "main" && (
        <div className="flex flex-col flex-grow pb-20">
          
          {/* HEADER */}
          <header className="h-14 bg-white/80 backdrop-blur-md sticky top-0 z-45 border-b border-slate-100 flex items-center justify-center px-4">
            <TasklyLogo className="w-6 h-6" />
          </header>

          <main className="flex-1 px-4 pt-6">
            {/* TAB: AVAILABLE TASKS (HOME) */}
            {activeTab === "home" && (
              <div className="space-y-6">
                
                {/* Available Tasks Header with Sorting Toggle */}
                <div className="flex items-center justify-between relative">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Available Tasks
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Complete tasks and earn instantly
                    </p>
                  </div>
                  
                  {/* Sorting Filter Trigger Button */}
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className={`p-2.5 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm ${
                      showSortMenu ? "ring-2 ring-blue-500/20 border-blue-200 bg-blue-50/10" : ""
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                  </button>

                  {/* Sorting Dropdown Menu */}
                  {showSortMenu && (
                    <div className="absolute top-16 right-0 w-48 bg-white rounded-2xl border border-slate-100 shadow-lg p-2.5 z-50 animate-fade-in space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block px-2.5 py-1.5">
                        Sort Tasks By
                      </span>
                      {[
                        { id: "recency-desc", label: "Newest First" },
                        { id: "recency-asc", label: "Oldest First" },
                        { id: "payout-desc", label: "Payout: High to Low" },
                        { id: "payout-asc", label: "Payout: Low to High" }
                      ].map((opt) => {
                        const isSel = sortBy === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setSortBy(opt.id as any);
                              setShowSortMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                              isSel ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {opt.label}
                            {isSel && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* FILTER CHIPS */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                  {filterChips.map((chip) => {
                    const isActive = activeFilter === chip;
                    return (
                      <button
                        key={chip}
                        onClick={() => setActiveFilter(chip)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
                          isActive
                            ? "bg-slate-950 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>

                {/* TASK LIST */}
                <div className="space-y-4">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => {
                      const isMyTask = !!(activeAddress && task.createdByWallet?.toLowerCase() === activeAddress);
                      return (
                      <div
                        key={task.id}
                        onClick={() => handleAuthAction(() => {
                          if (isMyTask) {
                            setSelectedCreatedTask(task);
                            setActiveTab("profile");
                            setProfileSubScreen("manage-submissions");
                          } else {
                            setSelectedTask(task);
                            setScreen("task-details");
                          }
                        })}
                        className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                      >
                        {isMyTask && (
                          <span className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500 text-white text-[8px] font-bold uppercase rounded-bl-lg tracking-wider">
                            My Task
                          </span>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                            {getPlatformIcon(task.platform)}
                          </div>
                          <div className="flex-grow">
                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-[#1E293B] text-[10px] font-bold rounded-full uppercase tracking-wider">
                              {task.type}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 mt-1.5 group-hover:text-blue-600 transition-colors line-clamp-1">
                              {task.title}
                            </h3>
                            <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-extrabold text-emerald-600 block">
                              {formatCurrency(task.amount)}
                            </span>
                            {(() => {
                              const val = parseFloat(task.amount.replace(/[^\d.]/g, ""));
                              if (!isNaN(val)) {
                                return (
                                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                    {currencyPreference === "NGN" ? `${val.toFixed(2)} cUSD` : `~₦${Math.round(val * CUSD_TO_NGN_RATE)}`}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                              {task.slotsRemaining} slots left
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-4">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-semibold">
                              Expires in {task.expiryHours}h
                            </span>
                          </div>
                          {isMyTask ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAuthAction(() => {
                                  setSelectedCreatedTask(task);
                                  setActiveTab("profile");
                                  setProfileSubScreen("manage-submissions");
                                });
                              }}
                              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Submissions
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAuthAction(() => {
                                  setSelectedTask(task);
                                  setScreen("task-details");
                                });
                              }}
                              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all"
                            >
                              View Task
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                      <p className="text-slate-400 text-sm font-medium">No tasks found for "{activeFilter}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TASK HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Task History
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    Track the status of your task submissions
                  </p>
                </div>

                {!isUserConnected ? (
                  renderConnectPrompt(
                    "Access Task History",
                    "Connect your wallet to view your submitted proofs, tracking statuses, and earned rewards."
                  )
                ) : (
                  <div className="space-y-4">
                    {history.map((item) => {
                      const statusConfig = {
                        pending: {
                          color: "bg-amber-50 text-amber-700 border-amber-100/50",
                          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
                          label: "Pending Review"
                        },
                        approved: {
                          color: "bg-emerald-50 text-emerald-700 border-emerald-100/50",
                          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
                          label: "Approved"
                        },
                        rejected: {
                          color: "bg-red-50 text-red-700 border-red-100/50",
                          icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
                          label: "Rejected"
                        },
                        disputed: {
                          color: "bg-orange-50 text-orange-700 border-orange-100/50",
                          icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />,
                          label: "Disputed"
                        },
                        "rejected-final": {
                          color: "bg-slate-100 text-slate-700 border-slate-200",
                          icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
                          label: "Rejection Upheld"
                        }
                      }[item.status] || {
                        color: "bg-slate-50 text-slate-600 border-slate-100",
                        icon: <Info className="w-3.5 h-3.5" />,
                        label: "Unknown"
                      };

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm animate-fade-in"
                        >
                          <div className="flex items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-50 rounded-lg">
                                {getPlatformIcon(item.platform, "w-4 h-4")}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                  {item.taskTitle}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                  Submitted: {item.date}
                                </p>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                              <span className="text-xs font-extrabold text-slate-800">
                                {formatCurrency(item.amount)}
                              </span>
                              {(() => {
                                const val = parseFloat(item.amount.replace(/[^\d.]/g, ""));
                                if (!isNaN(val)) {
                                  return (
                                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                      {currencyPreference === "NGN" ? `${val.toFixed(2)} cUSD` : `~₦${Math.round(val * CUSD_TO_NGN_RATE)}`}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusConfig.color}`}
                              >
                                {statusConfig.icon}
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>
                          
                          {/* Rejection Details & Dispute Button */}
                          {item.status === "rejected" && (
                            <div className="mt-1 pt-2.5 border-t border-slate-50 flex items-center justify-between gap-3 flex-wrap">
                              <div className="text-[10px] text-slate-500 font-medium">
                                <span className="font-extrabold text-red-600 uppercase text-[9px] block">Rejection Reason:</span>
                                <span className="font-bold text-slate-700 capitalize">{item.rejectionCategory}</span> - {item.rejectionReason}
                              </div>
                              <button
                                onClick={() => {
                                  setDisputingSubId(item.id);
                                  setDisputeReasonInput("");
                                }}
                                className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                              >
                                Dispute Rejection
                              </button>
                            </div>
                          )}

                          {/* Upheld/Disputed Status Extra details */}
                          {item.status === "disputed" && item.disputeReason && (
                            <div className="mt-1 pt-2.5 border-t border-slate-50 text-[10px] text-slate-500 font-medium">
                              <span className="font-extrabold text-orange-600 uppercase text-[9px] block">Your Dispute Argument:</span>
                              "{item.disputeReason}"
                            </div>
                          )}
                          {item.status === "rejected-final" && (
                            <div className="mt-1 pt-2.5 border-t border-slate-50 text-[10px] text-slate-500 font-medium">
                              <span className="font-extrabold text-slate-500 uppercase text-[9px] block">Admin Resolution:</span>
                              Rejection upheld. Dispute closed.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PROFILE & CREATOR DASHBOARD NESTED ROUTER */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {!isUserConnected ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Profile
                      </h2>
                      <p className="text-slate-500 text-sm font-medium mt-1">
                        Your stablecoin earnings and credentials
                      </p>
                    </div>
                    {renderConnectPrompt(
                      "Unlock Profile & Creator Dashboard",
                      "Connect your wallet to launch custom campaigns, approve worker submissions, and view your stablecoin stats."
                    )}
                  </div>
                ) : (
                  <>
                    {/* PROFILE: MAIN SUB-SCREEN */}
                    {profileSubScreen === "profile-main" && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                              Profile
                            </h2>
                            <p className="text-slate-500 text-sm font-medium mt-1">
                              Your stablecoin earnings and credentials
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="p-2.5 bg-white border border-slate-100 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                          >
                            <RotateCw className="w-4 h-4 text-emerald-600" />
                            Refresh
                          </button>
                        </div>

                        {/* Wallet Info Card */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 rounded-2xl text-white shadow-md space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">
                              Celo Wallet
                            </span>
                            <Wallet className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[11px] text-slate-500 font-medium block">Address</span>
                              <span className="text-sm font-bold block mt-0.5 font-mono select-all">
                                {formatAddress(displayAddress)}
                              </span>
                            </div>
                            {!isMiniPayApp && (
                              <button
                                type="button"
                                onClick={handleLogout}
                                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                Logout
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Wallet Balance Card */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                              Withdrawable Balance
                            </span>
                            <span className="text-2xl font-black text-slate-950 block mt-1">
                              {formatCurrency(`${dbUserBalance.toFixed(2)} cUSD`)}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleRequestWithdrawal}
                            disabled={dbUserBalance < 1.00}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                              dbUserBalance >= 1.00 
                                ? "bg-slate-900 text-white hover:bg-slate-800" 
                                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                            }`}
                          >
                            Withdraw Earnings
                          </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center space-y-1">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                              Total Earnings
                            </span>
                            <span className="text-xl font-black text-emerald-600 block">
                              {formatCurrency(stats.earnings)}
                            </span>
                          </div>
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center space-y-1">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                              Tasks Completed
                            </span>
                            <span className="text-xl font-black text-slate-900 block">
                              {stats.completed}
                            </span>
                          </div>
                        </div>

                        {/* Currency Preference Selector */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                Currency Display
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Choose how you view payout amounts
                              </span>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setCurrencyPreference("cUSD")}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  currencyPreference === "cUSD"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                cUSD
                              </button>
                              <button
                                type="button"
                                onClick={() => setCurrencyPreference("NGN")}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  currencyPreference === "NGN"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                Naira (₦)
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Task Created Manager Entry Button (Dashboard) */}
                        <button
                          onClick={() => setProfileSubScreen("created-tasks")}
                          className="w-full py-4 px-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-xl">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 block">Tasks Created</span>
                              <span className="text-xs text-slate-400 block mt-0.5">Manage your campaigns and submissions</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                        {/* Platform Developer Admin Panel Settings Card - Admin Only */}
                        {wagmiAddress?.toLowerCase() === PLATFORM_ESCROW_WALLET.toLowerCase() && (
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 mt-4 animate-fade-in">
                            <div className="flex items-center gap-2 text-slate-900">
                              <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                              <span className="text-sm font-extrabold">Platform Admin Settings</span>
                            </div>
                            
                            <div className="space-y-3 font-medium text-xs text-slate-600">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                                  Developer Escrow Wallet
                                </span>
                                <span className="text-slate-800 font-bold block mt-0.5 font-mono select-all truncate">
                                  {PLATFORM_ESCROW_WALLET}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                                    Fees Earned (2%)
                                  </span>
                                  <span className="text-emerald-600 font-black text-sm block mt-0.5">
                                    {platformAdminStats.feesCollected.toFixed(2)} cUSD
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                    ~₦{Math.round(platformAdminStats.feesCollected * CUSD_TO_NGN_RATE).toLocaleString()}
                                  </span>
                                </div>
                                
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                                    Locked in Escrow
                                  </span>
                                  <span className="text-blue-600 font-black text-sm block mt-0.5">
                                    {platformAdminStats.lockedEscrow.toFixed(2)} cUSD
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                    ~₦{Math.round(platformAdminStats.lockedEscrow * CUSD_TO_NGN_RATE).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-50 text-center bg-slate-50 rounded-xl p-3">
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">
                                    Total Users
                                  </span>
                                  <span className="text-slate-800 font-black text-xs block mt-0.5">
                                    {totalUsersCount}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">
                                    Tasks Created
                                  </span>
                                  <span className="text-slate-800 font-black text-xs block mt-0.5">
                                    {tasks.length}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">
                                    Tasks Completed
                                  </span>
                                  <span className="text-slate-800 font-black text-xs block mt-0.5">
                                    {tasks.filter(t => t.slotsRemaining <= 0 || t.status === "completed").length}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Disputes management button */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <AlertCircle className="w-4.5 h-4.5 text-orange-500" />
                                    {creatorSubmissions.filter(s => s.status === "disputed").length > 0 && (
                                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] font-bold text-white">
                                        {creatorSubmissions.filter(s => s.status === "disputed").length}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-slate-800">
                                    Pending Disputes ({creatorSubmissions.filter(s => s.status === "disputed").length})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setProfileSubScreen("admin-disputes")}
                                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                >
                                  Manage
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Campaigns management button */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="w-4.5 h-4.5 text-blue-500" />
                                  <span className="text-xs font-bold text-slate-800">
                                    All Platform Campaigns ({tasks.length})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setProfileSubScreen("admin-campaigns")}
                                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                >
                                  Manage
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Withdrawals management button */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Wallet className="w-4.5 h-4.5 text-emerald-500" />
                                  <span className="text-xs font-bold text-slate-800">
                                    Pending Withdrawals ({withdrawals.filter(w => w.status === "pending").length})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setProfileSubScreen("admin-withdrawals")}
                                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                >
                                  Manage
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              
                              {/* Database Purge / Reset Button */}
                              <div className="pt-3.5 border-t border-slate-100/80 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  System Actions
                                </span>
                                <button
                                  type="button"
                                  onClick={handleResetDatabase}
                                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                >
                                  Reset Platform Data
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PROFILE: USER'S CREATED TASKS SUB-SCREEN */}
                    {profileSubScreen === "created-tasks" && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5 text-slate-800" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">Created Tasks</h2>
                            <span className="text-xs text-slate-400 font-semibold block">Review worker submissions</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* User-created tasks */}
                          {tasks.filter(t => t.createdByWallet?.toLowerCase() === wagmiAddress?.toLowerCase()).map((t) => {
                            const pendingSubmissions = getPendingCount(t.id);
                            
                            // Determine status dynamically
                            let taskStatus = t.status || "active";
                            if (taskStatus !== "refunded") {
                              if (t.slotsRemaining === 0) {
                                taskStatus = "completed";
                              } else if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
                                taskStatus = "expired";
                              }
                            }

                            return (
                              <div
                                key={t.id}
                                className="bg-white p-4 border border-slate-100 shadow-sm rounded-2xl space-y-4 animate-fade-in"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="p-2 bg-slate-50 rounded-lg">
                                    {getPlatformIcon(t.platform, "w-4.5 h-4.5")}
                                  </div>
                                  <div className="flex-grow">
                                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{t.title}</h3>
                                    <div className="flex items-center gap-3 mt-1.5 font-medium text-[10px] text-slate-400">
                                      <span>
                                        Slots: {t.slotsRemaining} / {t.slotsTotal}
                                      </span>
                                      <span>
                                        Payout: {formatCurrency(t.amount)}
                                      </span>
                                      {t.expiresAt && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {new Date(t.expiresAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {pendingSubmissions > 0 && taskStatus === "active" && (
                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full">
                                      {pendingSubmissions} new
                                    </span>
                                  )}
                                </div>
                                <div className="border-t border-slate-50 pt-3 flex items-center justify-between flex-wrap gap-2">
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    taskStatus === "active"
                                      ? "bg-blue-50 text-blue-700 border-blue-100/50"
                                      : taskStatus === "completed"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                                      : taskStatus === "expired"
                                      ? "bg-rose-50 text-rose-700 border-rose-100/50"
                                      : "bg-slate-50 text-slate-600 border-slate-100"
                                  }`}>
                                    campaign {taskStatus}
                                  </span>
                                  <div className="flex gap-2">
                                    {taskStatus === "active" && (
                                      <button
                                        onClick={() => {
                                          setSelectedCreatedTask(t as Task);
                                          setProfileSubScreen("manage-submissions");
                                        }}
                                        className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        Review Proofs
                                      </button>
                                    )}
                                    {taskStatus === "expired" && t.slotsRemaining > 0 && (
                                      <button
                                        onClick={() => handleClaimRefund(t.id)}
                                        className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-1.5"
                                      >
                                        <Undo2 className="w-3.5 h-3.5" />
                                        Refund Escrow
                                      </button>
                                    )}
                                    {(taskStatus === "completed" || taskStatus === "refunded" || taskStatus === "expired") && (
                                      <button
                                        onClick={() => handleReopenTask(t.id)}
                                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Reopen Campaign
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PROFILE: SUBMISSIONS MANAGEMENT DASHBOARD FOR CREATORS */}
                    {profileSubScreen === "manage-submissions" && selectedCreatedTask && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setProfileSubScreen("created-tasks")}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5 text-slate-800" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 truncate max-w-[250px]">
                              Review Proofs
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block truncate max-w-[250px]">
                              {selectedCreatedTask.title}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {activeCreatorSubmissions.length > 0 ? (
                            activeCreatorSubmissions.map((sub) => {
                              const isAutoApproving = (() => {
                                const subTime = new Date(sub.date).getTime();
                                return (Date.now() - subTime) / (1000 * 60 * 60) >= 24;
                              })();
                              const isRejectDisabled = isRejectionCapReached(selectedCreatedTask.id);

                              return (
                                <div
                                  key={sub.id}
                                  className="bg-white p-4 border border-slate-100 shadow-sm rounded-xl space-y-3.5"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                                      Worker: {formatAddress(sub.workerAddress)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      {sub.date}
                                    </span>
                                  </div>

                                  {/* Proof Display details */}
                                  <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg space-y-3">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                      Submitted Proof
                                    </span>
                                    
                                    {/* File Proof */}
                                    {sub.proofLink && sub.proofLink.startsWith("http") && (
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const isVideo = sub.proofLink?.includes(".webm") || sub.proofLink?.includes(".mp4") || sub.proofImageName?.endsWith(".webm");
                                            setMediaViewerType(isVideo ? "video" : "image");
                                            setMediaViewerUrl(sub.proofLink || null);
                                          }}
                                          className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1.5 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50 active:scale-95 transition-all"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                                          <span>View Proof</span>
                                        </button>
                                      </div>
                                    )}
                                    
                                    {/* Text Proof display (with backward compatibility) */}
                                    {(sub.proofText || (sub.proofLink && !sub.proofLink.startsWith("http"))) && (
                                      <div className="space-y-1">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                                          Text Proof:
                                        </span>
                                        <div className="text-xs text-slate-700 font-semibold bg-white border border-slate-200/60 px-3.5 py-2 rounded-xl inline-block shadow-sm font-mono select-all">
                                          {sub.proofText || sub.proofLink}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Status and Action Buttons */}
                                  <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                                    <div>
                                      {sub.status !== "pending" ? (
                                        <div className="flex flex-col gap-1 items-start">
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                                              sub.status === "approved"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                                                : sub.status === "disputed"
                                                ? "bg-orange-50 text-orange-700 border-orange-100/50"
                                                : "bg-red-50 text-red-700 border-red-100/50"
                                            }`}
                                          >
                                            {sub.status}
                                          </span>
                                          {sub.status === "rejected" && sub.rejectionCategory && (
                                            <span className="text-[9px] text-slate-400 font-semibold font-sans mt-0.5 block max-w-[200px] truncate">
                                              Reason: {sub.rejectionCategory}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-1 items-start">
                                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Requires Action
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-bold block font-sans">
                                            {getRemainingTimeText(sub.date)}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {sub.status === "pending" && (
                                      <div className="flex gap-2">
                                        {isAutoApproving ? (
                                          <span className="text-[10px] text-slate-400 font-bold uppercase animate-pulse">
                                            Processing Auto-Payout...
                                          </span>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => triggerRejectDialog(sub.id, selectedCreatedTask.id)}
                                              disabled={isRejectDisabled}
                                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                isRejectDisabled
                                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                  : "bg-red-50 hover:bg-red-100 text-red-700"
                                              }`}
                                              title={isRejectDisabled ? "Rejection limit reached (Max 40% rejection rate)" : ""}
                                            >
                                              Reject
                                            </button>
                                            <button
                                              onClick={() => handleApproveSubmission(sub.id, selectedCreatedTask.id)}
                                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                            >
                                              Approve & Pay
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                              <p className="text-slate-400 text-xs font-semibold">No submissions received yet for this task</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PROFILE: DISPUTES MANAGEMENT DASHBOARD FOR ADMINISTRATOR */}
                    {profileSubScreen === "admin-disputes" && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5 text-slate-800" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">
                              Disputes Panel
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">
                              Moderate disputed submission rejections
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {creatorSubmissions.filter((sub) => sub.status === "disputed").length > 0 ? (
                            creatorSubmissions
                              .filter((sub) => sub.status === "disputed")
                              .map((sub) => {
                                const t = tasks.find((tk) => tk.id === sub.taskId);
                                return (
                                  <div
                                    key={sub.id}
                                    className="bg-white p-4 border border-slate-100 shadow-sm rounded-xl space-y-4 animate-fade-in"
                                  >
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                                      <span className="font-mono">Worker: {formatAddress(sub.workerAddress)}</span>
                                      <span>Task ID: {sub.taskId}</span>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                        Task: {t ? t.title : "Celo Task"}
                                      </h4>
                                      <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-semibold">
                                        <span>Payout: {t ? formatCurrency(t.amount) : "0.05 cUSD"}</span>
                                        <span>Creator: {t && t.createdByWallet ? formatAddress(t.createdByWallet) : "unknown"}</span>
                                      </div>
                                    </div>

                                    {/* Proof details */}
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg space-y-2.5 text-xs text-slate-700">
                                      <div>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Worker's Proof:</span>
                                        {sub.proofLink && sub.proofLink.startsWith("http") && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const isVideo = sub.proofLink?.includes(".webm") || sub.proofLink?.includes(".mp4") || sub.proofImageName?.endsWith(".webm");
                                              setMediaViewerType(isVideo ? "video" : "image");
                                              setMediaViewerUrl(sub.proofLink || null);
                                            }}
                                            className="text-blue-600 font-bold hover:underline flex items-center gap-1 bg-blue-50/50 px-2.5 py-1.5 rounded border border-blue-100/30 inline-flex mb-1 active:scale-95 transition-all"
                                          >
                                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                                            <span>View Proof</span>
                                          </button>
                                        )}
                                        {sub.proofText && (
                                          <div className="font-mono bg-white border border-slate-200/50 p-2 rounded text-[11px] select-all max-w-full overflow-x-auto">
                                            {sub.proofText}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-3">
                                        <div>
                                          <span className="text-[9px] text-red-600 font-extrabold uppercase tracking-wider block mb-0.5">Creator Rejection:</span>
                                          <p className="font-bold text-slate-800 capitalize">{sub.rejectionCategory}</p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">{sub.rejectionReason}</p>
                                        </div>
                                        <div className="border-l border-slate-100 pl-3 font-sans">
                                          <span className="text-[9px] text-orange-600 font-extrabold uppercase tracking-wider block mb-0.5">Worker Argument:</span>
                                          <p className="text-[10px] text-slate-600 italic font-semibold">"{sub.disputeReason}"</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Resolution Actions */}
                                    <div className="flex gap-2 justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleAdminApproveRejection(sub.id)}
                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                                      >
                                        Uphold Rejection
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdminPayWorker(sub.id, sub.taskId)}
                                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        Release Payout
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                              <p className="text-slate-400 text-xs font-semibold">No pending disputes currently</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PROFILE: CAMPAIGNS MANAGEMENT DASHBOARD FOR ADMINISTRATOR */}
                    {profileSubScreen === "admin-campaigns" && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5 text-slate-800" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 font-sans">
                              All Platform Campaigns
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">
                              Moderate or delete any campaign created on Taskly
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {tasks.length > 0 ? (
                            tasks.map((t) => {
                              // Determine status dynamically
                              let taskStatus = t.status || "active";
                              if (taskStatus !== "refunded") {
                                if (t.slotsRemaining === 0) {
                                  taskStatus = "completed";
                                } else if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
                                  taskStatus = "expired";
                                }
                              }

                              return (
                                <div
                                  key={t.id}
                                  className="bg-white p-4 border border-slate-100 shadow-sm rounded-2xl space-y-4 animate-fade-in"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                      {getPlatformIcon(t.platform, "w-4.5 h-4.5")}
                                    </div>
                                    <div className="flex-grow">
                                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{t.title}</h3>
                                      <div className="space-y-1 mt-1.5 font-semibold text-[10px] text-slate-400">
                                        <div className="flex items-center gap-3">
                                          <span>Slots: {t.slotsRemaining} / {t.slotsTotal}</span>
                                          <span>Payout: {formatCurrency(t.amount)}</span>
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-mono select-all truncate max-w-[240px]">
                                          Creator: {t.createdByWallet}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="border-t border-slate-50 pt-3 flex items-center justify-between flex-wrap gap-2">
                                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      taskStatus === "active"
                                        ? "bg-blue-50 text-blue-700 border-blue-100/50"
                                        : taskStatus === "completed"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                                        : taskStatus === "expired"
                                        ? "bg-amber-50 text-amber-700 border-amber-100/50"
                                        : taskStatus === "pending_payment"
                                        ? "bg-purple-50 text-purple-700 border-purple-100/50"
                                        : "bg-rose-50 text-rose-700 border-rose-100/50"
                                    }`}>
                                      {taskStatus}
                                    </span>
                                    
                                    <div className="flex gap-2">
                                      {t.status === "pending_payment" && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (window.confirm("Confirm you have received the Naira or manual payment for this campaign? This will activate the campaign for earners.")) {
                                              try {
                                                await updateDoc(doc(db, "tasks", t.id), { status: "active" });
                                                alert("Campaign activated successfully!");
                                              } catch (err: any) {
                                                alert("Activation failed: " + err.message);
                                              }
                                            }
                                          }}
                                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                        >
                                          Activate Campaign
                                        </button>
                                      )}
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCampaign(t.id)}
                                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                      >
                                        Delete Campaign
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                              <p className="text-slate-400 text-xs font-semibold">No campaigns active on the platform</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PROFILE: WITHDRAWALS MANAGEMENT DASHBOARD FOR ADMINISTRATOR */}
                    {profileSubScreen === "admin-withdrawals" && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ArrowLeft className="w-5 h-5 text-slate-800" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 font-sans">
                              Worker Withdrawals
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">
                              Approve and execute worker withdrawal payouts
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {withdrawals.length > 0 ? (
                            withdrawals.map((w) => {
                              return (
                                <div
                                  key={w.id}
                                  className="bg-white p-4 border border-slate-100 shadow-sm rounded-2xl space-y-4 animate-fade-in"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                      <Wallet className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="flex-grow">
                                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                                        Withdrawal of {w.amount.toFixed(2)} cUSD
                                      </h3>
                                      <div className="space-y-1 mt-1.5 font-semibold text-[10px] text-slate-400">
                                        <div className="text-[9px] text-slate-400 font-mono select-all truncate max-w-[240px]">
                                          Worker: {w.workerAddress}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-sans mt-0.5">
                                          Requested: {new Date(w.createdAt).toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="border-t border-slate-50 pt-3 flex items-center justify-between flex-wrap gap-2">
                                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      w.status === "pending"
                                        ? "bg-amber-50 text-amber-700 border-amber-100/50"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                                    }`}>
                                      {w.status}
                                    </span>
                                    
                                    {w.status === "pending" && (
                                      <button
                                        type="button"
                                        onClick={() => handleProcessWithdrawal(w)}
                                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                      >
                                        Process Payout
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                              <p className="text-slate-400 text-xs font-semibold">No withdrawals requested currently</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB: ABOUT */}
            {activeTab === "about" && (
              <div className="space-y-6 flex flex-col min-h-[70vh] justify-between pb-4">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      About Taskly
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Stablecoin microlabor marketplace on Celo
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm leading-relaxed space-y-4 text-slate-600 text-xs">
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">🚀 What is Taskly?</h3>
                      <p>
                        Taskly is a next-generation micro-job marketplace powered by the Celo blockchain. It connects creators who need digital actions completed (social follows, app testing, surveys) with earners looking to make stablecoin rewards.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">💳 Off-Chain Balance System</h3>
                      <p>
                        To save earners from paying blockchain gas fees on every single submission, Taskly accumulates your earnings securely off-chain in a general treasury wallet. Once your balance reaches the minimum threshold of <span className="font-extrabold text-emerald-600">1.00 cUSD</span>, you can submit a withdrawal request. Payouts are aggregated and batch-sent on-chain, keeping transaction fees at zero for earners!
                      </p>
                    </div>



                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">🇳🇬 Naira (NGN) Funding & Multi-Browser Ramps</h3>
                      <p>
                        Creators can fund campaign budgets on any mobile browser using Naira bank transfers via integrated Celo fiat-to-crypto ramps. If you don't have a Web3 browser extension, you can create a campaign in "pending payment" status, transfer Naira/cUSD to the admin's escrow wallet, and the platform admin will activate your campaign immediately.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">⚙️ Platform Architecture</h3>
                      <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px]">
                        <li>Network: <span className="font-bold">Celo Mainnet</span></li>
                        <li>Payment Currency: <span className="font-bold">cUSD (Celo Dollar)</span></li>
                        <li>Minimum Withdrawal: <span className="font-bold text-emerald-600">1.00 cUSD</span></li>
                        <li>Platform Fee: <span className="font-bold">2.0%</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* WhatsApp Community Invitation */}
                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 text-center space-y-3">
                    <p className="text-xs font-bold text-emerald-800/90 leading-relaxed">
                      Join our WhatsApp community for Taskly updates and to learn more!
                    </p>
                    <a
                      href="https://chat.whatsapp.com/Ji6pwJZLeOLI8kmLGfjLwe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      Join WhatsApp Community
                    </a>
                  </div>
                </div>

                {/* App Credentials at the Bottom */}
                <div className="text-center pt-8 border-t border-slate-100/60">
                  <a
                    href="https://www.tmb.it.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold tracking-wider text-slate-400 hover:text-slate-600 active:scale-95 transition-all uppercase block"
                  >
                    Built by TMB
                  </a>
                  <span className="text-[10px] text-slate-300 block mt-0.5 font-semibold">
                    Version 1.1.0
                  </span>
                </div>
              </div>
            )}
          </main>

          {/* FLOATING ACTION BUTTON (ONLY ON HOME TAB) */}
          {activeTab === "home" && (
            <button
              onClick={() => handleAuthAction(() => setScreen("create-task"))}
              className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 hover:scale-105 transition-all duration-300 z-40"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}

          {/* BOTTOM NAVIGATION BAR */}
          <nav className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto h-20 bg-white/90 backdrop-blur-md border-t border-slate-100 px-6 flex items-center justify-between z-40">
            {[
              { id: "home", label: "Home", icon: <TasklyLogo className="w-5 h-5 opacity-70" /> },
              { id: "history", label: "History", icon: <History className="w-5 h-5" /> },
              { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
              { id: "about", label: "About", icon: <Info className="w-5 h-5" /> }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setProfileSubScreen("profile-main"); // reset creator sub-screens on nav click
                  }}
                  className={`flex flex-col items-center gap-1.5 transition-all ${
                    isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <div className={`p-1 rounded-full ${isActive ? "bg-blue-50/50" : ""}`}>
                    {tab.icon}
                  </div>
                  <span className="text-[10px] font-bold">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* 3. TASK DETAILS SCREEN */}
      {screen === "task-details" && selectedTask && (
        <div className="flex-1 flex flex-col bg-[#FAFAFC] pb-6">
          <header className="h-14 bg-white border-b border-slate-100 sticky top-0 z-40 px-4 flex items-center justify-between">
            <button
              onClick={() => setScreen("main")}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-800" />
            </button>
            <span className="text-sm font-bold text-slate-900">Task Details</span>
            <div className="w-7 h-7" /> {/* spacer */}
          </header>

          <main className="flex-1 p-4 space-y-6">
            {/* Header info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  {getPlatformIcon(selectedTask.platform, "w-6 h-6")}
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-600 block">
                    {formatCurrency(selectedTask.amount)}
                  </span>
                  {(() => {
                    const val = parseFloat(selectedTask.amount.replace(/[^\d.]/g, ""));
                    if (!isNaN(val)) {
                      return (
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          {currencyPreference === "NGN" ? `${val.toFixed(2)} cUSD` : `~₦${Math.round(val * CUSD_TO_NGN_RATE)}`}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-[#1E293B] text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {selectedTask.type}
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 mt-2">
                  {selectedTask.title}
                </h2>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>
            </div>

            {/* Instruction Steps */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Instructions
              </h4>
              <div className="space-y-3">
                {selectedTask.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <span className="w-5 h-5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements and parameters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-xs font-medium text-slate-600">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Proof Required
                </h4>
                <p className="leading-relaxed">{selectedTask.proofRequirements}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                    Slots Remaining
                  </span>
                  <span className="text-slate-800 font-bold mt-1 block">
                    {selectedTask.slotsRemaining} / {selectedTask.slotsTotal}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                    Expiry Time
                  </span>
                  <span className="text-slate-800 font-bold mt-1 block">
                    {selectedTask.expiryHours} hours
                  </span>
                </div>
              </div>
            </div>
          </main>

          {/* Action Footer */}
          <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
            {selectedTask.link !== "#" && (
              <a
                href={selectedTask.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            {selectedTask.createdByWallet?.toLowerCase() === wagmiAddress?.toLowerCase() ? (
              <div className="flex-1 py-3.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold text-center border border-slate-200 flex items-center justify-center">
                You created this task
              </div>
            ) : (
              <button
                onClick={() => handleAuthAction(() => setScreen("submit-proof"))}
                className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
              >
                Proceed to Submission
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. SUBMIT PROOF SCREEN */}
      {screen === "submit-proof" && selectedTask && (
        <div className="flex-1 flex flex-col bg-[#FAFAFC] pb-6">
          <header className="h-14 bg-white border-b border-slate-100 sticky top-0 z-40 px-4 flex items-center justify-between">
            <button
              onClick={() => setScreen("task-details")}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-800" />
            </button>
            <span className="text-sm font-bold text-slate-900">Submit Proof</span>
            <div className="w-7 h-7" />
          </header>

          <form onSubmit={handleSubmitProof} className="flex-grow flex flex-col justify-between">
            <main className="p-4 space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-100/80 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  {getPlatformIcon(selectedTask.platform, "w-4 h-4")}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{selectedTask.title}</h3>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{formatCurrency(selectedTask.amount)}</p>
                </div>
              </div>

              {/* Upload Screenshots */}
              {(selectedTask.proofType === "screenshot" || selectedTask.proofType === "both" || !selectedTask.proofType) && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Upload Screenshot (Required)
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 bg-white rounded-2xl hover:border-slate-300 transition-colors p-6 flex flex-col items-center justify-center text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setProofForm({ ...proofForm, screenshot: e.target.files[0] });
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {proofForm.screenshot ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto">
                          <Check className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block truncate max-w-[200px]">
                            {proofForm.screenshot.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {(proofForm.screenshot.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Tap to upload image</span>
                          <span className="text-[10px] text-slate-400 block mt-1">PNG, JPG up to 10MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Screen Recording */}
              {selectedTask.proofType === "screen-recording" && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Upload Screen Recording (Required)
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 bg-white rounded-2xl hover:border-slate-300 transition-colors p-5 flex flex-col items-center justify-center text-center cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setProofForm({ ...proofForm, screenRecording: e.target.files[0] });
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {proofForm.screenRecording ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto">
                          <Check className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block truncate max-w-[200px]">
                            {proofForm.screenRecording.name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                        <span className="text-xs font-bold text-slate-700 block">Tap to upload video</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Text Proof reply */}
              {(selectedTask.proofType === "text" || selectedTask.proofType === "both") && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {selectedTask.proofType === "both" ? "Provide Text Proof (Required)" : "Provide Text Proof (Required)"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      selectedTask.platform === "survey"
                        ? "e.g. Survey confirmation code / your survey email"
                        : selectedTask.platform === "testing"
                        ? "e.g. Registered email / signup username"
                        : "e.g. Your profile username / retweet link / reply post URL"
                    }
                    value={proofForm.proofLink}
                    onChange={(e) => setProofForm({ ...proofForm, proofLink: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                  />
                </div>
              )}
            </main>

            <div className="p-4 bg-white border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmittingProof || (() => {
                  const pType = selectedTask.proofType || "screenshot";
                  if (pType === "screenshot") return !proofForm.screenshot;
                  if (pType === "text") return !proofForm.proofLink;
                  if (pType === "both") return !proofForm.screenshot || !proofForm.proofLink;
                  if (pType === "screen-recording") return !proofForm.screenRecording;
                  return false;
                })()}
                className="w-full py-3.5 bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmittingProof ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Submitting Proof...
                  </>
                ) : (
                  "Submit Proof"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. CREATE TASK SCREEN */}
      {screen === "create-task" && (
        <div className="flex-1 flex flex-col bg-[#FAFAFC] pb-6">
          <header className="h-14 bg-white border-b border-slate-100 sticky top-0 z-45 px-4 flex items-center justify-between">
            <button
              onClick={() => setScreen("main")}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-800" />
            </button>
            <span className="text-sm font-bold text-slate-900">Create Task</span>
            <div className="w-7 h-7" />
          </header>

          <form onSubmit={handleCreateTask} className="flex-grow flex flex-col justify-between">
            <main className="p-4 space-y-5 overflow-y-auto max-h-[78vh] scrollbar-none">
              {/* Platform selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Platform
                </label>
                <select
                  value={createTaskForm.platform}
                  onChange={(e) => {
                    const nextPlatform = e.target.value as Platform;
                    const actions = PLATFORM_ACTIONS[nextPlatform] || [];
                    const defaultAction = actions[0]?.value || "";
                    setCheckedActions(defaultAction ? [defaultAction] : []);
                    setCreateTaskForm((prev) => ({
                      ...prev,
                      platform: nextPlatform,
                    }));
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors uppercase tracking-wider"
                >
                  <option value="x">X (Twitter)</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="github">GitHub</option>
                  <option value="survey">Survey</option>
                  <option value="testing">Testing</option>
                </select>
              </div>

              {/* Select Required Actions Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Required Actions
                </label>
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  {(PLATFORM_ACTIONS[createTaskForm.platform] || []).map((action) => {
                    const isChecked = checkedActions.includes(action.value);
                    const nairaPrice = Math.round(action.basePrice * CUSD_TO_NGN_RATE);
                    return (
                      <label
                        key={action.value}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "border-blue-500 bg-blue-50/20 text-blue-900"
                            : "border-slate-100 hover:border-slate-200 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setCheckedActions((prev) => {
                              if (prev.includes(action.value)) {
                                if (prev.length === 1) return prev; // Keep at least one checked
                                return prev.filter((v) => v !== action.value);
                              } else {
                                return [...prev, action.value];
                              }
                            });
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 flex justify-between items-center text-xs">
                          <span className="font-bold">{action.label}</span>
                          <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            +{action.basePrice.toFixed(2)} cUSD (~₦{nairaPrice})
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Task Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subscribe to YouTube Channel"
                  value={createTaskForm.title}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                />
              </div>

              {/* Payout & Slots Numeric Steppers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payout Amount
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden px-1">
                    <button
                      type="button"
                      onClick={() => adjustPayout(-0.01)}
                      className="px-3.5 py-3.5 hover:bg-slate-50 active:scale-95 transition-all border-r border-slate-100 flex items-center justify-center flex-shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <div className="flex-grow flex items-center justify-center min-w-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={payoutInput}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          setPayoutInput(valStr);
                          const val = parseFloat(valStr);
                          if (!isNaN(val)) {
                            setPayoutValue(val);
                          }
                        }}
                        onBlur={() => {
                          const val = Math.max(0.01, parseFloat(payoutInput) || 0.01);
                          setPayoutValue(val);
                          setPayoutInput(val.toFixed(2));
                        }}
                        className="w-full text-center text-xs font-bold focus:outline-none bg-transparent py-3"
                      />
                      <span className="text-[10px] font-bold text-slate-400 mr-2 flex-shrink-0">cUSD</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustPayout(0.01)}
                      className="px-3.5 py-3.5 hover:bg-slate-50 active:scale-95 transition-all border-l border-slate-100 flex items-center justify-center flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Slots
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden px-1">
                    <button
                      type="button"
                      onClick={() => adjustSlots(-5)}
                      className="px-3.5 py-3.5 hover:bg-slate-50 active:scale-95 transition-all border-r border-slate-100 flex items-center justify-center flex-shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <div className="flex-grow flex items-center justify-center min-w-0">
                      <input
                        type="number"
                        step="1"
                        min="5"
                        value={slotsInput}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          setSlotsInput(valStr);
                          const val = parseInt(valStr, 10);
                          if (!isNaN(val)) {
                            setSlotsValue(val);
                          }
                        }}
                        onBlur={() => {
                          const val = Math.max(5, parseInt(slotsInput, 10) || 5);
                          setSlotsValue(val);
                          setSlotsInput(String(val));
                        }}
                        className="w-full text-center text-xs font-bold focus:outline-none bg-transparent py-3"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustSlots(5)}
                      className="px-3.5 py-3.5 hover:bg-slate-50 active:scale-95 transition-all border-l border-slate-100 flex items-center justify-center flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Local Nigerian Pricing Conversion Estimate Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Payout Per Worker:</span>
                  <span className="text-slate-900 font-bold">
                    {payoutValue.toFixed(2)} cUSD (~₦{Math.round(payoutValue * CUSD_TO_NGN_RATE)})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-200/50 pt-2">
                  <span className="text-slate-400 font-semibold">Total Campaign Budget:</span>
                  <span className="text-emerald-600 font-black">
                    {(payoutValue * slotsValue).toFixed(2)} cUSD (~₦{Math.round(payoutValue * slotsValue * CUSD_TO_NGN_RATE).toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Required Proof Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Required Proof Type
                </label>
                <select
                  value={createTaskForm.proofType}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, proofType: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors"
                >
                  <option value="screenshot">Screenshot Image Only</option>
                  <option value="text">Text / Username / Code Only</option>
                  <option value="both">Both (Screenshot + Text)</option>
                  <option value="screen-recording">Screen Recording Video</option>
                </select>
              </div>

              {/* Campaign Expiry Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Campaign Expiry Duration
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors"
                >
                  <option value={24}>24 Hours</option>
                  <option value={72}>3 Days</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>

              {/* Task Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Task Description
                </label>
                <textarea
                  required={!(
                    createTaskForm.type.toLowerCase().includes("follow") ||
                    createTaskForm.type.toLowerCase().includes("like") ||
                    createTaskForm.title.toLowerCase().includes("follow") ||
                    createTaskForm.title.toLowerCase().includes("like")
                  )}
                  rows={2}
                  placeholder="Explain the purpose of this task to workers..."
                  value={createTaskForm.description}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Task Instructions */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Instructions (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Click link&#10;Follow @example&#10;Screenshot your follow status"
                  value={createTaskForm.instructionsText}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, instructionsText: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Proof Requirements Preset Selector */}
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Proof Requirement Preset
                </label>
                <select
                  value={(() => {
                    const presets = getProofPresetOptions(createTaskForm.platform, checkedActions);
                    const isPreset = presets.includes(createTaskForm.proofRequirements);
                    return isPreset ? createTaskForm.proofRequirements : "custom";
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "custom") {
                      setCreateTaskForm({ ...createTaskForm, proofRequirements: val });
                    }
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors"
                >
                  {(() => {
                    const presets = getProofPresetOptions(createTaskForm.platform, checkedActions);
                    return (
                      <>
                        {presets.map((preset, idx) => (
                          <option key={idx} value={preset}>
                            {preset}
                          </option>
                        ))}
                        <option value="custom">Custom Requirement (Type below)</option>
                      </>
                    );
                  })()}
                </select>
              </div>

              {/* Proof Requirements Detail input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Proof Requirements Detail (Editable)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Screenshot showing following status"
                  value={createTaskForm.proofRequirements}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, proofRequirements: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                />
              </div>

              {/* Task Link */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Target Link (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/target"
                  value={createTaskForm.link}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, link: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                />
              </div>
            </main>

            <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-xl text-xs font-bold hover:from-blue-700 hover:to-emerald-600 active:scale-95 transition-all shadow-md"
              >
                Launch Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. SUCCESS CELEBRATION SCREEN */}
      {screen === "success-celebration" && selectedTask && (
        <div className="flex-grow flex flex-col bg-white pb-6 justify-between animate-fade-in max-w-md mx-auto w-full border-x border-slate-100 min-h-screen">
          <header className="h-14 bg-white border-b border-slate-50 sticky top-0 z-40 px-4 flex items-center justify-between flex-shrink-0">
            <div className="w-7 h-7" />
            <span className="text-sm font-bold text-slate-900">Task Completed</span>
            <div className="w-7 h-7" />
          </header>

          <main className="p-6 flex-grow flex flex-col items-center justify-center text-center space-y-8 max-w-sm mx-auto relative overflow-hidden">
            {/* Sparkle particles / celebration background (pure CSS) */}
            <div className="absolute inset-0 pointer-events-none select-none">
              <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-sparkle-1 top-1/4 left-1/4"></div>
              <div className="absolute w-1.5 h-1.5 rounded-full bg-blue-500 animate-sparkle-2 top-1/3 right-1/4"></div>
              <div className="absolute w-2 h-2 rounded-full bg-amber-500 animate-sparkle-3 bottom-1/3 left-1/3"></div>
              <div className="absolute w-1.5 h-1.5 rounded-full bg-pink-500 animate-sparkle-4 bottom-1/4 right-1/3"></div>
              <div className="absolute w-2.5 h-2.5 rounded-full bg-purple-500 animate-sparkle-5 top-1/2 left-1/2"></div>
            </div>

            {/* Bouncing / pulsing successful badge */}
            <div className="relative">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce-short">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              {/* Extra radiating rings */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping-slow pointer-events-none"></div>
            </div>

            <div className="space-y-3 relative z-10">
              <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Proof Submitted!
              </h2>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed font-sans px-4">
                Your proof has been successfully logged. The stablecoin reward will be credited directly to your MiniPay wallet within 24 hours of campaign owner approval.
              </p>
            </div>

            {/* Details Summary Card */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-5 text-xs font-semibold text-slate-600 space-y-3 text-left relative z-10 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Campaign Payout:</span>
                <span className="text-slate-800 font-extrabold text-sm text-emerald-600">
                  {formatCurrency(selectedTask.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/50 pt-3">
                <span className="text-slate-400">Platform Target:</span>
                <span className="text-slate-800 font-bold capitalize flex items-center gap-1.5">
                  {getPlatformIcon(selectedTask.platform, "w-4 h-4")}
                  {selectedTask.platform}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/50 pt-3">
                <span className="text-slate-400">Job Title:</span>
                <span className="text-slate-800 font-bold max-w-[150px] truncate text-right">
                  {selectedTask.title}
                </span>
              </div>
            </div>
          </main>

          <div className="p-6 bg-white flex flex-col gap-3 flex-shrink-0">
            <button
              onClick={() => {
                setScreen("main");
                setActiveTab("history");
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              View in Submission History
            </button>
            <button
              onClick={() => {
                setScreen("main");
                setActiveTab("home");
              }}
              className="w-full py-4 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* 6. WEB3 TRANSACTION MODAL OVERLAY */}
      {activeTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-6 text-center animate-scale-up">
            
            {/* Modal states */}
            {activeTransaction.status === "confirm-refund" && (
              <div className="space-y-5 animate-fade-in">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Undo2 className="w-7 h-7 text-rose-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">Claim Escrow Refund</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans px-2">
                    Claiming the remaining escrow budget back to your wallet address.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Refund Amount:</span>
                    <span className="text-rose-600 font-black text-sm">{activeTransaction.amount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Escrow Source:</span>
                    <span className="text-slate-800 font-mono text-[9px]">{formatAddress(PLATFORM_ESCROW_WALLET)}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTransaction.onClose) activeTransaction.onClose();
                    }}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingTxData?.taskId) {
                        executeRefund(pendingTxData.taskId);
                      }
                    }}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Claim Refund
                  </button>
                </div>
              </div>
            )}

            {activeTransaction.status === "refunding-escrow" && (
              <div className="py-8 space-y-6 animate-fade-in">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-rose-600 rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-950">Refunding Escrow Funds</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">
                    Transferring back to advertiser...
                  </p>
                </div>
              </div>
            )}

            {activeTransaction.status === "confirm-reopen" && (
              <div className="space-y-5 animate-fade-in">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <RefreshCw className="w-7 h-7 text-emerald-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">Reopen Campaign</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans px-2">
                    Replenishing campaign slots requires a new escrow deposit.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Deposit Cost:</span>
                    <span className="text-emerald-600 font-black text-sm">{activeTransaction.amount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Escrow Destination:</span>
                    <span className="text-slate-800 font-mono text-[9px]">{formatAddress(PLATFORM_ESCROW_WALLET)}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTransaction.onClose) activeTransaction.onClose();
                    }}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingTxData?.taskId) {
                        executeReopen(pendingTxData.taskId);
                      }
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Deposit & Reopen
                  </button>
                </div>
              </div>
            )}

            {activeTransaction.status === "reopening-campaign" && (
              <div className="py-8 space-y-6 animate-fade-in">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-950">Depositing to Escrow</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">
                    Broadcasting reopening transaction...
                  </p>
                </div>
              </div>
            )}

            {activeTransaction.status === "confirm-deposit" && (
              <div className="space-y-5">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Wallet className="w-7 h-7 text-blue-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">Campaign Escrow Deposit</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans px-2">
                    Deploying your micro-job campaign to the Celo network holds funds securely in escrow.
                  </p>
                </div>
                
                {/* Payment Method Selector */}
                <div className="space-y-1.5 text-left px-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Choose Payment Method
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/50 border border-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("wallet")}
                      disabled={!isConnected}
                      className={`py-2 px-3 rounded-lg text-xs font-bold text-center transition-all ${
                        paymentMethod === "wallet" && isConnected
                          ? "bg-slate-900 text-white shadow-sm"
                          : !isConnected
                          ? "bg-slate-100/30 text-slate-300 cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-100/30 active:scale-95"
                      }`}
                    >
                      Web3 Wallet (cUSD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("naira")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold text-center transition-all ${
                        paymentMethod === "naira" || !isConnected
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100/30 active:scale-95"
                      }`}
                    >
                      Naira Transfer (NGN)
                    </button>
                  </div>
                  {!isConnected && (
                    <span className="text-[9px] text-amber-600 font-semibold block mt-0.5">
                      No Web3 wallet injected in browser. Locked to Naira transfer.
                    </span>
                  )}
                </div>
                
                {/* Cost Breakdown */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Campaign Budget:</span>
                    <span className="text-slate-800">{(payoutValue * slotsValue).toFixed(2)} cUSD</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Platform Fee ({PLATFORM_FEE_PERCENTAGE}%):</span>
                    <span className="text-slate-800">{((payoutValue * slotsValue) * (PLATFORM_FEE_PERCENTAGE / 100)).toFixed(2)} cUSD</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Admin Escrow Wallet:</span>
                    <span className="text-slate-800 font-mono text-[9px]">{formatAddress(PLATFORM_ESCROW_WALLET)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/10 pt-2.5 text-slate-950 font-black text-sm">
                    <span>Total Deposit:</span>
                    <span className="text-emerald-600">{activeTransaction.amount}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                    Approx. ~₦{Math.round((payoutValue * slotsValue * (1 + PLATFORM_FEE_PERCENTAGE / 100)) * CUSD_TO_NGN_RATE).toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTransaction.onClose) activeTransaction.onClose();
                    }}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDepositing}
                    onClick={async () => {
                      setIsDepositing(true);
                      try {
                        const budget = payoutValue * slotsValue;
                        const fee = budget * (PLATFORM_FEE_PERCENTAGE / 100);
                        const total = budget + fee;

                        if (!isConnected || paymentMethod === "naira") {
                          // Naira manual transfer selected or forced (no injected browser wallet)
                          if (pendingTxData?.newTask) {
                            const pendingTask = {
                              ...pendingTxData.newTask,
                              status: "pending_payment",
                              transactionHash: "manual-payment"
                            };
                            await saveNewTask(pendingTask);
                          }
                          setIsDepositing(false);
                          setActiveTransaction((prev) => prev ? { ...prev, status: "naira-checkout" } : null);
                          return;
                        }

                        // Transition state to sending
                        setActiveTransaction((prev) => prev ? { ...prev, status: "sending-escrow" } : null);
                        const amountWei = parseEther(total.toFixed(18));

                        const cusdAddress = getCusdAddress(chainId);
                        const escrowContractAddress = getEscrowAddress(chainId);

                        let txHash: `0x${string}` | undefined;
                        if (escrowContractAddress && escrowContractAddress !== "0x0000000000000000000000000000000000000000") {
                          // Step 1: Approve the Escrow Contract to spend cUSD/USDm
                          await writeContractAsync({
                            address: cusdAddress,
                            abi: ERC20_ABI,
                            // function name matches approve(address spender, uint256 value)
                            functionName: "approve",
                            args: [escrowContractAddress, amountWei],
                            type: "legacy",
                          });

                          // Step 2: Call createCampaign on the escrow smart contract
                          const rewardWei = parseEther(payoutValue.toString());
                          const bytes32TaskId = formatTaskIdToBytes32(pendingTxData?.newTask?.id || "");
                          const durationSeconds = BigInt((pendingTxData?.newTask?.expiryHours || 24) * 3600);

                          txHash = await writeContractAsync({
                            address: escrowContractAddress,
                            abi: ESCROW_ABI,
                            functionName: "createCampaign",
                            args: [bytes32TaskId, rewardWei, BigInt(slotsValue), durationSeconds],
                            type: "legacy",
                            });
                        } else {
                          // Fallback to legacy transfer
                          txHash = await writeContractAsync({
                            address: cusdAddress,
                            abi: ERC20_ABI,
                            functionName: "transfer",
                            args: [PLATFORM_ESCROW_WALLET as `0x${string}`, amountWei],
                            type: "legacy",
                          });
                        }

                        // Create and save task
                        if (pendingTxData?.newTask) {
                          saveNewTask(pendingTxData.newTask);
                        }

                        setIsDepositing(false);
                        // Set success status
                        setActiveTransaction((prev) => prev ? { 
                          ...prev, 
                          status: "success", 
                          txHash
                        } : null);

                      } catch (err: any) {
                        console.error("Escrow deposit failed:", err);
                        alert("Transaction failed or rejected: " + (err.message || err));
                        setIsDepositing(false);
                        setActiveTransaction(null);
                        setPendingTxData(null);
                      }
                    }}
                    className={`flex-1 py-3 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                      isDepositing 
                        ? "bg-slate-400 cursor-not-allowed" 
                        : "bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600"
                    }`}
                  >
                    {isDepositing ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Deposit & Launch"
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTransaction.status === "naira-checkout" && (
              <div className="space-y-5 text-center animate-fade-in py-2">
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <TrendingUp className="w-7 h-7 text-purple-600 animate-pulse" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900">Naira ➔ cUSD Payment Portal</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                    Send local Naira bank transfers to automatically deposit cUSD into the Celo escrow wallet.
                  </p>
                </div>

                 <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">cUSD Budget to Fund:</span>
                    <span className="text-slate-800 font-bold">{activeTransaction.amount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                    <span className="text-slate-400">Naira Exchange Amount:</span>
                    <span className="text-slate-800">
                      ₦{(() => {
                        const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
                        return Math.round(amountNum * CUSD_TO_NGN_RATE).toLocaleString();
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Payment Gateway Fee (1.5%):</span>
                    <span className="text-slate-800">
                      ₦{(() => {
                        const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
                        const baseNaira = Math.round(amountNum * CUSD_TO_NGN_RATE);
                        return Math.round(baseNaira * 0.015).toLocaleString();
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Network Gas Fee Cover:</span>
                    <span className="text-slate-800">₦150</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/10 pt-2.5 text-slate-950 font-black text-xs">
                    <span>Total Naira Needed:</span>
                    <span className="text-purple-600 font-extrabold">
                      ₦{(() => {
                        const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
                        const baseNaira = Math.round(amountNum * CUSD_TO_NGN_RATE);
                        const koraFee = Math.round(baseNaira * 0.015);
                        const gasBuffer = 150;
                        return (baseNaira + koraFee + gasBuffer).toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2">
                  <button
                    type="button"
                    onClick={payWithKorapay}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-xl text-xs font-bold hover:from-blue-700 hover:to-emerald-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    Pay with Card / Bank Transfer
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTransaction(null);
                      setPendingTxData(null);
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  
                  <span className="text-[10px] text-slate-400 font-bold block mt-2 text-center">
                    Secured by Korapay
                  </span>
                </div>
              </div>
            )}

            {activeTransaction.status === "sending-escrow" && (
              <div className="py-8 space-y-6 animate-fade-in">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-950">Depositing to Celo Escrow</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">
                    Broadcasting transaction...
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-lg truncate max-w-[220px] mx-auto select-all">
                  Sign in MiniPay Wallet
                </span>
              </div>
            )}

            {activeTransaction.status === "confirm-release" && (
              <div className="space-y-5">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">Approve & Payout Worker</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans px-2">
                    This will approve the worker's submission and credit the reward amount to their withdrawable profile balance.
                  </p>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Release Amount:</span>
                    <span className="text-slate-800 font-black text-emerald-600">{activeTransaction.amount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Recipient Worker:</span>
                    <span className="text-slate-800 font-mono text-[9px]">
                      {pendingTxData?.subId ? formatAddress(creatorSubmissions.find(s => s.id === pendingTxData.subId)?.workerAddress || "0x") : "0x"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Escrow Source:</span>
                    <span className="text-slate-800 font-mono text-[9px]">{formatAddress(PLATFORM_ESCROW_WALLET)}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTransaction.onClose) activeTransaction.onClose();
                    }}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // Transition state to sending
                        setActiveTransaction((prev) => prev ? { ...prev, status: "releasing-escrow" } : null);

                        if (pendingTxData?.subId && pendingTxData?.taskId) {
                          await saveApproveSubmission(pendingTxData.subId, pendingTxData.taskId);
                        }

                        const mockHash = `0x_accumulated_${Array.from({length: 24}, () => Math.floor(Math.random()*16).toString(16)).join('')}` as `0x${string}`;
                        setActiveTransaction((prev) => prev ? { 
                          ...prev, 
                          status: "success", 
                          txHash: mockHash
                        } : null);
                      } catch (err: any) {
                        console.error("Payout failed:", err);
                        alert("Transaction failed or rejected: " + (err.message || err));
                        setActiveTransaction(null);
                        setPendingTxData(null);
                      }
                    }}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Approve & Payout
                  </button>
                </div>
              </div>
            )}

            {activeTransaction.status === "releasing-escrow" && (
              <div className="py-8 space-y-6 animate-fade-in">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-950">Releasing Escrow Payout</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">
                    Transferring funds to worker...
                  </p>
                </div>
              </div>
            )}

            {activeTransaction.status === "confirm-withdrawal" && (
              <div className="space-y-5">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Wallet className="w-7 h-7 text-emerald-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">Confirm Payout</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans px-2">
                    This will initiate a blockchain transfer of cUSD from the platform escrow/admin wallet directly to the worker.
                  </p>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payout Amount:</span>
                    <span className="text-slate-800 font-black text-emerald-600">{activeTransaction.amount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Recipient Worker:</span>
                    <span className="text-slate-800 font-mono text-[9px] truncate max-w-[120px]">
                      {pendingTxData?.withdrawal?.workerAddress || "0x"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTransaction.onClose) activeTransaction.onClose();
                    }}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setActiveTransaction((prev) => prev ? { ...prev, status: "processing-withdrawal" } : null);

                        const workerWallet = pendingTxData?.withdrawal?.workerAddress;
                        const payoutVal = pendingTxData?.withdrawal?.amount || 0;
                        if (!workerWallet) {
                          throw new Error("Worker wallet address not found.");
                        }

                        const amountWei = parseEther(payoutVal.toFixed(18));
                        const cusdAddress = getCusdAddress(chainId);

                        // On-chain transfer of the accumulated amount to the worker
                        const txHash = await writeContractAsync({
                          address: cusdAddress,
                          abi: ERC20_ABI,
                          functionName: "transfer",
                          args: [workerWallet as `0x${string}`, amountWei],
                          type: "legacy",
                        });

                        // Update the withdrawal request to completed in Firestore
                        if (pendingTxData?.withdrawal?.id) {
                          await updateDoc(doc(db, "withdrawals", pendingTxData.withdrawal.id), {
                            status: "completed",
                            txHash,
                            paidAt: new Date().toISOString()
                          });
                        }

                        setActiveTransaction((prev) => prev ? { 
                          ...prev, 
                          status: "success", 
                          txHash 
                        } : null);
                      } catch (err: any) {
                        console.error("Payout failed:", err);
                        alert("Transaction failed or rejected: " + (err.message || err));
                        setActiveTransaction(null);
                        setPendingTxData(null);
                      }
                    }}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Approve & Payout
                  </button>
                </div>
              </div>
            )}

            {activeTransaction.status === "processing-withdrawal" && (
              <div className="py-8 space-y-6 animate-fade-in">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-950">Processing Worker Withdrawal</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">
                    Transferring accumulated cUSD to worker...
                  </p>
                </div>
              </div>
            )}

            {activeTransaction.status === "success" && (
              <div className="space-y-5 py-2">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-950">Transaction Successful!</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Funds processed and confirmed on the blockchain
                  </p>
                </div>

                {activeTransaction.txHash && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[10px] space-y-1 text-left font-mono">
                    <span className="text-slate-400 font-bold block">TRANSACTION HASH:</span>
                    <a
                      href={`https://celoscan.io/tx/${activeTransaction.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-extrabold hover:underline break-all flex items-center gap-1"
                    >
                      {activeTransaction.txHash.substring(0, 24)}...
                      <ExternalLink className="w-3 h-3 inline-block flex-shrink-0" />
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTransaction(null);
                    setPendingTxData(null);
                  }}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Close & Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {rejectingSubId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-6 animate-scale-up">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">Reject Submission</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                Please select a reason category and provide a brief explanation for rejecting this submission.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rejection Category</label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all"
                >
                  <option value="invalid screenshot">Invalid screenshot</option>
                  <option value="incomplete task">Incomplete task</option>
                  <option value="duplicate submission">Duplicate submission</option>
                  <option value="wrong account">Wrong account</option>
                  <option value="spam / fraud">Spam / Fraud</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Short Explanation</label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. The screenshot uploaded does not show the requested follow status."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingSubId(null);
                  setRejectingTaskId(null);
                }}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReasonInput.trim()}
                onClick={() => {
                  if (rejectingSubId) {
                    handleRejectSubmission(rejectingSubId, rejectionCategory, rejectionReasonInput);
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Reject Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {disputingSubId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-6 animate-scale-up">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">Dispute Rejection</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                Explain why you believe this rejection is incorrect. The platform administrator will review your appeal.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Argument / Proof details</label>
              <textarea
                value={disputeReasonInput}
                onChange={(e) => setDisputeReasonInput(e.target.value)}
                placeholder="e.g. My username is visible in the top corner of the screenshot. I did follow the user."
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDisputingSubId(null);
                  setDisputeReasonInput("");
                }}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!disputeReasonInput.trim()}
                onClick={() => {
                  if (disputingSubId) {
                    handleDisputeRejection(disputingSubId, disputeReasonInput);
                  }
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MEDIA VIEWER MODAL ===== */}
      {mediaViewerUrl && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setMediaViewerUrl(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setMediaViewerUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Label */}
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-3">
            {mediaViewerType === "video" ? "Screen Recording" : "Proof Screenshot"}
          </p>

          {/* Media */}
          <div
            className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaViewerType === "video" ? (
              <video
                src={mediaViewerUrl}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[70vh] object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaViewerUrl}
                alt="Proof screenshot"
                className="w-full max-h-[70vh] object-contain"
              />
            )}
          </div>

          <p className="text-white/30 text-[10px] font-semibold mt-4">Tap outside to close</p>
        </div>
      )}

    </div>
  );
}

