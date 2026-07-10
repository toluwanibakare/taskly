import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of the transactions in development.
  // Reduce this in production (e.g. 0.1 = 10%) to stay within quota limits.
  tracesSampleRate: 0.2,

  // Replay settings for session recording (helps debug UX issues)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Only initialize Sentry if DSN is present (prevents errors in local dev without key)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Useful for filtering noise from known/expected errors
  ignoreErrors: [
    "User rejected the request",
    "MetaMask",
    "wallet_requestPermissions",
    "Non-Error exception captured",
  ],
});
