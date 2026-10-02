import Link from "next/link"
import { Trophy } from "lucide-react"

import { PageShell } from "@/components/page-shell"
import { buttonVariants } from "@/components/ui/shadcn/button"

export default function ClassificationPage() {
  return (
    <PageShell className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Classificação</h1>
        <div
          role="status"
          className="flex max-w-xl flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center shadow-xs"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Trophy className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            O ranking da comunidade ainda está sendo calculado
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            A classificação reflete apoios e resoluções das ocorrências. Apoie
            um problema no mapa para ajudar a movimentar o ranking.
          </p>
          <Link href="/mapa" className={buttonVariants({ size: "sm" })}>
            Apoiar ocorrências no mapa
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
