import { Maximize2 } from "lucide-react"

import { Button } from "@/components/ui/shadcn/button"

interface HeroSectionProps {
  onOpenMap: () => void
}

export function HeroSection({ onOpenMap }: HeroSectionProps) {
  return (
    <section className="flex flex-col gap-2">
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

        <Button variant="outline" className="w-fit" onClick={onOpenMap}>
          <Maximize2 />
          Abrir mapa
        </Button>
      </div>
    </section>
  )
}
