import type { Metadata } from 'next';
import Image from 'next/image';

import { buttonVariants } from '@/components/ui/shadcn/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Sem conexão',
  description: 'Você está offline. As páginas já visitadas continuam disponíveis.',
  robots: { index: false, follow: false },
};

/**
 * Offline fallback — served by the service worker (public/sw.js) for
 * uncached navigations while offline. Precached at SW install together with
 * every /_next/static asset it references, so it renders fully styled even on
 * a first-visit-while-offline device. Plain <a> tags on purpose: router
 * navigations need RSC fetches, which are dead while offline.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center">
      <Image
        src="/UrbalySquareLogoTransparent.svg"
        alt=""
        width={56}
        height={56}
        priority
        className="size-14"
      />

      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Você está offline
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sua conexão parece ter caído. As páginas que você já visitou continuam
          disponíveis e o mapa mostra os últimos dados carregados.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <a href="/mapa" className={cn(buttonVariants(), 'min-h-11 w-full')}>
          Ir para o mapa
        </a>
        <a
          href="/"
          className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}
        >
          Voltar ao início
        </a>
      </div>
    </main>
  );
}
