import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/**/*", "./prisma/schema.prisma"],
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // avatars Google
      { protocol: "https", hostname: "flagcdn.com" }, // drapeaux de secours
      { protocol: "https", hostname: "media.api-sports.io" }, // logos API-Football
    ],
  },
};

export default nextConfig;
