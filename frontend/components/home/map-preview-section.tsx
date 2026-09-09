"use client"

import { AnimatePresence, motion } from "motion/react"
import { MapPinned, Maximize2, X } from "lucide-react"

import { Button } from "@/components/ui/shadcn/button"

interface MapPreviewSectionProps {
  isMapOpen: boolean
  onToggle: () => void
}

export function MapPreviewSection({ isMapOpen, onToggle }: MapPreviewSectionProps) {
  return (
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
          onClick={onToggle}
        >
          {isMapOpen ? <X /> : <Maximize2 />}
        </Button>
      </motion.section>
    </AnimatePresence>
  )
}
