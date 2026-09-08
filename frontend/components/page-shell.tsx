import type { ReactNode } from "react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"

interface PageShellProps {
  children: ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Navbar />
      <main className={cn("page-transition flex-1 w-full", className)}>
        {children}
      </main>
      <Footer />
    </div>
  )
}