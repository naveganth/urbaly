import { InsetLayout } from "@/components/inset-layout"

export default function Home() {
  return (
    <InsetLayout>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Início</h1>
        <p className="text-muted-foreground">
          Urbaly
        </p>
      </div>
    </InsetLayout>
  )
}
