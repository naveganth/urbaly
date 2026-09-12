"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { MapPinned, Maximize2, X } from "lucide-react"
import { Button } from "@/components/ui/shadcn/button"
import Map from "@/components/map/map"

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
            ? "fixed inset-0 z-50 flex h-dvh min-h-0 flex-col overflow-y-auto bg-background text-foreground"
            : "relative flex min-h-88 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 shadow-xs sm:min-h-[30rem]"
        }
        transition={{ layout: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
      >
        {isMapOpen ? (
          <div className="w-full min-h-full p-4 sm:p-6 md:p-8 flex flex-col">
            <div className="max-w-7xl w-full mx-auto flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between gap-4 pb-2 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Mapa Urbano em Tempo Real</h2>
                  <p className="text-xs text-muted-foreground">
                    Clique em &quot;Reportar Problema&quot; para adicionar novas ocorrências diretamente no mapa.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Fechar mapa"
                  className="bg-background/80 backdrop-blur-sm shrink-0"
                  onClick={onToggle}
                >
                  <X />
                </Button>
              </div>
              <Map />
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex flex-col items-center gap-3 text-center p-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <MapPinned className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold text-lg">Explorar Ocorrências Urbanas</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Visualize buracos na pista, iluminação pública, alagamentos e reporte problemas na sua rua.
                </p>
              </div>

              <Button
                variant="default"
                size="sm"
                className="mt-2 gap-1.5 shadow-sm"
                onClick={onToggle}
              >
                <Maximize2 className="size-3.5" />
                Abrir Mapa Completo
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              aria-label="Abrir mapa em tela cheia"
              className="absolute right-4 top-4 bg-background/80 backdrop-blur-sm"
              onClick={onToggle}
            >
              <Maximize2 />
            </Button>
          </>
        )}
      </motion.section>
    </AnimatePresence>
  )
}
