'use client';

import * as React from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/components/theme-provider';
import {
  Search,
  X,
  CircleAlert,
  Crosshair,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/shadcn/dropdown-menu';
import { createMapReport, getMapReports } from '@/app/actions/api';
import { INITIAL_REPORTS } from '@/data/mock-reports';
import {
  StreetReport,
  ReportCategory,
  ReportStatus,
  CATEGORIES,
  REPORT_IMAGE_CDN,
} from './types';
import { ReportProblemSheet } from './report-problem-sheet';
import { ReportDetailsDialog } from './report-details-dialog';
import { CategoryIcon } from './category-icon';
import { MapMarker } from './map-marker';

function getMapTiles(isDark: boolean) {
  const mapApiKey = process.env.NEXT_PUBLIC_MAP_API_KEY?.trim();
  const themeVariant = isDark ? 'dark_all' : 'light_all';
  const tileUrl = `https://a.basemaps.cartocdn.com/${themeVariant}/{z}/{x}/{y}@2x.png`;

  if (mapApiKey) {
    return `${tileUrl}?key=${mapApiKey}`;
  }

  return tileUrl;
}

export default function Map() {
  const { resolvedTheme } = useTheme();
  const [hasMounted, setHasMounted] = React.useState(false);
  const isDark = hasMounted && resolvedTheme === 'dark';

  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = React.useRef(false);
  const placementMarkerRef = React.useRef<maplibregl.Marker | null>(null);

  // Reactive Map instance state to trigger React child components (MapMarker)
  const [mapInstance, setMapInstance] = React.useState<maplibregl.Map | null>(null);

  React.useEffect(() => {
    // This state gates browser-only map work until hydration completes.
    setHasMounted(true);
  }, []);

  // React state array for reports / marker coordinates
  const [reports, setReports] = React.useState<StreetReport[]>([]);
  const [reportsError, setReportsError] = React.useState<string | null>(null);
  const [isReportsLoading, setIsReportsLoading] = React.useState(true);
  const [isOffline, setIsOffline] = React.useState(false);
  const [mapRetryKey, setMapRetryKey] = React.useState(0);

  // Fetch reports from API using Server Action
  React.useEffect(() => {
    let cancelled = false;
    setIsReportsLoading(true);
    setReportsError(null);

    getMapReports()
      .then((apiReports) => {
        if (cancelled) return;
        if (apiReports && apiReports.length > 0) {
          setReports(
            apiReports.map((report) => ({
              id: String(report.id),
              title: report.titulo,
              description: report.descricao || 'Sem descrição informada.',
              category:
                (Object.keys(CATEGORIES) as ReportCategory[])[report.categoria] || 'other',
              coordinates: report.ponto,
              address: `Localização: ${report.ponto[1].toFixed(4)}, ${report.ponto[0].toFixed(4)}`,
              images: report.foto_nome
                ? [`${REPORT_IMAGE_CDN}/${encodeURIComponent(report.foto_nome)}`]
                : report.foto_data?.map((image) => `data:image/webp;base64,${image}`) ?? [],
              createdAt: report.data_criacao,
              updatedAt: report.data_atualizacao,
              status: 'open',
              upvotes: 0,
            }))
          );
        } else {
          // If API returns no reports yet, use mock reports to seed the map
          setReports(INITIAL_REPORTS);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('API map reports unavailable, falling back to initial data:', error);
        setReports(INITIAL_REPORTS);
        setReportsError('Servidor em modo de contingência. Mostrando registros locais.');
      })
      .finally(() => {
        if (!cancelled) setIsReportsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mapRetryKey]);

  React.useEffect(() => {
    const updateOfflineState = () => setIsOffline(!navigator.onLine);
    updateOfflineState();
    window.addEventListener('online', updateOfflineState);
    window.addEventListener('offline', updateOfflineState);

    return () => {
      window.removeEventListener('online', updateOfflineState);
      window.removeEventListener('offline', updateOfflineState);
    };
  }, []);

  // Mode & selection state
  const [isPlacementMode, setIsPlacementMode] = React.useState(false);
  const [placementCoordinates, setPlacementCoordinates] = React.useState<[number, number] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<StreetReport | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isMapLoading, setIsMapLoading] = React.useState(true);
  const [mapError, setMapError] = React.useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<ReportCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<ReportStatus | 'all'>('all');

  // Filter reports reactively
  const filteredReports = React.useMemo(() => {
    return reports.filter((report) => {
      const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        report.title.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        report.address.toLowerCase().includes(q) ||
        (report.neighborhood && report.neighborhood.toLowerCase().includes(q));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [reports, selectedCategory, selectedStatus, searchQuery]);

  // Statistics calculation
  const stats = React.useMemo(() => {
    const total = reports.length;
    const open = reports.filter((r) => r.status === 'open').length;
    const investigating = reports.filter((r) => r.status === 'investigating').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    return { total, open, investigating, resolved };
  }, [reports]);

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery.trim().length > 0;

  // Initialize MapLibre
  React.useEffect(() => {
    if (!mapContainerRef.current) return;

    mapLoadedRef.current = false;
    setIsMapLoading(true);
    setMapError(null);
    const initialTiles = getMapTiles(isDark);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: isDark ? 'Urbaly Dark' : 'Urbaly Light',
        metadata: {
          'mapbox:autocomposite': true,
        },
        glyphs: 'https://demotile.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          carto: {
            type: 'raster',
            tiles: [initialTiles],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'base-raster',
            type: 'raster',
            source: 'carto',
            paint: {
              'raster-opacity': 1,
            },
          },
        ],
      },
      center: [-51.065, 0.035],
      zoom: 13,
      maxZoom: 18,
      minZoom: 9,
    });

    mapRef.current = map;

    map.on('load', () => {
      mapLoadedRef.current = true;
      setMapInstance(map);
      setIsMapLoading(false);
    });

    map.on('error', (event) => {
      console.error('MapLibre error:', event.error || 'Unknown map error');
      if (!mapLoadedRef.current) {
        setIsMapLoading(false);
        setMapError('O mapa não pôde ser carregado. Verifique sua conexão e tente novamente.');
      }
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: true,
      }),
      'top-right'
    );

    return () => {
      setMapInstance(null);
      map.remove();
      mapRef.current = null;
    };
  }, [isDark, mapRetryKey]);

  // Update map tile theme on dark mode change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const newTiles = getMapTiles(isDark);
    const style = map.getStyle();
    if (style && style.sources && style.sources.carto) {
      map.setStyle({
        ...style,
        sources: {
          ...style.sources,
          carto: {
            type: 'raster',
            tiles: [newTiles],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
      });
    }
  }, [isDark]);

  // Handle map click for point placement mode
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (isPlacementMode) {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setPlacementCoordinates(coords);

        // Render or move placement marker
        if (placementMarkerRef.current) {
          placementMarkerRef.current.setLngLat(coords);
        } else {
          const el = document.createElement('div');
          el.className = 'google-placement-marker select-none';
          el.innerHTML = `
            <div class="map-placement-marker">
              <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 0C7.611 0 0 7.611 0 17C0 26.5 13.8 41.8 16.1 43.9C16.6 44.4 17.4 44.4 17.9 43.9C20.2 41.8 34 26.5 34 17C34 7.611 26.389 0 17 0Z" fill="#0284c7" />
                <path d="M17 1.5C8.44 1.5 1.5 8.44 1.5 17C1.5 19.8 2.6 23 4.5 26.2C5.6 21 9.8 11.5 17 11.5C24.2 11.5 28.4 21 29.5 26.2C31.4 23 32.5 19.8 32.5 17C32.5 8.44 25.56 1.5 17 1.5Z" fill="white" fill-opacity="0.25" />
                <circle cx="17" cy="16.5" r="9.5" fill="#ffffff" />
              </svg>
              <div class="map-placement-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
            </div>
          `;
          placementMarkerRef.current = new maplibregl.Marker({
            element: el,
            anchor: 'bottom',
          })
            .setLngLat(coords)
            .addTo(map);
        }

        // Open reporting sheet
        setIsSheetOpen(true);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPlacementMode]);

  // Strictly enforce crosshair cursor in placement mode
  React.useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!container) return;

    if (isPlacementMode) {
      container.classList.add('placement-mode-active');
      if (map) {
        map.getCanvas().style.cursor = 'crosshair';
      }
    } else {
      container.classList.remove('placement-mode-active');
      if (map) {
        map.getCanvas().style.cursor = '';
      }
    }
  }, [isPlacementMode]);

  // Clean up placement marker when cancelled
  const handleCancelPlacement = () => {
    setIsPlacementMode(false);
    setPlacementCoordinates(null);
    if (placementMarkerRef.current) {
      placementMarkerRef.current.remove();
      placementMarkerRef.current = null;
    }
  };

  // Add new report submitted from Sheet without full page refresh
  const handleAddReport = async (
    newReportData: Omit<StreetReport, 'id' | 'createdAt' | 'upvotes' | 'status'>
  ) => {
    let createdId: string | undefined;

    const res = await createMapReport({
      titulo: newReportData.title,
      descricao: newReportData.description,
      categoria: (Object.keys(CATEGORIES) as ReportCategory[]).indexOf(newReportData.category),
      ponto: newReportData.coordinates,
      fotoData: newReportData.images,
    });

    if (res.success && res.id) {
      createdId = String(res.id);
    }
    if (!res.success) {
      throw new Error(res.error || 'Não foi possível enviar o reporte.');
    }

    const createdReport: StreetReport = {
      ...newReportData,
      id: createdId || `pending-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      upvotes: 0,
    };

    // Dynamically update coordinates in React state array -> markers appear without refresh!
    setReports((previous) => [createdReport, ...previous]);

    // Animate map fly-to
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: newReportData.coordinates,
        zoom: 15,
        duration: 1200,
        essential: true,
      });
    }

    handleCancelPlacement();
  };

  // Upvote a report
  const handleUpvote = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport((prev) => (prev ? { ...prev, upvotes: prev.upvotes + 1 } : null));
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 ">
      {/* Top Floating Control Bar */}
      <div className="flex flex-col rounded-md backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        {/* Search & Status Filter */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por rua, bairro ou problema..."
              className="h-11 rounded-md border-border/70 bg-background/80 pl-9 text-sm shadow-none transition-[border-color,box-shadow] focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/15"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden h-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-md border border-border/70 bg-background/80 px-3 text-xs font-medium outline-none transition-[background-color,border-color,color] hover:border-primary/40 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:inline-flex">
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Status:</span>
              <span className="font-medium leading-tight">
                {selectedStatus === 'all'
                  ? 'Todos'
                  : selectedStatus === 'open'
                    ? 'Abertos'
                    : selectedStatus === 'investigating'
                      ? 'Em Análise'
                      : 'Resolvidos'}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedStatus('all')}>
                Todos os status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedStatus('open')}>
                Em Aberto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedStatus('investigating')}>
                Em Análise
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedStatus('resolved')}>
                Resolvidos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Primary Action Button */}
        <div className="flex w-full shrink-0 items-center gap-2 md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-md border border-border/70 bg-background/80 px-3 text-xs font-medium outline-none transition-[background-color,border-color,color] hover:border-primary/40 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden">
              <SlidersHorizontal className="size-4" />
              Filtros
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[min(28rem,70vh)] w-64 overflow-y-auto text-xs">
              <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedStatus('all')}>Todos os status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedStatus('open')}>Em aberto</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedStatus('investigating')}>Em análise</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedStatus('resolved')}>Resolvidos</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filtrar por categoria</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                Todas as categorias ({reports.length})
              </DropdownMenuItem>
              {(Object.keys(CATEGORIES) as ReportCategory[]).map((catKey) => (
                <DropdownMenuItem key={catKey} onClick={() => setSelectedCategory(catKey)}>
                  <CategoryIcon category={catKey} className="size-3.5" />
                  {CATEGORIES[catKey].label} ({reports.filter((r) => r.category === catKey).length})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setIsPlacementMode((prev) => !prev);
              if (isPlacementMode) {
                handleCancelPlacement();
              }
            }}
            className={cn(
              'h-11 w-full min-w-0 cursor-pointer touch-manipulation gap-2 rounded-md px-4 text-sm font-semibold shadow-sm transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98] md:w-auto',
              isPlacementMode
                ? 'bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600'
                : 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
            )}
          >
            {isPlacementMode ? (
              <>
                <X className="size-4" />
                Cancelar marcação
              </>
            ) : (
              <>
                <CircleAlert className="report-action-icon size-4" aria-hidden="true" />
                Reportar Problema
              </>
            )}
          </Button>
        </div>
      </div>

      {(isOffline || reportsError) && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {isOffline
              ? 'Você está offline. O mapa pode mostrar dados desatualizados; tente novamente quando a conexão voltar.'
              : reportsError}
          </span>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="relative hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs md:flex">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'min-h-11 cursor-pointer touch-manipulation whitespace-nowrap rounded-md border px-3 py-1.5 font-medium transition-[background-color,border-color,color,box-shadow] duration-150',
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          )}
        >
          Todas as Categorias ({reports.length})
        </button>

        {(Object.keys(CATEGORIES) as ReportCategory[]).map((catKey) => {
          const cat = CATEGORIES[catKey];
          const count = reports.filter((r) => r.category === catKey).length;
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setSelectedCategory(catKey)}
              className={cn(
                'flex min-h-11 cursor-pointer touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 font-medium transition-[background-color,border-color,color,box-shadow] duration-150',
                isSelected
                  ? 'bg-foreground text-background border-foreground shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <CategoryIcon category={catKey} className="size-3" />
              <span>{cat.label}</span>
              <span className="font-mono text-[10px] tabular-nums tracking-normal opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Map Container */}
      <div
        ref={mapContainerRef}
        className={cn(
          'relative h-[clamp(24rem,68dvh,40rem)] min-h-96 w-full overflow-hidden rounded-md border border-border/70 bg-muted shadow-lg shadow-foreground/5 transition-[border-color,box-shadow] md:min-h-120',
          isPlacementMode && 'placement-mode-active'
        )}
      >
        {isMapLoading && !mapError && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Carregando mapa"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-muted"
          >
            <div className="h-10 w-10 animate-pulse rounded-md border border-border/70 bg-card shadow-sm" />
            <span className="text-xs font-medium text-muted-foreground">Carregando mapa…</span>
          </div>
        )}

        {mapError && (
          <div
            role="alert"
            className="absolute inset-0 z-20 flex items-center justify-center bg-muted/95 px-6 text-center"
          >
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-md border border-border bg-card px-5 py-4 shadow-lg">
              <Info className="size-5 text-amber-500" />
              <p className="text-sm font-medium text-foreground">{mapError}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => setMapRetryKey((value) => value + 1)}
                className="h-10 rounded-md px-4"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Placement Mode Top Overlay Banner */}
        {isPlacementMode && (
          <div className="absolute left-3 right-3 top-3 z-10 mx-auto flex max-w-xl items-center justify-center gap-2.5 rounded-md border border-primary/35 bg-background/95 px-3 py-2.5 text-center text-xs font-semibold text-foreground shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-4 dark:bg-zinc-900/95">
            <span className="flex size-2 rounded-full bg-primary animate-ping" />
            <Crosshair className="size-4 text-primary" />
            <span>Modo de marcação ativo. Clique no mapa para indicar o local.</span>
            <button
              type="button"
              onClick={handleCancelPlacement}
              className="ml-1 size-11 shrink-0 cursor-pointer touch-manipulation rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar aviso de marcação"
            >
              <X className="mx-auto size-3.5" />
            </button>
          </div>
        )}

        {/* Bottom Legend / Stats Widget */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/80 bg-background/90 px-3.5 py-2 text-[11px] shadow-lg backdrop-blur-md sm:right-auto sm:flex-nowrap sm:py-1.5 dark:bg-zinc-900/90">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-mono font-semibold tabular-nums text-foreground">{filteredReports.length}</span>
            <span className="leading-tight">no mapa</span>
          </div>
          <span className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="leading-tight"><span className="font-mono tabular-nums">{stats.open}</span> abertos</span>
          </div>
          <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
            <span className="size-2 rounded-full bg-sky-500" />
            <span className="leading-tight"><span className="font-mono tabular-nums">{stats.investigating}</span> em análise</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="leading-tight"><span className="font-mono tabular-nums">{stats.resolved}</span> resolvidos</span>
          </div>
        </div>

        {/* Empty state hint */}
        {filteredReports.length === 0 &&
          !isMapLoading &&
          !isReportsLoading &&
          !mapError &&
          !reportsError && (
          <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-4">
            <div className="flex max-w-sm flex-col items-center gap-2 rounded-md border border-border bg-background/95 px-4 py-3 text-center text-xs text-muted-foreground shadow-xl backdrop-blur-md dark:bg-zinc-900/95">
              <Info className="size-4 text-amber-500" />
              <span>
                {hasActiveFilters
                  ? 'Nenhum problema encontrado com estes filtros.'
                  : 'Ainda não há problemas registrados nesta área.'}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (hasActiveFilters) {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                  } else {
                    setIsPlacementMode(true);
                  }
                }}
                className="mt-1 h-9 rounded-md px-3 text-xs"
              >
                {hasActiveFilters ? 'Limpar filtros' : 'Reportar um problema'}
              </Button>
            </div>
          </div>
        )}

        {/* Dynamic Map Markers mapped directly from React State Array without full page reload */}
        {mapInstance &&
          filteredReports.map((report, index) => (
            <MapMarker
              key={report.id}
              map={mapInstance}
              pointer={{
                id: report.id,
                coordinates: report.coordinates,
                category: report.category,
                title: report.title,
              }}
              isDark={isDark}
              delayMs={index * 60}
              onClick={() => {
                setSelectedReport(report);
                setIsDetailsOpen(true);
              }}
            />
          ))}
      </div>

      {/* Report Problem Sheet (Drawer with SmoothUI Multi-File Upload) */}
      <ReportProblemSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        coordinates={placementCoordinates}
        onSubmit={handleAddReport}
        onCancelPlacement={handleCancelPlacement}
      />

      {/* Report Details Dialog (with Multi-photo Gallery & ID-based photo fetch) */}
      <ReportDetailsDialog
        report={selectedReport}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpvote={handleUpvote}
      />
    </div>
  );
}
