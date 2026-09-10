import { MapLayout } from '@/components/layout/map-layout';
import Map from '@/components/map/map';
import { MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';

export default function MapPage() {
  return (
    <MapLayout>
      <div className="flex flex-col gap-4">
        {/* Header with Title and Quick Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="size-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Mapa Urbano Colaborativo</h1>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">
                Macapá • Amapá
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Monitore problemas na via, registre ocorrências na sua rua com fotos e ajude a melhorar a cidade.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3.5 text-amber-500" />
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
