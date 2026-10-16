import type { MetadataRoute } from 'next';

/**
 * Web App Manifest (served at /manifest.webmanifest, auto-linked by Next.js).
 *
 * Icon roles:
 *   "any"      -> transparent pin (UrbalySquareLogoTransparent.svg)
 *   "maskable" -> full-bleed green tile; the pin already sits inside the 80%
 *                 safe circle, so Android can circle/squircle/round-rect crop it
 *                 without touching the mark (verified against the 500px artwork).
 *
 * theme_color is the light first-paint color (page background); the in-app
 * <meta name="theme-color"> swaps to the dark background via media query
 * (see `viewport` in app/layout.tsx).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Urbaly — Monitoramento Urbano do Amapá',
    short_name: 'Urbaly',
    description:
      'Plataforma colaborativa de monitoramento e análise de dados urbanos para o estado do Amapá. Acompanhe ocorrências e reporte problemas na sua rua.',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    categories: ['navigation', 'utilities', 'government'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Abrir mapa',
        short_name: 'Mapa',
        url: '/mapa',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Classificação',
        url: '/classificacao',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Estatísticas',
        url: '/estatisticas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    // Screenshots (install-dialog rich UI) are added once real captures exist;
    // see the PWA rollout plan — they need the app running at 390x844 / 1280x800.
  };
}
