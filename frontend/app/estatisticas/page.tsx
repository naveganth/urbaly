import Link from "next/link"
import { BarChart3 } from "lucide-react"

import { PageShell } from "@/components/page-shell"
import { buttonVariants } from "@/components/ui/shadcn/button"

export default function StatisticsPage() {
  return (
    <PageShell className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Estatísticas</h1>
        <div
          role="status"
          className="flex max-w-xl flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center shadow-xs"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <BarChart3 className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            Ainda não há estatísticas agregadas para exibir
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Os números aparecem aqui assim que as ocorrências do mapa forem
            consolidadas. Enquanto isso, explore o que já foi reportado.
          </p>
          <Link href="/mapa" className={buttonVariants({ size: "sm" })}>
            Ver mapa de ocorrências
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
