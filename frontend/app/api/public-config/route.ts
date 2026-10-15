import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Exposes ONLY the two browser-required public values (CARTO fallback key,
 * Google OAuth client ID). The map boots on keyless OpenFreeMap; the browser
 * calls CARTO tile servers only on OpenFreeMap fallback, and Google Identity
 * Services directly. Everything else in `lib/env.ts` stays on the server.
 * Cacheable: values change per deploy.
 */
export async function GET() {
  const { cartoApiKey, googleClientId } = getServerEnv();
  return NextResponse.json(
    { cartoApiKey, googleClientId },
    { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
  );
}
