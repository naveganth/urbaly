'use client';

import * as React from 'react';

export interface PublicConfig {
  cartoApiKey: string;
  googleClientId: string;
}

const EMPTY: PublicConfig = { cartoApiKey: '', googleClientId: '' };

let cached: Promise<PublicConfig> | null = null;

/** Fetched once per page load, then shared. Never throws — degrades to ''. */
function loadPublicConfig(): Promise<PublicConfig> {
  if (!cached) {
    cached = fetch('/api/public-config', { cache: 'force-cache' })
      .then((res) => (res.ok ? res.json() : EMPTY))
      .then((data): PublicConfig => {
        if (data && typeof data === 'object') {
          return {
            cartoApiKey: typeof data.cartoApiKey === 'string' ? data.cartoApiKey : '',
            googleClientId: typeof data.googleClientId === 'string' ? data.googleClientId : '',
          };
        }
        return EMPTY;
      })
      .catch(() => EMPTY);
  }
  return cached;
}

/** `null` while loading, then the config (possibly with empty strings). */
export function usePublicConfig(): PublicConfig | null {
  const [config, setConfig] = React.useState<PublicConfig | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    void loadPublicConfig().then((value) => {
      if (!cancelled) setConfig(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return config;
}
