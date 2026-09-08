import './globals.css';
import { Inter, Instrument_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';

const instrumentSansHeading = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
});

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang='es'
      suppressHydrationWarning
      className={cn(
        'font-sans',
        inter.variable,
        instrumentSansHeading.variable,
      )}
    >
      <body className='min-h-screen bg-background text-foreground antialiased'>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
