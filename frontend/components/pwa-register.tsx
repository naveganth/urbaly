'use client';

import * as React from 'react';

/**
 * Registers the PWA service worker (public/sw.js).
 *
 * Production only: a service worker fights Turbopack HMR (stale chunks served
 * from cache make dev lie about your code). Test the result with a real build:
 * `npm run build && npm run start`.
 *
 * No reload-on-update prompt: navigations are network-first, so a new worker
 * can never serve older HTML than the network while online. Mid-session
 * reloads would also risk losing in-progress report drafts.
 */
export function PwaRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!window.isSecureContext) return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((error) => {
          console.warn('[Urbaly PWA] Service worker registration failed:', error);
        });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
