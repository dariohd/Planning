import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/bulle/:path*",
        destination: "https://bullechatbot.vercel.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
