import Link from "next/link"
import { MapPinned } from "lucide-react"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"

export default function Home() {
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
            <Button
              variant="outline"
              render={<Link href="/mapa" />}
              nativeButton={false}
              className="w-fit"
            >
              <MapPinned />
              Abrir mapa
            </Button>
          </div>
        </div>

        <section
          aria-label="Mapa de ocorrências"
          className="relative flex min-h-[22rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 shadow-xs sm:min-h-[30rem]"
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
        </section>
      </div>
    </PageShell>
  )
}
