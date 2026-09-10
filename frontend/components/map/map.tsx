'use client';

import * as React from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import {
  Plus,
  Search,
  MapPin,
  Compass,
  AlertCircle,
  X,
  Crosshair,
  SlidersHorizontal,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/shadcn/dropdown-menu';
import { StreetReport, ReportCategory, ReportStatus, CATEGORIES } from './types';
import { INITIAL_REPORTS } from '@/data/mock-reports';
import { ReportProblemSheet } from './report-problem-sheet';
import { ReportDetailsDialog } from './report-details-dialog';
import { CategoryIcon } from './category-icon';
import { createGooglePinElement } from './google-pin';


const LOCAL_STORAGE_KEY = 'urbaly_street_reports_v2';

const CATEGORY_HEX_COLORS: Record<ReportCategory, { light: string; dark: string }> = {
  pothole: { light: '#f59e0b', dark: '#fbbf24' },
  lighting: { light: '#eab308', dark: '#facc15' },
  waste: { light: '#10b981', dark: '#34d399' },
  drainage: { light: '#0284c7', dark: '#38bdf8' },
  signage: { light: '#f43f5e', dark: '#fb7185' },
  accessibility: { light: '#9333ea', dark: '#c084fc' },
  greenery: { light: '#16a34a', dark: '#4ade80' },
  vandalism: { light: '#ea580c', dark: '#fb923c' },
  other: { light: '#64748b', dark: '#94a3b8' },
};

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
  const markersRef = React.useRef<maplibregl.Marker[]>([]);
  const placementMarkerRef = React.useRef<maplibregl.Marker | null>(null);
  const previousFilteredIdsRef = React.useRef<string[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  // Reports state with LocalStorage persistence
  const [reports, setReports] = React.useState<StreetReport[]>(INITIAL_REPORTS);
  const [storageReady, setStorageReady] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setReports(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading reports from localStorage:', e);
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageReady(true);
    }
  }, []);

  // Sync to local storage
  React.useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return;

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      console.error('Error saving reports to localStorage:', e);
    }
  }, [reports, storageReady]);

  // Mode & selection state
  const [isPlacementMode, setIsPlacementMode] = React.useState(false);
  const [placementCoordinates, setPlacementCoordinates] = React.useState<[number, number] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<StreetReport | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<ReportCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<ReportStatus | 'all'>('all');

  // Filter reports
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

  // Initialize Map
  React.useEffect(() => {
    if (!mapContainerRef.current) return;

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

    map.on('error', (event) => {
      console.error('MapLibre error:', event.error || 'Unknown map error');
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map tile theme on dark mode change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const newTiles = getMapTiles(isDark);
    const style = map.getStyle();
    if (style && style.sources && style.sources.carto) {
      // Re-apply style with updated tiles
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

  // Update MapLibre markers when filteredReports or isDark change with sequential Google Maps pin drop
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasMounted) return;

    const nextFilteredIds = filteredReports.map((report) => report.id);
    const hasFilteredListChanged =
      previousFilteredIdsRef.current.length === 0 ||
      previousFilteredIdsRef.current.length !== nextFilteredIds.length ||
      previousFilteredIdsRef.current.some((id, index) => id !== nextFilteredIds[index]);

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for filtered reports one-by-one with Google Maps pin drop animation
    filteredReports.forEach((report, index) => {
      const delayMs = hasFilteredListChanged ? index * 120 : 0;
      const animateIn = hasFilteredListChanged;

      const el = createGooglePinElement({
        category: report.category,
        isDark,
        delayMs,
        animateIn,
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedReport(report);
        setIsDetailsOpen(true);
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat(report.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });

    previousFilteredIdsRef.current = nextFilteredIds;
  }, [filteredReports, isDark, hasMounted]);

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
            <div class="relative flex flex-col items-center animate-bounce" style="width: 34px; height: 44px; filter: drop-shadow(0 6px 14px rgba(2, 132, 199, 0.45));">
              <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 0C7.611 0 0 7.611 0 17C0 26.5 13.8 41.8 16.1 43.9C16.6 44.4 17.4 44.4 17.9 43.9C20.2 41.8 34 26.5 34 17C34 7.611 26.389 0 17 0Z" fill="#0284c7" />
                <path d="M17 1.5C8.44 1.5 1.5 8.44 1.5 17C1.5 19.8 2.6 23 4.5 26.2C5.6 21 9.8 11.5 17 11.5C24.2 11.5 28.4 21 29.5 26.2C31.4 23 32.5 19.8 32.5 17C32.5 8.44 25.56 1.5 17 1.5Z" fill="white" fill-opacity="0.25" />
                <circle cx="17" cy="16.5" r="9.5" fill="#ffffff" />
              </svg>
              <div style="position: absolute; top: 6px; left: 6px; width: 22px; height: 21px; display: flex; align-items: center; justify-content: center; color: #0284c7;">
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

  // Strictly enforce crosshair cursor in placement mode (fixing MapLibre canvas overrides)
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

  // Add new report submitted from Sheet
  const handleAddReport = (
    newReportData: Omit<StreetReport, 'id' | 'createdAt' | 'upvotes' | 'status'>
  ) => {
    const newReport: StreetReport = {
      ...newReportData,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      upvotes: 1,
    };

    setReports((prev) => [newReport, ...prev]);

    // Animate map fly-to
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: newReport.coordinates,
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

  // User Geolocation
  const handleGeolocate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: coords,
              zoom: 15,
              duration: 1500,
            });
          }
        },
        (err) => {
          console.warn('Geolocation denied or unavailable:', err);
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [-51.065, 0.035],
              zoom: 14,
            });
          }
        }
      );
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Floating Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 p-2 rounded-xl bg-card border border-border shadow-xs">
        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por rua, bairro ou problema..."
              className="pl-8 h-8 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center border border-border bg-background hover:bg-muted hover:text-foreground h-8 gap-1.5 px-2.5 rounded-none text-xs font-medium cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-ring outline-none">
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">Status:</span>
              <span className="font-semibold">
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
              <DropdownMenuLabel>Filtrar por Situação</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedStatus('all')}>
                Todos os Status
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

        {/* Primary Action Button: Add Report & GPS */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGeolocate}
            title="Minha Localização Atual"
            className="h-8 px-2.5"
          >
            <Compass className="size-4 text-primary" />
            <span className="hidden sm:inline text-xs">GPS</span>
          </Button>

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
              'h-8 gap-1.5 text-xs font-semibold px-3.5 shadow-sm transition-all cursor-pointer',
              isPlacementMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isPlacementMode ? (
              <>
                <X className="size-4" />
                Cancelar Marcação
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Reportar Problema
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-2.5 py-1 rounded-full border font-medium whitespace-nowrap transition-all cursor-pointer',
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
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full border whitespace-nowrap transition-all cursor-pointer font-medium',
                isSelected
                  ? 'bg-foreground text-background border-foreground shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <CategoryIcon category={catKey} className="size-3" />
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Map Container */}
      <div
        ref={mapContainerRef}
        className={cn(
          'relative w-full h-[640px] rounded-2xl overflow-hidden border border-border shadow-md bg-muted transition-colors',
          isPlacementMode && 'placement-mode-active'
        )}
      >
        {/* Placement Mode Top Overlay Banner */}
        {isPlacementMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 px-4 py-2 rounded-full bg-background/95 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/50 shadow-xl text-xs font-semibold text-foreground animate-in fade-in slide-in-from-top-3">
            <span className="flex size-2 rounded-full bg-primary animate-ping" />
            <Crosshair className="size-4 text-primary" />
            <span>Modo Mira Ativo: Clique na rua para marcar a ocorrência</span>
            <button
              type="button"
              onClick={handleCancelPlacement}
              className="ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Bottom Legend / Stats Widget */}
        <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-background/90 dark:bg-zinc-900/90 backdrop-blur-md border border-border/80 shadow-lg text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredReports.length}</span>
            <span>exibidos</span>
          </div>
          <span className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span className="size-2 rounded-full bg-amber-500" />
            <span>{stats.open} abertos</span>
          </div>
          <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
            <span className="size-2 rounded-full bg-sky-500" />
            <span>{stats.investigating} em análise</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>{stats.resolved} resolvidos</span>
          </div>
        </div>

        {/* Empty state hint */}
        {filteredReports.length === 0 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-xl bg-background/90 dark:bg-zinc-900/90 backdrop-blur-md border border-border shadow-xl text-xs text-muted-foreground flex items-center gap-2">
              <Info className="size-4 text-amber-500" />
              Nenhuma ocorrência encontrada para os filtros selecionados.
            </div>
          </div>
        )}
      </div>

      {/* Report Problem Sheet (Drawer with SmoothUI Multi-File Upload) */}
      <ReportProblemSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        coordinates={placementCoordinates}
        onSubmit={handleAddReport}
        onCancelPlacement={handleCancelPlacement}
      />

      {/* Report Details Dialog (with Multi-photo Gallery) */}
      <ReportDetailsDialog
        report={selectedReport}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpvote={handleUpvote}
      />
    </div>
  );
}
