'use client';

import * as React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/shadcn/button';

/**
 * "Install the app?" prompt.
 *
 * Chromium (Android + desktop Chrome/Edge): the browser fires
 * `beforeinstallprompt` once the manifest + service worker make the app
 * installable. We defer the native flow and surface our own branded card;
 * `prompt()` runs only when the user taps "Instalar". The event may fire
 * before React hydrates (common on repeat visits), so `app/layout.tsx`
 * stashes it on `window.__urbalyInstallPrompt` and this component reads
 * that stash on mount.
 *
 * iOS Safari never fires that event, so it gets the manual route instead
 * (Share → Add to Home Screen). Conservative on purpose: only real Safari,
 * since the instruction names it explicitly.
 *
 * Never shown when: already running standalone, already installed (flag
 * persisted on `appinstalled`), or snoozed after "Agora não" (14 days).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    /**
     * Stashed by the inline capture in `app/layout.tsx`, which runs before
     * hydration. On repeat visits Chrome can fire `beforeinstallprompt`
     * within the first few hundred ms, and a missed event never comes back
     * for that page load.
     */
    __urbalyInstallPrompt?: Event;
  }
}

const INSTALLED_KEY = 'urbaly:pwa-installed';
const DISMISSED_KEY = 'urbaly:pwa-dismissed-at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/**
 * Show after a short settle window. Eligibility is the device check: on
 * Chromium we only show once `beforeinstallprompt` has fired (that IS the
 * browser saying "installable"), on iOS Safari the manual route is always
 * available.
 */
const FIRST_DELAY_MS = 5_000;
/** Retry cadence while waiting for the event or a free surface. */
const RETRY_MS = 2_000;
const MAX_ATTEMPTS = 15;

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage: the prompt still works, it just
    // re-appears next visit.
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}

function isEligible(): boolean {
  if (isStandalone()) return false;
  if (storageGet(INSTALLED_KEY)) return false;
  const dismissedAt = Number(storageGet(DISMISSED_KEY) ?? 0);
  if (dismissedAt && Date.now() - dismissedAt < SNOOZE_MS) return false;
  // iOS Safari gets the manual instructions; every other engine needs the
  // Chromium install event to exist at all, so skip the rest (Firefox,
  // desktop Safari…).
  return isIOSSafari() || 'onbeforeinstallprompt' in window;
}

export function PwaInstallPrompt() {
  const shouldReduceMotion = useReducedMotion();
  const [platform, setPlatform] = React.useState<'chromium' | 'ios' | null>(null);
  const [visible, setVisible] = React.useState(false);
  const deferredPrompt = React.useRef<BeforeInstallPromptEvent | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    // Pick up the event possibly captured pre-hydration (see the inline
    // script in app/layout.tsx) — a missed beforeinstallprompt never comes
    // back for the current page load.
    if (window.__urbalyInstallPrompt) {
      deferredPrompt.current = window.__urbalyInstallPrompt as BeforeInstallPromptEvent;
    }
    const onBeforeInstall = (event: Event) => {
      // Keep the event around so the native flow fires on our tap, not the
      // browser's own mini-infobar timing.
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
    };
    const onAppInstalled = () => {
      storageSet(INSTALLED_KEY, '1');
      deferredPrompt.current = null;
      window.__urbalyInstallPrompt = undefined;
      setVisible(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  React.useEffect(() => {
    if (!isEligible()) return;
    const ios = isIOSSafari();

    let attempts = 0;
    let timer: number | undefined;

    const tryShow = () => {
      // Don't stack on top of another surface: the wizard, photo/report
      // sheets and the details panel are all role="dialog".
      const dialogOpen = document.querySelector('[role="dialog"]') !== null;
      const canInstall = ios || deferredPrompt.current !== null;
      if (!dialogOpen && canInstall) {
        setPlatform(ios ? 'ios' : 'chromium');
        setVisible(true);
        return;
      }
      attempts += 1;
      if (attempts <= MAX_ATTEMPTS) {
        timer = window.setTimeout(tryShow, RETRY_MS);
      }
    };

    timer = window.setTimeout(tryShow, FIRST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const snooze = () => storageSet(DISMISSED_KEY, String(Date.now()));

  const dismiss = () => {
    setVisible(false);
    snooze();
  };

  const install = async () => {
    const promptEvent = deferredPrompt.current;
    setVisible(false);
    deferredPrompt.current = null;
    window.__urbalyInstallPrompt = undefined;
    if (!promptEvent) {
      snooze();
      return;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') storageSet(INSTALLED_KEY, '1');
      else snooze();
    } catch {
      snooze();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.96 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: 'spring' as const, bounce: 0.16, duration: 0.5 }
          }
          className='fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-[25] mx-auto max-w-md rounded-2xl border border-border bg-background/95 p-4 font-sans text-card-foreground shadow-xl backdrop-blur-md dark:bg-zinc-900/95'
        >
          <div className='flex items-start gap-3'>
            <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
              <Image
                src='/UrbalySquareLogoTransparent.svg'
                alt=''
                width={24}
                height={24}
                className='size-6'
              />
            </span>
            <div className='min-w-0 flex-1'>
              <p id={titleId} className='text-sm font-semibold text-foreground'>
                Instalar o Urbaly
              </p>
              <p
                id={descriptionId}
                className='mt-1 text-xs leading-relaxed text-muted-foreground'
              >
                {platform === 'ios' ? (
                  <>
                    No Safari, toque em{' '}
                    <Share aria-hidden className='inline size-3.5 -translate-y-px text-foreground' />{' '}
                    Compartilhar e depois em{' '}
                    <span className='font-medium text-foreground'>
                      &ldquo;Adicionar à Tela de Início&rdquo;
                    </span>
                    .
                  </>
                ) : (
                  'Experiência completa: tela cheia, suporte offline e acesso direto da tela inicial.'
                )}
              </p>
            </div>
            <Button
              type='button'
              variant='ghost'
              aria-label='Fechar'
              onClick={dismiss}
              className='-mr-1 -mt-1 size-10 shrink-0 rounded-xl text-muted-foreground'
            >
              <X />
            </Button>
          </div>

          <div className='mt-3 flex gap-2'>
            {platform === 'ios' ? (
              <Button
                type='button'
                onClick={dismiss}
                className='h-11 flex-1 rounded-xl text-xs font-semibold'
              >
                Entendi
              </Button>
            ) : (
              <>
                <Button
                  type='button'
                  onClick={install}
                  className='h-11 flex-1 rounded-xl text-xs font-semibold'
                >
                  Instalar
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={dismiss}
                  className='h-11 flex-1 rounded-xl text-xs font-medium text-muted-foreground'
                >
                  Agora não
                </Button>
              </>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
