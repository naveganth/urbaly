import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://urbaly.gabrielataide.com/v1/db/:path*",
      },
    ];
  },
};

export default nextConfig;