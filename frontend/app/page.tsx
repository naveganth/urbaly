"use client"

import { AnimatePresence, motion } from "motion/react"
import { Maximize2, MapPinned, X } from "lucide-react"
import * as React from "react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"

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
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Mapa em tempo real
          </p>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Explore o estado do Amapá!
              </h1>
              <p className="mt-2 text-muted-foreground">
                Acompanhe ocorrências e informações da cidade em um só lugar.
              </p>
            </div>
            <Button variant="outline" className="w-fit" onClick={() => setIsMapOpen(true)}>
              <Maximize2 />
              Abrir mapa
            </Button>
          </div>
        </div>

        <AnimatePresence>
          <motion.section
            layout
            aria-label="Mapa de ocorrências"
            className={
              isMapOpen
                ? "fixed inset-0 z-50 flex h-dvh min-h-0 items-center justify-center overflow-hidden bg-card text-card-foreground"
                : "relative flex min-h-88 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 shadow-xs sm:min-h-[30rem]"
            }
            transition={{ layout: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
          >
            <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:3rem_3rem]" />
            <div className="relative flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <MapPinned className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Mapa em breve</h2>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  A visualização das ocorrências aparecerá aqui.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label={isMapOpen ? "Fechar mapa" : "Abrir mapa em tela cheia"}
              className="absolute right-4 top-4 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsMapOpen((open) => !open)}
            >
              {isMapOpen ? <X /> : <Maximize2 />}
            </Button>
          </motion.section>
        </AnimatePresence>
      </div>
    </PageShell>
  )
}
