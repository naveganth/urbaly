import { Provider } from "@/components/ui/provider"

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html suppressHydrationWarning lang="en">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
