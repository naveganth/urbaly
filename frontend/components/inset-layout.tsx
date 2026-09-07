"use client"

import * as React from "react"
import { InsetNavbar, InsetNavbarProps } from "@/components/inset-navbar"
import { cn } from "@/lib/utils"

export interface InsetLayoutProps extends InsetNavbarProps {
  children?: React.ReactNode
  containerClassName?: string
  contentClassName?: string
}

export function InsetLayout({
  children,
  containerClassName,
  contentClassName,
  ...navbarProps
}: InsetLayoutProps) {
  return (
    <div className={cn("min-h-screen w-full bg-background flex flex-col", containerClassName)}>
      {/* Top Navigation Bar */}
      <InsetNavbar {...navbarProps} />

      {/* Inset Main Container */}
      <main className="flex-1 w-full px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6 flex flex-col">
        <div
          className={cn(
            "flex-1 w-full rounded-xl sm:rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 sm:p-8 md:p-10 transition-colors",
            contentClassName
          )}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
