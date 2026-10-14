import type { NextConfig } from "next";

// NOTE: env loading is NOT done here. Next.js core calls its internal
// `loadEnvConfig` before this file is evaluated and caches the result, so a
// `loadEnvConfig(<repo-root>)` call here would be a silent no-op (verified).
// Instead, `lib/env.ts` loads the repo-root `.env*` files at runtime as
// lowest precedence — this works in `dev`, `build`, `start`, and standalone.
// Production must still set variables in the hosting platform's env manager;
// see `../.env.example`.

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  allowedDevOrigins: ['192.168.100.69'],
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