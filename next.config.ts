import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The root layout lives under app/[lang], so unmatched URLs need app/global-not-found.tsx.
    globalNotFound: true,
  },
};

export default nextConfig;
