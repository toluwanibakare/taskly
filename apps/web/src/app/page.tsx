"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useConnect, useWriteContract, useChainId, useDisconnect, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther, keccak256, toBytes, stringToHex } from "viem";

import { getEscrowAddress, formatTaskIdToBytes32, useEscrow } from "../hooks/useEscrow";
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
  where,
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
  TrendingUp,
  Receipt,
  Trophy,
  Search,
  Loader2,
  Zap,
  ArrowRight,
  ChevronLeft,
  Share2,
  Pencil,
  Bell,
  Users,
  Lightbulb,
  Copy,
  Megaphone
} from "lucide-react";
import { EmailModal } from "../components/EmailModal";
import { createNotification, getNotifIcon } from "../lib/notifications";
import { BadgeUnlockModal, BadgeUnlockInfo } from "../components/BadgeUnlockModal";
import { CertificateModal } from "../components/CertificateModal";
import { OnboardingTour } from "../components/OnboardingTour";

// Platform Type definition
type Platform = "instagram" | "x" | "youtube" | "tiktok" | "survey" | "testing" | "facebook" | "linkedin" | "github" | "content" | "community";

// v2.1.0 feature flags
const NEW_FEATURE_UNTIL = "2026-08-12";
const HIGH_PAYOUT_THRESHOLD = 0.25;

const TASK_CATEGORIES: Record<string, { label: string; platforms: Platform[]; isNew: boolean }> = {
  social: { label: "Social Media", platforms: ["instagram", "x", "youtube", "tiktok", "facebook", "linkedin", "github"], isNew: false },
  survey: { label: "Surveys & Quizzes", platforms: ["survey"], isNew: true },
  beta: { label: "Beta Lab", platforms: ["testing"], isNew: true },
  content: { label: "Writing & Content", platforms: ["content"], isNew: true },
  community: { label: "Community & Groups", platforms: ["community"], isNew: true },
};

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
  createdAt?: string;
  updatedAt?: string;
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
    title: "Create X Post Promoting Tezra",
    platform: "x",
    type: "Content Sharing",
    payout: 0.50,
    description: "Write a unique, organic post on your personal X profile promoting Tezra for micro-jobs in Nigeria.",
    instructions: "Compose a tweet describing how Tezra helps Nigerians earn USDm.\nInclude the hashtags #Tezra and #Celo.\nPost the tweet.\nCopy the link of your published tweet.",
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
    description: "Join our TikTok community to catch short, educational videos about stablecoins and tech.",
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
    type: "Web & App Tasks",
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
    type: "Web & App Tasks",
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
  isNew?: boolean;
}

const FALLBACK_USDM_TO_NGN_RATE = 1403;

const PLATFORM_ACTIONS: Record<Platform, PlatformAction[]> = {
  x: [
    { value: "follow", label: "Follow Profile", basePrice: 0.02 },
    { value: "like", label: "Like Post", basePrice: 0.01 },
    { value: "repost", label: "Repost (Retweet)", basePrice: 0.01 },
    { value: "comment", label: "Reply / Comment", basePrice: 0.02 },
    { value: "tweet", label: "Write Custom Tweet", basePrice: 0.10 },
    { value: "quote", label: "Quote Tweet with Comment", basePrice: 0.03, isNew: true },
    { value: "bookmark", label: "Bookmark Post", basePrice: 0.02, isNew: true }
  ],
  instagram: [
    { value: "follow", label: "Follow Profile", basePrice: 0.02 },
    { value: "like", label: "Like Post", basePrice: 0.01 },
    { value: "comment", label: "Comment on Post", basePrice: 0.02 },
    { value: "story", label: "Share Post to Story", basePrice: 0.05 },
    { value: "save_collection", label: "Save to Collection", basePrice: 0.02, isNew: true },
    { value: "dm", label: "Send a DM", basePrice: 0.04, isNew: true }
  ],
  youtube: [
    { value: "subscribe", label: "Subscribe to Channel", basePrice: 0.03 },
    { value: "like", label: "Like Video", basePrice: 0.01 },
    { value: "comment", label: "Comment on Video", basePrice: 0.02 },
    { value: "watch", label: "Watch Video (2 min+)", basePrice: 0.03 },
    { value: "playlist", label: "Add Video to Playlist", basePrice: 0.02, isNew: true },
    { value: "shorts_subscribe", label: "Subscribe via Shorts", basePrice: 0.03, isNew: true }
  ],
  tiktok: [
    { value: "follow", label: "Follow Profile", basePrice: 0.02 },
    { value: "like", label: "Like Video", basePrice: 0.01 },
    { value: "favorite", label: "Save to Favorites", basePrice: 0.02 },
    { value: "comment", label: "Comment on Video", basePrice: 0.02, isNew: true },
    { value: "stitch", label: "Stitch the Video", basePrice: 0.05, isNew: true },
    { value: "duet", label: "Duet the Video", basePrice: 0.05, isNew: true }
  ],
  facebook: [
    { value: "follow_page", label: "Like & Follow Page", basePrice: 0.02 },
    { value: "like_post", label: "Like Post", basePrice: 0.01 },
    { value: "share_post", label: "Share Post", basePrice: 0.03 },
    { value: "join_group", label: "Join Facebook Group", basePrice: 0.02, isNew: true },
    { value: "share_to_group", label: "Share Post to Group", basePrice: 0.03, isNew: true }
  ],
  linkedin: [
    { value: "follow_company", label: "Follow Company Page", basePrice: 0.03 },
    { value: "like_post", label: "Like Post", basePrice: 0.01 },
    { value: "comment", label: "Comment on Post", basePrice: 0.03 },
    { value: "connect", label: "Connect with Profile", basePrice: 0.03, isNew: true },
    { value: "endorse", label: "Endorse a Skill", basePrice: 0.02, isNew: true }
  ],
  survey: [
    { value: "google_form", label: "Google Form UX Survey", basePrice: 0.15 },
    { value: "product_market", label: "Product Market Survey", basePrice: 0.20 },
    { value: "quiz_70", label: "Take Quiz (Score 70%+)", basePrice: 0.30, isNew: true },
    { value: "read_5q", label: "Read Article & 5 Questions", basePrice: 0.35, isNew: true },
    { value: "watch_3q", label: "Watch Video & 3 Questions", basePrice: 0.30, isNew: true },
    { value: "daily_poll", label: "Daily Poll Vote", basePrice: 0.10, isNew: true },
    { value: "video_feedback", label: "Video Feedback Recording", basePrice: 0.35, isNew: true }
  ],
  testing: [
    { value: "website_signup", label: "Website Sign-up & Verification", basePrice: 0.07 },
    { value: "app_download", label: "App Download & Registration", basePrice: 0.25 },
    { value: "ux_feedback", label: "UX & Usability Feedback Audit", basePrice: 0.35 },
    { value: "newsletter_sub", label: "Newsletter Email Subscription", basePrice: 0.05 },
    { value: "interact_features", label: "Walkthrough App/Web Features", basePrice: 0.12 },
    { value: "screen_recording", label: "Screen-Recording Walkthrough", basePrice: 0.35, isNew: true }
  ],
  github: [
    { value: "github_star", label: "Star Repository", basePrice: 0.03 },
    { value: "github_fork", label: "Fork Repository", basePrice: 0.04 },
    { value: "github_follow", label: "Follow Profile", basePrice: 0.02 },
    { value: "github_watch", label: "Watch Repository", basePrice: 0.02, isNew: true }
  ],
  content: [
    { value: "blog_post", label: "Write Blog Post", basePrice: 1.00, isNew: true },
    { value: "x_thread", label: "Write X Thread", basePrice: 0.75, isNew: true },
    { value: "product_review", label: "Product Review", basePrice: 0.60, isNew: true },
    { value: "testimonial", label: "Write Testimonial", basePrice: 0.60, isNew: true },
    { value: "google_maps_review", label: "Google Maps Review", basePrice: 0.50, isNew: true },
    { value: "article_rewrite", label: "Rewrite Article", basePrice: 0.40, isNew: true }
  ],
  community: [
    { value: "telegram_join", label: "Join Telegram Group", basePrice: 0.15, isNew: true },
    { value: "whatsapp_join", label: "Join WhatsApp Community", basePrice: 0.15, isNew: true },
    { value: "discord_join", label: "Join Discord Server", basePrice: 0.20, isNew: true },
    { value: "join_intro", label: "Join Group & Introduce Yourself", basePrice: 0.25, isNew: true },
    { value: "whatsapp_share_3", label: "Share to 3 WhatsApp Groups", basePrice: 0.30, isNew: true }
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
  website_signup: ["Open the website registration link.", "Fill out the form and verify your email address.", "Log in to your newly created account dashboard."],
  app_download: ["Download and install the mobile app from the official store.", "Create a new user account.", "Log in to the app dashboard."],
  ux_feedback: ["Open the product or website link.", "Test the primary user workflows.", "Identify any usability issues or interface friction.", "Write a detailed feedback review."],
  newsletter_sub: ["Open the newsletter sign-up page.", "Enter your active email address.", "Confirm your subscription in the email inbox."],
  interact_features: ["Open the app or website.", "Click through at least 3 major sections or tabs.", "Interact with a key feature (e.g. adding an item, running a search, editing a page)."],
  github_star: ["Open the repository link.", "Click the Star button at the top right."],
  github_fork: ["Open the repository link.", "Click the Fork button at the top right.", "Create the fork under your account."],
  github_follow: ["Open the GitHub profile link.", "Click the Follow button under the user avatar."],
  quote: ["Open the post link.", "Click the Repost icon and select 'Quote'.", "Add your own supporting comment and publish."],
  bookmark: ["Open the post link.", "Click the Bookmark icon to save the post."],
  save_collection: ["Open the Instagram post/reel.", "Tap the bookmark icon below the post.", "Save it to a collection (new or existing)."],
  dm: ["Open the Instagram profile link.", "Tap the DM/Message button.", "Send the provided message template."],
  playlist: ["Open the YouTube video link.", "Click Save under the video.", "Add the video to a playlist."],
  shorts_subscribe: ["Open the YouTube Shorts link.", "Watch the short and tap Subscribe on the channel."],
  stitch: ["Open the TikTok video.", "Tap Stitch, choose the section, and record your reply.", "Publish the stitched video."],
  duet: ["Open the TikTok video.", "Tap Duet and record your side-by-side video.", "Publish the duet."],
  join_group: ["Open the Facebook group link.", "Click 'Join Group' and answer any entry questions."],
  share_to_group: ["Open the post link.", "Click Share and select a Facebook group.", "Post the share to the group."],
  connect: ["Open the LinkedIn profile link.", "Click 'Connect' and add a personalized note."],
  endorse: ["Open the LinkedIn profile link.", "Click 'More' then 'Endorse skill'.", "Select a skill and endorse it."],
  quiz_70: ["Open the quiz link.", "Complete all questions.", "Score 70% or higher (screenshot your score)."],
  read_5q: ["Open the article link.", "Read the article fully.", "Answer the 5 questions about the content."],
  watch_3q: ["Open the video link.", "Watch the full video.", "Answer the 3 questions about the content."],
  daily_poll: ["Open the poll link.", "Cast your vote for today's poll."],
  video_feedback: ["Open the feedback link.", "Record a short video (30–60s) with your feedback.", "Upload or submit the recording link."],
  screen_recording: ["Open the app or website.", "Start a screen recording on your device.", "Walk through at least 3 major features slowly.", "Stop and upload the screen recording as proof."],
  github_watch: ["Open the GitHub repository link.", "Click the Watch button and choose your notification level."],
  blog_post: ["Write an original blog post (500+ words) on the given topic.", "Publish it on your own blog or a public platform.", "Provide the published URL."],
  x_thread: ["Write an original X thread (5+ posts) on the given topic.", "Publish it from your profile.", "Provide the link to the first tweet."],
  product_review: ["Use or explore the product.", "Write a genuine, structured review (200+ words).", "Publish it on your profile or a review platform.", "Provide the published link."],
  testimonial: ["Write a short positive testimonial (50+ words) about the product.", "Include your name and role.", "Provide the published or submitted link/text."],
  google_maps_review: ["Open the Google Maps listing link.", "Rate the business with 5 stars.", "Write a short honest review and submit.", "Screenshot the published review."],
  article_rewrite: ["Open the source article link.", "Rewrite the article in your own words (400+ words).", "Publish it and provide the link."],
  telegram_join: ["Open the Telegram group invite link.", "Tap 'Join Group'.", "Screenshot showing you as a member."],
  whatsapp_join: ["Open the WhatsApp community invite link.", "Tap 'Join Community' and enter if prompted.", "Screenshot showing you joined."],
  discord_join: ["Open the Discord server invite link.", "Accept the invite and complete any verification.", "Screenshot showing your membership."],
  join_intro: ["Open the group invite link and join.", "Post a short introduction message about yourself.", "Screenshot of your introduction message in the group."],
  whatsapp_share_3: ["Open the shareable content link.", "Forward the link to 3 different WhatsApp groups.", "Screenshot all 3 shared messages."]
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
  website_signup: ["Screenshot of website profile page showing your logged-in email/username", "Registered email address"],
  app_download: ["Screenshot of mobile app profile dashboard showing account information", "Registered email address or username"],
  ux_feedback: ["Screenshot of your detailed usability report or bug list", "Constructive usability text feedback"],
  newsletter_sub: ["Screenshot of subscription confirmation email", "Subscribed email address"],
  interact_features: ["Screenshot showing your interaction history or completed task action", "Short description of your walkthrough experience"],
  github_star: ["Screenshot showing the repository as Starred", "Your GitHub username"],
  github_fork: ["Screenshot of the forked repository in your profile", "Link to your forked repository", "Your GitHub username"],
  github_follow: ["Screenshot showing the 'Unfollow' button on the profile", "Your GitHub username"],
  quote: ["Screenshot of your quote tweet", "Link to your quote tweet"],
  bookmark: ["Screenshot showing the post as Bookmarked"],
  save_collection: ["Screenshot of the post saved in the collection", "Your Instagram handle"],
  dm: ["Screenshot of your sent DM", "Your Instagram handle"],
  playlist: ["Screenshot of the video added to the playlist", "Playlist name"],
  shorts_subscribe: ["Screenshot showing channel as Subscribed from Shorts", "YouTube username"],
  stitch: ["Link to your published stitch video", "Screenshot of your stitch"],
  duet: ["Link to your published duet video", "Screenshot of your duet"],
  join_group: ["Screenshot showing you as a group member"],
  share_to_group: ["Screenshot of the post shared into the group", "Group name"],
  connect: ["Screenshot of the pending/sent connection request"],
  endorse: ["Screenshot showing the endorsed skill", "LinkedIn profile link"],
  quiz_70: ["Screenshot of your quiz score (70%+)", "Your name/email used"],
  read_5q: ["Screenshot of your completed answers", "Your name/email used"],
  watch_3q: ["Screenshot of your completed answers", "Your name/email used"],
  daily_poll: ["Screenshot of your cast vote", "Your poll response"],
  video_feedback: ["Link to your uploaded feedback recording"],
  screen_recording: ["Upload the screen recording file", "Short summary of what you tested"],
  github_watch: ["Screenshot showing the repository as Watched", "Your GitHub username"],
  blog_post: ["Link to your published blog post", "Word count"],
  x_thread: ["Link to the first tweet of your thread"],
  product_review: ["Link to your published review", "Screenshot of the review"],
  testimonial: ["Link or text of your testimonial"],
  google_maps_review: ["Screenshot of your published Google Maps review", "Business name"],
  article_rewrite: ["Link to your rewritten article", "Screenshot of the published page"],
  telegram_join: ["Screenshot showing you as a member of the Telegram group", "Your Telegram username"],
  whatsapp_join: ["Screenshot showing you joined the WhatsApp community", "Your phone number (last 4 digits)"],
  discord_join: ["Screenshot showing your Discord membership", "Your Discord username"],
  join_intro: ["Screenshot of your introduction message in the group", "Your name"],
  whatsapp_share_3: ["Screenshots of all 3 WhatsApp groups where you shared", "Group names"]
};

const BADGES_METADATA: Record<string, { name: string; description: string; emoji: string; xp: number; icon: (color: string) => React.ReactNode }> = {
  genesis_creator: {
    name: "Genesis Creator",
    description: "First user to launch a campaign on Celo Mainnet",
    emoji: "🚀",
    xp: 200,
    icon: (color: string) => (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="12" fill={color === "gray" ? "#E2E8F0" : "#DBEAFE"} />
        <path d="M32 16L40 28H24L32 16Z" fill={color === "gray" ? "#94A3B8" : "#2563EB"} />
        <circle cx="32" cy="40" r="8" fill={color === "gray" ? "#64748B" : "#3B82F6"} />
      </svg>
    )
  },
  sold_out: {
    name: "Sold Out",
    description: "First creator to get all slots filled in a campaign",
    emoji: "✅",
    xp: 150,
    icon: (color: string) => (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="12" fill={color === "gray" ? "#E2E8F0" : "#D1FAE5"} />
        <path d="M18 32L28 42L46 22" stroke={color === "gray" ? "#94A3B8" : "#059669"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  task_machine: {
    name: "Task Machine",
    description: "Complete 20 tasks in a single day",
    emoji: "🤖",
    xp: 200,
    icon: (color: string) => (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="12" fill={color === "gray" ? "#E2E8F0" : "#FCE7F3"} />
        <path d="M32 16V48M16 32H48" stroke={color === "gray" ? "#94A3B8" : "#DB2777"} strokeWidth="6" strokeLinecap="round" />
        <circle cx="32" cy="32" r="12" fill={color === "gray" ? "#64748B" : "#EC4899"} />
      </svg>
    )
  },
  speed_run: {
    name: "Speed Run",
    description: "Submit proof within 3 minutes of opening a task",
    emoji: "⚡",
    xp: 100,
    icon: (color: string) => (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="12" fill={color === "gray" ? "#E2E8F0" : "#FEF3C7"} />
        <circle cx="32" cy="32" r="16" stroke={color === "gray" ? "#94A3B8" : "#D97706"} strokeWidth="4" />
        <path d="M32 20V32L40 36" stroke={color === "gray" ? "#64748B" : "#F59E0B"} strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  },
  pioneer_earner: {
    name: "Pioneer Earner",
    description: "Reach a total earnings of 10.00 USDm",
    emoji: "💰",
    xp: 250,
    icon: (color: string) => (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="12" fill={color === "gray" ? "#E2E8F0" : "#F3E8FF"} />
        <path d="M32 16L36.5 27H48L39 34L42 45L32 38L22 45L25 34L16 27H27.5L32 16Z" fill={color === "gray" ? "#94A3B8" : "#7C3AED"} />
      </svg>
    )
  },
  first_payout: {
    name: "First Withdraw",
    description: "First worker to request and complete a payout withdrawal",
    emoji: "💸",
    xp: 100,
    icon: (color: string) => (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="12" fill={color === "gray" ? "#E2E8F0" : "#FFF7ED"} />
        <path d="M22 40V24H42V40M18 20H46M32 28V36M28 32H36" stroke={color === "gray" ? "#94A3B8" : "#EA580C"} strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  },
  pioneer: {
    name: "Early Pioneer",
    description: "Claimed welcome gift and pioneer badge reward",
    emoji: "🎖️",
    xp: 50,
    icon: (color: string) => (
      <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="12" fill={color === "gray" ? "#E2E8F0" : "#D1FAE5"} />
        <path d="M32 18L35 28H46L38 34L41 44L32 38L23 44L26 34L18 28H29L32 18Z" fill={color === "gray" ? "#94A3B8" : "#10B981"} />
      </svg>
    )
  }
};

const PLATFORM_ESCROW_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET || "0xe6B3794191523dE54A03A685FDd786B313b1788C";
const PLATFORM_FEE_PERCENTAGE = 2; // 2% platform fee

const USDM_ADDRESSES: Record<number, `0x${string}`> = {
  42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo Mainnet (USDm)
  44787: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Celo Alfajores (formerly cUSD)
  11142220: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b", // Celo Sepolia (USDm)
};

const getUsdmAddress = (chainId: number): `0x${string}` => {
  return USDM_ADDRESSES[chainId] || "0x765DE816845861e75A25fCA122bb6898B8B1282a";
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
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
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

const TezraLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <img src={logoImg.src} alt="Tezra Logo" className="object-contain w-full h-full" />
  </div>
);

const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "tezra_uploads");

  const resourceType = file.type.startsWith("video/") || file.type.startsWith("audio/") ? "video" : "image";
  const url = `https://api.cloudinary.com/v1_1/lzeo74ym/${resourceType}/upload`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const data = await response.json();
  return data.secure_url;
};

// WAT = UTC+1
const WAT_OFFSET_MS = 60 * 60 * 1000;
const REFERRAL_CONTEST_START_MS = Date.UTC(2026, 7, 9, 0, 0, 0) - WAT_OFFSET_MS;
const REFERRAL_CONTEST_END_MS = Date.UTC(2026, 7, 30, 23, 59, 59) - WAT_OFFSET_MS;
const SOCIAL_QUEST_END_MS = Date.UTC(2026, 7, 9, 23, 59, 59) - WAT_OFFSET_MS;

function CountdownTimer({
  targetTime,
  phaseTargets,
  label,
  tone = "dark",
  showExpired = "Ended"
}: {
  targetTime: number;
  phaseTargets?: { start: number; end: number };
  label: string;
  tone?: "dark" | "light";
  showExpired?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const isPhase = !!phaseTargets && now < phaseTargets.end;
  const displayTarget = isPhase
    ? now < phaseTargets!.start
      ? phaseTargets!.start
      : phaseTargets!.end
    : targetTime;
  const displayLabel = isPhase
    ? now < phaseTargets!.start
      ? "Contest starts in"
      : "Contest ends in"
    : label;

  const diff = Math.max(0, displayTarget - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const cellBase = tone === "dark"
    ? "bg-slate-950/40 border-slate-700/60 text-white"
    : "bg-slate-100 border-slate-200 text-slate-800";

  if (diff <= 0) {
    return (
      <div className="text-center py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-500">
        {showExpired}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 text-center mb-1.5">
        {displayLabel}
      </span>
      <div className="flex items-center justify-center gap-1.5">
        {[
          { value: days, unit: "days" },
          { value: hours, unit: "hrs" },
          { value: mins, unit: "min" },
          { value: secs, unit: "sec" }
        ].map((cell) => (
          <div key={cell.unit} className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border ${cellBase} min-w-[46px]`}>
            <span className="text-base font-black tabular-nums leading-none">
              {String(cell.value).padStart(2, "0")}
            </span>
            <span className="text-[7px] font-bold uppercase tracking-wider opacity-70 mt-0.5">
              {cell.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [USDM_TO_NGN_RATE, setUsdmToNgnRate] = useState<number>(FALLBACK_USDM_TO_NGN_RATE);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates && data.rates.NGN) {
            const fetchedRate = Math.round(data.rates.NGN);
            console.log("Fetched live NGN rate:", fetchedRate);
            setUsdmToNgnRate(fetchedRate);
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
  const [isConnectingWallet, setIsConnectingWallet] = useState<boolean>(false);
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
  const { createCampaign } = useEscrow();

  // Screen state routing — skip splash and restore tab if reloading an existing session
  const [screen, setScreen] = useState<"splash" | "main" | "task-details" | "submit-proof" | "create-task" | "success-celebration" | "submit-idea">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("tezra_active_tab")) {
      return "main";
    }
    return "splash";
  });

  // Bottom navigation tab state — restored from sessionStorage on reload
  const [activeTab, setActiveTab] = useState<"home" | "earn" | "profile" | "about">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("tezra_active_tab") as "home" | "earn" | "profile" | "about" | null;
      if (saved) return saved;
    }
    return "home";
  });

  // Capture referral code from URL query parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("r");
      if (ref) {
        const myOwnRef = localStorage.getItem("my_generated_ref_code");
        if (myOwnRef && myOwnRef.toLowerCase() === ref.toLowerCase()) {
          console.log("Self-referral check failed on same device/browser.");
          return;
        }
        localStorage.setItem("tezra_referrer_code", ref);
        setShowReferralWelcome(true);
      }
    }
  }, []);

  // Profile Sub-Screen for Creator Dashboard
  // "profile-main" | "created-tasks" | "manage-submissions" | "admin-disputes" | "admin-withdrawals" | "admin-contest"
  const [profileSubScreen, setProfileSubScreen] = useState<"profile-main" | "created-tasks" | "manage-submissions" | "admin-disputes" | "admin-campaigns" | "admin-withdrawals" | "admin-contest" | "admin-contract" | "admin-promotion" | "admin-task-ideas" | "admin-users" | "admin-announcements" | "admin-quest-payout" | "task-history" | "transaction-history">("profile-main");

  // Persist active tab to sessionStorage so reload restores the same page
  useEffect(() => {
    if (typeof window !== "undefined" && screen === "main") {
      sessionStorage.setItem("tezra_active_tab", activeTab);
    }
  }, [activeTab, screen]);

  // Scroll to top whenever the user navigates to a new tab or screen
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab, screen]);

  // Selected task for Details and Submission
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Selected created task to view submissions
  const [selectedCreatedTask, setSelectedCreatedTask] = useState<Task | null>(null);

  // Sorting popover state
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState<"payout-desc" | "payout-asc" | "recency-desc" | "recency-asc">("payout-desc");
  const [showPwaModal, setShowPwaModal] = useState(false);

  // Available Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // Submissions received by tasks created by the user (Firestore synced)
  const [creatorSubmissions, setCreatorSubmissions] = useState<CreatorSubmission[]>([]);

  // Filter selection state
  const [activeFilter, setActiveFilter] = useState<string>("All");

  // Currency Preference: "USDm" | "NGN"
  const [currencyPreference, setCurrencyPreference] = useState<"USDm" | "NGN">("USDm");

  // Platform Administrator stats (from Firestore database stats doc)
  const [platformAdminStats, setPlatformAdminStats] = useState({
    feesCollected: 0.09,
    lockedEscrow: 1.50,
  });
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [onchainTxCount, setOnchainTxCount] = useState<number>(0);
  const [onchainUsersCount, setOnchainUsersCount] = useState<number>(0);
  const [onchainFeesCollected, setOnchainFeesCollected] = useState<number>(0);
  const [isLoadingOnchainStats, setIsLoadingOnchainStats] = useState<boolean>(false);
  const [isLoadingOnchainFees, setIsLoadingOnchainFees] = useState<boolean>(false);

  const escrowContractAddress = getEscrowAddress(chainId);
  const usdmAddress = getUsdmAddress(chainId);

  // Read user's own USDm balance on-chain
  const { data: rawUserUsdmBalance } = useReadContract({
    address: usdmAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [wagmiAddress || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!wagmiAddress && !!usdmAddress,
    }
  });

  const userUsdmBalance = useMemo(() => {
    if (!rawUserUsdmBalance) return 0;
    try {
      return parseFloat(formatEther(rawUserUsdmBalance as bigint));
    } catch {
      return 0;
    }
  }, [rawUserUsdmBalance]);

  const { data: rawEscrowBalance } = useReadContract({
    address: usdmAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [escrowContractAddress],
    query: {
      enabled: !!escrowContractAddress && escrowContractAddress !== "0x0000000000000000000000000000000000000000",
    }
  });

  const liveLockedEscrow = useMemo(() => {
    if (rawEscrowBalance === undefined || rawEscrowBalance === null) {
      return platformAdminStats.lockedEscrow;
    }
    try {
      return parseFloat(formatEther(rawEscrowBalance as bigint));
    } catch {
      return platformAdminStats.lockedEscrow;
    }
  }, [rawEscrowBalance, platformAdminStats.lockedEscrow]);

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
          amount: t ? t.amount : "0.05 USDm",
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

  useEffect(() => {
    if (!activeAddress || history.length === 0) return;
    const key = `notified_submissions_${activeAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      // First time connecting: seed current statuses so we only notify on FUTURE changes
      const seed: Record<string, string> = {};
      history.forEach((sub) => {
        seed[sub.id] = sub.status;
      });
      localStorage.setItem(key, JSON.stringify(seed));
      return;
    }

    try {
      const notified = JSON.parse(stored);
      let updated = false;

      for (const sub of history) {
        const prevStatus = notified[sub.id];
        
        if (sub.status !== "pending" && prevStatus !== sub.status) {
          if (sub.status === "approved") {
            setPendingNotif({
              title: sub.taskTitle,
              msg: "Your submission just got approved! You earned +10 XP.",
              type: "success"
            });
          } else if (sub.status === "rejected") {
            setPendingNotif({
              title: sub.taskTitle,
              msg: "Your submission was rejected. -10 XP.",
              type: "error"
            });
          }
          notified[sub.id] = sub.status;
          updated = true;
          break; // Show one notification at a time to prevent UI cluttering
        }
      }

      if (updated) {
        localStorage.setItem(key, JSON.stringify(notified));
      }
    } catch (e) {
      console.error("Error processing notification check:", e);
    }
  }, [history, activeAddress]);


  // Web3 Transaction Overlay state
  interface ActiveTransaction {
    status: "confirm-deposit" | "waiting-for-tx" | "scanning-blockchain" | "naira-checkout" | "sending-escrow" | "confirm-release" | "releasing-escrow" | "confirm-refund" | "refunding-escrow" | "confirm-reopen" | "reopening-campaign" | "confirm-withdrawal" | "processing-withdrawal" | "success" | "error";
    title: string;
    amount: string;
    step?: number;
    txHash?: string;
    onClose?: () => void;
    expectedAmount?: string;
    expectedRecipient?: string;
    userTxHash?: string;
  }
  const [activeTransaction, setActiveTransaction] = useState<ActiveTransaction | null>(null);
  const [useWelcomeCredit, setUseWelcomeCredit] = useState(true);
  const [lockWelcomeCredit, setLockWelcomeCredit] = useState(false);

  interface PendingTxData {
    newTask?: Task;
    subId?: string;
    taskId?: string;
    withdrawal?: any;
  }
  const [pendingTxData, setPendingTxData] = useState<PendingTxData | null>(null);

  // Firestore user balance and withdrawals
  const [dbUserBalance, setDbUserBalance] = useState<number>(0);
  const [dbUserProfile, setDbUserProfile] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Format amount based on user currency preference
  const formatCurrency = (amountStr: string) => {
    if (!amountStr) return "";
    const val = parseFloat(amountStr.replace(/[^\d.]/g, ""));
    if (isNaN(val)) return amountStr;
    if (currencyPreference === "NGN") {
      return `₦${Math.round(val * USDM_TO_NGN_RATE).toLocaleString()}`;
    }
    return `${val.toFixed(2)} USDm`;
  };

  const formatCurrencyVal = (val: number) => {
    if (currencyPreference === "NGN") {
      return `₦${Math.round(val * USDM_TO_NGN_RATE).toLocaleString()}`;
    }
    return `${val.toFixed(2)} USDm`;
  };

  // Checked checklist actions for the selected platform
  const [checkedActions, setCheckedActions] = useState<string[]>(["follow"]);

  useEffect(() => {
    if (!activeAddress || !dbUserProfile) return;
    const streakCount = effectiveStreakCount;
    const lastCompleted = dbUserProfile.lastCompletedDate || "";

    if (streakCount > 0) {
      // 1. Check Streak Milestone Celebrations
      const keyMilestone = `notified_streak_milestone_${activeAddress.toLowerCase()}_${streakCount}`;
      const alreadyShownMilestone = localStorage.getItem(keyMilestone);

      if (!alreadyShownMilestone) {
        // Pop up milestone notification
        setStreakMilestoneNotif(streakCount);
        localStorage.setItem(keyMilestone, "true");
      }

      // 2. Check Streak Loss Reminders
      const todayStr = new Date().toISOString().split("T")[0];
      if (lastCompleted && lastCompleted !== todayStr) {
        // Last submission was yesterday or earlier, and they have an active streak. 
        // Ensure they haven't submitted anything today yet (to keep it alive).
        const hasSubmissionToday = history.some(sub => sub.date === todayStr);
        if (!hasSubmissionToday) {
          // Show the top alert warning banner
          setShowStreakReminder(true);
        } else {
          setShowStreakReminder(false);
        }
      } else {
        setShowStreakReminder(false);
      }
    } else {
      setShowStreakReminder(false);
    }
  }, [dbUserProfile, history, activeAddress]);

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
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [visitedLink, setVisitedLink] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [pendingNotif, setPendingNotif] = useState<{ title: string; msg: string; type: "success" | "error" } | null>(null);
  const [showStreakReminder, setShowStreakReminder] = useState(false);
  const [streakMilestoneNotif, setStreakMilestoneNotif] = useState<number | null>(null);

  const effectiveStreakCount = useMemo(() => {
    const raw = dbUserProfile?.streakCount || 0;
    const lastDate = dbUserProfile?.lastCompletedDate || "";
    if (raw > 0 && lastDate) {
      const today = new Date().toISOString().split('T')[0];
      const diffTime = Math.abs(new Date(today).getTime() - new Date(lastDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 1) return 0;
    }
    return raw;
  }, [dbUserProfile?.streakCount, dbUserProfile?.lastCompletedDate]);
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const [adminDeleteTaskId, setAdminDeleteTaskId] = useState<string | null>(null);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [showReferralsModal, setShowReferralsModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showContestDetailsScreen, setShowContestDetailsScreen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("tezra_show_contest_details") === "true";
    }
    return false;
  });
  const [contestDetailsTab, setContestDetailsTab] = useState<"rules" | "leaderboard">((() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("tezra_contest_details_tab");
      if (saved === "rules" || saved === "leaderboard") return saved;
    }
    return "rules";
  })());
  const [historySubScreen, setHistorySubScreen] = useState<"tasks" | "ledger">("tasks");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<number>(1.00);
  const [contestConfig, setContestConfig] = useState<{ status: "idle" | "coming_soon" | "active"; startTime: string | null; endTime: string | null; prizePool: number; winnersCount: number; durationDays: number } | null>(null);
  const [contestLeaderboard, setContestLeaderboard] = useState<any[]>([]);
  const [showContestPopup, setShowContestPopup] = useState(false);
  const [adminContestPrize, setAdminContestPrize] = useState(20);
  const [adminContestDuration, setAdminContestDuration] = useState(7);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [questPayoutWinner, setQuestPayoutWinner] = useState("");
  const [questPayoutAmount, setQuestPayoutAmount] = useState("");
  const [questPayoutTitle, setQuestPayoutTitle] = useState("Social Quest Payout");
  const [questPayoutTxHash, setQuestPayoutTxHash] = useState("");
  const [showPaymentCertificate, setShowPaymentCertificate] = useState(false);
  const [questPayoutProcessing, setQuestPayoutProcessing] = useState(false);
  const [unlockedBadgeInfo, setUnlockedBadgeInfo] = useState<BadgeUnlockInfo | null>(null);
  const [pendingBadgeUnlock, setPendingBadgeUnlock] = useState<BadgeUnlockInfo | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileEditName, setProfileEditName] = useState("");
  const [profileEditEmail, setProfileEditEmail] = useState("");
  const [profileEditAvatar, setProfileEditAvatar] = useState<File | null>(null);
  const [profileEditAvatarPreview, setProfileEditAvatarPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [appNotifications, setAppNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Announcement templates (admin)
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementDrafts, setAnnouncementDrafts] = useState<Record<string, any>>({});
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [savingAnnouncementId, setSavingAnnouncementId] = useState<string | null>(null);
  const [sendingAnnouncementId, setSendingAnnouncementId] = useState<string | null>(null);

  // Promotion Broadcast builder states
  const [promoSubject, setPromoSubject] = useState("");
  const [promoTitle, setPromoTitle] = useState("");
  const [promoBadgeText, setPromoBadgeText] = useState("");
  const [promoBodyHtml, setPromoBodyHtml] = useState("");
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoCtaText, setPromoCtaText] = useState("");
  const [promoCtaUrl, setPromoCtaUrl] = useState("");
  const [promoPushTitle, setPromoPushTitle] = useState("");
  const [promoPushBody, setPromoPushBody] = useState("");
  const [promoPushUrl, setPromoPushUrl] = useState("");
  const [promoChannel, setPromoChannel] = useState<"both" | "email" | "push">("both");
  const [promoSending, setPromoSending] = useState(false);

  // Pull to refresh states
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Live in-app notifications subscription for the signed-in wallet
  useEffect(() => {
    if (!wagmiAddress) {
      setAppNotifications([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "users", wagmiAddress.toLowerCase(), "notifications"),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) =>
          ((b as any).createdAt?.toMillis?.() || 0) - ((a as any).createdAt?.toMillis?.() || 0)
        );
        setAppNotifications(items);
      },
      (err) => console.error("Failed to load notifications:", err)
    );
    return unsub;
  }, [wagmiAddress]);

  // Register Service Worker on Load for PWA notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully:", reg);
          reg.pushManager.getSubscription().then((sub) => {
            if (sub && dbUserProfile?.notificationsEnabled) {
              setNotificationsEnabled(true);
            }
          });
        })
        .catch((err) => console.error("Service Worker registration failed:", err));
    }
  }, [dbUserProfile?.notificationsEnabled]);

  // Lock body scroll completely when splash loading screen is active
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (screen === "splash") {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
      document.body.style.position = "fixed";
      document.body.style.width = "100vw";
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [screen]);

  const togglePushSubscription = async () => {
    if (!activeAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    if (notificationsEnabled) {
      try {
        const userRef = doc(db, "users", activeAddress.toLowerCase());
        await updateDoc(userRef, { notificationsEnabled: false });
        setNotificationsEnabled(false);
        alert("Push notifications disabled.");
      } catch (err) {
        console.error("Failed to disable notifications:", err);
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permission denied. Please enable notifications in your browser/device settings.");
        return;
      }

      const res = await fetch("/api/notifications/subscribe");
      const { publicKey } = await res.json();

      if (!publicKey) {
        throw new Error("VAPID public key not returned from server.");
      }

      const reg = await navigator.serviceWorker.ready;
      
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      };

      const subscription = await reg.pushManager.subscribe(subscribeOptions);

      const saveRes = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: activeAddress,
          subscription,
        }),
      });

      if (saveRes.ok) {
        setNotificationsEnabled(true);
        alert("Push notifications enabled successfully!");
      } else {
        alert("Failed to save notification subscription to server.");
      }
    } catch (err) {
      console.error("Push subscription process failed:", err);
      alert("Failed to enable notifications. Ensure you have added the app to your Home Screen.");
    }
  };

  const handleSendPromotion = async () => {
    // Validate based on channel selected
    if (promoChannel === "email" || promoChannel === "both") {
      if (!promoSubject.trim() || !promoTitle.trim() || !promoBodyHtml.trim()) {
        alert("Please fill in the Email Subject, Email Title, and Email Body fields.");
        return;
      }
    }
    if (promoChannel === "push" || promoChannel === "both") {
      if (!promoPushTitle.trim() || !promoPushBody.trim()) {
        alert("Please fill in the Push Notification Title and Body fields.");
        return;
      }
    }

    if (!confirm(`Are you sure you want to broadcast this promotion to all users via ${promoChannel === "both" ? "Email and Push Alerts" : promoChannel === "email" ? "Email" : "Push Alerts"}?`)) {
      return;
    }

    setPromoSending(true);
    try {
      const res = await fetch("/api/admin/broadcast-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: promoSubject,
          title: promoTitle,
          badgeText: promoBadgeText || "Promo",
          bodyHtml: promoBodyHtml,
          imageUrl: promoImageUrl || undefined,
          ctaText: promoCtaText || undefined,
          ctaUrl: promoCtaUrl || undefined,
          pushTitle: promoPushTitle,
          pushBody: promoPushBody,
          pushUrl: promoPushUrl || undefined,
          channels: promoChannel,
          secretKey: "tezra-admin"
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Broadcast successfully completed!\nEmails sent: ${data.emailSentCount}\nPush notifications sent: ${data.pushSentCount}`);
        // Reset states
        setPromoSubject("");
        setPromoTitle("");
        setPromoBadgeText("");
        setPromoBodyHtml("");
        setPromoImageUrl("");
        setPromoCtaText("");
        setPromoCtaUrl("");
        setPromoPushTitle("");
        setPromoPushBody("");
        setPromoPushUrl("");
        setProfileSubScreen("profile-main");
      } else {
        alert("Failed to send broadcast promotion: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Promo sending failed:", err);
      alert("An error occurred: " + err.message);
    } finally {
      setPromoSending(false);
    }
  };

  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `promotions/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      setPromoImageUrl(downloadUrl);
      alert("Image uploaded successfully!");
    } catch (err: any) {
      console.error("Promo image upload failed:", err);
      alert("Image upload failed: " + err.message);
    }
  };

  const handleLoadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      if (res.ok && data.success) {
        setAnnouncements(data.announcements);
        const drafts: Record<string, any> = {};
        data.announcements.forEach((a: any) => {
          drafts[a.id] = {
            emailSubject: a.emailSubject || "",
            emailBody: a.emailBody || "",
            pushTitle: a.pushTitle || "",
            pushBody: a.pushBody || ""
          };
        });
        setAnnouncementDrafts(drafts);
      } else {
        alert("Failed to load announcements: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Failed to load announcements:", err);
      alert("Failed to load announcements: " + err.message);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const handleSaveAnnouncement = async (id: string) => {
    const draft = announcementDrafts[id];
    if (!draft) return;
    if (!draft.emailSubject.trim() || !draft.emailBody.trim() || !draft.pushTitle.trim() || !draft.pushBody.trim()) {
      alert("Please fill in all fields (email subject, email body, push title and push body) before saving.");
      return;
    }
    setSavingAnnouncementId(id);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, secretKey: "tezra-admin", ...draft })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Template saved. You can edit it again any time before sending.");
        await handleLoadAnnouncements();
      } else {
        alert("Failed to save template: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Failed to save template: " + err.message);
    } finally {
      setSavingAnnouncementId(null);
    }
  };

  const handleSendAnnouncement = async (id: string) => {
    const tpl = announcements.find((a) => a.id === id);
    if (!tpl || tpl.sentAt) return;
    if (!confirm(`Send "${tpl.name}" now? It will email all users, send push notifications and post in-app alerts. This can only be done once.`)) {
      return;
    }
    setSendingAnnouncementId(id);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, secretKey: "tezra-admin" })
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          `Sent! Emails: ${data.emailSentCount}, Push notifications: ${data.pushSentCount}, In-app alerts: ${data.inAppSentCount}.`
        );
        await handleLoadAnnouncements();
      } else {
        alert("Failed to send announcement: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Failed to send announcement: " + err.message);
    } finally {
      setSendingAnnouncementId(null);
    }
  };

  useEffect(() => {
    if (profileSubScreen === "admin-announcements") {
      handleLoadAnnouncements();
    }
  }, [profileSubScreen, handleLoadAnnouncements]);

  const isStandaloneMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes("android-app://")
    );
  }, []);

  // PWA Standalone Pull-to-Refresh Drag Gesture side effect
  useEffect(() => {
    if (!isStandaloneMode || typeof window === "undefined") return;

    let startY = 0;
    let activePull = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (activePull || window.scrollY > 0) return;
      startY = e.touches[0]?.pageY ?? 0;
      activePull = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activePull) return;
      const currentY = e.touches[0]?.pageY ?? startY;
      const diff = currentY - startY;

      // user scrolled during the gesture (or was mid-scroll) - bail out cleanly
      if (window.scrollY > 0) {
        activePull = false;
        setPullDistance(0);
        return;
      }

      // finger moved back up: relax the indicator but keep the gesture alive
      if (diff <= 0) {
        setPullDistance(0);
        return;
      }

      if (e.cancelable) e.preventDefault();
      // apply smooth pull friction
      const dist = Math.min(80, diff * 0.4);
      setPullDistance(dist);
    };

    const handleTouchEnd = () => {
      if (!activePull) return;
      activePull = false;
      setPullDistance((currentDist) => {
        if (currentDist >= 45) {
          setIsPullRefreshing(true);
          // reload browser page
          setTimeout(() => {
            window.location.reload();
          }, 500);
          return 45;
        }
        return 0;
      });
    };

    const handleTouchCancel = () => {
      activePull = false;
      setPullDistance(0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [isStandaloneMode]);

  useEffect(() => {
    setVisitedLink(false);
  }, [selectedTask]);

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
  const [isReopening, setIsReopening] = useState<boolean>(false);
  const [reopeningTaskId, setReopeningTaskId] = useState<string | null>(null);

  // Submit Task Idea queue state
  const [taskIdeas, setTaskIdeas] = useState<any[]>([]);
  const [ideaForm, setIdeaForm] = useState({ kind: "task" as "task" | "category", title: "", description: "", category: "social", example_tasks: "", suggested_payout: "" });
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);
  const [ideaSubmitted, setIdeaSubmitted] = useState(false);
  const [launchingIdeaId, setLaunchingIdeaId] = useState<string | null>(null);
  const [ideaLaunchForm, setIdeaLaunchForm] = useState<{ platform: Platform; actions: string[]; slots: number }>({ platform: "x", actions: ["follow"], slots: 50 });

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
                         createTaskForm.platform === "testing" ? "Beta Lab" :
                         createTaskForm.platform === "content" ? "Writing & Content" :
                         createTaskForm.platform === "community" ? "Community & Groups" :
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
      type: createTaskForm.platform === "testing" 
        ? "Beta Lab" 
        : createTaskForm.platform === "survey"
        ? "Surveys & Quizzes"
        : createTaskForm.platform === "content"
        ? "Writing & Content"
        : createTaskForm.platform === "community"
        ? "Community & Groups"
        : checkedActions.includes("follow") || checkedActions.includes("subscribe") || checkedActions.includes("follow_page") || checkedActions.includes("follow_company") ? "Social Follow" : "Social Engagement"
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
      if (isMinipay && !isConnected && !isConnectingWallet) {
        setIsConnectingWallet(true);
        // Request account access directly first to ensure ethereum object injection is ready
        win.ethereum.request({ method: "eth_requestAccounts" })
          .then(async () => {
            // Add USDm token to MetaMask for proper display
            try {
              await addUsdmToMetaMask();
            } catch (e) {
              console.log("Could not add USDm token during auto-connect:", e);
            }
            
            const injectedConnector = connectors.find((c) => c.type === "injected") || connectors.find((c) => c.id === "injected") || connectors[0];
            if (injectedConnector) {
              try {
                await connectAsync({ connector: injectedConnector });
                setIsConnectingWallet(false);
              } catch (err) {
                console.error("Auto-connect sync failed in MiniPay", err);
                setIsConnectingWallet(false);
              }
            } else {
              setIsConnectingWallet(false);
            }
          })
          .catch((err: any) => {
            console.error("Direct MiniPay eth_requestAccounts failed:", err);
            // If user rejected, don't keep retrying automatically
            if (err?.code !== 4001 && !err?.message?.includes("rejected")) {
              // Could add retry logic here if needed
            }
            setIsConnectingWallet(false);
          });
      }
    }
  }, [screen, isConnected, connectors, connectAsync, isConnectingWallet]);

  // Load or create user document on connection (WAGMI or Manual)
  useEffect(() => {
    if (activeAddress) {
      const userDocRef = doc(db, "users", activeAddress);
      getDoc(userDocRef).then(async (docSnap) => {
        if (!docSnap.exists()) {
          // Check local storage for referral code
          const storedRefCode = localStorage.getItem("tezra_referrer_code");
          let referredBy = null;

          // Generate a random 6-character code
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          let generatedCode = "";
          for (let i = 0; i < 6; i++) {
            generatedCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          if (storedRefCode) {
            const myOwnRef = localStorage.getItem("my_generated_ref_code");
            if (myOwnRef && myOwnRef.toLowerCase() === storedRefCode.toLowerCase()) {
              console.log("Self-referral blocked: same device.");
            } else if (generatedCode.toLowerCase() === storedRefCode.toLowerCase()) {
              console.log("Self-referral blocked: same code.");
            } else {
              try {
                const usersSnap = await getDocs(collection(db, "users"));
                const referrerDoc = usersSnap.docs.find(d => d.data().refCode === storedRefCode);
                if (referrerDoc) {
                  const refWallet = referrerDoc.data().wallet_address;
                  if (refWallet && refWallet.toLowerCase() !== activeAddress.toLowerCase()) {
                    referredBy = refWallet;
                  } else {
                    console.log("Self-referral blocked: same wallet address.");
                  }
                }
              } catch (e) {
                console.error("Referrer lookup failed:", e);
              }
            }
          }

          localStorage.setItem("my_generated_ref_code", generatedCode);

          const avatarDesign = parseInt(activeAddress.slice(-2), 16) % 4;

          await setDoc(userDocRef, {
            wallet_address: activeAddress,
            total_earnings: 0,
            tasks_completed: 0,
            total_submissions: 0,
            xp: 500,
            streakCount: 0,
            consecutiveRejections: 0,
            badges: {},
            refCode: generatedCode,
            referredBy: referredBy || null,
            avatarDesign,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else {
          const uData = docSnap.data();
          if (!uData.refCode) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let generatedCode = "";
            for (let i = 0; i < 6; i++) {
              generatedCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            await updateDoc(userDocRef, { refCode: generatedCode });
            localStorage.setItem("my_generated_ref_code", generatedCode);
          } else {
            localStorage.setItem("my_generated_ref_code", uData.refCode);
          }
        }
      }).catch((err) => console.error("Error creating/getting user doc:", err));
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
          instructions: data.instructions?.length > 0 ? data.instructions : ["Open the link.", "Complete the requirements.", "Upload proof."],
          proofRequirements: data.proof_requirements || "Screenshot showing completion.",
          link: data.task_link,
          expiryHours: data.expiry_hours || 24,
          isUserCreated: !!(activeAddress && data.created_by_wallet && data.created_by_wallet.toLowerCase() === activeAddress),
          proofType: data.proof_type,
          createdByWallet: data.created_by_wallet,
          status: data.status || "active",
          expiresAt: data.expires_at || null,
          createdAt: data.created_at || null,
          updatedAt: data.updated_at || null,
        });
      });
      setTasks(loadedTasks);
      setIsLoadingTasks(false);
    }, (err) => {
      console.error("Error loading tasks:", err);
      setIsLoadingTasks(false);
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
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        wallet: d.id,
        displayName: d.data().displayName || "",
        email: d.data().email || "",
        joinedAt: d.data().created_at || d.data().updated_at || "",
        balance: d.data().balance || 0,
        tasksCompleted: d.data().tasks_completed || 0,
        ...d.data()
      }));
      list.sort((a, b) => (new Date(b.joinedAt || 0).getTime() || 0) - (new Date(a.joinedAt || 0).getTime() || 0));
      setAllUsers(list);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeSubs();
      unsubscribeAdmin();
      unsubscribeUsers();
    };
  }, []);

  const getExplorerUrl = (cid: number): string => {
    if (cid === 42220) return "https://celo.blockscout.com";
    if (cid === 44787) return "https://alfajores-blockscout.celo-testnet.org";
    if (cid === 11142220) return "https://celo-sepolia.blockscout.com";
    return "https://celo.blockscout.com";
  };

  // Fetch Live On-Chain Contract Statistics via Blockscout API
  useEffect(() => {
    const fetchOnchainStats = async () => {
      setIsLoadingOnchainStats(true);
      try {
        const explorerUrl = getExplorerUrl(chainId);
        const contractAddress = getEscrowAddress(chainId);
        
        if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
          const res = await fetch(`${explorerUrl}/api/v2/addresses/${contractAddress}/transactions`);
          if (res.ok) {
            const json = await res.json();
            const items = json.items || [];
            setOnchainTxCount(items.length);
            
            const uniqueUsers = new Set<string>();
            items.forEach((tx: any) => {
              if (tx.from && tx.from.hash) uniqueUsers.add(tx.from.hash.toLowerCase());
              if (tx.to && tx.to.hash) uniqueUsers.add(tx.to.hash.toLowerCase());
            });
            setOnchainUsersCount(uniqueUsers.size);
          }
        }
      } catch (err) {
        console.error("Error fetching live on-chain statistics:", err);
      } finally {
        setIsLoadingOnchainStats(false);
      }
    };

    if (screen === "main" && activeTab === "profile") {
      fetchOnchainStats();
      fetchOnchainFees();
    }
  }, [screen, activeTab, chainId]);

  // Fetch On-Chain Fees Collected (2% platform fee from escrow contract)
  const fetchOnchainFees = async () => {
    setIsLoadingOnchainFees(true);
    try {
      const explorerUrl = getExplorerUrl(chainId);
      const contractAddress = getEscrowAddress(chainId);
      
      if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
        let totalVolume = 0;
        
        const tokenTransfersRes = await fetch(`${explorerUrl}/api/v2/addresses/${contractAddress}/token-transfers`);
        if (tokenTransfersRes.ok) {
          const tokenJson = await tokenTransfersRes.json();
          const tokenItems = tokenJson.items || [];
          
          const usdmAddr = getUsdmAddress(chainId).toLowerCase();
          
          for (const transfer of tokenItems) {
            if (transfer.to?.hash?.toLowerCase() === contractAddress.toLowerCase() && 
                transfer.token?.address?.toLowerCase() === usdmAddr) {
              const value = parseFloat(formatEther(BigInt(transfer.total?.value || transfer.value || "0")));
              totalVolume += value;
            }
          }
        }
        
        // Correct fee: contract receives total = budget + fee, where fee = budget * 2%
        // So fee = totalVolume * 2 / 102
        const feesCollected = totalVolume * PLATFORM_FEE_PERCENTAGE / (100 + PLATFORM_FEE_PERCENTAGE);
        setOnchainFeesCollected(parseFloat(feesCollected.toFixed(2)));
      }
    } catch (err) {
      console.error("Error fetching live on-chain fees:", err);
    } finally {
      setIsLoadingOnchainFees(false);
    }
  };

  // Real-time listener for current user document to track balance
  useEffect(() => {
    if (!activeAddress) {
      setDbUserBalance(0);
      setDbUserProfile(null);
      return;
    }
    const userDocRef = doc(db, "users", activeAddress);
    const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const uData = docSnap.data();
        setDbUserBalance(uData.balance || 0);

        // Check if suspended, and if the lock period has expired (auto XP boost/reset)
        if (uData.lockUntil) {
          const lockTime = new Date(uData.lockUntil).getTime();
          if (Date.now() >= lockTime) {
            const oldXp = uData.xp || 500;
            const newXp = Math.max(350, oldXp + 50);
            await updateDoc(userDocRef, {
              lockUntil: null,
              consecutiveRejections: 0,
              xp: newXp,
              updated_at: new Date().toISOString()
            });
            return;
          }
        }

        setDbUserProfile(uData);
      } else {
        setDbUserBalance(0);
        setDbUserProfile(null);
      }
    });
    return () => unsubscribeUser();
  }, [activeAddress]);

  // Prompt email modal if user has no registered email
  useEffect(() => {
    if (
      activeAddress &&
      dbUserProfile !== null &&
      !dbUserProfile.email &&
      !sessionStorage.getItem(`tezra_email_prompt_dismissed_${activeAddress.toLowerCase()}`)
    ) {
      setShowEmailModal(true);
    }
  }, [activeAddress, dbUserProfile]);

  // Load referred users list for active wallet address
  useEffect(() => {
    if (!activeAddress) {
      setReferredUsers([]);
      return;
    }
    const q = query(collection(db, "users"), where("referredBy", "==", activeAddress.toLowerCase()));
    const unsubscribeReferred = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data());
      });
      setReferredUsers(users);
    });
    return () => unsubscribeReferred();
  }, [activeAddress]);

  // Real-time synchronization of global Referral Contest configuration
  useEffect(() => {
    const docRef = doc(db, "admin", "referral_contest");
    const unsubscribeContest = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setContestConfig(data);
      } else {
        setContestConfig({
          status: "idle",
          startTime: null,
          endTime: null,
          prizePool: 20,
          winnersCount: 3,
          durationDays: 7
        });
      }
    });
    return () => unsubscribeContest();
  }, []);

  // Real-time synchronization of contest leaderboard participants
  useEffect(() => {
    if (!contestConfig || contestConfig.status === "idle") {
      setContestLeaderboard([]);
      return;
    }
    const q = query(collection(db, "users"), where("contestRegistered", "==", true));
    const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
      const participants: any[] = [];
      snapshot.forEach((docSnap) => {
        const uData = docSnap.data();
        if (uData.wallet_address?.toLowerCase() !== PLATFORM_ESCROW_WALLET.toLowerCase()) {
          participants.push(uData);
        }
      });
      if (contestConfig.status === "coming_soon") {
        participants.sort((a, b) => {
          const nameA = (a.username || a.displayName || a.wallet_address || "").toLowerCase();
          const nameB = (b.username || b.displayName || b.wallet_address || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      } else {
        participants.sort((a, b) => (b.contestReferralEarnings || 0) - (a.contestReferralEarnings || 0));
      }
      setContestLeaderboard(participants);
    });
    return () => unsubscribeLeaderboard();
  }, [contestConfig]);

  // Persist contest details screen state across refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("tezra_show_contest_details", showContestDetailsScreen ? "true" : "false");
      sessionStorage.setItem("tezra_contest_details_tab", contestDetailsTab);
    }
  }, [showContestDetailsScreen, contestDetailsTab]);

  // Alert popup triggers for contest registration on app load
  useEffect(() => {
    if (!activeAddress || !contestConfig || contestConfig.status === "idle") {
      setShowContestPopup(false);
      return;
    }
    if (dbUserProfile && !dbUserProfile.contestRegistered) {
      const dismissed = sessionStorage.getItem(`tezra_contest_${contestConfig.status}_dismissed`);
      if (!dismissed) {
        setShowContestPopup(true);
      }
    }
  }, [activeAddress, contestConfig, dbUserProfile]);

  // Dynamic helper to compute referral statistics
  const getReferralStats = () => {
    let totalEarnings = 0;
    const details = referredUsers.map((ru) => {
      const addressLower = (ru.wallet_address || "").toLowerCase();
      const hasCompletedTask = (ru.tasks_completed || 0) > 0;
      const hasCreatedCampaign = tasks.some(t => (t.createdByWallet || "").toLowerCase() === addressLower);
      
      let earned = 0;
      if (hasCompletedTask) earned += 0.02;
      if (hasCreatedCampaign) earned += 0.10;
      
      totalEarnings += earned;
      return {
        wallet: ru.wallet_address || "unknown",
        tasksCompleted: ru.tasks_completed || 0,
        hasCreatedCampaign,
        earned
      };
    });
    return {
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      count: referredUsers.length,
      details
    };
  };

  // Dynamic transaction history ledger builder
  const getTransactionLedger = () => {
    const ledger: any[] = [];
    const addressLower = (activeAddress || "").toLowerCase();

    // 1. Task Payouts Approved (Inflows)
    history.forEach((sub) => {
      if (sub.status === "approved") {
        const val = parseFloat(sub.amount.replace(/[^\d.]/g, "")) || 0;
        ledger.push({
          id: `payout-${sub.id}`,
          type: "inflow",
          title: "Task Completion Payout",
          amount: val,
          date: sub.date || new Date().toISOString().split("T")[0],
          meta: sub.taskTitle,
          status: "completed"
        });
      }
    });

    // 2. Referral Rewards (Inflows)
    referredUsers.forEach((ru) => {
      const ruAddress = (ru.wallet_address || "").toLowerCase();
      const hasCompleted = (ru.tasks_completed || 0) > 0;
      const hasCreated = tasks.some(t => (t.createdByWallet || "").toLowerCase() === ruAddress);

      if (hasCompleted) {
        ledger.push({
          id: `ref-task-${ruAddress}`,
          type: "inflow",
          title: "Referral Bonus (First Task)",
          amount: 0.02,
          date: ru.created_at ? ru.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
          meta: `Friend: ${formatAddress(ruAddress)}`,
          status: "completed"
        });
      }
      if (hasCreated) {
        ledger.push({
          id: `ref-camp-${ruAddress}`,
          type: "inflow",
          title: "Referral Bonus (First Campaign)",
          amount: 0.10,
          date: ru.created_at ? ru.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
          meta: `Friend: ${formatAddress(ruAddress)}`,
          status: "completed"
        });
      }
    });

    // 3. Campaigns Created/Funded (Outflows & Escrow Refunds)
    tasks.forEach((t) => {
      if ((t.createdByWallet || "").toLowerCase() === addressLower) {
        const amt = parseFloat(t.amount.replace(/[^\d.]/g, "")) || 0.05;
        const slots = t.slotsTotal || 0;
        const budget = amt * slots;
        const fee = budget * 0.02;
        const totalCost = budget + fee;

        ledger.push({
          id: `campaign-${t.id}`,
          type: "outflow",
          title: t.status === "reopened" ? "Reopened Campaign Escrow" : "Launched Campaign Escrow",
          amount: totalCost,
          date: t.expiresAt ? new Date(new Date(t.expiresAt).getTime() - (t.expiryHours || 24) * 3600 * 1000).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          meta: t.title,
          status: t.status === "pending_payment" ? "pending" : "completed"
        });

        if (t.status === "refunded") {
          const slotsLeft = t.slotsRemaining || 0;
          const refundAmount = amt * slotsLeft;
          
          ledger.push({
            id: `refund-${t.id}`,
            type: "inflow",
            title: "Escrow Refund (Unclaimed Slots)",
            amount: refundAmount,
            date: t.updatedAt ? t.updatedAt.split("T")[0] : new Date().toISOString().split("T")[0],
            meta: `Refund for: ${t.title}`,
            status: "completed"
          });
        }
      }
    });

    // 4. Withdrawals Requested (Outflows)
    withdrawals.forEach((w) => {
      const wWorker = (w.workerAddress || w.wallet_address || "").toLowerCase();
      if (wWorker === addressLower) {
        const val = typeof w.amount === "number" ? w.amount : (parseFloat(w.amount.replace(/[^\d.]/g, "")) || 0);
        ledger.push({
          id: `withdrawal-${w.id || w.createdAt || w.created_at}`,
          type: "outflow",
          title: "Withdrawal Request",
          amount: val,
          date: w.createdAt ? w.createdAt.split("T")[0] : (w.created_at ? w.created_at.split("T")[0] : new Date().toISOString().split("T")[0]),
          meta: w.status === "completed" ? `Tx: ${formatAddress(w.transaction_hash || "")}` : "Awaiting Admin Release",
          status: w.status // "pending" | "completed" | "rejected"
        });
      }
    });

    // Sort chronologically (newest first)
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Compute totals
    let totalInflow = 0;
    let totalOutflow = 0;

    ledger.forEach((item) => {
      if (item.status === "completed" || item.status === "approved" || item.status === "active") {
        if (item.type === "inflow") totalInflow += item.amount;
        if (item.type === "outflow") totalOutflow += item.amount;
      }
    });

    return {
      items: ledger,
      totalInflow: parseFloat(totalInflow.toFixed(2)),
      totalOutflow: parseFloat(totalOutflow.toFixed(2)),
      netBalance: parseFloat((totalInflow - totalOutflow).toFixed(2))
    };
  };

  // Load withdrawals (Admin loads all, regular users load their own)
  useEffect(() => {
    if (!activeAddress) {
      setWithdrawals([]);
      return;
    }
    const isAdmin = activeAddress.toLowerCase() === PLATFORM_ESCROW_WALLET.toLowerCase();
    const q = isAdmin 
      ? collection(db, "withdrawals")
      : query(collection(db, "withdrawals"), where("wallet_address", "==", activeAddress.toLowerCase()));

    const unsubscribeWithdrawals = onSnapshot(q, (snapshot) => {
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
              const newSlotsRemaining = Math.max(0, tk.slotsRemaining - 1);
              await updateDoc(taskRef, {
                slots_remaining: newSlotsRemaining,
                updated_at: new Date().toISOString()
              });
              if (newSlotsRemaining === 0) {
                const creatorWallet = tk.createdByWallet;
                if (creatorWallet) {
                  const creatorUserRef = doc(db, "users", creatorWallet.toLowerCase());
                  const creatorSnap = await getDoc(creatorUserRef);
                  if (creatorSnap.exists()) {
                    const cData = creatorSnap.data();
                    const currentBadges = cData.badges || {};
                    if (!currentBadges.sold_out) {
                      const tasksSnap = await getDocs(collection(db, "tasks"));
                      const soldOutNonAdminTasks = tasksSnap.docs.filter(
                        (d) => d.data().slots_remaining === 0 && d.id !== tk.id && d.data().createdByWallet?.toLowerCase() !== PLATFORM_ESCROW_WALLET.toLowerCase()
                      );
                      if (soldOutNonAdminTasks.length === 0) {
                        currentBadges.sold_out = new Date().toISOString();
                        await updateDoc(creatorUserRef, { badges: currentBadges });
                        if (cData.email) {
                          fetch("/api/send-email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "badge_unlock",
                              payload: {
                                toEmail: cData.email,
                                badgeName: "Sold Out",
                                badgeEmoji: "✅",
                                badgeDescription: "First creator to get all slots filled in a campaign",
                                xpReward: 150,
                              },
                            }),
                          }).catch(err => console.error("Failed to send sold out email:", err));
                        }
                      }
                    }
                  }
                }
              }
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

            await updateWorkerGamification(sub.workerAddress, true, sub.date);
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
    let totalEarned = approved.reduce((acc, curr) => {
      const val = parseFloat(curr.amount.split(" ")[0]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    // Sum referral rewards
    referredUsers.forEach((ru) => {
      const ruAddress = (ru.wallet_address || "").toLowerCase();
      const hasCompletedTask = (ru.tasks_completed || 0) > 0;
      const hasCreatedCampaign = tasks.some(t => (t.createdByWallet || "").toLowerCase() === ruAddress);
      
      if (hasCompletedTask) totalEarned += 0.02;
      if (hasCreatedCampaign) totalEarned += 0.10;
    });

    return {
      completed: approved.length,
      earnings: `${totalEarned.toFixed(2)} USDm`
    };
  }, [history, referredUsers, tasks]);

  // Filter chips list — arranged by the v2.1 task categories
  const filterChips = ["All", ...Object.values(TASK_CATEGORIES).map((c) => c.label)];

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
    
    // Filter by category chip
    if (activeFilter !== "All") {
      const activeCategory = Object.values(TASK_CATEGORIES).find((c) => c.label === activeFilter);
      if (activeCategory) {
        const allowedPlatforms = activeCategory.platforms;
        result = result.filter((t) => allowedPlatforms.includes(t.platform.toLowerCase() as Platform));
      } else {
        result = [];
      }
    }

    // Sort
    return [...result].sort((a, b) => {
      const valA = parseFloat(a.amount.split(" ")[0]);
      const valB = parseFloat(b.amount.split(" ")[0]);
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime() || 0;
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime() || 0;
      
      switch (sortBy) {
        case "payout-desc":
          return valB - valA;
        case "payout-asc":
          return valA - valB;
        case "recency-desc":
          return timeB - timeA;
        case "recency-asc":
          return timeA - timeB;
        default:
          return 0;
      }
    });
  }, [tasks, activeFilter, sortBy, wagmiAddress, creatorSubmissions]);

  // Function to resolve platform icons (includes Facebook & LinkedIn)
  const getPlatformIcon = (platform: Platform, className = "w-5 h-5") => {
    const key = (platform || "").toLowerCase();
    switch (key) {
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
      case "content":
        return <FileText className={`${className} text-violet-600`} />;
      case "community":
        return <Users className={`${className} text-teal-600`} />;
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
      
      if (isMinipay && !isConnectingWallet) {
        setIsConnectingWallet(true);
        try {
          // Force account initialization directly before syncing with Wagmi
          await win.ethereum.request({ method: "eth_requestAccounts" });
          
          // Add USDm token to MetaMask for MiniPay users
          await addUsdmToMetaMask();
          
          const injectedConnector = connectors.find((c) => c.type === "injected") || connectors.find((c) => c.id === "injected") || connectors[0];
          if (injectedConnector) {
            await connectAsync({ connector: injectedConnector });
            // Small delay to ensure connection is fully established
            setTimeout(() => {
              action();
              setIsConnectingWallet(false);
            }, 300);
          } else {
            alert("Injected wallet connector not found.");
            setIsConnectingWallet(false);
          }
        } catch (err: any) {
          console.error("Manual connection failed in MiniPay", err);
          // Check if it's a user rejection
          if (err?.code === 4001 || err?.message?.includes("rejected")) {
            alert("Please approve the connection request in MiniPay to continue.");
          }
          setIsConnectingWallet(false);
        }
      } else {
        if (openConnectModal) {
          openConnectModal();
        } else {
          const injectedConnector = connectors.find((c) => c.type === "injected") || connectors.find((c) => c.id === "injected");
          if (injectedConnector) {
            await connectAsync({ connector: injectedConnector });
          }
        }
      }
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  };

  // Add USDm token to MetaMask wallet for proper display
  const addUsdmToMetaMask = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      const usdmAddr = getUsdmAddress(chainId);
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: usdmAddr,
            symbol: "USDm",
            decimals: 18,
            image: "https://celo.org/images/mip-map/usdm.png"
          }
        }
      });
      console.log("USDm token added to MetaMask");
    } catch (err) {
      console.log("Could not add USDm to MetaMask (user may have rejected or already added):", err);
    }
  };

  // Scan blockchain for USDm transaction to escrow wallet
  const scanForUsdmTransaction = async (expectedAmount: string, expectedRecipient: string, userAddress: string): Promise<{ found: boolean; txHash?: string; actualAmount?: string }> => {
    if (typeof window === "undefined") return { found: false };
    
    const explorerUrl = chainId === 42220 
      ? "https://celo.blockscout.com" 
      : chainId === 44787
        ? "https://celo-sepolia.blockscout.com"
        : "https://celo-sepolia.blockscout.com";
    
    const usdmAddr = getUsdmAddress(chainId).toLowerCase();
    const recipientLower = expectedRecipient.toLowerCase();
    const expectedAmountWei = parseEther(expectedAmount);
    
    try {
      // Fetch recent token transfers to the escrow wallet
      const res = await fetch(`${explorerUrl}/api/v2/addresses/${recipientLower}/token-transfers?limit=50`);
      if (!res.ok) throw new Error("Failed to fetch token transfers");
      
      const json = await res.json();
      const transfers = json.items || [];
      
      // Look for USDm transfers from user to escrow within last few minutes
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      
      for (const transfer of transfers) {
        const transferTime = new Date(transfer.timestamp).getTime();
        if (transferTime < fiveMinutesAgo) continue;
        
        const fromAddr = transfer.from?.hash?.toLowerCase();
        const toAddr = transfer.to?.hash?.toLowerCase();
        const tokenAddr = transfer.token?.address?.toLowerCase();
        const value = transfer.total?.value || transfer.value || "0";
        
        if (
          fromAddr === userAddress.toLowerCase() &&
          toAddr === recipientLower &&
          tokenAddr === usdmAddr
        ) {
          const actualAmount = formatEther(BigInt(value));
          // Allow small tolerance for gas/fees
          const expectedNum = parseFloat(expectedAmount);
          const actualNum = parseFloat(actualAmount);
          if (Math.abs(actualNum - expectedNum) < 0.01) { // 0.01 USDm tolerance
            return { found: true, txHash: transfer.transaction_hash, actualAmount };
          }
        }
      }
      
      return { found: false };
    } catch (err) {
      console.error("Error scanning for transaction:", err);
      return { found: false };
    }
  };

  // Relaunch wallet for retry - go back to deposit confirmation to retry
  const relaunchWallet = async () => {
    setActiveTransaction((prev) => prev ? {
      ...prev,
      status: "confirm-deposit"
    } : null);
    setIsDepositing(false);
  };

  // Launch Korapay Checkout inline modal
  const payWithKorapay = () => {
    if (!activeTransaction || !pendingTxData?.newTask) return;
    const task = pendingTxData.newTask;
    const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
    const baseNairaAmount = Math.round(amountNum * USDM_TO_NGN_RATE);
    
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
          name: "Tezra Creator",
          email: "creator@tezra.xyz"
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

    const taskId = (isReopening && reopeningTaskId) ? reopeningTaskId : doc(collection(db, "tasks")).id;
    const newTask: Task = {
      id: taskId,
      platform: createTaskForm.platform,
      title: createTaskForm.title,
      amount: `${payoutValue.toFixed(2)} USDm`,
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
    const credit = useWelcomeCredit ? (dbUserProfile?.taskCredit || 0) : 0;
    const total = Math.max(0, budget + fee - credit);

    if (isReopening && reopeningTaskId) {
      const orig = tasks.find(t => t.id === reopeningTaskId);
      if (orig) {
        const leftoverSlots = orig.slotsRemaining || 0;
        const rewardAmt = parseFloat(orig.amount.replace(/[^\d.]/g, "")) || 0.05;
        const leftoverEscrow = leftoverSlots * rewardAmt;
        // Reopening does not re-collect the platform fee — the fee was already charged
        // at the original deposit, so the full leftover escrow is usable.
        const usableEscrow = parseFloat(leftoverEscrow.toFixed(2));
        
        const newBudget = parseFloat((payoutValue * slotsValue).toFixed(2));
        if (newBudget > usableEscrow) {
          alert(`Your new campaign budget (${newBudget.toFixed(2)} USDm) exceeds the usable escrow balance (${usableEscrow.toFixed(2)} USDm). Please reduce slots or payout to fit within your usable escrow.`);
          return;
        }

        try {
          setPendingTxData({ newTask });
          await updateDoc(doc(db, "tasks", orig.id), {
            status: "active",
            slots_remaining: slotsValue,
            total_slots: (orig.slotsTotal || 0) + slotsValue,
            expires_at: new Date(Date.now() + expiryHours * 3600 * 1000).toISOString(),
            expiry_hours: expiryHours,
            updated_at: new Date().toISOString()
          });
          
          setPendingTxData(null);
          setIsReopening(false);
          setReopeningTaskId(null);
          
          setActiveTransaction({
            status: "success",
            title: newTask.title,
            amount: `${newBudget.toFixed(2)} USDm`,
            txHash: undefined,
            onClose: () => {
              setActiveTransaction(null);
            }
          });
        } catch (err: any) {
          console.error("Reopen task failed:", err);
          alert("Failed to reopen task: " + (err.message || err));
          setPendingTxData(null);
          setActiveTransaction(null);
        }
        return;
      }
    }

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
          amount: `${total.toFixed(2)} USDm`,
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
      amount: `${total.toFixed(2)} USDm`,
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
      instructions: newTask.instructions,
      proof_requirements: newTask.proofRequirements,
      status: newTask.status || "active",
      created_by_wallet: activeAddress || "unknown",
      expires_at: new Date(Date.now() + (newTask.expiryHours || 24) * 3600 * 1000).toISOString(),
      expiry_hours: newTask.expiryHours || 24,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_budget: parseFloat(newTask.amount.replace(/[^\d.]/g, "")) * newTask.slotsTotal,
      transaction_hash: activeTransaction?.txHash || (newTask as any).transactionHash || "0x",
      payout_currency: "USDm"
    };

    try {
      await setDoc(doc(db, "tasks", newTask.id), taskData);

      // Genesis Creator Badge & Referral Reward Logic
      try {
        if (activeAddress) {
          const userDocRef = doc(db, "users", activeAddress.toLowerCase());
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            const uData = userSnap.data();
            
            // Deduct taskCredit if user has credit
            if (uData.taskCredit && uData.taskCredit > 0) {
              const totalCost = taskData.total_budget;
              const creditUsed = Math.min(totalCost, uData.taskCredit);
              const updatedCredit = parseFloat((uData.taskCredit - creditUsed).toFixed(2));
              await updateDoc(userDocRef, {
                taskCredit: updatedCredit
              });
              setDbUserProfile((prev: any) => prev ? { ...prev, taskCredit: updatedCredit } : null);
              console.log(`Deducted task credit by ${creditUsed}. Remaining: ${updatedCredit}`);
            }

            const tasksSnap = await getDocs(collection(db, "tasks"));
            
            // 1. Genesis Creator Badge Check
            if (activeAddress.toLowerCase() !== PLATFORM_ESCROW_WALLET.toLowerCase()) {
              const nonAdminTasks = tasksSnap.docs.filter(
                (d) => d.data().createdByWallet?.toLowerCase() !== PLATFORM_ESCROW_WALLET.toLowerCase() && d.id !== newTask.id
              );
              if (nonAdminTasks.length === 0) {
                const currentBadges = uData.badges || {};
                if (!currentBadges.genesis_creator) {
                  currentBadges.genesis_creator = new Date().toISOString();
                  await updateDoc(userDocRef, { badges: currentBadges });
                  if (uData.email) {
                    fetch("/api/send-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "badge_unlock",
                        payload: {
                          toEmail: uData.email,
                          badgeName: "Genesis Creator",
                          badgeEmoji: "🚀",
                          badgeDescription: "First user to launch a campaign on Celo Mainnet",
                          xpReward: 200,
                        },
                      }),
                    }).catch(err => console.error("Failed to send genesis creator email:", err));
                  }
                }
              }
            }

            // 2. Referral Payout Check (First task launch)
            if (uData.referredBy) {
              const advertiserTasks = tasksSnap.docs.filter(
                (d) => d.data().createdByWallet?.toLowerCase() === activeAddress.toLowerCase() && d.id !== newTask.id
              );
              if (advertiserTasks.length === 0) {
                const referrerRef = doc(db, "users", uData.referredBy.toLowerCase());
                await runTransaction(db, async (trans) => {
                  const refSnap = await trans.get(referrerRef);
                  if (refSnap.exists()) {
                    const refBalance = refSnap.data().balance || 0;
                    const refEarnings = refSnap.data().total_earnings || 0;

                    const contestConfigRef = doc(db, "admin", "referral_contest");
                    const contestConfigSnap = await trans.get(contestConfigRef);
                    let incrementContestEarnings = false;
                    if (contestConfigSnap.exists()) {
                      const cData = contestConfigSnap.data();
                      if (cData.status === "active" && refSnap.data().contestRegistered) {
                        incrementContestEarnings = true;
                      }
                    }

                    const updatePayload: any = {
                      balance: parseFloat((refBalance + 0.10).toFixed(2)),
                      total_earnings: parseFloat((refEarnings + 0.10).toFixed(2)),
                      updated_at: new Date().toISOString()
                    };
                    if (incrementContestEarnings) {
                      const currentContestEarnings = refSnap.data().contestReferralEarnings || 0;
                      updatePayload.contestReferralEarnings = parseFloat((currentContestEarnings + 0.10).toFixed(2));
                    }

                    trans.set(referrerRef, updatePayload, { merge: true });
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in Genesis/Referral checks on task creation:", err);
      }

      await setDoc(doc(db, "payments", `pay-${newTask.id}-${Date.now()}`), {
        task_id: newTask.id,
        wallet_address: activeAddress || "unknown",
        amount: taskData.total_budget,
        currency: "USDm",
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

      // Send task created email notification
      const creatorEmail = dbUserProfile?.email || "";
      if (creatorEmail) {
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "task_created",
            payload: {
              creatorEmail: creatorEmail,
              creatorWallet: activeAddress || "unknown",
              taskTitle: newTask.title,
              taskId: newTask.id,
              reward: newTask.amount,
              status: taskData.status,
              paymentMethod: (newTask as any).transactionHash === "welcome-credit" ? "Welcome Credit 🎁" : activeTransaction?.status || "wallet"
            }
          })
        }).catch((e) => console.error("Error sending task created email:", e));
      }

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
    setIsReopening(false);
  };

  // Load task ideas for admin review
  useEffect(() => {
    const isAdmin = wagmiAddress?.toLowerCase() === PLATFORM_ESCROW_WALLET.toLowerCase();
    if (!isAdmin) {
      setTaskIdeas([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "taskIdeas"),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setTaskIdeas(items);
      },
      (err) => console.error("Failed to load task ideas:", err)
    );
    return unsub;
  }, [wagmiAddress]);

  // Worker: submit a task idea
  const handleSubmitTaskIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaForm.title.trim() || !ideaForm.description.trim()) return;
    if (!activeAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsSubmittingIdea(true);
    try {
      const ideaId = doc(collection(db, "taskIdeas")).id;
      const ideaData: any = {
        kind: ideaForm.kind,
        title: ideaForm.title.trim(),
        description: ideaForm.description.trim(),
        suggested_payout: ideaForm.suggested_payout ? parseFloat(ideaForm.suggested_payout) : null,
        wallet_address: activeAddress,
        status: "pending",
        created_at: new Date().toISOString()
      };
      if (ideaForm.kind === "task") {
        ideaData.category = ideaForm.category;
      } else {
        ideaData.category = "category";
        ideaData.example_tasks = ideaForm.example_tasks.trim();
      }
      await setDoc(doc(db, "taskIdeas", ideaId), ideaData);
      setIdeaSubmitted(true);
      setIdeaForm({ kind: "task", title: "", description: "", category: "social", example_tasks: "", suggested_payout: "" });
    } catch (err: any) {
      console.error("Failed to submit task idea:", err);
      alert("Failed to submit your idea: " + (err.message || err));
    }
    setIsSubmittingIdea(false);
  };

  // Admin: reject a task idea
  const handleRejectIdea = async (idea: any) => {
    try {
      await updateDoc(doc(db, "taskIdeas", idea.id), {
        status: "rejected",
        reviewed_at: new Date().toISOString()
      });
      if (idea.wallet_address) {
        createNotification(
          idea.wallet_address,
          "system",
          "Task Idea Not Selected",
          `We reviewed your idea "${idea.title}" but it won't be launched right now. Keep them coming!`
        ).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to reject task idea:", err);
    }
  };

  // Admin: approve & launch a task idea — opens the confirm-deposit modal for funding
  const handleApproveIdea = async (idea: any) => {
    try {
      if (!idea) return;

      setLaunchingIdeaId(idea.id);
      await updateDoc(doc(db, "taskIdeas", idea.id), {
        status: "approved",
        reviewed_at: new Date().toISOString()
      });

      if (idea.kind === "category") {
        // Category ideas are accepted onto the platform roadmap — no campaign launch
        if (idea.wallet_address) {
          const userRef = doc(db, "users", idea.wallet_address.toLowerCase());
          const userSnap = await getDoc(userRef);
          let userEmail = "";
          if (userSnap.exists()) {
            const uData = userSnap.data();
            userEmail = uData.email || "";
            const currentCredit = uData.taskCredit || 0;
            await updateDoc(userRef, {
              taskCredit: parseFloat((currentCredit + 0.50).toFixed(2))
            });
          }

          createNotification(
            idea.wallet_address,
            "campaign_created",
            "Your Category Idea Was Accepted!",
            `Your suggested category "${idea.title}" has been accepted. You received a 0.50 USDm credit!`
          ).catch(() => {});

          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "task_idea_approved",
              payload: {
                toEmail: userEmail,
                ideaTitle: idea.title,
                kind: "category",
                recipientWallet: idea.wallet_address
              }
            })
          }).catch((e) => console.error("Error sending category idea approved email:", e));
        }
        setLaunchingIdeaId(null);
        return;
      }

      const platform = ideaLaunchForm.platform;
      const actions = ideaLaunchForm.actions.length > 0 ? ideaLaunchForm.actions : ["follow"];
      const base = getBasePrice(platform, actions);
      const slots = ideaLaunchForm.slots || 50;
      const taskId = doc(collection(db, "tasks")).id;

      const instList: string[] = ["Open the target link."];
      actions.forEach((actVal) => {
        const steps = ACTION_INSTRUCTIONS[actVal] || [];
        instList.push(...steps);
      });
      instList.push("Provide the required completion proof.");
      const proofList: string[] = [];
      actions.forEach((actVal) => {
        const proofs = ACTION_PROOF_PRESETS[actVal] || [];
        proofs.forEach((p) => { if (!proofList.includes(p)) proofList.push(p); });
      });

      const platformLabel = platform === "x" ? "X" : platform === "testing" ? "Beta Lab" : platform.charAt(0).toUpperCase() + platform.slice(1);
      const actionLabels = actions.map((a) => PLATFORM_ACTIONS[platform]?.find((x) => x.value === a)?.label || "").filter(Boolean);
      const title = actionLabels.length > 0
        ? (actionLabels.length === 1 ? `${actionLabels[0]} on ${platformLabel}` : `${actionLabels.slice(0, -1).join(", ")} & ${actionLabels[actionLabels.length - 1]} on ${platformLabel}`)
        : idea.title;

      const newTask: Task = {
        id: taskId,
        platform,
        title,
        amount: `${base.toFixed(2)} USDm`,
        description: idea.description || `Community idea: ${idea.title}`,
        type: platform === "testing" ? "Beta Lab" : platform === "survey" ? "Surveys & Quizzes" : platform === "content" ? "Writing & Content" : platform === "community" ? "Community & Groups" : "Social Engagement",
        slotsRemaining: slots,
        slotsTotal: slots,
        instructions: instList,
        proofRequirements: proofList.length > 0 ? proofList.join(" & ") : "Submit screenshot showing completion.",
        link: "https://celo.org",
        expiryHours: 24,
        isUserCreated: true,
        proofType: proofList.some((p) => p.toLowerCase().includes("recording")) ? "screen-recording" : "both"
      };

      setLaunchingIdeaId(idea.id);
      await updateDoc(doc(db, "taskIdeas", idea.id), {
        status: "approved",
        reviewed_at: new Date().toISOString()
      });
      if (idea.wallet_address) {
        const userRef = doc(db, "users", idea.wallet_address.toLowerCase());
        const userSnap = await getDoc(userRef);
        let userEmail = "";
        if (userSnap.exists()) {
          const uData = userSnap.data();
          userEmail = uData.email || "";
          const currentCredit = uData.taskCredit || 0;
          await updateDoc(userRef, {
            taskCredit: parseFloat((currentCredit + 0.50).toFixed(2))
          });
        }

        createNotification(
          idea.wallet_address,
          "campaign_created",
          "Your Task Idea Was Selected!",
          `Your idea "${idea.title}" is being launched. You received a 0.50 USDm credit!`
        ).catch(() => {});

        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "task_idea_approved",
            payload: {
              toEmail: userEmail,
              ideaTitle: idea.title,
              kind: "task",
              recipientWallet: idea.wallet_address
            }
          })
        }).catch((e) => console.error("Error sending task idea approved email:", e));
      }
      setLaunchingIdeaId(null);

      setPendingTxData({ newTask });
      setActiveTransaction({
        status: "confirm-deposit",
        title: newTask.title,
        amount: `${(base * slots).toFixed(2)} USDm`,
        onClose: () => {
          setActiveTransaction(null);
          setPendingTxData(null);
        }
      });
    } catch (err: any) {
      console.error("Failed to approve task idea:", err);
      alert("Failed to approve idea: " + (err.message || err));
      setLaunchingIdeaId(null);
    }
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
          fileUrl = await uploadToCloudinary(proofForm.screenshot);
        } 
        else if (proofForm.screenRecording) {
          fileUrl = await uploadToCloudinary(proofForm.screenRecording);
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

        // Send submission notification email to the task creator
        try {
          const creatorWallet = selectedTask.createdByWallet || (selectedTask as any).created_by_wallet;
          if (creatorWallet && creatorWallet !== "unknown") {
            const creatorDocRef = doc(db, "users", creatorWallet.toLowerCase());
            getDoc(creatorDocRef).then((creatorSnap) => {
              if (creatorSnap.exists()) {
                const creatorData = creatorSnap.data();
                if (creatorData.email) {
                  fetch("/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "submission_created",
                      payload: {
                        creatorEmail: creatorData.email,
                        taskTitle: selectedTask.title,
                        taskId: selectedTask.id
                      }
                    })
                  }).catch(err => console.error("Failed to send submission email to creator:", err));
                }
              }
            }).catch(e => console.error("Error reading creator profile for email:", e));
          }
        } catch (emailErr) {
          console.error("Error sending submission email notification:", emailErr);
        }

        // Update streak immediately on submission (not waiting for approval)
        await updateStreakOnSubmission(wagmiAddress.toLowerCase());

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
    const payoutStr = tk ? tk.amount : "1.50 USDm";
    
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
        const newSlotsRemaining = Math.max(0, tk.slotsRemaining - 1);
        await updateDoc(taskRef, {
          slots_remaining: newSlotsRemaining,
          updated_at: new Date().toISOString()
        });
        if (newSlotsRemaining === 0) {
          const creatorWallet = tk.createdByWallet;
          if (creatorWallet) {
            const creatorUserRef = doc(db, "users", creatorWallet.toLowerCase());
            const creatorSnap = await getDoc(creatorUserRef);
            if (creatorSnap.exists()) {
              const cData = creatorSnap.data();
              const currentBadges = cData.badges || {};
              if (!currentBadges.sold_out) {
                const tasksSnap = await getDocs(collection(db, "tasks"));
                const soldOutNonAdminTasks = tasksSnap.docs.filter(
                  (d) => d.data().slots_remaining === 0 && d.id !== tk.id && d.data().createdByWallet?.toLowerCase() !== PLATFORM_ESCROW_WALLET.toLowerCase()
                );
                if (soldOutNonAdminTasks.length === 0) {
                  currentBadges.sold_out = new Date().toISOString();
                  await updateDoc(creatorUserRef, { badges: currentBadges });
                  if (cData.email) {
                    fetch("/api/send-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "badge_unlock",
                        payload: {
                          toEmail: cData.email,
                          badgeName: "Sold Out",
                          badgeEmoji: "✅",
                          badgeDescription: "First creator to get all slots filled in a campaign",
                          xpReward: 150,
                        },
                      }),
                    }).catch(err => console.error("Failed to send sold out email:", err));
                  }
                }
              }
            }
          }
        }
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
          let workerEmail = "";
          await runTransaction(db, async (transaction) => {
            const workerDoc = await transaction.get(workerUserRef);
            if (workerDoc.exists()) {
              workerEmail = workerDoc.data().email || "";
            }
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
          await updateWorkerGamification(workerWallet, true, subDocSnap.data().date);

          // Send approval email (if email available) AND web push + in-app notification
          // to the worker — push must go out even when the worker has no email.
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "task_approval",
              payload: {
                workerEmail: workerEmail,
                workerWallet: workerWallet,
                taskTitle: tk?.title || "Tezra Task",
                reward: `${payoutVal.toFixed(2)} USDm`,
                approved: true
              }
            })
          }).catch(e => console.error("Error sending approval email to worker:", e));
          createNotification(
            workerWallet,
            "submission_approved",
            "Submission Approved!",
            `Your submission for "${tk?.title || "Tezra Task"}" was approved. You earned ${payoutVal.toFixed(2)} USDm!`
          ).catch((e) => console.error("Error creating approval notification:", e));
        }
      }

    } catch (err) {
      console.error("Firestore approve submission failed:", err);
    }
  };

  // Calculate if rejection rate cap is reached (Max 40% rejection rate for a task) - Disabled to allow free rejections
  const isRejectionCapReached = (taskId: string): boolean => {
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
      const subDocSnap = await getDoc(subRef);
      if (!subDocSnap.exists()) return;
      const workerWallet = subDocSnap.data().wallet_address;

      await updateDoc(subRef, {
        status: "rejected",
        rejection_category: category,
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewer_wallet: wagmiAddress?.toLowerCase() || "unknown"
      });

      if (workerWallet) {
        await updateWorkerGamification(workerWallet, false, subDocSnap.data().date);

        // Send rejection notification: email when available, web push + in-app always
        try {
          const workerUserRef = doc(db, "users", workerWallet.toLowerCase());
          const workerSnap = await getDoc(workerUserRef);
          let workerEmail = "";
          if (workerSnap.exists()) {
            workerEmail = workerSnap.data().email || "";
          }
          const tk = tasks.find((t) => t.id === subDocSnap.data().task_id);
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "task_approval",
              payload: {
                workerEmail: workerEmail,
                workerWallet: workerWallet,
                taskTitle: tk?.title || "Tezra Task",
                reward: tk ? tk.amount : "Reward",
                approved: false
              }
            })
          }).catch(e => console.error("Error sending rejection email to worker:", e));
          createNotification(
            workerWallet,
            "submission_rejected",
            "Submission Rejected",
            `Your submission for "${tk?.title || "Tezra Task"}" was rejected. Tap to view details.`
          ).catch((e) => console.error("Error creating rejection notification:", e));
        } catch (emailErr) {
          console.error("Error sending rejection email notification:", emailErr);
        }
      }

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

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    if (activeAddress) {
      localStorage.setItem(`opened_task_${activeAddress.toLowerCase()}`, Date.now().toString());
    }
    setScreen("task-details");
  };

  // Update streak immediately when user submits proof (not waiting for approval)
  const updateStreakOnSubmission = async (workerWallet: string) => {
    try {
      const workerRef = doc(db, "users", workerWallet.toLowerCase());
      await runTransaction(db, async (transaction) => {
        const workerSnap = await transaction.get(workerRef);
        if (!workerSnap.exists()) return;

        const data = workerSnap.data();
        let streakCount = data.streakCount !== undefined ? data.streakCount : 0;
        let lastCompletedDate = data.lastCompletedDate || "";
        let completedTodayCount = data.completedTodayCount || 0;
        let completedTodayDate = data.completedTodayDate || "";

        const todayStr = new Date().toISOString().split('T')[0];
        
        // Update streak
        if (lastCompletedDate) {
          const lastDate = new Date(lastCompletedDate);
          const todayDate = new Date(todayStr);
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            streakCount += 1;
          } else if (diffDays > 1) {
            streakCount = 1;
          }
        } else {
          streakCount = 1;
        }
        lastCompletedDate = todayStr;

        // Update completed today count
        if (completedTodayDate === todayStr) {
          completedTodayCount += 1;
        } else {
          completedTodayCount = 1;
          completedTodayDate = todayStr;
        }

        transaction.set(workerRef, {
          streakCount,
          lastCompletedDate,
          completedTodayCount,
          completedTodayDate,
          updated_at: new Date().toISOString()
        }, { merge: true });
      });
    } catch (e) {
      console.error("Error updating streak on submission:", e);
    }
  };

  const updateWorkerGamification = async (workerWallet: string, isApproval: boolean, submissionTime: string) => {
    try {
      const workerRef = doc(db, "users", workerWallet.toLowerCase());
      let workerEmail: string | null = null;
      let awardedSpeedRun = false;
      let awardedTaskMachine = false;
      let awardedPioneerEarner = false;

      await runTransaction(db, async (transaction) => {
        const workerSnap = await transaction.get(workerRef);
        if (!workerSnap.exists()) return;

        const data = workerSnap.data();
        workerEmail = data.email || null;
        let xp = data.xp !== undefined ? data.xp : 500;
        let consecutiveRejections = data.consecutiveRejections !== undefined ? data.consecutiveRejections : 0;
        let streakCount = data.streakCount !== undefined ? data.streakCount : 0;
        let lastCompletedDate = data.lastCompletedDate || "";
        let lockUntil = data.lockUntil || null;
        let totalEarnings = data.total_earnings || 0;
        let balance = data.balance || 0;
        let tasksCompleted = data.tasks_completed || 0;
        const badges = data.badges || {};

        if (isApproval) {
          xp += 10;
          consecutiveRejections = 0;

          // Check speed_run badge
          const openedKey = `opened_task_${workerWallet.toLowerCase()}`;
          const openedAtStr = typeof window !== "undefined" ? localStorage.getItem(openedKey) : null;
          if (openedAtStr) {
            const openedTime = parseInt(openedAtStr, 10);
            const subTime = new Date(submissionTime).getTime();
            if (subTime - openedTime < 3 * 60 * 1000 && !badges.speed_run) {
              badges.speed_run = new Date().toISOString();
              awardedSpeedRun = true;
            }
            if (typeof window !== "undefined") {
              localStorage.removeItem(openedKey);
            }
          }

          // Check task machine badge (20 tasks completed in a day)
          const todayDateStr = new Date().toISOString().split('T')[0];
          let completedToday = data.completedTodayCount || 0;
          let completedTodayDate = data.completedTodayDate || "";
          if (completedTodayDate === todayDateStr) {
            completedToday += 1;
          } else {
            completedToday = 1;
            completedTodayDate = todayDateStr;
          }
          if (completedToday >= 20 && !badges.task_machine) {
            badges.task_machine = new Date().toISOString();
            awardedTaskMachine = true;
          }

          // Check Pioneer Earner (total_earnings >= 10.0)
          if (totalEarnings >= 10.0 && !badges.pioneer_earner) {
            badges.pioneer_earner = new Date().toISOString();
            awardedPioneerEarner = true;
          }

          // Referral Reward: If worker completed their first task (tasksCompleted was 0 prior to this one, so tasksCompleted + 1 = 1)
          if (tasksCompleted === 0 && data.referredBy) {
            const referrerRef = doc(db, "users", data.referredBy.toLowerCase());
            const referrerSnap = await transaction.get(referrerRef);
            if (referrerSnap.exists()) {
              const refBalance = referrerSnap.data().balance || 0;
              const refEarnings = referrerSnap.data().total_earnings || 0;

              const contestConfigRef = doc(db, "admin", "referral_contest");
              const contestConfigSnap = await transaction.get(contestConfigRef);
              let incrementContestEarnings = false;
              if (contestConfigSnap.exists()) {
                const cData = contestConfigSnap.data();
                if (cData.status === "active" && referrerSnap.data().contestRegistered) {
                  incrementContestEarnings = true;
                }
              }

              const updatePayload: any = {
                balance: parseFloat((refBalance + 0.02).toFixed(2)),
                total_earnings: parseFloat((refEarnings + 0.02).toFixed(2)),
                updated_at: new Date().toISOString()
              };
              if (incrementContestEarnings) {
                const currentContestEarnings = referrerSnap.data().contestReferralEarnings || 0;
                updatePayload.contestReferralEarnings = parseFloat((currentContestEarnings + 0.02).toFixed(2));
              }

              transaction.set(referrerRef, updatePayload, { merge: true });
            }
          }

          transaction.set(workerRef, {
            xp,
            consecutiveRejections,
            badges,
            updated_at: new Date().toISOString()
          }, { merge: true });

        } else {
          // Rejection logic
          xp = Math.max(0, xp - 10);
          consecutiveRejections += 1;

          if (consecutiveRejections >= 3) {
            lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          }

          if (xp < 200) {
            lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          }

          transaction.set(workerRef, {
            xp,
            consecutiveRejections,
            lockUntil,
            updated_at: new Date().toISOString()
          }, { merge: true });
        }
      });

      if (awardedSpeedRun && workerEmail) {
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "badge_unlock",
            payload: {
              toEmail: workerEmail,
              badgeName: "Speed Run",
              badgeEmoji: "⚡",
              badgeDescription: "Submit proof within 3 minutes of opening a task",
              xpReward: 100,
            },
          }),
        }).catch(err => console.error("Failed to send speed run email:", err));
      }

      if (awardedTaskMachine && workerEmail) {
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "badge_unlock",
            payload: {
              toEmail: workerEmail,
              badgeName: "Task Machine",
              badgeEmoji: "🤖",
              badgeDescription: "Complete 20 tasks in a single day",
              xpReward: 200,
            },
          }),
        }).catch(err => console.error("Failed to send task machine email:", err));
      }

      if (awardedPioneerEarner && workerEmail) {
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "badge_unlock",
            payload: {
              toEmail: workerEmail,
              badgeName: "Pioneer Earner",
              badgeEmoji: "💰",
              badgeDescription: "Reach a total earnings of 10.00 USDm",
              xpReward: 250,
            },
          }),
        }).catch(err => console.error("Failed to send pioneer earner email:", err));
      }
    } catch (e) {
      console.error("Error updating worker gamification stats:", e);
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
      amount: `${payoutVal.toFixed(2)} USDm`,
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
  const handleRequestWithdrawal = async (amountToWithdraw: number) => {
    if (!wagmiAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    if (amountToWithdraw < 1.00) {
      alert("Minimum withdrawable amount is 1 USDm.");
      return;
    }
    if (amountToWithdraw > dbUserBalance) {
      alert("Withdrawable amount exceeds your current balance.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", wagmiAddress.toLowerCase());
      await updateDoc(userDocRef, {
        balance: parseFloat((dbUserBalance - amountToWithdraw).toFixed(2)),
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

      alert(`Withdrawal request of ${amountToWithdraw.toFixed(2)} USDm submitted successfully! It is pending platform admin payout.`);
    } catch (err: any) {
      console.error("Withdrawal request failed:", err);
      alert("Failed to submit withdrawal request: " + err.message);
    }
  };

  // Worker Action: Register/Join active Referral Contest
  const handleRegisterForContest = async () => {
    if (!activeAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const userRef = doc(db, "users", activeAddress.toLowerCase());
      await updateDoc(userRef, {
        contestRegistered: true,
        contestReferralEarnings: 0,
        updated_at: new Date().toISOString()
      });
      setShowContestPopup(false);
      if (contestConfig) {
        sessionStorage.setItem(`tezra_contest_${contestConfig.status}_dismissed`, "true");
      }
      alert("🎉 You are successfully registered for the Referral Contest! Start referring to earn bounties!");
    } catch (err: any) {
      console.error("Failed to register for contest:", err);
      alert("Registration failed: " + err.message);
    }
  };

  // Admin Action: Update global Referral Contest settings & status
  const handleUpdateContestConfig = async (status: "idle" | "coming_soon" | "active") => {
    try {
      const docRef = doc(db, "admin", "referral_contest");
      let startTime = null;
      let endTime = null;

      if (status === "active") {
        startTime = new Date().toISOString();
        endTime = new Date(Date.now() + adminContestDuration * 24 * 60 * 60 * 1000).toISOString();
      }

      await setDoc(docRef, {
        status,
        startTime,
        endTime,
        prizePool: adminContestPrize,
        winnersCount: 3,
        durationDays: adminContestDuration
      }, { merge: true });

      // If turning off/resetting, clear contest status on users
      if (status === "idle") {
        const usersSnap = await getDocs(collection(db, "users"));
        const batchPromises = usersSnap.docs
          .filter(d => d.data().contestRegistered || d.data().contestReferralEarnings)
          .map(d => updateDoc(doc(db, "users", d.id), {
            contestRegistered: false,
            contestReferralEarnings: 0
          }));
        await Promise.all(batchPromises);
      }

      alert(`Referral Contest status successfully updated to: ${status.toUpperCase()}`);
    } catch (err: any) {
      console.error("Failed to update contest:", err);
      alert("Failed to update contest: " + err.message);
    }
  };

  // Admin Action: Initiate On-chain Payout for Withdrawal Request
  const handleProcessWithdrawal = (withdrawal: any) => {
    setPendingTxData({ withdrawal });
    setActiveTransaction({
      status: "confirm-withdrawal",
      title: "Process Worker Withdrawal",
      amount: `${withdrawal.amount.toFixed(2)} USDm`,
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
      amount: `${refundVal.toFixed(2)} USDm`,
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

      const escrowContractAddress = getEscrowAddress(chainId);

      let txHash: `0x${string}` | undefined;

      // Execute on-chain smart contract refund
      if (escrowContractAddress && escrowContractAddress !== "0x0000000000000000000000000000000000000000") {
        const usdmAddr = getUsdmAddress(chainId);
        // Try every bytes32 encoding the platform has ever used to create on-chain campaigns
        const taskIdCandidates = [
          keccak256(toBytes(taskId)),
          stringToHex(taskId.slice(0, 31).padEnd(32, "\0")),
        ] as `0x${string}`[];

        let lastError: any = null;
        let refundedOnChain = false;

        for (const bytes32TaskId of taskIdCandidates) {
          try {
            const refundParams = {
              address: escrowContractAddress,
              abi: ESCROW_ABI,
              functionName: "refundCampaign" as const,
              args: [bytes32TaskId] as const,
              type: "legacy" as const,
              feeCurrency: usdmAddr,
            } as any;
            txHash = await (writeContractAsync as any)(refundParams);
            refundedOnChain = true;
            break;
          } catch (err: any) {
            lastError = err;
            // User rejection should not trigger the admin fallback
            if (String(err?.message || "").toLowerCase().includes("rejected")) {
              throw err;
            }
          }
        }

        // Fallback: Naira-funded campaigns have the admin as the on-chain advertiser,
        // so refund via the admin wallet server-side.
        if (!refundedOnChain) {
          try {
            const res = await fetch("/api/refund-task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              txHash = data.txHash;
              refundedOnChain = true;
            } else {
              throw new Error(data.error || "Refund failed via admin wallet");
            }
          } catch (apiErr: any) {
            throw new Error(
              lastError
                ? `${String(lastError.message || lastError).slice(0, 200)} — admin fallback also failed: ${apiErr.message}`
                : apiErr.message
            );
          }
        }
      } else {
        // Fallback for mock environment
        await new Promise((resolve) => setTimeout(resolve, 1500));
        txHash = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}` as `0x${string}`;
      }

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
        txHash
      } : null);

    } catch (err: any) {
      console.error("Smart contract refund failed:", err);
      alert("Refund failed: " + (err.message || err));
      setActiveTransaction(null);
      setPendingTxData(null);
    }
  };

  // Creator Action: Reopen Campaign
  const handleReopenTask = async (taskId: string) => {
    const tk = tasks.find((t) => t.id === taskId);
    if (!tk) return;

    const rewardNum = parseFloat(tk.amount.replace(/[^\d.]/g, "")) || 0.05;
    
    setCreateTaskForm({
      title: tk.title,
      platform: tk.platform || "x",
      description: tk.description || "",
      type: tk.type || "Social Follow",
      instructionsText: (tk.instructions || []).join("\n"),
      proofRequirements: tk.proofRequirements || "Submit screenshot showing completion.",
      link: tk.link || "https://celo.org",
      proofType: tk.proofType || "screenshot"
    });
    
    setPayoutValue(rewardNum);
    setPayoutInput(rewardNum.toFixed(2));
    // Default the form to the remaining (unclaimed) slots so reopening works without
    // manual recalculation. The budget check will still guard against increases.
    setSlotsValue(tk.slotsRemaining || 5);
    setSlotsInput(String(tk.slotsRemaining || 5));
    setExpiryHours(tk.expiryHours || 24);
    setIsReopening(true);
    setReopeningTaskId(taskId);

    const actions: string[] = [];
    const titleLower = tk.title.toLowerCase();
    if (titleLower.includes("follow") || titleLower.includes("subscribe")) {
      if (tk.platform === "youtube") actions.push("subscribe");
      else if (tk.platform === "linkedin") actions.push("follow_company");
      else if (tk.platform === "facebook") actions.push("follow_page");
      else actions.push("follow");
    }
    if (titleLower.includes("like")) actions.push("like");
    if (titleLower.includes("retweet") || titleLower.includes("repost")) actions.push("repost");
    if (titleLower.includes("comment")) actions.push("comment");
    if (titleLower.includes("star")) actions.push("github_star");
    if (titleLower.includes("fork")) actions.push("github_fork");
    if (titleLower.includes("watch")) actions.push("watch");
    
    if (actions.length === 0) {
      actions.push("follow");
    }
    setCheckedActions(actions);

    setScreen("create-task");
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

  const displayHandle = useMemo(() => {
    if (dbUserProfile?.displayName) {
      return dbUserProfile.displayName.startsWith("@") ? dbUserProfile.displayName : `@${dbUserProfile.displayName}`;
    }
    if (isMiniPayApp) return "Tezra Member";
    return `@${formatAddress(displayAddress)}`;
  }, [dbUserProfile?.displayName, isMiniPayApp, displayAddress]);

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
    <div className={screen === "splash" ? "w-full max-w-md mx-auto bg-[#FAFAFC] text-[#1E293B] flex flex-col relative shadow-xl font-sans border-x border-slate-100 h-screen max-h-screen overflow-hidden" : "w-full max-w-md mx-auto bg-[#FAFAFC] text-[#1E293B] flex flex-col relative shadow-xl font-sans border-x border-slate-100 min-h-screen overflow-x-hidden"}>
      
      {/* 1. SPLASH SCREEN */}
      {screen === "splash" && (
        <div className="fixed inset-x-0 top-0 bottom-0 z-50 max-w-md mx-auto bg-[#FAFAFC] flex flex-col items-center justify-between py-8 px-6 animate-fade-in overflow-hidden h-screen max-h-screen">
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Steady Logo (no bouncing) */}
            <div className="mb-6 p-4 bg-white rounded-3xl shadow-md border border-slate-50 flex items-center justify-center">
              <TezraLogo className="w-16 h-16 animate-pulse" />
            </div>
            
            {/* Tezra Gradient Text */}
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Tezra
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
              Version 2.1.1
            </span>
          </div>
        </div>
      )}

      {/* 2. MAIN NAVIGATION CONTAINER (HOME, HISTORY, PROFILE, ABOUT) */}
      {screen === "main" && (
        <div className="flex flex-col flex-grow pb-20">
          
          {/* HEADER */}
          <header className="h-14 bg-white/80 backdrop-blur-md sticky top-0 z-45 border-b border-slate-100 flex items-center justify-center px-4">
            <TezraLogo className="w-6 h-6" />
          </header>

          {showStreakReminder && (
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2.5 text-[10px] font-bold flex items-center justify-between shadow-md animate-fade-in z-40 sticky top-14">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="animate-pulse">🔥</span>
                <span className="truncate">Don't lose your {effectiveStreakCount}-day streak! Submit a task today.</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowStreakReminder(false)}
                className="ml-2 text-white/80 hover:text-white font-extrabold focus:outline-none"
              >
                Dismiss
              </button>
            </div>
          )}

          <main className="flex-1 px-4 pt-6">
            {/* TAB: AVAILABLE TASKS (HOME) */}
            {activeTab === "home" && (
              <div className="space-y-6">
                {isLoadingTasks && tasks.length === 0 ? (
                  /* TASKS LOADING ANIMATION — shown until the database sync finishes */
                  <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fade-in">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-bounce-short">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400/40 animate-ping-slow pointer-events-none" />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-black text-slate-900">Loading tasks...</p>
                      <p className="text-[10px] font-semibold text-slate-400">Connecting to the database</p>
                    </div>
                    {/* Skeleton cards */}
                    <div className="w-full space-y-4 mt-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 animate-pulse">
                          <div className="flex items-start justify-between gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                            <div className="flex-grow space-y-2">
                              <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                              <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                              <div className="h-2.5 bg-slate-50 rounded-full w-1/2" />
                            </div>
                            <div className="space-y-2 flex-shrink-0">
                              <div className="h-3 bg-emerald-100 rounded-full w-16" />
                              <div className="h-2.5 bg-slate-50 rounded-full w-12 ml-auto" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                            <div className="h-2.5 bg-slate-100 rounded-full w-20" />
                            <div className="h-7 bg-slate-100 rounded-lg w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                
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
                  <div className="flex items-center gap-2">
                    {/* In-App Notification Bell */}
                    <div className="relative">
                      <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className={`p-2.5 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm ${
                          notificationsOpen ? "ring-2 ring-blue-500/20 border-blue-200 bg-blue-50/10" : ""
                        }`}
                      >
                        <Bell className="w-4 h-4 text-slate-700" />
                        {appNotifications.filter((n) => !n.read).length > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                            {appNotifications.filter((n) => !n.read).length}
                          </span>
                        )}
                      </button>

                      {notificationsOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                          <div className="absolute right-0 top-12 w-[320px] max-h-[420px] overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-xl z-50 p-2.5 animate-fade-in space-y-1.5">
                            <div className="flex items-center justify-between px-2.5 py-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                Notifications
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  appNotifications.forEach((n) => {
                                    if (!n.read) {
                                      updateDoc(doc(db, "users", wagmiAddress!.toLowerCase(), "notifications", n.id), { read: true }).catch(() => {});
                                    }
                                  });
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                              >
                                Mark all read
                              </button>
                            </div>
                            {appNotifications.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-8 px-4">
                                No notifications yet. Approvals, rejections and rewards will show up here.
                              </p>
                            ) : (
                              appNotifications.map((n) => (
                                <button
                                  key={n.id}
                                  type="button"
                                  onClick={() => updateDoc(doc(db, "users", wagmiAddress!.toLowerCase(), "notifications", n.id), { read: true }).catch(() => {})}
                                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 transition-colors ${
                                    n.read ? "bg-transparent" : "bg-blue-50/60"
                                  } hover:bg-slate-50`}
                                >
                                  <span className="text-base leading-none mt-0.5">
                                    {getNotifIcon(n.type)}
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-[11px] font-bold text-slate-900">{n.title}</span>
                                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{n.message}</span>
                                    <span className="block text-[9px] text-slate-400 mt-1 font-medium">
                                      {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleString() : ""}
                                    </span>
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      )}
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
                  </div>

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
                    const chipCategory = Object.values(TASK_CATEGORIES).find((c) => c.label === chip);
                    const isNewChip = !!chipCategory?.isNew && new Date(NEW_FEATURE_UNTIL) > new Date();
                    return (
                      <button
                        key={chip}
                        onClick={() => setActiveFilter(chip)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 ${
                          isActive
                            ? "bg-slate-950 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        {chip}
                        {isNewChip && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${isActive ? "bg-emerald-400 text-emerald-950" : "bg-emerald-100 text-emerald-600"}`}>
                            New
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* EARN STRIP */}
                {filteredTasks.length > 0 && (() => {
                  const maxPayout = Math.max(...filteredTasks.map((t) => parseFloat(t.amount.replace(/[^\d.]/g, "")) || 0));
                  if (!isFinite(maxPayout) || maxPayout <= 0) return null;
                  return (
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-indigo-500/10">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Earn up to</p>
                        <p className="text-xl font-black text-white leading-tight mt-0.5">
                          ${maxPayout.toFixed(2)} USDm <span className="text-[10px] font-bold text-blue-200">per task</span>
                        </p>
                      </div>
                      <div className="bg-white/15 rounded-xl p-2.5">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  );
                })()}

                {/* TASK OF THE DAY */}
                {filteredTasks.length > 0 && (() => {
                  const todTask = [...filteredTasks].sort((a, b) =>
                    (parseFloat(b.amount.replace(/[^\d.]/g, "")) || 0) - (parseFloat(a.amount.replace(/[^\d.]/g, "")) || 0)
                  )[0];
                  return (
                    <div className="bg-slate-950 rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
                      onClick={() => handleAuthAction(() => handleSelectTask(todTask))}
                    >
                      <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl" />
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="px-2 py-0.5 bg-amber-400 text-amber-950 text-[9px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Task of the Day
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl flex-shrink-0">
                          {getPlatformIcon(todTask.platform, "w-5 h-5")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{todTask.title}</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1">{todTask.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-base font-black text-emerald-400 block">{formatCurrency(todTask.amount)}</span>
                          <span className="text-[9px] text-slate-400 font-semibold">{todTask.slotsRemaining} slots</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                            handleSelectTask(task);
                          }
                        })}
                        className="bg-white p-5 rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                      >
                        {isMyTask && (
                          <span className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500 text-white text-[8px] font-bold uppercase rounded-bl-lg tracking-wider">
                            My Task
                          </span>
                        )}
                        {(() => {
                          const payoutNum = parseFloat(task.amount.replace(/[^\d.]/g, ""));
                          return !isNaN(payoutNum) && payoutNum >= HIGH_PAYOUT_THRESHOLD ? (
                            <span className="absolute top-0 right-0 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black uppercase rounded-bl-lg tracking-wider flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> High Payout
                            </span>
                          ) : null;
                        })()}
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
                                    {currencyPreference === "NGN" ? `${val.toFixed(2)} USDm` : `~₦${Math.round(val * USDM_TO_NGN_RATE)}`}
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
                                  handleSelectTask(task);
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
                  </>
                )}
              </div>
            )}

            {/* TAB: EARN */}
            {activeTab === "earn" && (
              showContestDetailsScreen ? (
                <div className="space-y-5 animate-fade-in flex flex-col min-h-[70vh] pb-6">
                  {/* Back Header */}
                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowContestDetailsScreen(false)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl active:scale-95 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-700" />
                    </button>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Referral Champion Contest</h2>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Rules & Leaderboard</span>
                    </div>
                  </div>

                  {/* Countdown Timer Block */}
                  <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl shadow-sm text-white">
                    <CountdownTimer
                      targetTime={REFERRAL_CONTEST_END_MS}
                      phaseTargets={{ start: REFERRAL_CONTEST_START_MS, end: REFERRAL_CONTEST_END_MS }}
                      label="Contest ends in"
                      tone="dark"
                      showExpired="Referral Contest has ended"
                    />
                  </div>

                  {/* Two Tabs Selector */}
                  <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setContestDetailsTab("rules")}
                      className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        contestDetailsTab === "rules"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Contest Rules
                    </button>
                    <button
                      type="button"
                      onClick={() => setContestDetailsTab("leaderboard")}
                      className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        contestDetailsTab === "leaderboard"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Leaderboard ({contestLeaderboard.length})
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {contestDetailsTab === "rules" ? (
                    <div className="space-y-4 animate-fade-in">
                      
                      {/* Prizes & Benefits Card */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-blue-600" />
                          Rewards Pool:
                        </span>
                        <ul className="text-slate-500 text-xs font-semibold list-disc list-inside space-y-1.5 leading-relaxed pl-1">
                          <li>1st Place: <strong className="text-slate-900">10.00 USDm</strong> on-chain.</li>
                          <li>2nd & 3rd Place: <strong className="text-slate-900">5.00 USDm</strong> each on-chain.</li>
                          <li>Plus free task creation credits, welcome bonuses, and public recognition!</li>
                        </ul>
                      </div>

                      {/* Rules Details */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          Participation Rules:
                        </span>
                        <ul className="text-slate-500 text-xs font-semibold list-disc list-inside space-y-1.5 leading-relaxed pl-1">
                          <li>Only referrals completed after the contest starts count toward your score.</li>
                          <li>Earn +0.02 USDm for task completions, and +0.10 USDm for campaign launches by your invitees.</li>
                          <li><strong className="text-red-500">Requirements:</strong> You must have inputted your <span className="font-extrabold text-slate-800">Email</span> and <span className="font-extrabold text-slate-800">Username</span> in your Profile tab to qualify for rewards!</li>
                        </ul>
                      </div>

                      {/* Leaderboard Warning Alert */}
                      <div className="bg-amber-50/70 border border-amber-200/50 p-4 rounded-2xl text-[10px] text-amber-700 font-semibold leading-relaxed flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Leaderboard Notice:</strong> The leaderboard updates consistently and periodically to reflect on-chain verification and prevent sybil entries.
                        </span>
                      </div>

                      {/* Registration Action */}
                      <div className="pt-2">
                        {dbUserProfile?.contestRegistered ? (
                          <div className="w-full py-3.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            You are successfully registered for the contest!
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRegisterForContest}
                            disabled={!isUserConnected}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white disabled:text-slate-400 text-xs font-extrabold rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-center"
                          >
                            {isUserConnected ? "Register for Contest" : "Connect Wallet to Register"}
                          </button>
                        )}
                      </div>

                    </div>
                  ) : (
                    // Leaderboard Tab Content
                    <div className="space-y-4 animate-fade-in">
                      
                      {/* Warning on Leaderboard */}
                      <div className="bg-amber-50/70 border border-amber-200/50 p-3.5 rounded-2xl text-[10px] text-amber-700 font-semibold leading-relaxed flex gap-2 shadow-sm">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>
                          The leaderboard updates consistently and periodically to verify referral activity.
                        </span>
                      </div>

                      {/* Leaderboard Table / List */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Rank & Wallet</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Earnings</span>
                        </div>

                        <div className="divide-y divide-slate-50 max-h-[380px] overflow-y-auto">
                          {contestLeaderboard.length > 0 ? (
                            contestLeaderboard.map((user, idx) => {
                              const isMe = user.wallet_address?.toLowerCase() === activeAddress?.toLowerCase();
                              return (
                                <div key={idx} className={`px-4 py-3.5 flex items-center justify-between gap-3 text-xs ${isMe ? "bg-blue-50/20" : ""}`}>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                      idx === 0 ? "bg-amber-100 text-amber-800" :
                                      idx === 1 ? "bg-slate-100 text-slate-700" :
                                      idx === 2 ? "bg-orange-100 text-orange-800" :
                                      "bg-slate-50 text-slate-400"
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <span className="font-mono font-extrabold text-slate-800 block truncate text-[11px]">
                                        {user.username || user.displayName || `${user.wallet_address?.substring(0,6)}...${user.wallet_address?.substring(user.wallet_address.length - 4)}`}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-extrabold text-slate-900 text-right">
                                    {formatCurrencyVal(user.contestReferralEarnings || 0)}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-xs text-slate-400 font-semibold">
                              No participants registered yet.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Earn Rewards
                    </h2>
                    <p className="text-slate-500 text-xs font-semibold mt-0.5">
                      Participate in promotional campaigns and contests
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Campaign 1: Sign-up Reward & Certificate Share */}
                    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 flex items-center gap-1.5 bg-red-500/10 text-red-400 text-[10px] font-extrabold uppercase tracking-wider rounded-bl-2xl border-l border-b border-red-500/30">
                        Ended
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/15 border border-red-500/30 rounded-full text-red-400 text-[9px] font-black uppercase tracking-wider mb-3">
                        <span>Social Quest</span>
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-white">Membership Certificate Share</h3>
                      <p className="text-slate-300 text-xs mt-2 leading-relaxed font-medium">
                        Share your official <strong className="text-emerald-400">Tezra Member Certificate</strong> on X tagging <strong className="text-emerald-400">@earnwithtezra</strong> and <strong className="text-emerald-400">@0xTMB</strong>. This campaign has ended and winners will be announced soon!
                      </p>
                      <div className="mt-4">
                        <div className="text-[10px] text-red-400 font-extrabold uppercase tracking-wider bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                          Campaign Closed
                        </div>
                      </div>
                      <div className="flex gap-2.5 mt-5">
                        <button
                          onClick={() => {
                            if (!dbUserProfile?.displayName) {
                              setShowEmailModal(true);
                            } else {
                              setShowCertificate(true);
                            }
                          }}
                          className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold rounded-xl active:scale-95 transition-all text-center border border-slate-700/50"
                        >
                          View Certificate
                        </button>
                      </div>
                    </div>

                    {/* Campaign 2: Referral Contest */}
                    <div 
                      onClick={() => {
                        setContestDetailsTab("rules");
                        setShowContestDetailsScreen(true);
                      }}
                      className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer hover:border-slate-200 transition-all"
                    >
                      <div className="absolute top-0 right-0 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 text-[8px] font-extrabold uppercase tracking-wider rounded-bl-xl border-l border-b border-emerald-100 flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Active
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[9px] font-black uppercase tracking-wider mb-3">
                        <span>Leaderboard Campaign</span>
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900">Referral Champion Contest</h3>
                      <p className="text-slate-500 text-xs mt-2 leading-relaxed font-medium">
                        Invite your community to Tezra. Top 3 referrers with the highest active user submissions within the campaign window will share a reward pool of <strong className="text-blue-600">$20.00 USDm</strong>!
                      </p>
                      <div className="mt-4">
                        <CountdownTimer
                          targetTime={REFERRAL_CONTEST_END_MS}
                          phaseTargets={{ start: REFERRAL_CONTEST_START_MS, end: REFERRAL_CONTEST_END_MS }}
                          label="Contest ends in"
                          showExpired="Referral Contest has ended"
                        />
                      </div>
                      <div className="flex gap-2.5 mt-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContestDetailsTab("rules");
                            setShowContestDetailsScreen(true);
                          }}
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 uppercase tracking-wide"
                        >
                          <Trophy className="w-4 h-4" />
                          Contest Details
                        </button>
                      </div>
                    </div>

                    {/* Campaign 3: Badge Contest */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 bg-purple-50 text-purple-600 text-[10px] font-extrabold uppercase tracking-wider rounded-bl-2xl border-l border-b border-purple-100">
                        ⏳ Coming Soon
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-50 border border-purple-100 rounded-full text-purple-600 text-[9px] font-black uppercase tracking-wider mb-3">
                        <span>Collector Contest</span>
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900">Badge Collector Sprint</h3>
                      <p className="text-slate-500 text-xs mt-2 leading-relaxed font-medium">
                        Earn achievements, download your badge cards, and post them to X. The collector who gathers and shares the most achievements with proper tagging wins <strong className="text-purple-600">$15.00 USDm</strong>.
                      </p>
                      <button
                        disabled
                        className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 text-xs font-extrabold rounded-xl mt-5 cursor-not-allowed text-center"
                      >
                        Contest Locked
                      </button>
                    </div>
                  </div>
                </div>
              )
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
                            onClick={() => {
                              setProfileEditName(dbUserProfile?.displayName || "");
                              setProfileEditEmail(dbUserProfile?.email || "");
                              setProfileEditAvatar(null);
                              setProfileEditAvatarPreview(null);
                              setShowProfileEdit(true);
                            }}
                            className="px-3 py-2 bg-white border border-slate-100 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold whitespace-nowrap flex-shrink-0"
                          >
                            <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                            Edit Profile
                          </button>
                        </div>

                        {/* 1. Wallet Info Card */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 rounded-2xl text-white shadow-md space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">
                              Celo Wallet
                            </span>
                            <Wallet className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[11px] text-slate-500 font-medium block">Username</span>
                              <span className="text-sm font-bold block mt-0.5 select-all">
                                {displayHandle}
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

                        {/* 2. Wallet Balance Card */}
                        {(() => {
                          const totalEarningsNum = parseFloat(stats.earnings.split(" ")[0]) || 0;
                          const isWithdrawableUnlocked = totalEarningsNum >= 1.00;
                          const displayedWithdrawableBalance = isWithdrawableUnlocked ? dbUserBalance : 0.00;
                          const canWithdraw = isWithdrawableUnlocked && dbUserBalance >= 1.00;

                          return (
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                                    Withdrawable Balance
                                  </span>
                                  <span className="text-2xl font-black text-slate-950 block mt-1">
                                    {formatCurrency(`${displayedWithdrawableBalance.toFixed(2)} USDm`)}
                                  </span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWithdrawAmountInput(1.00);
                                    setShowWithdrawModal(true);
                                  }}
                                  disabled={!canWithdraw}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                                    canWithdraw 
                                      ? "bg-slate-900 text-white hover:bg-slate-800" 
                                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                                  }`}
                                >
                                  Withdraw Earnings
                                </button>
                              </div>
                              {!isWithdrawableUnlocked && (
                                <p className="text-[10px] text-amber-600 font-bold bg-amber-50/50 border border-amber-100/50 p-2.5 rounded-xl leading-normal">
                                  ⚠️ Withdrawable amount is locked at 0.00 USDm until your total platform earnings reach 1.00 USDm. Keep earning to unlock withdrawals!
                                </p>
                              )}
                              {isWithdrawableUnlocked && dbUserBalance < 1.00 && (
                                <p className="text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 p-2.5 rounded-xl leading-normal">
                                  ℹ️ Minimum withdrawal amount is 1.00 USDm. Earn more tasks or referrals to build your withdrawable balance.
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* 2.5 Campaign Creation Credit Info Banner (if has credit) */}
                        {dbUserProfile?.taskCredit > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setUseWelcomeCredit(true);
                              setLockWelcomeCredit(true);
                              handleAuthAction(() => setScreen("create-task"));
                            }}
                            className="w-full text-left bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:scale-[1.01] active:scale-95 transition-all duration-200 cursor-pointer"
                          >
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                                Campaign Creation Credit
                              </span>
                              <span className="text-sm font-black text-slate-900 block">
                                {formatCurrency(`${dbUserProfile.taskCredit.toFixed(2)} USDm`)}
                              </span>
                              <span className="text-[9px] text-slate-500 block font-semibold">
                                Click here to launch your campaign & apply credit 🚀
                              </span>
                            </div>
                            <span className="text-xs bg-emerald-500 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider scale-95 shadow-sm shadow-emerald-500/20 whitespace-nowrap flex-shrink-0">
                              🎁 Use Credit
                            </span>
                          </button>
                        )}

                        {/* 3. Stats Grid */}
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

                        {/* 4. Currency Preference Selector */}
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
                                onClick={() => setCurrencyPreference("USDm")}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  currencyPreference === "USDm"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                USDm
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

                        {/* 4.5 Push Notifications Settings Selector (Only show on PWA App standalone version) */}
                        {isStandaloneMode && (
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                  Push Notifications
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Get instant alerts on approvals & milestones
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={togglePushSubscription}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 5. XP, Level, Streaks and Badges Card */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-fade-in">
                          {/* Level & Streak Row */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
                                Level {Math.floor((dbUserProfile?.xp || 500) / 100)}
                              </span>
                              <span className="text-[11px] text-slate-500 font-semibold">
                                {dbUserProfile?.xp || 500} XP
                              </span>
                            </div>
                            
                            {/* Streak count (Snapchat style fire emoji) */}
                            {effectiveStreakCount > 0 && (
                              <div className={`flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-black ${
                                showStreakReminder ? "animate-pulse" : ""
                              }`}>
                                <span>🔥</span>
                                <span>{effectiveStreakCount}</span>
                              </div>
                            )}
                          </div>

                          {/* Level Progress Bar */}
                          <div className="space-y-1">
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${(dbUserProfile?.xp || 500) % 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>Next Level</span>
                              <span>{100 - ((dbUserProfile?.xp || 500) % 100)} XP to go</span>
                            </div>
                          </div>

                          {/* Achievements Badges Trigger Button */}
                          <button
                            type="button"
                            onClick={() => setShowBadgesModal(true)}
                            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-100 flex items-center justify-center gap-2"
                          >
                            <span>🏆</span>
                            View Achievements & Badges
                          </button>

                          {/* Profile Navigation Actions */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setProfileSubScreen("task-history")}
                              className="py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-100 flex items-center justify-center gap-1.5"
                            >
                              <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                              Task History
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfileSubScreen("transaction-history")}
                              className="py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-100 flex items-center justify-center gap-1.5"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                              Transactions
                            </button>
                          </div>
                        </div>

                        {/* 6. Referral Link Card & Referral Contest */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 animate-fade-in">
                          <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                              Invite & Earn Stablecoins
                            </span>
                            <p className="text-[10px] text-slate-500 leading-relaxed mt-1 font-medium">
                              Share your private link. Earn <strong>0.02 USDm</strong> on their first completed task and <strong>0.10 USDm</strong> on their first campaign launch!
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <div className="flex-1 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 text-xs font-mono text-slate-600 select-all overflow-x-auto whitespace-nowrap scrollbar-none">
                              {typeof window !== "undefined" ? `${window.location.origin}/?r=${dbUserProfile?.refCode || ""}` : `/?r=${dbUserProfile?.refCode || ""}`}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== "undefined") {
                                  const link = `${window.location.origin}/?r=${dbUserProfile?.refCode || ""}`;
                                  navigator.clipboard.writeText(link);
                                  setCopiedRef(true);
                                  setTimeout(() => setCopiedRef(false), 2000);
                                }
                              }}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${
                                copiedRef ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              {copiedRef ? "Copied!" : "Copy Link"}
                            </button>
                          </div>

                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setShowReferralsModal(true)}
                              className="w-full py-2.5 text-center text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 bg-blue-50/50 hover:bg-blue-100/50 rounded-xl border border-blue-100/50 active:scale-95 transition-all"
                            >
                              View Referral Stats & Earnings ({referredUsers.length})
                            </button>
                          </div>
                        </div>

                        {/* Task Created Manager Entry Button (Dashboard) */}
                        <button
                          onClick={() => setProfileSubScreen("created-tasks")}
                          className="w-full py-4 px-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-xl relative">
                              <FileText className="w-5 h-5 text-blue-600" />
                              {(() => {
                                const myTaskIds = new Set(tasks.filter(t => t.createdByWallet?.toLowerCase() === activeAddress?.toLowerCase()).map(t => t.id));
                                const pendingCount = creatorSubmissions.filter(s => myTaskIds.has(s.taskId) && s.status === "pending").length;
                                if (pendingCount > 0) {
                                  return (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-white">
                                      {pendingCount}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 block">Tasks Created</span>
                              <span className="text-xs text-slate-400 block mt-0.5">
                                {(() => {
                                  const myTaskIds = new Set(tasks.filter(t => t.createdByWallet?.toLowerCase() === activeAddress?.toLowerCase()).map(t => t.id));
                                  const pendingCount = creatorSubmissions.filter(s => myTaskIds.has(s.taskId) && s.status === "pending").length;
                                  return pendingCount > 0 
                                    ? `${pendingCount} new submission${pendingCount > 1 ? "s" : ""} pending review`
                                    : "Manage your campaigns and submissions";
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const myTaskIds = new Set(tasks.filter(t => t.createdByWallet?.toLowerCase() === activeAddress?.toLowerCase()).map(t => t.id));
                              const pendingCount = creatorSubmissions.filter(s => myTaskIds.has(s.taskId) && s.status === "pending").length;
                              if (pendingCount > 0) {
                                return (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[9px] font-bold">
                                    New
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </div>
                        </button>
                        {/* Submit Task Idea Entry */}
                        <button
                          onClick={() => handleAuthAction(() => setScreen("submit-idea"))}
                          className="w-full py-4 px-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-violet-50 rounded-xl">
                              <Lightbulb className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 block flex items-center gap-2">
                                Submit Task Idea
                                {new Date(NEW_FEATURE_UNTIL) > new Date() && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-600">
                                    New
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-slate-400 block mt-0.5">
                                Suggest a task and earn when it goes live
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                        {/* Platform Developer Admin Panel Settings Card - Admin Only */}
                        {wagmiAddress?.toLowerCase() === PLATFORM_ESCROW_WALLET.toLowerCase() && (
                          <div className="mt-4 animate-fade-in space-y-4">
                            {/* Admin Header */}
                            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-5 rounded-2xl text-white shadow-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                                    <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-extrabold tracking-tight">Platform Admin Panel</h3>
                                    <p className="text-slate-300 text-xs mt-0.5 font-medium">Developer controls & real-time analytics</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    Live
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Fees Earned Card */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl -translate-x-4 translate-y-4"></div>
                                <div className="relative flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Fees Earned (2%)</span>
                                    <span className="text-emerald-600 font-black text-xl block mt-1">
                                      {platformAdminStats.feesCollected.toFixed(2)} USDm
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                      ~₦{Math.round(platformAdminStats.feesCollected * USDM_TO_NGN_RATE).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                  </div>
                                </div>
                              </div>

                              {/* Locked in Escrow Card */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl -translate-x-4 translate-y-4"></div>
                                <div className="relative flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Locked in Escrow</span>
                                    <span className="text-blue-600 font-black text-xl block mt-1">
                                      {rawEscrowBalance !== undefined && rawEscrowBalance !== null 
                                        ? parseFloat(formatEther(rawEscrowBalance as bigint)).toFixed(2)
                                        : liveLockedEscrow.toFixed(2)} USDm
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                      ~₦{Math.round(liveLockedEscrow * USDM_TO_NGN_RATE).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-blue-50 rounded-xl">
                                    <Wallet className="w-5 h-5 text-blue-600" />
                                  </div>
                                </div>
                              </div>

                              {/* Total Users Card */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl -translate-x-4 translate-y-4"></div>
                                <div className="relative flex items-center justify-between">
                                  <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Users</span>
                                    <span className="text-slate-800 font-black text-2xl block mt-1">
                                      {totalUsersCount}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-purple-50 rounded-xl">
                                    <User className="w-5 h-5 text-purple-600" />
                                  </div>
                                </div>
                              </div>

                              {/* Tasks Created Card */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full blur-2xl -translate-x-4 translate-y-4"></div>
                                <div className="relative flex items-center justify-between">
                                  <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Tasks Created</span>
                                    <span className="text-slate-800 font-black text-2xl block mt-1">
                                      {tasks.length}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-orange-50 rounded-xl">
                                    <ClipboardList className="w-5 h-5 text-orange-600" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Metrics Row */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Tasks Completed Card */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl -translate-x-4 translate-y-4"></div>
                                <div className="relative flex items-center justify-between">
                                  <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Tasks Completed</span>
                                    <span className="text-slate-800 font-black text-2xl block mt-1">
                                      {tasks.filter(t => t.slotsRemaining <= 0 || t.status === "completed").length}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  </div>
                                </div>
                              </div>

                              {/* On-Chain Activity Card */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-2xl -translate-x-4 translate-y-4"></div>
                                <div className="relative flex items-center justify-between">
                                  <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">On-Chain Activity</span>
                                    <div className="flex items-center justify-center gap-4 mt-1">
                                      <div>
                                        <span className="text-slate-800 font-black text-xl block">
                                          {isLoadingOnchainStats ? (
                                            <span className="inline-block w-5 h-5 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></span>
                                          ) : (
                                            onchainUsersCount
                                          )}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold block">Users</span>
                                      </div>
                                      <div className="border-l border-slate-200 pl-4">
                                        <span className="text-slate-800 font-black text-xl block">
                                          {isLoadingOnchainStats ? (
                                            <span className="inline-block w-5 h-5 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></span>
                                          ) : (
                                            onchainTxCount
                                          )}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold block">Txs</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-2.5 bg-cyan-50 rounded-xl">
                                    <Cpu className="w-5 h-5 text-cyan-600" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Developer Info Card */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex items-center justify-between mb-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Developer Escrow Wallet</span>
                                </div>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3 font-mono text-sm text-slate-800 select-all truncate flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-slate-400" />
                                {PLATFORM_ESCROW_WALLET}
                              </div>
                            </div>

                            {/* Management Actions Grid */}
                            <div className="space-y-2">
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-3">Management Actions</span>
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Disputes */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-disputes")}
                                    className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/50 transition-all flex flex-col items-center gap-2 active:scale-95 relative group"
                                  >
                                    <div className="relative p-2 bg-orange-50 rounded-lg">
                                      <AlertCircle className="w-5 h-5 text-orange-500" />
                                      {creatorSubmissions.filter(s => s.status === "disputed").length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-orange-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-white">
                                          {creatorSubmissions.filter(s => s.status === "disputed").length}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Disputes</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {creatorSubmissions.filter(s => s.status === "disputed").length} pending
                                    </span>
                                  </button>

                                  {/* Campaigns */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-campaigns")}
                                    className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2 active:scale-95"
                                  >
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                      <ClipboardList className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Campaigns</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {tasks.length} total
                                    </span>
                                  </button>

                                  {/* Withdrawals */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-withdrawals")}
                                    className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/50 transition-all flex flex-col items-center gap-2 active:scale-95"
                                  >
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                      <Wallet className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Withdrawals</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {withdrawals.filter(w => w.status === "pending").length} pending
                                    </span>
                                  </button>

                                  {/* Referral Contest */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-contest")}
                                    className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2 active:scale-95"
                                  >
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                      <Trophy className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Contest</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {contestConfig ? contestConfig.status.toUpperCase() : "IDLE"}
                                    </span>
                                  </button>

                                  {/* Task Ideas Queue */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-task-ideas")}
                                    className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-violet-200 hover:bg-violet-50/50 transition-all flex flex-col items-center gap-2 active:scale-95 relative group"
                                  >
                                    <div className="relative p-2 bg-violet-50 rounded-lg">
                                      <Lightbulb className="w-5 h-5 text-violet-500" />
                                      {taskIdeas.filter((i) => i.status === "pending").length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-violet-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-white">
                                          {taskIdeas.filter((i) => i.status === "pending").length}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Task Ideas</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {taskIdeas.filter((i) => i.status === "pending").length} pending
                                    </span>
                                  </button>

                                  {/* Users */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-users")}
                                    className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-slate-300 hover:bg-slate-50/50 transition-all flex flex-col items-center gap-2 active:scale-95"
                                  >
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                      <Users className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Users</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {totalUsersCount} total
                                    </span>
                                  </button>

                                  {/* Announcements */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-announcements")}
                                    className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-amber-200 hover:bg-amber-50/50 transition-all flex flex-col items-center gap-2 active:scale-95 relative group"
                                  >
                                    <div className="relative p-2 bg-amber-50 rounded-lg">
                                      <Megaphone className="w-5 h-5 text-amber-500" />
                                      {(() => {
                                        const unsent = announcements.filter((a) => !a.sentAt).length;
                                        if (unsent > 0) {
                                          return (
                                            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-white">
                                              {unsent}
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">Announcements</span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {announcements.filter((a) => !a.sentAt).length > 0
                                        ? `${announcements.filter((a) => !a.sentAt).length} unsent`
                                        : "All sent"}
                                    </span>
                                  </button>

                                  {/* Custom Promotions Broadcast */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-promotion")}
                                    className="col-span-2 p-3.5 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 transition-all flex flex-row items-center justify-center gap-3 active:scale-95"
                                  >
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                      <Bell className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div className="text-left">
                                      <span className="text-xs font-bold text-slate-800 block">Broadcast Promotions</span>
                                      <span className="text-[9px] text-slate-400 font-medium">
                                        Send custom HTML email & push alerts to all users
                                      </span>
                                    </div>
                                  </button>

                                  {/* Direct Quest Payout */}
                                  <button
                                    type="button"
                                    onClick={() => setProfileSubScreen("admin-quest-payout")}
                                    className="col-span-2 p-3.5 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/50 transition-all flex flex-row items-center justify-center gap-3 active:scale-95 mt-2"
                                  >
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                      <Trophy className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="text-left flex-grow font-sans">
                                      <span className="text-xs font-bold text-slate-800 block">Direct Quest Payout</span>
                                      <span className="text-[9px] text-slate-400 font-medium">
                                        Send USDm directly to winners and generate payment certificates
                                      </span>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PROFILE: USER'S TASK HISTORY SUB-SCREEN */}
                    {profileSubScreen === "task-history" && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100 bg-white shadow-sm active:scale-95 flex items-center justify-center flex-shrink-0"
                          >
                            <ArrowLeft className="w-4 h-4 text-slate-800" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                              Task History
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">Track the status of your task submissions</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {history.length > 0 ? (
                            history.map((item) => {
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
                                              {currencyPreference === "NGN" ? `${val.toFixed(2)} USDm` : `~₦${Math.round(val * USDM_TO_NGN_RATE)}`}
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
                            })
                          ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                              <p className="text-slate-400 text-xs font-semibold">No task submissions recorded yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PROFILE: USER'S TRANSACTION HISTORY SUB-SCREEN */}
                    {profileSubScreen === "transaction-history" && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100 bg-white shadow-sm active:scale-95 flex items-center justify-center flex-shrink-0"
                          >
                            <ArrowLeft className="w-4 h-4 text-slate-800" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                              Transactions
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">Full cash-flow breakdown</span>
                          </div>
                        </div>

                        {/* Summary statistics */}
                        {(() => {
                          const ledger = getTransactionLedger();
                          return (
                            <>
                              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 grid grid-cols-2 gap-4 text-center">
                                <div className="space-y-1">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Earnings</span>
                                  <span className="text-xs font-black text-emerald-600">
                                    +{formatCurrencyVal(ledger.totalInflow)}
                                  </span>
                                </div>
                                <div className="space-y-1 border-l border-slate-100">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Outflow</span>
                                  <span className="text-xs font-black text-rose-600">
                                    -{formatCurrencyVal(ledger.totalOutflow)}
                                  </span>
                                </div>
                              </div>

                              {/* Transaction Items list */}
                              <div className="space-y-3.5">
                                {ledger.items.length > 0 ? (
                                  ledger.items.map((item, idx) => (
                                    <div
                                      key={item.id || idx}
                                      className="bg-white p-4 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between gap-3 animate-fade-in"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2.5 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                          item.type === "inflow" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50/70 text-rose-600"
                                        }`}>
                                          <Receipt className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <h4 className="text-xs font-black text-slate-900 truncate">
                                            {item.title}
                                          </h4>
                                          <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">
                                            {item.meta} • {item.date}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right flex-shrink-0 space-y-1">
                                        <span className={`text-xs font-black block ${
                                          item.type === "inflow" ? "text-emerald-600" : "text-rose-600"
                                        }`}>
                                          {item.type === "inflow" ? "+" : "-"}{formatCurrencyVal(item.amount)}
                                        </span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                          item.status === "completed" || item.status === "approved" || item.status === "active"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : item.status === "pending"
                                            ? "bg-amber-50 text-amber-700 animate-pulse"
                                            : "bg-slate-50 text-slate-400"
                                        }`}>
                                          {item.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                                    <p className="text-slate-400 text-xs font-semibold">No transactions recorded yet.</p>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
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
                          {/* User-created tasks — newest first */}
                          {tasks
                            .filter(t => t.createdByWallet?.toLowerCase() === wagmiAddress?.toLowerCase())
                            .sort((a, b) => (new Date(b.createdAt || b.updatedAt || 0).getTime()) - (new Date(a.createdAt || a.updatedAt || 0).getTime()))
                            .map((t) => {
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
                                    {getPlatformIcon(t.platform, "w-5 h-5")}
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
                                  {pendingSubmissions > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex-shrink-0 whitespace-nowrap">
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
                                        <span>Payout: {t ? formatCurrency(t.amount) : "0.05 USDm"}</span>
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
                              Moderate or delete any campaign created on Tezra
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
                                      {getPlatformIcon(t.platform, "w-5 h-5")}
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
                                        onClick={() => setAdminDeleteTaskId(t.id)}
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

                    {/* PROFILE: TASK IDEAS QUEUE FOR ADMINISTRATOR */}
                    {profileSubScreen === "admin-task-ideas" && (
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
                              Task Idea Queue
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">
                              Review community ideas and launch the best ones as paid tasks
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {taskIdeas.length > 0 ? (
                            taskIdeas.map((idea) => {
                              const catInfo = TASK_CATEGORIES[idea.category] || { label: idea.category || "General", platforms: [] };
                              const isPending = idea.status === "pending";
                              const isApproving = launchingIdeaId === idea.id;
                              return (
                                <div key={idea.id} className="bg-white p-4 border border-slate-100 shadow-sm rounded-2xl space-y-3 animate-fade-in">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-grow min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[9px] font-bold rounded-full uppercase tracking-wider">
                                          {catInfo.label}
                                        </span>
                                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                                          idea.status === "pending"
                                            ? "bg-amber-50 text-amber-700"
                                            : idea.status === "approved"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-500"
                                        }`}>
                                          {idea.status}
                                        </span>
                                      </div>
                                      <h3 className="text-sm font-bold text-slate-900 mt-2">{idea.title}</h3>
                                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{idea.description}</p>
                                      <div className="flex items-center gap-3 mt-2.5 text-[10px] text-slate-400 font-semibold">
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {idea.wallet_address ? formatAddress(idea.wallet_address) : "unknown"}
                                        </span>
                                        {idea.suggested_payout && (
                                          <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                            ~{Number(idea.suggested_payout).toFixed(2)} USDm suggested
                                          </span>
                                        )}
                                        <span>
                                          {idea.created_at ? new Date(idea.created_at).toLocaleDateString() : ""}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {isPending && (
                                    <div className="space-y-3 border-t border-slate-100 pt-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Platform
                                          </label>
                                          <select
                                            value={ideaLaunchForm.platform}
                                            disabled={isApproving}
                                            onChange={(e) => {
                                              const nextPlatform = e.target.value as Platform;
                                              const actions = PLATFORM_ACTIONS[nextPlatform] || [];
                                              const defaultAction = actions[0]?.value || "";
                                              setIdeaLaunchForm({
                                                platform: nextPlatform,
                                                actions: defaultAction ? [defaultAction] : [],
                                                slots: ideaLaunchForm.slots
                                              });
                                            }}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold focus:outline-none focus:border-slate-400 uppercase tracking-wider"
                                          >
                                            {Object.entries(TASK_CATEGORIES).map(([catKey, cat]) => (
                                              <optgroup key={catKey} label={cat.label}>
                                                {cat.platforms.map((p) => (
                                                  <option key={p} value={p}>
                                                    {p === "x" ? "X (Twitter)" : p === "testing" ? "Beta Lab" : p.charAt(0).toUpperCase() + p.slice(1)}
                                                  </option>
                                                ))}
                                              </optgroup>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Slots
                                          </label>
                                          <input
                                            type="number"
                                            min={5}
                                            value={ideaLaunchForm.slots}
                                            disabled={isApproving}
                                            onChange={(e) => setIdeaLaunchForm({ ...ideaLaunchForm, slots: parseInt(e.target.value) || 5 })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold focus:outline-none focus:border-slate-400"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                          Actions
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(PLATFORM_ACTIONS[ideaLaunchForm.platform] || []).map((action) => {
                                            const isChecked = ideaLaunchForm.actions.includes(action.value);
                                            return (
                                              <button
                                                key={action.value}
                                                type="button"
                                                disabled={isApproving}
                                                onClick={() => {
                                                  setIdeaLaunchForm((prev) => {
                                                    const has = prev.actions.includes(action.value);
                                                    if (has && prev.actions.length === 1) return prev;
                                                    return {
                                                      ...prev,
                                                      actions: has ? prev.actions.filter((v) => v !== action.value) : [...prev.actions, action.value]
                                                    };
                                                  });
                                                }}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                  isChecked
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                              >
                                                {action.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          disabled={isApproving}
                                          onClick={() => handleApproveIdea(idea)}
                                          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-[11px] font-bold active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                          {isApproving ? (
                                            <>
                                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                              Launching...
                                            </>
                                          ) : (
                                            <>
                                              <Check className="w-3.5 h-3.5" />
                                              Approve & Launch
                                            </>
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isApproving}
                                          onClick={() => handleRejectIdea(idea)}
                                          className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl text-[11px] font-bold active:scale-95 transition-all"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                              <p className="text-slate-400 text-xs font-semibold">No task ideas submitted yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PROFILE: USERS DIRECTORY FOR ADMINISTRATOR */}
                    {profileSubScreen === "admin-users" && (
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
                              Platform Users
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">
                              {totalUsersCount} users — tap a row to copy the wallet address
                            </span>
                          </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by name, email or wallet address..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:border-slate-300 transition-colors placeholder:text-slate-400 shadow-sm"
                          />
                        </div>

                        <div className="space-y-3">
                          {(() => {
                            const q = userSearchQuery.trim().toLowerCase();
                            const filtered = q
                              ? allUsers.filter((u) =>
                                  (u.displayName || "").toLowerCase().includes(q) ||
                                  (u.email || "").toLowerCase().includes(q) ||
                                  (u.wallet || "").toLowerCase().includes(q)
                                )
                              : allUsers;
                            if (filtered.length === 0) {
                              return (
                                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                                  <p className="text-slate-400 text-xs font-semibold">No users found</p>
                                </div>
                              );
                            }
                            return filtered.map((u) => {
                              const name = u.displayName || (u.wallet ? formatAddress(u.wallet) : "Unnamed User");
                              return (
                                <div key={u.id} className="bg-white p-4 border border-slate-100 shadow-sm rounded-2xl space-y-2.5 animate-fade-in">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                                        {(name || "?").charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                                        {u.email ? (
                                          <p className="text-[10px] text-slate-400 font-semibold truncate">{u.email}</p>
                                        ) : (
                                          <p className="text-[10px] text-slate-300 font-semibold">No email registered</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        {(u.balance || 0).toFixed(2)} USDm
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                                        {(u.tasksCompleted || 0)} tasks
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                    <span className="text-[10px] font-mono text-slate-600 truncate flex-grow select-all">
                                      {u.wallet}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(u.wallet);
                                        alert(`Copied wallet address to clipboard!\n${u.wallet}`);
                                      }}
                                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 rounded-lg text-[9px] font-bold text-slate-700 transition-all flex items-center gap-1 flex-shrink-0"
                                    >
                                      <Copy className="w-3 h-3" />
                                      Copy
                                    </button>
                                  </div>
                                </div>
                              );
                            });
                          })()}
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
                                        Withdrawal of {w.amount.toFixed(2)} USDm
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
                    {/* PROFILE: REFERRAL CONTEST DASHBOARD FOR ADMINISTRATOR */}
                    {profileSubScreen === "admin-contest" && (
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
                              Referral Contest Settings
                            </h2>
                            <span className="text-xs text-slate-400 font-semibold block">
                              Configure live bounties, duration, and distribute prizes to top referrers
                            </span>
                          </div>
                        </div>

                        {/* Config Panel */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Configure Contest</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Prize Pool (USDm)
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={adminContestPrize}
                                onChange={(e) => setAdminContestPrize(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Duration (Days)
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={adminContestDuration}
                                onChange={(e) => setAdminContestDuration(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-2.5 pt-2 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Contest Operations (Current Status: <strong className="text-blue-600">{contestConfig?.status.toUpperCase() || "IDLE"}</strong>)
                            </span>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateContestConfig("coming_soon")}
                                className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold active:scale-95 transition-all shadow-sm"
                              >
                                Set Coming Soon
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateContestConfig("active")}
                                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold active:scale-95 transition-all shadow-sm"
                              >
                                Start Active
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateContestConfig("idle")}
                                className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold active:scale-95 transition-all"
                              >
                                End & Reset
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Top 3 Winners Distribution Box */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Top 3 Winners (Unmasked)</h3>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">
                              Prizes: 1st: 10 USDm | 2nd & 3rd: 5 USDm
                            </span>
                          </div>

                          <div className="space-y-3">
                            {contestLeaderboard.length > 0 ? (
                              contestLeaderboard.slice(0, 3).map((winner, index) => {
                                const prizeValue = index === 0 ? 10 : 5;
                                return (
                                  <div key={winner.wallet_address || index} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-grow">
                                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                                        <span className="text-blue-500 font-mono">#{index + 1}</span>
                                        <span className="font-mono select-all truncate text-[11px]">
                                          {winner.wallet_address}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] text-slate-400 font-semibold">
                                          Earned: {formatCurrencyVal(winner.contestReferralEarnings || 0)}
                                        </span>
                                        <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100/30 px-1.5 py-0.5 rounded">
                                          Prize: {prizeValue.toFixed(2)} USDm
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(winner.wallet_address);
                                        alert("Copied wallet address to clipboard!");
                                      }}
                                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 rounded-lg text-[9px] font-bold transition-all"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-6 text-xs text-slate-400 font-semibold bg-slate-50 rounded-xl border border-slate-100">
                                No participants in the contest yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PROFILE: CONTRACT SETTINGS FOR ADMINISTRATOR */}
                    {profileSubScreen === "admin-contract" && (
                      <ContractSettings
                        escrowAddress={escrowContractAddress}
                        adminWallet={PLATFORM_ESCROW_WALLET}
                        writeContractAsync={writeContractAsync}
                        isConnected={isConnected}
                        onConnect={openConnectModal}
                        onBack={() => setProfileSubScreen("profile-main")}
                      />
                    )}

                    {/* PROFILE: DIRECT QUEST PAYOUT PANEL */}
                    {profileSubScreen === "admin-quest-payout" && (
                      <div className="space-y-6 animate-fade-in pb-12">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1.5 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-100 transition-all bg-white"
                          >
                            <ArrowLeft className="w-4 h-4 text-slate-700" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Direct Quest Payout</h2>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium font-sans">
                              Send reward tokens directly from the admin wallet and generate digital certificates.
                            </p>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 font-sans">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Winner Wallet Address</label>
                            <input
                              type="text"
                              value={questPayoutWinner}
                              onChange={(e) => setQuestPayoutWinner(e.target.value)}
                              placeholder="0x..."
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-xl font-mono text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Payout Amount (USDm)</label>
                            <input
                              type="text"
                              value={questPayoutAmount}
                              onChange={(e) => setQuestPayoutAmount(e.target.value)}
                              placeholder="e.g. 10.00"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-xl font-sans text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Quest / Campaign Title</label>
                            <input
                              type="text"
                              value={questPayoutTitle}
                              onChange={(e) => setQuestPayoutTitle(e.target.value)}
                              placeholder="e.g. Social Quest - Membership Certificate Share"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-xl font-sans text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={questPayoutProcessing || !questPayoutWinner || !questPayoutAmount}
                            onClick={async () => {
                              try {
                                setQuestPayoutProcessing(true);
                                const tokenAddress = getUsdmAddress(chainId);
                                if (!tokenAddress) throw new Error("Stable token address not configured");
                                
                                const amountWei = parseEther(parseFloat(questPayoutAmount).toFixed(18));
                                const tx = await writeContractAsync({
                                  address: tokenAddress,
                                  abi: ERC20_ABI,
                                  functionName: "transfer",
                                  args: [questPayoutWinner as `0x${string}`, amountWei],
                                });
                                
                                setQuestPayoutTxHash(tx);
                                setShowPaymentCertificate(true);
                                alert("🎉 Payout executed successfully!");
                              } catch (err: any) {
                                console.error(err);
                                alert(`Payout failed: ${err.message || err}`);
                              } finally {
                                setQuestPayoutProcessing(false);
                              }
                            }}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-500/10 active:scale-95 transition-all text-center flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {questPayoutProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing Payout...
                              </>
                            ) : (
                              <>
                                <Trophy className="w-4 h-4" />
                                Send Payout & Generate Certificate
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PROFILE: ANNOUNCEMENT TEMPLATES */}
                    {profileSubScreen === "admin-announcements" && (
                      <div className="space-y-6 animate-fade-in pb-12">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1.5 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-100 transition-all bg-white"
                          >
                            <ArrowLeft className="w-4 h-4 text-slate-700" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Announcements</h2>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium">
                              Edit templates, then send each one once. Sent announcements cannot be re-sent.
                            </p>
                          </div>
                        </div>

                        {announcementsLoading ? (
                          <div className="text-center py-12">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                            <p className="text-xs text-slate-400 font-semibold mt-2">Loading templates...</p>
                          </div>
                        ) : announcements.length === 0 ? (
                          <div className="text-center py-12 text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-slate-100">
                            No announcement templates found.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {announcements.map((tpl) => {
                              const draft = announcementDrafts[tpl.id] || {
                                emailSubject: "",
                                emailBody: "",
                                pushTitle: "",
                                pushBody: ""
                              };
                              const sentAt = tpl.sentAt
                                ? tpl.sentAt.seconds
                                  ? new Date(tpl.sentAt.seconds * 1000).toLocaleString()
                                  : new Date(tpl.sentAt).toLocaleString()
                                : null;
                              return (
                                <div key={tpl.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                  <div className="p-4 border-b border-slate-50 flex items-start justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>
                                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{tpl.description}</p>
                                    </div>
                                    {sentAt ? (
                                      <span className="shrink-0 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                        Sent {sentAt}
                                      </span>
                                    ) : (
                                      <span className="shrink-0 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                        Not sent yet
                                      </span>
                                    )}
                                  </div>

                                  <div className="p-4 space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-black uppercase text-slate-700 block">Email Subject</label>
                                      <input
                                        type="text"
                                        value={draft.emailSubject}
                                        onChange={(e) =>
                                          setAnnouncementDrafts((prev) => ({
                                            ...prev,
                                            [tpl.id]: { ...prev[tpl.id], emailSubject: e.target.value }
                                          }))
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-black uppercase text-slate-700 block">Email Body (plain text, blank line between paragraphs)</label>
                                      <textarea
                                        rows={8}
                                        value={draft.emailBody}
                                        onChange={(e) =>
                                          setAnnouncementDrafts((prev) => ({
                                            ...prev,
                                            [tpl.id]: { ...prev[tpl.id], emailBody: e.target.value }
                                          }))
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-700 block">Push & In-App Title</label>
                                        <input
                                          type="text"
                                          value={draft.pushTitle}
                                          onChange={(e) =>
                                            setAnnouncementDrafts((prev) => ({
                                              ...prev,
                                              [tpl.id]: { ...prev[tpl.id], pushTitle: e.target.value }
                                            }))
                                          }
                                          className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-700 block">Push & In-App Body</label>
                                        <textarea
                                          rows={3}
                                          value={draft.pushBody}
                                          onChange={(e) =>
                                            setAnnouncementDrafts((prev) => ({
                                              ...prev,
                                              [tpl.id]: { ...prev[tpl.id], pushBody: e.target.value }
                                            }))
                                          }
                                          className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveAnnouncement(tpl.id)}
                                        disabled={savingAnnouncementId === tpl.id}
                                        className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-[11px] font-bold active:scale-95 transition-all"
                                      >
                                        {savingAnnouncementId === tpl.id ? "Saving..." : "Save Changes"}
                                      </button>
                                      {!tpl.sentAt && (
                                        <button
                                          type="button"
                                          onClick={() => handleSendAnnouncement(tpl.id)}
                                          disabled={sendingAnnouncementId !== null}
                                          className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-[11px] font-black active:scale-95 transition-all"
                                        >
                                          {sendingAnnouncementId === tpl.id ? "Sending..." : "Send Now"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* PROFILE: PROMOTIONS & BROADCAST BUILDER */}
                    {profileSubScreen === "admin-promotion" && (
                      <div className="space-y-6 animate-fade-in pb-12">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setProfileSubScreen("profile-main")}
                            className="p-1.5 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-100 transition-all bg-white"
                          >
                            <ArrowLeft className="w-4 h-4 text-slate-700" />
                          </button>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Broadcast Promotions</h2>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium">Send custom email and push updates to all users</p>
                          </div>
                        </div>

                        {/* Content Split: Form vs. Preview */}
                        <div className="space-y-6">
                          {/* Form Section */}
                          <div className="space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Campaign Settings</h3>
                              
                              {/* Target Channels */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-700 block">Deliver Via</label>
                                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                                  {["both", "email", "push"].map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setPromoChannel(c as any)}
                                      className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        promoChannel === c
                                          ? "bg-slate-950 text-white shadow-sm"
                                          : "text-slate-500 hover:text-slate-800"
                                      }`}
                                    >
                                      {c === "both" ? "Both" : c === "email" ? "Email" : "Push Alert"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* EMAIL ONLY OR BOTH - EMAIL FORM CARD */}
                            {(promoChannel === "email" || promoChannel === "both") && (
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-50">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">Email Campaign Details</h3>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Email Subject Line</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. New Task Alert: Complete Surveys for stablecoins!"
                                    value={promoSubject}
                                    onChange={(e) => setPromoSubject(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Badge Title</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Announcement, Reward, Special"
                                    value={promoBadgeText}
                                    onChange={(e) => setPromoBadgeText(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Email Title / Headline</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Earn $5.00 USDm instantly!"
                                    value={promoTitle}
                                    onChange={(e) => setPromoTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Email Body Text (HTML)</label>
                                  <textarea
                                    rows={4}
                                    placeholder="e.g. <p>A brand new task is available. Open the link and complete surveys now.</p>"
                                    value={promoBodyHtml}
                                    onChange={(e) => setPromoBodyHtml(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 font-mono"
                                  />
                                </div>

                                {/* Banner Image URL & File Upload */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Banner Image (Optional)</label>
                                  <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <input
                                      type="text"
                                      placeholder="Paste Image URL"
                                      value={promoImageUrl}
                                      onChange={(e) => setPromoImageUrl(e.target.value)}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 transition-all text-slate-800"
                                    />
                                    <div className="flex items-center gap-2">
                                      <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all active:scale-95 text-center">
                                        <UploadCloud className="w-4 h-4" />
                                        Upload Banner Image
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={handlePromoImageUpload}
                                          className="hidden"
                                        />
                                      </label>
                                      {promoImageUrl && (
                                        <button
                                          type="button"
                                          onClick={() => setPromoImageUrl("")}
                                          className="py-2 px-3 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-[10px] font-bold transition-all"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-700 block">CTA Button Text</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Open Task"
                                      value={promoCtaText}
                                      onChange={(e) => setPromoCtaText(e.target.value)}
                                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-700 block">CTA Button Link</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. https://tezra.xyz/?task=123"
                                      value={promoCtaUrl}
                                      onChange={(e) => setPromoCtaUrl(e.target.value)}
                                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* PUSH ONLY OR BOTH - PUSH FORM CARD */}
                            {(promoChannel === "push" || promoChannel === "both") && (
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-50">
                                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">Push Notification Details</h3>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Push Notification Title</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. New Task Live"
                                    value={promoPushTitle}
                                    onChange={(e) => setPromoPushTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Push Notification Body (Plain text)</label>
                                  <textarea
                                    rows={3}
                                    placeholder="e.g. A brand new task has been uploaded! Complete now to earn stablecoins."
                                    value={promoPushBody}
                                    onChange={(e) => setPromoPushBody(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 font-sans"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-slate-700 block">Push Redirect URL</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. /?task=123"
                                    value={promoPushUrl}
                                    onChange={(e) => setPromoPushUrl(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Submit Button */}
                            <button
                              type="button"
                              onClick={handleSendPromotion}
                              disabled={promoSending}
                              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 uppercase"
                            >
                              {promoSending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Broadcasting Alerts...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                                  Send Broadcast Notification
                                </>
                              )}
                            </button>
                          </div>

                          {/* Live Preview Section */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Live Template Preview</h3>
                            
                            {/* Email Live Template Mockup */}
                            {(promoChannel === "email" || promoChannel === "both") && (
                              <div className="bg-[#0f172a] rounded-2xl p-4 shadow-md text-slate-200 overflow-hidden font-sans border border-slate-800 text-[13px] scale-95 origin-top transition-all">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-3 border-b border-slate-800 pb-1.5">
                                  📧 Email Inbox Preview (Subject: {promoSubject || "Tezra Update"})
                                </span>
                                
                                <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700/50">
                                  {/* Template Header */}
                                  <div className="bg-gradient-to-br from-emerald-600 to-blue-600 p-6 text-center text-white">
                                    <div className="w-10 h-10 bg-white p-1 rounded-xl mx-auto mb-2 flex items-center justify-center">
                                      <TezraLogo className="w-7 h-7" />
                                    </div>
                                    <h4 className="text-lg font-black tracking-tight margin-0 text-white">Tezra</h4>
                                    <span className="text-[9px] uppercase tracking-widest text-slate-100 font-bold">Microwork for Stablecoins</span>
                                  </div>

                                  {/* Template Content */}
                                  <div className="p-6 space-y-4">
                                    <span className="inline-block px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-[9px] rounded-full uppercase tracking-wider">
                                      {promoBadgeText || "Promo"}
                                    </span>
                                    <h5 className="text-sm font-black text-white leading-snug">{promoTitle || "Notification Headline"}</h5>
                                    
                                    {/* Optional Image */}
                                    {promoImageUrl && (
                                      <img
                                        src={promoImageUrl}
                                        alt="Promotion Banner"
                                        className="max-w-full h-auto rounded-lg mx-auto border border-slate-700/60 my-2"
                                      />
                                    )}
                                    
                                    {/* Body HTML */}
                                    <div
                                      className="text-slate-300 leading-relaxed space-y-2 text-xs"
                                      dangerouslySetInnerHTML={{ __html: promoBodyHtml || "<p>Type body content above to preview template layout...</p>" }}
                                    />

                                    {/* CTA Button */}
                                    {promoCtaText && (
                                      <div className="text-center pt-2">
                                        <span className="inline-block bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md cursor-pointer hover:opacity-95 transition-opacity">
                                          {promoCtaText}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Template Footer */}
                                  <div className="bg-[#0f172a] p-4 text-center border-t border-slate-800 text-[10px] text-slate-500 font-semibold space-y-1">
                                    <p>© 2026 Tezra. All rights reserved.</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Push Alert Mockup */}
                            {(promoChannel === "push" || promoChannel === "both") && (
                              <div className="bg-slate-900 rounded-2xl p-4 shadow-md text-white border border-slate-800 scale-95 origin-top transition-all">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-3 border-b border-slate-800/80 pb-1.5">
                                  🔔 PWA Lockscreen Push Preview
                                </span>
                                
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 flex items-start gap-3 shadow-md max-w-sm mx-auto">
                                  <div className="w-10 h-10 bg-white p-1.5 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                                    <TezraLogo className="w-7 h-7" />
                                  </div>
                                  <div className="flex-1 space-y-0.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[11px] font-bold text-slate-200">Tezra</span>
                                      <span className="text-[9px] text-slate-400 font-semibold">now</span>
                                    </div>
                                    <h6 className="text-xs font-black text-white">{promoPushTitle || "Notification Headline"}</h6>
                                    <p className="text-[10px] text-slate-300 leading-normal line-clamp-2">
                                      {promoPushBody || "Body notification text..."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
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
                      About Tezra
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Stablecoin microlabor marketplace on Celo
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm leading-relaxed space-y-4 text-slate-600 text-xs">
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">🚀 What is Tezra?</h3>
                      <p>
                        Tezra is a next-generation micro-job marketplace powered by the Celo blockchain. It connects creators who need digital actions completed (social follows, app testing, surveys) with earners looking to make stablecoin rewards.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">💳 Off-Chain Balance System</h3>
                      <p>
                        To save earners from paying network fees on every single submission, Tezra accumulates your earnings securely off-chain in a general treasury wallet. Once your balance reaches the minimum threshold of <span className="font-extrabold text-emerald-600">1.00 USDm</span>, you can submit a withdrawal request. Payouts are aggregated and batch-sent on-chain, keeping transaction fees at zero for earners!
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">🇳🇬 Naira (NGN) Automated Funding</h3>
                      <p>
                        Creators can fund campaign budgets instantly using cards or direct bank transfers in Naira (NGN) via Korapay. When a creator launches a campaign with Naira, the system prompts them to pay the NGN budget, which is then processed automatically. Upon validation, the smart contract automatically creates and funds the campaign on-chain from the admin escrow, removing any manual approval delay.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">⚙️ Platform Architecture</h3>
                      <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px]">
                        <li>Network: <span className="font-bold">Celo Mainnet</span></li>
                        <li>Payment Currency: <span className="font-bold">USDm (Celo Dollar)</span></li>
                        <li>Minimum Withdrawal: <span className="font-bold text-emerald-600">1.00 USDm</span></li>
                        <li>Platform Fee: <span className="font-bold">2.0%</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* USER FAQ ACCORDIONS */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide px-1 flex items-center gap-1.5 mt-2">
                      <Info className="w-4 h-4 text-blue-500" /> User Guide & FAQ
                    </h3>
                    
                    <div className="space-y-2">
                      {/* Accordion Item 1 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "wallet" ? null : "wallet")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>🔌 How to Connect Your Wallet</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "wallet" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "wallet" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              Tap the <strong>Connect Wallet</strong> button at the top right of the application screen.
                            </p>
                            <p>
                              Choose your preferred Web3 provider (e.g. <strong>MetaMask, Valora, or MiniPay</strong>). Ensure your wallet network is set to <strong>Celo Mainnet</strong>. Once successfully connected, your shortened address and live USDm token balance will display in the top header.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accordion Item 2 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "create-task" ? null : "create-task")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>📢 How to Create a Task (Advertisers)</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "create-task" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "create-task" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              1. Tap the floating <strong>+</strong> button on the feed homepage or the "Create Campaign" tab.
                            </p>
                            <p>
                              2. Choose your platform (e.g. X, Instagram, GitHub, Web & App Tasks) and select the specific actions required.
                            </p>
                            <p>
                              3. Fill in the campaign details: set the individual worker payout reward, specify slots (number of workers), target duration, and paste the direct link.
                            </p>
                            <p>
                              4. Submit your campaign. You can pay the required budget using on-chain USDm directly, or pay in <strong>Naira (NGN) via Korapay</strong> (supporting bank transfers or cards), which automatically deposits USDm into the smart contract for you.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accordion Item 3 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "complete-task" ? null : "complete-task")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>💰 How to Complete Tasks & Earn</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "complete-task" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "complete-task" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              1. Browse the live campaign feed on the homepage and select any task that interests you.
                            </p>
                            <p>
                              2. Read the instructions and proof requirements carefully. Tap the link to open the target app or profile page.
                            </p>
                            <p>
                              3. Perform the requested actions (e.g. signing up, following, subscribing). Ensure you take the necessary screenshot proof.
                            </p>
                            <p>
                              4. Go back to Tezra, fill in the proof form (upload the screenshot, and/or enter any required text values), and tap <strong>Submit Proof</strong>. The campaign creator will review your proof and release the funds!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accordion Item 4 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "refund" ? null : "refund")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>🔄 How to Request Escrow Refunds</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "refund" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "refund" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              If a campaign you launched expires and still has remaining unfulfilled slots, you can claim your unused USDm tokens back:
                            </p>
                            <p>
                              Go to the <strong>Profile</strong> tab and tap <strong>Manage Campaigns</strong>. Locate your expired campaign and tap <strong>Refund Escrow</strong>. Confirm the transaction in your connected wallet. The smart contract will immediately release the remaining budget tokens directly back to your address.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accordion Item 5 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "dispute" ? null : "dispute")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>⚖️ How to Open a Dispute</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "dispute" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "dispute" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              If a campaign creator rejects your proof submission and you are confident you completed the actions correctly, you can open a dispute:
                            </p>
                            <p>
                              Navigate to your <strong>Profile</strong> tab, scroll down to your submissions history list, and find the rejected submission. Tap the <strong>Dispute Rejection</strong> button, enter a clear description explaining your case, and submit. The platform administrators will manually review the dispute, evaluate your uploaded screenshot proof against the campaign requirements, and render a final fair verdict.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accordion Item 6 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "xp-level" ? null : "xp-level")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>⭐ How do XP & Levels work?</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "xp-level" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "xp-level" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              Tezra uses an <strong>XP (Experience Points)</strong> reputation score to verify quality work:
                            </p>
                            <p>
                              1. Every new user starts with <strong>500 XP</strong> (Level 5).
                            </p>
                            <p>
                              2. Each approved submission grants you <strong>+10 XP</strong>. Each rejected submission deducts <strong>-10 XP</strong>.
                            </p>
                            <p>
                              3. <strong>Suspension warning:</strong> If you get <strong>3 rejections in a row</strong>, or your total XP drops below <strong>200 XP</strong>, your account is temporarily locked for <strong>24 hours</strong>. 
                            </p>
                            <p>
                              4. Once the 24-hour cool-down expires, your XP is boosted back up to <strong>350 XP</strong> for a fresh start!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accordion Item 7 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "refer-earn" ? null : "refer-earn")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>🎁 How does the Invite & Earn program work?</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "refer-earn" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "refer-earn" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              You can earn extra passive stablecoins by inviting friends to Tezra:
                            </p>
                            <p>
                              1. Copy your private referral link from your <strong>Profile</strong> page.
                            </p>
                            <p>
                              2. Referrer Reward: Earn <strong>0.02 USDm</strong> when your referred friend completes their first approved task, and <strong>0.10 USDm</strong> when they launch their first campaign!
                            </p>
                            <p>
                              3. Invited Friend Reward: The referred user gets a <strong>0.02 USDm</strong> bonus on their first approved task, and a <strong>0.05 USDm</strong> cashback bonus on their first campaign launch!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Accordion Item 8 */}
                      <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                        <button
                          onClick={() => setOpenAccordion(openAccordion === "badges-streaks" ? null : "badges-streaks")}
                          className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                          <span>🏆 What are Achievement Badges & Streaks?</span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openAccordion === "badges-streaks" ? "rotate-90 text-blue-500" : ""}`} />
                        </button>
                        {openAccordion === "badges-streaks" && (
                          <div className="px-5 pb-4 text-[11px] leading-relaxed text-slate-600 border-t border-slate-50 pt-3 space-y-2">
                            <p>
                              Showcase your dedication with visual credentials on your profile:
                            </p>
                            <p>
                              • <strong>Daily Streaks (🔥):</strong> Completing tasks on consecutive days increases your streak counter. Don't miss a day or the fire resets!
                            </p>
                            <p>
                              • <strong>Achievement Badges (🏆):</strong> Collect 6 unique visual achievements (such as <strong>Genesis Creator</strong>, <strong>Speed Run</strong>, or <strong>Sold Out</strong>). Acquired achievements light up in vibrant colors, while locked achievements remain in grayscale.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Telegram Community & Support Invitation */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 text-center space-y-4 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Connect & Get Support
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Join our updates channel, ask questions, or follow our social handle!
                      </p>
                    </div>
                    
                    <div className="flex justify-center items-center gap-4">
                      {/* Telegram Updates */}
                      <a
                        href="https://t.me/tezra_updates"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-sky-100/50 shadow-sm"
                        title="Telegram Updates"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.82-1.07 4.8-1.55 7.15-.2.95-.55 1.27-.88 1.3-.73.07-1.29-.48-2-.95-1.12-.74-1.75-1.19-2.83-1.9-1.25-.82-.44-1.28.27-2.02.19-.19 3.42-3.13 3.48-3.4.01-.03.01-.15-.06-.21s-.18-.04-.26-.02c-.11.02-1.88 1.19-5.32 3.52-.5.35-.96.52-1.37.51-.45-.01-1.32-.26-1.97-.47-.8-.26-1.43-.4-1.37-.85.03-.23.35-.47.95-.71 3.71-1.61 6.19-2.67 7.42-3.18 3.52-1.46 4.25-1.71 4.73-1.72.11 0 .35.03.5.16.13.11.17.26.18.37.01.08.02.26.01.43z"/>
                        </svg>
                      </a>

                      {/* WhatsApp Support Chat */}
                      <a
                        href="https://wa.me/12272143646"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-emerald-100/50 shadow-sm"
                        title="WhatsApp Support"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01C17.18 3.03 14.69 2 12.04 2zm5.8 14.17c-.24.68-1.2 1.23-1.66 1.28-.46.05-.91.07-2.93-.72-2.58-1.02-4.24-3.65-4.37-3.82-.13-.17-1.07-1.43-1.07-2.73 0-1.3.68-1.94.92-2.2.24-.26.54-.33.72-.33h.52c.16 0 .37-.02.57.45.2.49.68 1.66.74 1.79.06.13.1.28.02.44s-.12.26-.24.4l-.4.49c-.12.15-.26.31-.11.57.15.26.68 1.12 1.46 1.81.99.88 1.83 1.15 2.09 1.28.26.13.41.11.57-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14s1.53.72 1.79.85c.26.13.43.2.49.31.06.11.06.63-.18 1.31z"/>
                        </svg>
                      </a>

                      {/* X / Twitter Support */}
                      <a
                        href="https://x.com/tezra_app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-slate-50 text-slate-800 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-slate-100/50 shadow-sm"
                        title="Follow X Handle"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    </div>
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
                    Version 2.1.1
                  </span>
                </div>
              </div>
            )}
          </main>

          {/* FLOATING ACTION BUTTON (ONLY ON HOME TAB) */}
          {activeTab === "home" && (
            <button
              onClick={() => {
                setLockWelcomeCredit(false);
                handleAuthAction(() => setScreen("create-task"));
              }}
              className={`fixed right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 hover:scale-105 transition-all duration-300 z-40 ${
                isStandaloneMode ? "bottom-28" : "bottom-24"
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}

          {/* BOTTOM NAVIGATION BAR */}
          <nav className={`fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-100 px-6 flex items-center justify-between z-40 ${
            isStandaloneMode ? "h-[92px] pb-6" : "h-20"
          }`}>
            {[
              { id: "home", label: "Home", icon: <TezraLogo className="w-5 h-5 opacity-70" /> },
              { id: "earn", label: "Earn", icon: <Trophy className="w-5 h-5" />, elementId: "nav-tab-earn" },
              { id: "profile", label: "Profile", icon: <User className="w-5 h-5" />, elementId: "nav-tab-profile" },
              { id: "about", label: "About", icon: <Info className="w-5 h-5" /> }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={tab.elementId}
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
                          {currencyPreference === "NGN" ? `${val.toFixed(2)} USDm` : `~₦${Math.round(val * USDM_TO_NGN_RATE)}`}
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
          <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
            {(() => {
              const isSuspended = !!(dbUserProfile && dbUserProfile.lockUntil && new Date(dbUserProfile.lockUntil).getTime() > Date.now());
              return selectedTask.createdByWallet?.toLowerCase() === wagmiAddress?.toLowerCase() ? (
                <div className="w-full py-3.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold text-center border border-slate-200 flex items-center justify-center">
                  You created this task
                </div>
              ) : (
                <div className="w-full space-y-2">
                  {/* Step 1: Visit Link */}
                  {selectedTask.link !== "#" && (
                    <a
                      href={selectedTask.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setVisitedLink(true)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      1. Visit Campaign Link
                    </a>
                  )}

                  {/* Step 2: Proceed to Submission */}
                  <button
                    disabled={isSuspended || (!visitedLink && selectedTask.link !== "#")}
                    onClick={() => handleAuthAction(() => setScreen("submit-proof"))}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                      !isSuspended && (visitedLink || selectedTask.link === "#")
                        ? "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    }`}
                  >
                    2. Proceed to Submission
                  </button>
                  
                  {/* Hint / Warning Text */}
                  {isSuspended && (
                    <p className="text-[10px] text-red-500 font-bold text-center mt-1 leading-relaxed">
                      🚫 Submission locked until {new Date(dbUserProfile.lockUntil).toLocaleString()} due to consecutive rejections or low XP.
                    </p>
                  )}
                  {!isSuspended && !visitedLink && selectedTask.link !== "#" && (
                    <p className="text-[10px] text-slate-400 font-semibold text-center italic mt-1">
                      ⚠️ You must visit the campaign link first to unlock proof submission.
                    </p>
                  )}
                </div>
              );
            })()}
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
        <div className="flex-1 flex flex-col bg-[#FAFAFC]">
          <header className="h-14 bg-white border-b border-slate-100 sticky top-0 z-45 px-4 flex items-center justify-between">
            <button
              onClick={() => {
                setScreen("main");
                setIsReopening(false);
              }}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-800" />
            </button>
            <span className="text-sm font-bold text-slate-900">
              {isReopening ? "Reopen & Edit Campaign" : "Create Task"}
            </span>
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
                  disabled={isReopening}
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
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors uppercase tracking-wider disabled:opacity-60"
                >
                  {Object.entries(TASK_CATEGORIES).map(([catKey, cat]) => (
                    <optgroup key={catKey} label={cat.label}>
                      {cat.platforms.map((p) => (
                        <option key={p} value={p}>
                          {p === "x" ? "X (Twitter)" : p === "testing" ? "Beta Lab" : p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
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
                    const nairaPrice = Math.round(action.basePrice * USDM_TO_NGN_RATE);
                    return (
                      <label
                        key={action.value}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "border-blue-500 bg-blue-50/20 text-blue-900"
                            : "border-slate-100 hover:border-slate-200 text-slate-700"
                        } ${isReopening ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isReopening}
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
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div className="flex-1 flex justify-between items-center text-xs">
                          <span className="font-bold flex items-center gap-1.5">
                            {action.label}
                            {action.isNew && new Date(NEW_FEATURE_UNTIL) > new Date() && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-600">
                                New
                              </span>
                            )}
                          </span>
                          <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            +{action.basePrice.toFixed(2)} USDm (~₦{nairaPrice})
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
                  disabled={isReopening}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 disabled:opacity-60"
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
                      disabled={isReopening}
                      onClick={() => adjustPayout(-0.01)}
                      className="px-3.5 py-3.5 hover:bg-slate-50 active:scale-95 transition-all border-r border-slate-100 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <div className="flex-grow flex items-center justify-center min-w-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={payoutInput}
                        disabled={isReopening}
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
                        className="w-full text-center text-xs font-bold focus:outline-none bg-transparent py-3 disabled:opacity-60"
                      />
                      <span className="text-[10px] font-bold text-slate-400 mr-2 flex-shrink-0">USDm</span>
                    </div>
                    <button
                      type="button"
                      disabled={isReopening}
                      onClick={() => adjustPayout(0.01)}
                      className="px-3.5 py-3.5 hover:bg-slate-50 active:scale-95 transition-all border-l border-slate-100 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
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

              {/* Reusable Escrow Information for Reopened Campaigns */}
              {(() => {
                if (!isReopening || !reopeningTaskId) return null;
                const orig = tasks.find(t => t.id === reopeningTaskId);
                if (!orig) return null;
                
                const leftoverSlots = orig.slotsRemaining || 0;
                const rewardAmt = parseFloat(orig.amount.replace(/[^\d.]/g, "")) || 0.05;
                const leftoverEscrow = leftoverSlots * rewardAmt;
                const feeToDeduct = leftoverEscrow * (PLATFORM_FEE_PERCENTAGE / 100);
                const usableEscrow = parseFloat((leftoverEscrow - feeToDeduct).toFixed(2));
                
                return (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 space-y-2.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs text-orange-800 font-extrabold uppercase tracking-wider">
                      <span>🔄 Reusing Leftover Escrow Balance</span>
                    </div>
                    <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Leftover Escrow ({orig.slotsRemaining} slots):</span>
                        <span className="font-bold">{leftoverEscrow.toFixed(2)} USDm</span>
                      </div>
                      <div className="flex justify-between text-orange-700">
                        <span>Platform Fee (2% deducted):</span>
                        <span>-{feeToDeduct.toFixed(2)} USDm</span>
                      </div>
                      <div className="flex justify-between border-t border-orange-100/70 pt-1.5 text-slate-900 font-bold">
                        <span>Usable Escrow Balance:</span>
                        <span className="text-orange-600 font-black">{usableEscrow.toFixed(2)} USDm</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                      Reopening this campaign consumes this usable escrow balance. No additional payment is required if the new campaign budget is within this limit!
                    </p>
                  </div>
                );
              })()}

              {/* Local Nigerian Pricing Conversion Estimate Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Payout Per Worker:</span>
                  <span className="text-slate-900 font-bold">
                    {payoutValue.toFixed(2)} USDm (~₦{Math.round(payoutValue * USDM_TO_NGN_RATE)})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-200/50 pt-2">
                  <span className="text-slate-400 font-semibold">Total Campaign Budget:</span>
                  <span className="text-emerald-600 font-black">
                    {(payoutValue * slotsValue).toFixed(2)} USDm (~₦{Math.round(payoutValue * slotsValue * USDM_TO_NGN_RATE).toLocaleString()})
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
                  disabled={isReopening}
                  placeholder="Explain the purpose of this task to workers..."
                  value={createTaskForm.description}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 resize-none disabled:opacity-60"
                />
              </div>

              {/* Task Instructions */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Instructions (One per line)
                </label>
                <textarea
                  rows={3}
                  disabled={isReopening}
                  placeholder="e.g. Click link&#10;Follow @example&#10;Screenshot your follow status"
                  value={createTaskForm.instructionsText}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, instructionsText: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 resize-none disabled:opacity-60"
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
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors disabled:opacity-60"
                  disabled={isReopening}
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
                  disabled={isReopening}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, proofRequirements: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 disabled:opacity-60"
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
                  disabled={isReopening}
                  onChange={(e) => setCreateTaskForm({ ...createTaskForm, link: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 disabled:opacity-60"
                />
              </div>

              {/* Welcome Bonus Credit Option (if user has credit) */}
              {dbUserProfile?.taskCredit > 0 && !isReopening && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all animate-fade-in">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                      Welcome Bonus Credit
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                      {lockWelcomeCredit 
                        ? "Applied automatically from profile dashboard 🎁" 
                        : "Apply available welcome bonus credit to launch this campaign."}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      id="useWelcomeCreditCheckbox"
                      disabled={lockWelcomeCredit}
                      checked={useWelcomeCredit}
                      onChange={(e) => setUseWelcomeCredit(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 accent-emerald-500 cursor-pointer disabled:opacity-60"
                    />
                  </div>
                </div>
              )}
            </main>

            <div className={`p-4 bg-white border-t border-slate-100 flex-shrink-0 ${
              isStandaloneMode ? "pb-8" : "pb-4"
            }`}>
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-emerald-500 text-white rounded-xl text-xs font-bold hover:from-blue-700 hover:to-emerald-600 active:scale-95 transition-all shadow-md"
              >
                {isReopening ? "Reopen Campaign" : "Launch Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4b. SUBMIT TASK IDEA SCREEN */}
      {screen === "submit-idea" && (
        <div className="flex-1 flex flex-col bg-[#FAFAFC]">
          <header className="h-14 bg-white border-b border-slate-100 sticky top-0 z-45 px-4 flex items-center justify-between">
            <button
              onClick={() => {
                setScreen("main");
                setIdeaSubmitted(false);
              }}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-800" />
            </button>
            <span className="text-sm font-bold text-slate-900">Submit Task Idea</span>
            <div className="w-7 h-7" />
          </header>

          {ideaSubmitted ? (
            <main className="p-6 flex-grow flex flex-col items-center justify-center text-center space-y-5 max-w-sm mx-auto animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Idea Received!</h2>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                Thanks for your suggestion. The Tezra team reviews every idea — if it is approved,
                it will be launched as a paid task and you will be notified.
              </p>
              <button
                type="button"
                onClick={() => {
                  setScreen("main");
                  setIdeaSubmitted(false);
                }}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
              >
                Back to Home
              </button>
            </main>
          ) : (
            <form onSubmit={handleSubmitTaskIdea} className="flex-grow flex flex-col justify-between">
              <main className="p-4 space-y-5 overflow-y-auto max-h-[78vh] scrollbar-none">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1.5">
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-600" /> Earn by suggesting
                  </p>
                  <p className="text-[10px] font-medium text-blue-700/80 leading-relaxed">
                    Suggest a new task for an existing category, or propose a brand-new task
                    category for the Tezra community. Approved ideas get launched as paid tasks.
                  </p>
                </div>

                {/* Kind Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    What are you suggesting?
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/50 border border-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIdeaForm({ ...ideaForm, kind: "task" })}
                      className={`py-2.5 px-3 rounded-lg text-[11px] font-bold text-center transition-all ${
                        ideaForm.kind === "task"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      New Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdeaForm({ ...ideaForm, kind: "category" })}
                      className={`py-2.5 px-3 rounded-lg text-[11px] font-bold text-center transition-all ${
                        ideaForm.kind === "category"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      New Category
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {ideaForm.kind === "task" ? "Idea Title" : "Category Name"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={ideaForm.kind === "task" ? "e.g. Subscribe to a YouTube Channel" : "e.g. Educational & Learning Tasks"}
                    value={ideaForm.title}
                    onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                  />
                </div>

                {ideaForm.kind === "task" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Category
                    </label>
                    <select
                      value={ideaForm.category}
                      onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors uppercase tracking-wider"
                    >
                      {Object.entries(TASK_CATEGORIES).map(([catKey, cat]) => (
                        <option key={catKey} value={catKey}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Example Tasks
                    </label>
                    <textarea
                      rows={3}
                      placeholder="List 3–5 example tasks this category could contain. e.g. 'Take a coding quiz', 'Watch a lesson & summarize it'"
                      value={ideaForm.example_tasks}
                      onChange={(e) => setIdeaForm({ ...ideaForm, example_tasks: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 resize-none"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={ideaForm.kind === "task"
                      ? "Describe what workers should do, what proof they would submit, and why it would help."
                      : "Describe the category: what kind of tasks it groups, who it serves, and why Tezra should add it."}
                    value={ideaForm.description}
                    onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Suggested Payout (USDm) <span className="normal-case font-semibold text-slate-300">— optional</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 0.25"
                    value={ideaForm.suggested_payout}
                    onChange={(e) => setIdeaForm({ ...ideaForm, suggested_payout: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                  />
                </div>
              </main>

              <div className="p-4 bg-white border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmittingIdea || !ideaForm.title.trim() || !ideaForm.description.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold hover:from-blue-700 hover:to-emerald-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmittingIdea ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Idea"
                  )}
                </button>
              </div>
            </form>
          )}
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
                setActiveTab("profile");
                setProfileSubScreen("task-history");
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
              Go to Tasks
            </button>
          </div>
        </div>
      )}

      {/* Standalone PWA Pull-to-Refresh Indicator */}
      {isStandaloneMode && (pullDistance > 0 || isPullRefreshing) && (
        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
            opacity: Math.min(1, pullDistance / 40),
            transition: pullDistance === 0 || pullDistance === 45 ? "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s" : "none"
          }}
          className="fixed top-2 left-0 right-0 z-50 flex justify-center pointer-events-none"
        >
          <div className="bg-white/95 backdrop-blur shadow-md border border-slate-100 rounded-full p-2 flex items-center justify-center">
            <RotateCw
              className={`w-5 h-5 text-blue-600 ${
                isPullRefreshing ? "animate-spin" : ""
              }`}
              style={{
                transform: isPullRefreshing ? "none" : `rotate(${pullDistance * 4}deg)`
              }}
            />
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
                      Web3 Wallet (USDm)
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
                    <span className="text-slate-800">{(payoutValue * slotsValue).toFixed(2)} USDm</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Platform Fee ({PLATFORM_FEE_PERCENTAGE}%):</span>
                    <span className="text-slate-800">{((payoutValue * slotsValue) * (PLATFORM_FEE_PERCENTAGE / 100)).toFixed(2)} USDm</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">Admin Escrow Wallet:</span>
                    <span className="text-slate-800 font-mono text-[9px]">{formatAddress(PLATFORM_ESCROW_WALLET)}</span>
                  </div>
                  {dbUserProfile?.taskCredit > 0 && useWelcomeCredit && (
                    <div className="flex justify-between items-center border-t border-emerald-100/50 pt-2.5 text-emerald-600">
                      <span className="font-semibold">Available Welcome Credit:</span>
                      <span className="font-bold">-${dbUserProfile.taskCredit.toFixed(2)} USDm</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-slate-800/10 pt-2.5 text-slate-950 font-black text-sm">
                    <span>Total Deposit:</span>
                    <span className="text-emerald-600">{activeTransaction.amount}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                    Approx. ~₦{Math.round((payoutValue * slotsValue * (1 + PLATFORM_FEE_PERCENTAGE / 100)) * USDM_TO_NGN_RATE).toLocaleString()}
                  </div>
                </div>

                {/* USDm Balance Check */}
                {isConnected && paymentMethod !== "naira" && (() => {
                  const budget = payoutValue * slotsValue;
                  const fee = budget * (PLATFORM_FEE_PERCENTAGE / 100);
                  const credit = useWelcomeCredit ? (dbUserProfile?.taskCredit || 0) : 0;
                  const totalNeeded = Math.max(0, budget + fee - credit);
                  const hasEnough = userUsdmBalance >= totalNeeded;
                  return (
                    <div className={`rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center gap-2 ${hasEnough ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasEnough ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span>
                        Your USDm balance: <strong>{userUsdmBalance.toFixed(4)} USDm</strong>
                        {!hasEnough && (
                          <span className="block text-[10px] mt-0.5 text-red-600">⚠ Insufficient — need at least {totalNeeded.toFixed(4)} USDm. Fund your wallet first.</span>
                        )}
                      </span>
                    </div>
                  );
                })()}

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
                    disabled={isDepositing || (isConnected && paymentMethod !== "naira" && userUsdmBalance < Math.max(0, (payoutValue * slotsValue * (1 + PLATFORM_FEE_PERCENTAGE / 100)) - (useWelcomeCredit ? (dbUserProfile?.taskCredit || 0) : 0)))}
                    onClick={async () => {
                      const budget = payoutValue * slotsValue;
                      const fee = budget * (PLATFORM_FEE_PERCENTAGE / 100);
                      const credit = useWelcomeCredit ? (dbUserProfile?.taskCredit || 0) : 0;
                      const total = Math.max(0, budget + fee - credit);

                      // Prevent execution if disabled conditions are met
                      if (isDepositing || (isConnected && paymentMethod !== "naira" && userUsdmBalance < total)) {
                        return;
                      }

                      setIsDepositing(true);
                      try {
                        const task = pendingTxData?.newTask;
                        if (!task) return;

                        // Welcome credit completely covers the cost
                        if (total <= 0) {
                          const pendingTask = {
                            ...task,
                            status: "active",
                            transactionHash: "welcome-credit"
                          };
                          await saveNewTask(pendingTask);
                          setIsDepositing(false);
                          setActiveTransaction({
                            status: "success",
                            title: task.title,
                            amount: "0.00 USDm (Paid via Welcome Credit 🎁)",
                            txHash: undefined,
                            onClose: () => {
                              setActiveTransaction(null);
                            }
                          });
                          return;
                        }

                        if (!isConnected || paymentMethod === "naira") {
                          const pendingTask = {
                            ...task,
                            status: "pending_payment",
                            transactionHash: "manual-payment"
                          };
                          await saveNewTask(pendingTask);
                          setIsDepositing(false);
                          setActiveTransaction((prev) => prev ? { ...prev, status: "naira-checkout" } : null);
                          return;
                        }

                        if (!escrowContractAddress || escrowContractAddress === "0x0000000000000000000000000000000000000000") {
                          throw new Error("Escrow contract not configured for this network");
                        }

                        await addUsdmToMetaMask();
                        setActiveTransaction((prev) => prev ? {
                          ...prev,
                          status: "waiting-for-tx",
                          expectedAmount: total.toFixed(2),
                          expectedRecipient: escrowContractAddress
                        } : null);

                        // Step 1: Approve USDm spending (escrow contract as spender)
                        const approveParams = {
                          address: usdmAddress,
                          abi: ERC20_ABI,
                          functionName: "approve" as const,
                          args: [escrowContractAddress, parseEther(total.toFixed(18))] as const,
                          feeCurrency: usdmAddress,
                        } as any;
                        const approveTx = await (writeContractAsync as any)(approveParams);

                        // Step 2: Create campaign on escrow contract via hook
                        await createCampaign(task.id, payoutValue, slotsValue, expiryHours * 3600);

                        // Step 3: Scan blockchain
                        setActiveTransaction((prev) => prev ? { ...prev, status: "scanning-blockchain" } : null);

                        const result = await scanForUsdmTransaction(total.toFixed(2), escrowContractAddress, wagmiAddress!);

                        if (result.found) {
                          await saveNewTask(task);
                          setActiveTransaction((prev) => prev ? {
                            ...prev,
                            status: "success",
                            txHash: result.txHash,
                            userTxHash: result.txHash
                          } : null);
                        } else {
                          await saveNewTask(task);
                          setActiveTransaction((prev) => prev ? {
                            ...prev,
                            status: "success",
                            txHash: approveTx,
                            userTxHash: approveTx
                          } : null);
                        }
                        setIsDepositing(false);
                      } catch (err: any) {
                        console.error("Escrow deposit failed:", err);
                        let errorMsg = "Transaction failed or rejected.";
                        const errStr = String(err?.message || err || "");
                        if (errStr.includes("Campaign already exists")) {
                          errorMsg = "⚠ Campaign already exists on-chain for this task ID. Please create a new task.";
                        } else if (errStr.includes("insufficient allowance") || errStr.includes("ERC20: insufficient")) {
                          errorMsg = "⚠ Insufficient USDm allowance. The approve step may have failed. Please try again.";
                        } else if (errStr.includes("User rejected") || errStr.includes("user rejected")) {
                          errorMsg = "Transaction was rejected by wallet.";
                        } else if (errStr.includes("execution reverted")) {
                          const match = errStr.match(/reverted with reason string '(.+?)'/);
                          errorMsg = match ? `⚠ Contract reverted: "${match[1]}"` : "⚠ Contract execution reverted. Check your USDm balance and wallet connection.";
                        } else if (errStr.length > 0) {
                          errorMsg = errStr.slice(0, 200);
                        }
                        setActiveTransaction((prev) => prev ? {
                          ...prev,
                          status: "error",
                          title: errorMsg
                        } : null);
                        setIsDepositing(false);
                      }
                    }}
                    className={`flex-1 py-3 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                      isDepositing || (isConnected && paymentMethod !== "naira" && userUsdmBalance < Math.max(0, (payoutValue * slotsValue * (1 + PLATFORM_FEE_PERCENTAGE / 100)) - (useWelcomeCredit ? (dbUserProfile?.taskCredit || 0) : 0)))
                        ? "bg-slate-400 cursor-not-allowed opacity-60" 
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

            {activeTransaction.status === "waiting-for-tx" && (
              <div className="space-y-5 animate-fade-in">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">Waiting for Transaction</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans px-2">
                    MetaMask has opened. Please approve the USDm transaction in your wallet.
                  </p>
                </div>
                
                {/* Transaction Details */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Amount to Send:</span>
                    <span className="text-slate-800 font-bold text-emerald-600">{activeTransaction.expectedAmount} USDm</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">To (Escrow):</span>
                    <span className="text-slate-800 font-mono text-[9px] truncate max-w-[140px]">{formatAddress(activeTransaction.expectedRecipient || "")}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                    <span className="text-slate-400">From:</span>
                    <span className="text-slate-800 font-mono text-[9px] truncate max-w-[140px]">{formatAddress(wagmiAddress || "")}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/10 pt-2.5 text-slate-950 font-black text-sm">
                    <span>Total:</span>
                    <span className="text-emerald-600">{activeTransaction.expectedAmount} USDm</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      // I have done the transaction - scan blockchain
                      if (!activeTransaction.expectedAmount || !activeTransaction.expectedRecipient || !wagmiAddress) return;
                      
                      setActiveTransaction((prev) => prev ? { 
                        ...prev, 
                        status: "scanning-blockchain" 
                      } : null);
                      
                      const result = await scanForUsdmTransaction(
                        activeTransaction.expectedAmount!,
                        activeTransaction.expectedRecipient!,
                        wagmiAddress
                      );
                      
                      if (result.found) {
                        // Transaction found - complete the task creation
                        if (pendingTxData?.newTask) {
                          await saveNewTask(pendingTxData.newTask);
                        }
                        setActiveTransaction((prev) => prev ? { 
                          ...prev, 
                          status: "success", 
                          txHash: result.txHash,
                          userTxHash: result.txHash
                        } : null);
                      } else {
                        // Transaction not found yet - show error state with retry option
                        setActiveTransaction((prev) => prev ? { 
                          ...prev, 
                          status: "error",
                          title: "Transaction Not Found"
                        } : null);
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    I Have Done the Transaction
                  </button>

                  <button
                    type="button"
                    onClick={relaunchWallet}
                    className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    Retry Deposit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeTransaction.onClose) activeTransaction.onClose();
                    }}
                    className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel Transaction
                  </button>
                </div>
              </div>
            )}

            {activeTransaction.status === "scanning-blockchain" && (
              <div className="py-8 space-y-6 animate-fade-in">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-950">Scanning Blockchain</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">
                    Verifying your USDm transaction on Celo...
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 block bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-lg truncate max-w-[220px] mx-auto select-all">
                    Checking: {activeTransaction.expectedAmount} USDm → {formatAddress(activeTransaction.expectedRecipient || "")}
                  </span>
                </div>
              </div>
            )}

            {activeTransaction.status === "error" && (
              <div className="space-y-5 animate-fade-in">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <AlertCircle className="w-7 h-7 text-rose-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">{activeTransaction.title || "Transaction Not Found"}</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans px-2">
                    We couldn't find the transaction on the blockchain yet. This can happen if:
                  </p>
                </div>
                
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">1.</span>
                    <span>Transaction is still pending (wait a moment and try again)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">2.</span>
                    <span>Transaction was rejected or failed in MetaMask</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">3.</span>
                    <span>Wrong amount or recipient was sent</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      // Retry scanning
                      if (!activeTransaction.expectedAmount || !activeTransaction.expectedRecipient || !wagmiAddress) return;
                      
                      setActiveTransaction((prev) => prev ? { 
                        ...prev, 
                        status: "scanning-blockchain" 
                      } : null);
                      
                      const result = await scanForUsdmTransaction(
                        activeTransaction.expectedAmount!,
                        activeTransaction.expectedRecipient!,
                        wagmiAddress
                      );
                      
                      if (result.found) {
                        if (pendingTxData?.newTask) {
                          await saveNewTask(pendingTxData.newTask);
                        }
                        setActiveTransaction((prev) => prev ? { 
                          ...prev, 
                          status: "success", 
                          txHash: result.txHash,
                          userTxHash: result.txHash
                        } : null);
                      } else {
                        setActiveTransaction((prev) => prev ? { 
                          ...prev, 
                          status: "error" 
                        } : null);
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Scan Again
                  </button>

                  <button
                    type="button"
                    onClick={relaunchWallet}
                    className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    Retry Deposit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeTransaction.onClose) activeTransaction.onClose();
                    }}
                    className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
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
                  <h3 className="text-lg font-black text-slate-900">Naira ➔ USDm Payment Portal</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                    Send local Naira bank transfers to automatically deposit USDm into the Celo escrow wallet.
                  </p>
                </div>

                 <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">USDm Budget to Fund:</span>
                    <span className="text-slate-800 font-bold">{activeTransaction.amount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                    <span className="text-slate-400">Naira Exchange Amount:</span>
                    <span className="text-slate-800">
                      ₦{(() => {
                        const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
                        return Math.round(amountNum * USDM_TO_NGN_RATE).toLocaleString();
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Payment Gateway Fee (1.5%):</span>
                    <span className="text-slate-800">
                      ₦{(() => {
                        const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
                        const baseNaira = Math.round(amountNum * USDM_TO_NGN_RATE);
                        return Math.round(baseNaira * 0.015).toLocaleString();
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Network Fee Cover:</span>
                    <span className="text-slate-800">₦150</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/10 pt-2.5 text-slate-950 font-black text-xs">
                    <span>Total Naira Needed:</span>
                    <span className="text-purple-600 font-extrabold">
                      ₦{(() => {
                        const amountNum = parseFloat(activeTransaction.amount.replace(/[^\d.]/g, "")) || 1;
                        const baseNaira = Math.round(amountNum * USDM_TO_NGN_RATE);
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
                    This will initiate a blockchain transfer of USDm from the platform escrow/admin wallet directly to the worker.
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
                        const usdmAddress = getUsdmAddress(chainId);

                        // On-chain transfer of the accumulated amount to the worker
                        const transferParams = {
                          address: usdmAddress,
                          abi: ERC20_ABI,
                          functionName: "transfer" as const,
                          args: [workerWallet as `0x${string}`, amountWei] as const,
                          type: "legacy" as const,
                          feeCurrency: usdmAddress,
                        } as any;
                        const txHash = await (writeContractAsync as any)(transferParams);

                        // Update the withdrawal request to completed in Firestore
                        if (pendingTxData?.withdrawal?.id) {
                          await updateDoc(doc(db, "withdrawals", pendingTxData.withdrawal.id), {
                            status: "completed",
                            txHash,
                            paidAt: new Date().toISOString()
                          });

                          try {
                            const withdrawalsSnap = await getDocs(collection(db, "withdrawals"));
                            const completedWithdrawals = withdrawalsSnap.docs.filter(d => d.data().status === "completed" && d.id !== pendingTxData.withdrawal.id);
                            if (completedWithdrawals.length === 0) {
                              const recipientWallet = pendingTxData.withdrawal.wallet_address;
                              if (recipientWallet) {
                                const recipientUserRef = doc(db, "users", recipientWallet.toLowerCase());
                                const recipientSnap = await getDoc(recipientUserRef);
                                if (recipientSnap.exists()) {
                                  const currentBadges = recipientSnap.data().badges || {};
                                  if (!currentBadges.first_payout) {
                                    currentBadges.first_payout = new Date().toISOString();
                                    await updateDoc(recipientUserRef, { badges: currentBadges });
                                    const recipientData = recipientSnap.data();
                                    if (recipientData.email) {
                                      fetch("/api/send-email", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          action: "badge_unlock",
                                          payload: {
                                            toEmail: recipientData.email,
                                            badgeName: "First Withdraw",
                                            badgeEmoji: "💸",
                                            badgeDescription: "First worker to request and complete a payout withdrawal",
                                            xpReward: 100,
                                          },
                                        }),
                                      }).catch(err => console.error("Failed to send first payout email:", err));
                                    }
                                  }
                                }
                              }
                            }
                          } catch (err) {
                            console.error("Error in first_payout badge award check:", err);
                          }
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
                    Transferring accumulated USDm to worker...
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

      {/* ===== XP STATUS NOTIFICATION MODAL ===== */}
      {pendingNotif && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 text-center space-y-5 animate-scale-up">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-xl bg-slate-50 border border-slate-100">
              {pendingNotif.type === "success" ? "🎉" : "⚠️"}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                {pendingNotif.type === "success" ? "Submission Approved!" : "Submission Rejected"}
              </h3>
              <p className="text-xs text-slate-500 font-bold font-mono px-2 py-1 bg-slate-50 rounded-lg inline-block max-w-full truncate">
                {pendingNotif.title}
              </p>
              <p className={`text-xs font-semibold leading-relaxed ${
                pendingNotif.type === "success" ? "text-emerald-600" : "text-rose-600"
              }`}>
                {pendingNotif.msg}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPendingNotif(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Great, thanks!
            </button>
          </div>
        </div>
      )}

      {/* ===== STREAK MILESTONE CELEBRATION MODAL ===== */}
      {streakMilestoneNotif !== null && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 text-center space-y-5 animate-scale-up">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-orange-50 border border-orange-100 animate-bounce">
              🔥
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                Streak Milestone Unlocked!
              </h3>
              <p className="text-2xl font-black text-orange-600 font-mono">
                {streakMilestoneNotif} Day Streak
              </p>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Incredible dedication! You have successfully completed tasks on {streakMilestoneNotif} consecutive days. Keep it hot!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStreakMilestoneNotif(null)}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 hover:brightness-105"
            >
              Keep Burning!
            </button>
          </div>
        </div>
      )}

      {/* ===== REFERRAL CONTEST WELCOME MODAL ===== */}
      {showContestPopup && contestConfig && contestConfig.status !== "idle" && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 text-center space-y-5 animate-scale-up">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-blue-50 border border-blue-100">
              🏆
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                {contestConfig.status === "coming_soon" ? "Referral Contest Coming Soon!" : "Referral Contest Is Active!"}
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Secure your slot today! Stand a chance to earn from the <strong className="text-emerald-600">{contestConfig.prizePool} USDm</strong> bounty pool (1st gets 10 USDm, 2nd & 3rd get 5 USDm). Top referrers also get public recognition and task creation credits!
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowContestPopup(false);
                  sessionStorage.setItem(`tezra_contest_${contestConfig.status}_dismissed`, "true");
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={handleRegisterForContest}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Join Contest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== REFERRAL WELCOME MODAL ===== */}
      {showReferralWelcome && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 text-center space-y-5 animate-scale-up">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-blue-50 border border-blue-100">
              🎁
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                Referral Invite Accepted!
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed font-sans">
                You just accessed Tezra using a referral link! 
              </p>
              <div className="bg-slate-50 p-4.5 rounded-2xl text-left border border-slate-100 space-y-2.5">
                <p className="text-[10px] text-slate-600 font-bold leading-normal">
                  🔥 Complete your first task: Get a bonus of <span className="text-blue-600 font-black">0.02 USDm</span> back, plus the task's payout!
                </p>
                <p className="text-[10px] text-slate-600 font-bold leading-normal">
                  🚀 Launch your first campaign: Get a <span className="text-emerald-600 font-black">0.05 USDm</span> cashback reward credited directly to your balance!
                </p>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-2">
                Connect your wallet to get started!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowReferralWelcome(false)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Let's Earn!
            </button>
          </div>
        </div>
      )}

      {/* ===== REFERRALS TRACKING MODAL ===== */}
      {showReferralsModal && (() => {
        const stats = getReferralStats();
        return (
          <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 flex flex-col max-h-[85vh] animate-scale-up">
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">Referrals</h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Real-time statistics</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferralsModal(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-100 p-1.5 rounded-lg active:scale-95 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Total Stats Summary Cards */}
              <div className="grid grid-cols-2 gap-3 py-4 flex-shrink-0">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Referrals</span>
                  <span className="text-xl font-black text-slate-800 mt-1 block">{stats.count}</span>
                </div>
                <div className="bg-blue-50/30 border border-blue-100/50 p-3 rounded-2xl text-center">
                  <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider block">Referral Earnings</span>
                  <span className="text-xl font-black text-blue-600 mt-1 block">
                    {formatCurrencyVal(stats.totalEarnings)}
                  </span>
                </div>
              </div>

              {/* Referred Users List */}
              <div className="flex-grow overflow-y-auto space-y-3 pr-1 py-1 scrollbar-none min-h-[150px]">
                {stats.details.length > 0 ? (
                  stats.details.map((ru, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 p-3 rounded-2xl space-y-2 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {formatAddress(ru.wallet)}
                        </span>
                        <span className="text-xs font-black text-emerald-600">
                          +{formatCurrencyVal(ru.earned)}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className={`px-2 py-0.5 rounded ${ru.tasksCompleted > 0 ? "bg-blue-50 text-blue-700 border border-blue-100/30" : "bg-slate-50 text-slate-400"}`}>
                          Task Done: {ru.tasksCompleted > 0 ? "YES" : "NO"}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${ru.hasCreatedCampaign ? "bg-emerald-50 text-emerald-700 border border-emerald-100/30" : "bg-slate-50 text-slate-400"}`}>
                          Campaign: {ru.hasCreatedCampaign ? "YES" : "NO"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No referred users yet. Share your link to start earning!
                  </div>
                )}
              </div>
              {/* Bottom Action */}
              <button
                type="button"
                onClick={() => setShowReferralsModal(false)}
                className="w-full py-3.5 mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex-shrink-0"
              >
                Close Ledger
              </button>
            </div>
          </div>
        );
      })()}

      {/* ===== REFERRAL CONTEST LEADERBOARD MODAL ===== */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 flex flex-col max-h-[80vh] animate-scale-up">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Contest Leaderboard</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {contestConfig?.status === "coming_soon" ? "Coming Soon • " : "Active • "}
                    {contestLeaderboard.length} Users Registered
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-100 p-1.5 rounded-lg active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Leaderboard Scrollable Table List */}
            <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-2 scrollbar-none">
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider pb-1 flex justify-between">
                <span>Participant ({contestLeaderboard.length})</span>
                <span>Earnings (USDm)</span>
              </div>
              
              {contestLeaderboard.length > 0 ? (
                contestLeaderboard.map((participant, index) => {
                  const isCurrentUser = participant.wallet_address?.toLowerCase() === activeAddress?.toLowerCase();
                  const nameStr = participant.username 
                    ? `@${participant.username.replace(/^@/, '')}` 
                    : (participant.displayName || formatAddress(participant.wallet_address || ""));
                  return (
                    <div
                      key={participant.wallet_address || index}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-[10px] font-bold ${
                        isCurrentUser
                          ? "bg-blue-50/40 border-blue-100 text-blue-700"
                          : "bg-white border-slate-100 text-slate-700 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[9px]">#{index + 1}</span>
                        <span className="font-semibold text-slate-700">
                          {nameStr}
                          {isCurrentUser && <span className="ml-1 text-[8px] font-sans font-black text-blue-600">(You)</span>}
                        </span>
                      </div>
                      <span className={isCurrentUser ? "text-blue-700" : "text-slate-900 font-mono"}>
                        {formatCurrencyVal(participant.contestReferralEarnings || 0)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-[10px] text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-slate-100/50">
                  No participants registered yet.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <button
              type="button"
              onClick={() => setShowLeaderboardModal(false)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex-shrink-0"
            >
              Close Leaderboard
            </button>
          </div>
        </div>
      )}

      {/* ===== CUSTOM WITHDRAWAL MODAL ===== */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 flex flex-col space-y-5 animate-scale-up">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Withdraw Earnings</h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Connected: {isMiniPayApp ? "via MiniPay" : formatAddress(wagmiAddress || "")}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-100 p-1.5 rounded-lg active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Input Amount Display & Max Button */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Withdrawal Amount (USDm)
              </label>
              <div className="flex items-center border border-slate-200 rounded-2xl bg-white overflow-hidden p-1.5 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min={1.00}
                  max={dbUserBalance}
                  value={withdrawAmountInput}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setWithdrawAmountInput(Math.min(dbUserBalance, val));
                  }}
                  className="flex-1 px-3 py-2 bg-transparent text-sm font-black text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setWithdrawAmountInput(dbUserBalance)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Slider (Lever) */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Min: 1.00 USDm</span>
                <span>Max: {dbUserBalance.toFixed(2)} USDm</span>
              </div>
              <input
                type="range"
                min={1.00}
                max={Math.max(1.00, dbUserBalance)}
                step={0.01}
                value={withdrawAmountInput}
                onChange={(e) => setWithdrawAmountInput(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Warning / Notes */}
            <p className="text-[9px] text-slate-400 leading-normal font-semibold">
              Payouts are processed off-chain from our secure escrow multi-sig onto Celo. Requests usually resolve in under 24 hours.
            </p>

            {/* Submit Action */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (withdrawAmountInput < 1.00) {
                    alert("Minimum withdrawal is 1.00 USDm.");
                    return;
                  }
                  await handleRequestWithdrawal(withdrawAmountInput);
                  setShowWithdrawModal(false);
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADMIN DELETE CAMPAIGN CONFIRMATION MODAL ===== */}
      {adminDeleteTaskId && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 text-center space-y-5 animate-scale-up">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-xl bg-rose-50 border border-rose-100 text-rose-600">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-950 tracking-tight uppercase">
                Delete Campaign?
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Are you sure you want to delete this campaign? This action is permanent, will erase it from Firestore, and cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAdminDeleteTaskId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteDoc(doc(db, "tasks", adminDeleteTaskId));
                    alert("Campaign deleted successfully from Firestore.");
                  } catch (err: any) {
                    alert("Failed to delete campaign: " + err.message);
                  }
                  setAdminDeleteTaskId(null);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
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

      {/* ===== BADGES / ACHIEVEMENTS MODAL ===== */}
      {showBadgesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 space-y-6 animate-scale-up max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                  <span>🏆</span> Achievements & Badges
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed font-sans uppercase tracking-wider">
                  Complete milestones to unlock unique collectible visual proofs!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBadgesModal(false)}
                className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              {Object.keys(BADGES_METADATA).sort((a, b) => {
                const aUnlocked = Array.isArray(dbUserProfile?.badges)
                  ? dbUserProfile.badges.includes(a)
                  : !!dbUserProfile?.badges?.[a];
                const bUnlocked = Array.isArray(dbUserProfile?.badges)
                  ? dbUserProfile.badges.includes(b)
                  : !!dbUserProfile?.badges?.[b];
                if (aUnlocked && !bUnlocked) return -1;
                if (!aUnlocked && bUnlocked) return 1;
                return 0;
              }).map((key) => {
                const badge = BADGES_METADATA[key];
                const isUnlocked = Array.isArray(dbUserProfile?.badges)
                  ? dbUserProfile.badges.includes(key)
                  : !!dbUserProfile?.badges?.[key];
                const unlockedAt = isUnlocked
                  ? (Array.isArray(dbUserProfile?.badges)
                      ? dbUserProfile?.emailSubmittedAt || dbUserProfile?.created_at || new Date().toISOString()
                      : dbUserProfile?.badges?.[key])
                  : null;

                return (
                  <div 
                    key={key} 
                    className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                      isUnlocked 
                        ? "bg-slate-50/50 border-slate-200/80 shadow-sm" 
                        : "bg-white border-slate-100 opacity-60"
                    }`}
                  >
                    {/* Badge Icon */}
                    <div className="flex-shrink-0">
                      {badge.icon(isUnlocked ? "color" : "gray")}
                    </div>

                    {/* Badge Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold ${isUnlocked ? "text-slate-900" : "text-slate-400"}`}>
                        {badge.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">
                        {badge.description}
                      </p>
                      {isUnlocked && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                            🎉 Acquired: {(() => {
                              if (!unlockedAt) return new Date().toLocaleDateString();
                              const d = (unlockedAt as any).toDate ? (unlockedAt as any).toDate() : new Date(unlockedAt);
                              return isNaN(d.getTime()) ? new Date().toLocaleDateString() : d.toLocaleDateString();
                            })()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowBadgesModal(false);
                              setUnlockedBadgeInfo({
                                id: key,
                                title: badge.name,
                                description: badge.description,
                                icon: badge.emoji,
                                xpReward: badge.xp,
                              });
                            }}
                            className="text-[9px] bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition whitespace-nowrap"
                          >
                            <Share2 className="w-2.5 h-2.5" />
                            <span>Share Card</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowBadgesModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 mt-2"
            >
              Close Window
            </button>
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

      {/* ===== EMAIL GIFT CLAIM MODAL ===== */}
      {activeAddress && (
        <EmailModal
          walletAddress={activeAddress}
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            sessionStorage.setItem(`tezra_email_prompt_dismissed_${activeAddress.toLowerCase()}`, "true");
          }}
          onSuccess={(badge) => {
            setShowEmailModal(false);
            setPendingBadgeUnlock(badge);
            setShowCertificate(true);
          }}
        />
      )}

      {/* ===== PROFILE EDIT MODAL ===== */}
      {showProfileEdit && activeAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
            <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setShowProfileEdit(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                <p className="text-xs text-slate-400">Update your display name, avatar, or email</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2"
                  style={{
                    background: `linear-gradient(135deg, ${["#059669","#7c3aed","#d97706","#0284c7"][(dbUserProfile?.avatarDesign ?? 0) % 4]}, ${["#10b981","#a78bfa","#f59e0b","#38bdf8"][(dbUserProfile?.avatarDesign ?? 0) % 4]})`,
                    borderColor: ["#34d399","#c4b5fd","#fcd34d","#7dd3fc"][(dbUserProfile?.avatarDesign ?? 0) % 4],
                  }}
                >
                  {profileEditAvatarPreview ? (
                    <img src={profileEditAvatarPreview} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : dbUserProfile?.avatarUrl ? (
                    <img src={dbUserProfile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (profileEditName || dbUserProfile?.displayName || activeAddress.slice(2, 3).toUpperCase() || "?")
                  )}
                </div>
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700">
                  Upload Avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProfileEditAvatar(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) {
                            setProfileEditAvatarPreview(ev.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileEditName}
                  onChange={(e) => setProfileEditName(e.target.value.slice(0, 20))}
                  placeholder="Your display name"
                  maxLength={20}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
                />
                <p className="text-[10px] text-slate-500 mt-1">Max 20 characters. Leave empty to use wallet address.</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEditEmail}
                  onChange={(e) => setProfileEditEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileEdit(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setProfileSaving(true);
                    try {
                      const userRef = doc(db, "users", activeAddress.toLowerCase());
                      const updateData: any = { updated_at: new Date().toISOString() };

                      if (profileEditName.trim()) {
                        updateData.displayName = profileEditName.trim();
                      } else {
                        updateData.displayName = "";
                      }

                      if (profileEditEmail.trim() && profileEditEmail.includes("@")) {
                        updateData.email = profileEditEmail.trim().toLowerCase();
                      }

                      if (profileEditAvatar) {
                        // Validate file size (max 5MB)
                        if (profileEditAvatar.size > 5 * 1024 * 1024) {
                          alert("Avatar image must be under 5MB. Please choose a smaller file.");
                          setProfileSaving(false);
                          return;
                        }
                        const downloadUrl = await uploadToCloudinary(profileEditAvatar);
                        updateData.avatarUrl = downloadUrl;
                      }

                      await updateDoc(userRef, updateData);
                      setDbUserProfile((prev: any) => ({ ...prev, ...updateData }));
                      setShowProfileEdit(false);
                    } catch (err: any) {
                      console.error("Failed to save profile:", err?.code, err?.message, err);
                      const msg = err?.code === "storage/unauthorized"
                        ? "Storage permission denied. Please contact support."
                        : err?.code === "storage/quota-exceeded"
                        ? "Storage quota exceeded. Please contact support."
                        : err?.code === "storage/canceled"
                        ? "Upload was cancelled. Please try again."
                        : `Failed to save profile: ${err?.message || "Please try again."}`;
                      alert(msg);
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  disabled={profileSaving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {profileSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== BADGE UNLOCK CELEBRATION & SHARE MODAL ===== */}
      <BadgeUnlockModal
        badge={unlockedBadgeInfo}
        onClose={() => setUnlockedBadgeInfo(null)}
        displayName={dbUserProfile?.displayName}
        avatarUrl={dbUserProfile?.avatarUrl}
        avatarDesign={dbUserProfile?.avatarDesign}
        walletAddress={activeAddress}
      />

      {/* ===== MEMBER CERTIFICATE MODAL ===== */}
      <CertificateModal
        isOpen={showCertificate}
        displayName={dbUserProfile?.displayName || ""}
        walletAddress={activeAddress || ""}
        avatarUrl={dbUserProfile?.avatarUrl}
        avatarDesign={dbUserProfile?.avatarDesign}
        onClose={() => {
          setShowCertificate(false);
          // Chain to badge unlock celebrating modal if pending
          if (pendingBadgeUnlock) {
            setTimeout(() => {
              setUnlockedBadgeInfo(pendingBadgeUnlock);
              setPendingBadgeUnlock(null);
            }, 2500);
          }
        }}
      />

      {/* ===== PAYMENT CERTIFICATE CELEBRATION MODAL ===== */}
      {showPaymentCertificate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-5 animate-fade-in font-sans">
          {/* Shimmer Border Container */}
          <div className="bg-slate-900 border-2 border-amber-500/40 text-white rounded-3xl p-6 shadow-2xl relative w-full max-w-md overflow-hidden text-center flex flex-col items-center">
            
            {/* Holographic shifting gold background detail */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-gradient-to-br from-amber-400/20 to-yellow-600/20 rounded-full blur-[60px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-gradient-to-tr from-emerald-400/20 to-teal-600/20 rounded-full blur-[60px] pointer-events-none animate-pulse" />

            {/* Sparkles Particle Micro-animations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-1/5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce delay-75" />
              <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-ping delay-200" />
              <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300" />
              <div className="absolute bottom-1/3 right-1/5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping delay-500" />
            </div>

            {/* Glowing Trophy Seal */}
            <div className="relative mb-5 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/5">
              <Trophy className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>

            <h3 className="text-xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent uppercase tracking-wider">
              Payment Certificate
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">
              Tezra Microwork Network
            </span>

            <div className="w-full border-t border-slate-800/80 my-4.5" />

            {/* Details Table */}
            <div className="w-full space-y-3.5 text-left font-sans text-xs">
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Quest / Campaign</span>
                <span className="text-slate-200 font-black text-right truncate max-w-[200px]">{questPayoutTitle || "Social Quest Payout"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Winner Address</span>
                <span className="text-amber-400 font-mono font-black text-right">
                  {questPayoutWinner ? `${questPayoutWinner.substring(0, 8)}...${questPayoutWinner.substring(questPayoutWinner.length - 6)}` : ""}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Amount Paid</span>
                <span className="text-emerald-400 font-black text-sm">{parseFloat(questPayoutAmount || "0").toFixed(2)} USDm</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/50 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Status</span>
                <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                  Success
                </span>
              </div>
              {questPayoutTxHash && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Transaction Hash</span>
                  <a
                    href={`https://celo.blockscout.com/tx/${questPayoutTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-mono text-[10px] break-all hover:underline flex items-center gap-1.5"
                  >
                    {questPayoutTxHash}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <div className="w-full border-t border-slate-800/80 my-4.5" />

            <div className="w-full flex gap-3">
              <button
                type="button"
                onClick={() => {
                  alert("💡 Tip: Take a screenshot of this certificate to save it or share directly on X/Twitter!");
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl active:scale-95 transition-all uppercase tracking-wider border border-slate-700"
              >
                Share Certificate
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentCertificate(false)}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90 text-white text-xs font-black rounded-xl active:scale-95 transition-all uppercase tracking-wider"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== INTERACTIVE ONBOARDING TOUR ===== */}
      <OnboardingTour
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        enabled={!showEmailModal && !showCertificate && !unlockedBadgeInfo && !pendingBadgeUnlock && !!dbUserProfile?.displayName}
      />

      {/* ===== FLOATING PWA INSTALLATION TRIGGER (Web browser only) ===== */}
      {!isStandaloneMode && (
        <>
          <button
            type="button"
            onClick={() => setShowPwaModal(true)}
            className="fixed bottom-24 left-4 z-40 p-2.5 bg-slate-900 border border-slate-800 rounded-full shadow-lg active:scale-95 transition-all animate-bounce hover:bg-slate-800 flex items-center justify-center"
            title="Install Tezra App"
          >
            <div className="relative">
              <TezraLogo className="w-6 h-6 text-white animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
          </button>

          {/* ===== PWA INSTALLATION MODAL ===== */}
          {showPwaModal && (
            <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
              <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 flex flex-col space-y-4 animate-scale-up">
                {/* Header */}
                <div className="flex justify-between items-start pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-2xl">
                      <TezraLogo className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">Install Tezra App</h3>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Add to Home Screen</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPwaModal(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-100 p-1.5 rounded-lg active:scale-95 transition-all"
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Add Tezra to your home screen for a full-screen standalone experience, faster loading times, and instant push notifications for task approvals!
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-semibold text-slate-600 leading-normal space-y-2">
                  <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[9px]">How to Install:</p>
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>Tap the browser's <strong>Share</strong> button (on iOS Safari) or the <strong>Menu</strong> icon (on Android Chrome).</li>
                    <li>Select <strong>Add to Home Screen</strong> from the list.</li>
                    <li>Launch the app from your home screen and enable notifications!</li>
                  </ol>
                </div>

                {/* Footer Action */}
                <button
                  type="button"
                  onClick={() => setShowPwaModal(false)}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContractSettings({ escrowAddress, adminWallet, writeContractAsync, isConnected, onConnect, onBack }: {
  escrowAddress: `0x${string}`;
  adminWallet: string;
  writeContractAsync: any;
  isConnected?: boolean;
  onConnect?: (() => void) | undefined;
  onBack: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const { address: connectedWallet } = useAccount();
  const chainId = useChainId();
  const usdmAddress = getUsdmAddress(chainId);

  const { data: contractOwner } = useReadContract({
    address: escrowAddress && escrowAddress !== "0x0000000000000000000000000000000000000000" ? escrowAddress : undefined,
    abi: ESCROW_ABI,
    functionName: "owner",
    query: { enabled: escrowAddress !== "0x0000000000000000000000000000000000000000" },
  });

  const isOwnerConnected = contractOwner && connectedWallet &&
    contractOwner.toString().toLowerCase() === connectedWallet.toLowerCase();

  const handleUpdateOwner = async () => {
    if (!isConnected) {
      if (onConnect) onConnect();
      else alert("Please connect your wallet first.");
      return;
    }
    if (!escrowAddress || escrowAddress === "0x0000000000000000000000000000000000000000") {
      alert("Escrow contract not deployed on this network");
      return;
    }
    setIsUpdating(true);
    setUpdateMsg("Check your wallet — confirm the transaction to proceed...");
    try {
      const ownerParams = {
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: "updateOwner" as const,
        args: [adminWallet as `0x${string}`] as const,
        type: "legacy" as const,
        feeCurrency: usdmAddress,
      } as any;
      const txPromise = (writeContractAsync as any)(ownerParams);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 90000)
      );
      await Promise.race([txPromise, timeout]);
      setUpdateMsg("Owner updated successfully! Fees will now be sent to the admin wallet.");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "timeout") {
        setUpdateMsg("No response from wallet. Make sure your wallet is connected and try again.");
      } else if (msg.includes("rejected")) {
        setUpdateMsg("Transaction was rejected in wallet.");
      } else if (msg.includes("Only owner")) {
        setUpdateMsg("Only the contract owner can update ownership. Switch to the owner wallet in MetaMask and try again.");
      } else {
        setUpdateMsg("Failed: " + msg.slice(0, 100));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans">Contract Settings</h2>
          <span className="text-xs text-slate-400 font-semibold block">
            Manage escrow contract ownership and fee collection
          </span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Escrow Contract</span>
          <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs text-slate-800 select-all truncate flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {escrowAddress !== "0x0000000000000000000000000000000000000000" ? escrowAddress : "Not deployed on this network"}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Contract Owner</span>
          <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs text-slate-800 select-all truncate flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {contractOwner ? (contractOwner as string) : "Loading..."}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Connected Wallet</span>
          <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs text-slate-800 select-all truncate flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {connectedWallet || "Not connected"}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Wallet (New Owner)</span>
          <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs text-slate-800 select-all truncate flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {adminWallet}
          </div>
        </div>

        {contractOwner && (
          <div className={`rounded-xl p-3 text-xs font-semibold ${isOwnerConnected ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-800 border border-amber-100"}`}>
            {isOwnerConnected ? (
              <span>You are connected as the contract owner. Click the button to transfer ownership to the admin wallet.</span>
            ) : (
              <span>
                <strong>Switch wallets:</strong> You are connected as <code className="bg-amber-100 px-1 rounded">{connectedWallet ? connectedWallet.slice(0, 6) + "..." + connectedWallet.slice(-4) : "unknown"}</code>, 
                but the contract owner is <code className="bg-amber-100 px-1 rounded">{(contractOwner as string).slice(0, 6) + "..." + (contractOwner as string).slice(-4)}</code>. 
                Switch to the owner wallet in MetaMask to proceed.
              </span>
            )}
          </div>
        )}

        {escrowAddress !== "0x0000000000000000000000000000000000000000" && (
          <button
            type="button"
            disabled={isUpdating || !isOwnerConnected}
            onClick={handleUpdateOwner}
            className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
              isOwnerConnected
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isUpdating ? (
              <><RotateCw className="w-4 h-4 animate-spin" /> Confirming...</>
            ) : (
              <><RotateCw className="w-4 h-4" /> Set Owner to Admin Wallet</>
            )}
          </button>
        )}

        {updateMsg && (
          <div className={`rounded-xl p-3 text-xs font-semibold ${updateMsg.includes("successfully") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
            {updateMsg}
          </div>
        )}
      </div>
    </div>
  );
}

