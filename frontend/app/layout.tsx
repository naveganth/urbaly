import "./globals.css";
import { Inter, Instrument_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const instrumentSansHeading = Instrument_Sans({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={cn("font-sans", inter.variable, instrumentSansHeading.variable)}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}