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
    optimizePackageImports: ["lucide-react", "motion"],
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
  async headers() {
    return [
      {
        // The service worker must never be served from the HTTP cache stale,
        // or updates stop reaching clients. Scope header is explicit even
        // though /sw.js already gets root scope by default.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Icons are regenerated only when the logo changes (npm run icons);
        // content-hashed by name bump, so long-lived caching is safe.
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;