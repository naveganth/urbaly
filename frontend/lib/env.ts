/**
 * Centralized environment access for Urbaly. Server-only — never import this
 * from client components (it throws in the browser).
 *
 * Rules:
 * - No `NEXT_PUBLIC_*` variables are used. All values are read on the server.
 * - `CARTO_API_KEY` / `GOOGLE_CLIENT_ID` must still reach the browser (map
 *   tiles and Google sign-in run client-side), so the server exposes just
 *   those two via `/api/public-config`. Nothing else leaves the server.
 *   They are public by design: protect them with provider-side restrictions
 *   (CARTO HTTP-referrer allowlist, Google authorized origins), not secrecy.
 * - Backend URLs (`API_BASE_URL` / `AUTH_BASE_URL`) never leave the server.
 * - Missing config degrades loudly (server console warning) instead of
 *   silently pointing at the wrong backend.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import dotenv from 'dotenv';

const PROD_API_BASE_URL = 'https://urbaly.gabrielataide.com/v1/db';
const PROD_AUTH_BASE_URL = 'https://urbaly.gabrielataide.com/v1/auth';
const DEV_API_BASE_URL = 'http://localhost:8080/v1/db';
const DEV_AUTH_BASE_URL = 'http://localhost:8080/v1/auth';

let rootEnvLoaded = false;

/**
 * Loads the repo-root `.env*` files as lowest precedence.
 *
 * Why this exists: Next.js only auto-loads `frontend/.env*`, and its
 * internal `loadEnvConfig` call runs before `next.config.ts` and caches —
 * so a config-time `loadEnvConfig(<repo-root>)` is a silent no-op (verified
 * against the installed @next/env: subsequent calls return the cached
 * result unless force-reloaded). Loading here at runtime works in every
 * mode (`dev`, `build`, `start`, standalone): only keys that are still
 * unset are filled, so platform env and `frontend/.env*` always win. When
 * the file doesn't exist (Vercel, Docker, standalone) this is a no-op.
 */
function ensureRootEnvLoaded() {
  if (rootEnvLoaded) return;
  rootEnvLoaded = true;
  const envName = process.env.NODE_ENV === 'test' ? 'test' : process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const candidates = [process.cwd(), path.resolve(process.cwd(), '..')];
  for (const dir of candidates) {
    // The repo root is the dir containing frontend/package.json.
    if (!fs.existsSync(path.join(dir, 'frontend', 'package.json'))) continue;
    for (const file of [`.env.${envName}.local`, ...(envName === 'test' ? [] : ['.env.local']), `.env.${envName}`, '.env']) {
      const filePath = path.join(dir, file);
      if (!fs.existsSync(filePath)) continue;
      dotenv.config({ path: filePath });
    }
    break;
  }
}

const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

function readTrimmed(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function resolveServerUrl(
  serverName: string,
  legacyPublicName: string,
  devDefault: string,
  prodDefault: string,
): string {
  const serverValue = readTrimmed(serverName);
  if (serverValue) return serverValue;

  const legacyValue = readTrimmed(legacyPublicName);
  if (legacyValue) {
    // Server-only context: safe to warn here (never rendered in the browser).
    warnOnce(
      legacyPublicName,
      `[Urbaly env] ${serverName} is unset; using legacy ${legacyPublicName}. ` +
        `Set ${serverName} instead — the NEXT_PUBLIC_* variant is exposed in the client bundle.`,
    );
    return legacyValue;
  }

  const fallback = isProduction() ? prodDefault : devDefault;
  warnOnce(
    `${serverName}:fallback`,
    `[Urbaly env] Neither ${serverName} nor ${legacyPublicName} is set; ` +
      `defaulting to ${fallback}. Set ${serverName} explicitly in production.`,
  );
  return fallback;
}

/** Server-only. Throws when imported code runs in the browser. */
export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('[Urbaly env] Server env accessed from client code. Fetch /api/public-config instead.');
  }
  ensureRootEnvLoaded();
  const apiBaseUrl = resolveServerUrl(
    'API_BASE_URL',
    'NEXT_PUBLIC_API_URL',
    DEV_API_BASE_URL,
    PROD_API_BASE_URL,
  );
  // Derive the auth default from the resolved API URL when only one side is
  // configured. Mirrors the previous `.replace('/v1/db', '/v1/auth')` behaviour.
  const derivedAuthDefault = apiBaseUrl.includes('/v1/db')
    ? apiBaseUrl.replace('/v1/db', '/v1/auth')
    : isProduction()
      ? PROD_AUTH_BASE_URL
      : DEV_AUTH_BASE_URL;
  const cartoApiKey = readTrimmed('CARTO_API_KEY') ?? readTrimmed('NEXT_PUBLIC_CARTO_API_KEY') ?? '';
  if (!cartoApiKey) {
    warnOnce(
      'CARTO_API_KEY',
      '[Urbaly env] CARTO_API_KEY is missing. The map falls back to the keyless CARTO style. ' +
        'Create the repo-root `.env` (see `.env.example`) and restart `next dev`.',
    );
  }
  const googleClientId = readTrimmed('GOOGLE_CLIENT_ID') ?? readTrimmed('NEXT_PUBLIC_GOOGLE_CLIENT_ID') ?? '';
  if (!googleClientId) {
    warnOnce(
      'GOOGLE_CLIENT_ID',
      '[Urbaly env] GOOGLE_CLIENT_ID is missing. Google sign-in is disabled until it is set.',
    );
  }
  return {
    apiBaseUrl,
    authBaseUrl: resolveServerUrl('AUTH_BASE_URL', 'NEXT_PUBLIC_AUTH_URL', derivedAuthDefault, derivedAuthDefault),
    cartoApiKey,
    googleClientId,
  };
}
