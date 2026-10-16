import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth-context';

import { REPORT_IMAGE_CDN } from '@/components/map/types';

export const metadata: Metadata = {
  title: {
    default: 'Urbaly — Monitoramento Urbano do Amapá',
    template: '%s | Urbaly',
  },
  description:
    'Plataforma colaborativa de monitoramento e análise de dados urbanos para o estado do Amapá. Acompanhe ocorrências e reporte problemas na sua rua.',
  applicationName: 'Urbaly',
  // iOS standalone: content stays below the status bar until the safe-area
  // pass flips this to 'black-translucent' (with env(safe-area-inset-top)
  // padding on the navbar).
  appleWebApp: {
    capable: true,
    title: 'Urbaly',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  // /manifest.webmanifest (app/manifest.ts) is linked automatically by Next.js.
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Required for env(safe-area-inset-*) values to become non-zero on notched
  // devices — the map controls and report wizard already reserve those insets.
  viewportFit: 'cover',
  // In-page browser chrome follows the app background per OS color scheme;
  // color-scheme itself is set at runtime by ThemeProvider.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

const instrumentSansHeading = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
});

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='pt-BR'
      suppressHydrationWarning
      className={cn(
        'font-sans',
        inter.variable,
        instrumentSansHeading.variable,
      )}
    >
      <head>
        {/* Warm up the report-photo CDN early so 58px marker circles
            start fetching the moment their src is assigned. */}
        <link rel='dns-prefetch' href={REPORT_IMAGE_CDN} />
        <link rel='preconnect' href={REPORT_IMAGE_CDN} crossOrigin='anonymous' />
      </head>
      <body className='min-h-screen bg-background text-foreground antialiased'>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
