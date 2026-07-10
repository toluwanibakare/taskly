const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    }
    return config
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry org & project — fill these in from sentry.io after creating a project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map uploads during build (set in CI/Vercel env vars)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silences noisy Sentry build output
  silent: true,

  // Upload source maps to Sentry for readable stack traces in production
  // Set to false if you don't want source maps uploaded (saves build time)
  sourcemaps: {
    disable: false,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Hides Sentry's tunnel route from the browser network tab
  hideSourceMaps: true,
});
