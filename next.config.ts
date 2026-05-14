import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    clientTraceMetadata: ["sentry-trace", "baggage"],
  },
};

export default withSentryConfig(nextConfig, {
  org: "asukare",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
});
