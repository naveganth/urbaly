import { Maximize2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/shadcn/button"
import { cn } from "@/lib/utils"

interface HeroSectionProps {
  onOpenMap: () => void
}

export function HeroSection({ onOpenMap }: HeroSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Mapa em tempo real
      </p>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Explore o estado do Amapá!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Acompanhe ocorrências e informações da cidade em um só lugar.
          </p>
        </div>

        <div className="flex w-fit shrink-0 items-center gap-2">
          <a
            href="#como-funciona"
            className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}
          >
            Como funciona
          </a>
          <Button className="w-fit" onClick={onOpenMap}>
            <Maximize2 />
            Abrir mapa
          </Button>
        </div>
      </div>
    </section>
  )
}
