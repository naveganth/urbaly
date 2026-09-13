import { MapLayout } from '@/components/layout/map-layout';
import Map from '@/components/map/map';
import { MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';

export default function MapPage() {
  return (
    <MapLayout>
      <div className="flex flex-col gap-5">
        {/* Header with Title and Quick Indicators */}
        <div className="flex flex-col gap-4 border-b border-border/60 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MapPin className="size-4" />
              </span>
              <h1 className="font-heading min-w-0 text-2xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-2xl">
                Mapa Urbano Colaborativo
              </h1>
              <Badge variant="outline" className="hidden border-primary/20 bg-primary/10 text-xs text-primary sm:inline-flex">
                Macapá • Amapá
              </Badge>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-[1.55] text-pretty text-muted-foreground sm:text-sm">
              Monitore problemas na via, registre ocorrências na sua rua com fotos e ajude a melhorar a cidade.
            </p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Atualização em tempo real
            </span>
          </div>
        </div>

        {/* Map Component */}
        <Map />
      </div>
    </MapLayout>
  );
}
