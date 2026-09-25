"use client"

import * as React from "react"
import { Navbar, NavbarProps } from "@/components/navbar"
import { cn } from "@/lib/utils"

export interface MapLayoutProps extends NavbarProps {
  children?: React.ReactNode
  containerClassName?: string
  contentClassName?: string
}

export function MapLayout({
  children,
  containerClassName,
  contentClassName,
  intent = "inset",
  ...navbarProps
}: MapLayoutProps) {
  const isInset = intent === "inset"

  return (
    <div
      className={cn(
        "peer/navbar group/navbar relative isolate z-10 flex min-h-svh w-full flex-col",
        isInset && "bg-sidebar dark:bg-background",
        !isInset && "bg-background",
        containerClassName
      )}
    >
      <Navbar intent={intent} {...navbarProps} />

      <main
        data-navbar-inset={isInset || undefined}
        className={cn(
          "flex flex-1 flex-col",
          isInset
            ? "bg-sidebar pb-2 md:px-2 dark:bg-background"
            : "w-full px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6"
        )}
      >
        <div
          className={cn(
            "page-transition flex min-h-0 flex-1 flex-col",
            isInset
              ? "grow bg-background p-6 text-foreground shadow-xs md:rounded-lg md:p-10 md:ring-1 md:ring-foreground/5 dark:bg-card dark:md:ring-foreground/10"
              : "w-full rounded-md border border-border bg-card p-6 text-card-foreground shadow-xs transition-colors sm:p-8 md:p-10",
            contentClassName
          )}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
