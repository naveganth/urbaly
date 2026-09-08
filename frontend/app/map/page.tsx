import { InsetLayout } from "@/components/inset-layout"

export default function MapPage() {
  return (
    <InsetLayout>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Mapa</h1>
        <p className="text-muted-foreground">
          Visualização do mapa da cidade e indicadores urbanos.
        </p>
      </div>
    </InsetLayout>
  )
}