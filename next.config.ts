import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

// Only wrap with Serwist in production builds (webpack mode)
// In dev, Turbopack is used and Serwist isn't compatible
let exportedConfig: NextConfig = nextConfig;

if (process.env.NODE_ENV === "production") {
  // Dynamic import workaround for conditional config
  const withSerwistInit = require("@serwist/next").default;
  const withSerwist = withSerwistInit({
    swSrc: "src/sw.ts",
    swDest: "public/sw.js",
  });
  exportedConfig = withSerwist(nextConfig);
}

export default exportedConfig;
