"use client"

import * as React from "react"

import { HeroSection } from "@/components/home/hero-section"
import { HomeFaqSection } from "@/components/home/faq-section"
import { MapPreviewSection } from "@/components/home/map-preview-section"
import { PageShell } from "@/components/page-shell"

export default function Home() {
  const [isMapOpen, setIsMapOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isMapOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMapOpen(false)
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMapOpen])

  return (
    <PageShell className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <HeroSection onOpenMap={() => setIsMapOpen(true)} />
        <MapPreviewSection isMapOpen={isMapOpen} onToggle={() => setIsMapOpen((open) => !open)} />
        <HomeFaqSection />
      </div>
    </PageShell>
  )
}
