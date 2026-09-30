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
  Loader2,
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
import { createMapReport, getMapReports, getReportImages } from '@/app/actions/api';
import { AnimatePresence } from 'motion/react';
import { INITIAL_REPORTS } from '@/data/mock-reports';
import {
  StreetReport,
  ReportCategory,
  ReportStatus,
  CATEGORIES,
  REPORT_IMAGE_CDN,
} from './types';
import { ReportProblemSheet } from './report-problem-sheet';
import { ReportDetailsPanel } from './report-details-panel';
import {
  useGatedReportImages,
  peekCachedReportImages,
  storeCachedReportImages,
} from './use-report-images';
import { CategoryIcon } from './category-icon';
import { MapMarker } from './map-marker';

function getCartoApiKey() {
  return (
    process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MAP_API_KEY?.trim() ||
    ''
  );
}

function getCartoVectorStyle(isDark: boolean) {
  const base = isDark
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  const apiKey = getCartoApiKey();
  return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
}

// Zoom band with hysteresis: photo previews engage at >= 15 but only
// disengage below 14.6, so hovering around the threshold never flickers
// the markers back and forth.
const PHOTO_ZOOM_ENTER = 15;
const PHOTO_ZOOM_EXIT = 14.6;

// Thumbnail resolution order: inline listing image -> zoom-prefetched
// CDN thumb -> shared cache (fed by prefetch or a previous selection).
function getReportThumb(
  report: StreetReport,
  photoThumbs: Record<string, string>
): string | undefined {
  return (
    report.images?.[0] ??
    report.imageUrl ??
    photoThumbs[report.id] ??
    peekCachedReportImages(report.id)?.[0]
  );
}

function isFetchableReportId(id: string): boolean {
  const numericId = parseInt(id, 10);
  return !isNaN(numericId) && numericId > 0;
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
  // Current zoom level: pins swap to circular CDN photo previews when very zoomed in.
  const [showPhotoPins, setShowPhotoPins] = React.useState(false);
  // First-image thumbnails fetched on demand for reports whose listing carries
  // no inline photos (the /quadro endpoint often omits foto payloads).
  const [photoThumbs, setPhotoThumbs] = React.useState<Record<string, string>>({});
  // Reports confirmed to have no fetchable image — pins settle on the
  // fallback disc instead of shimmering forever.
  const [thumbFailed, setThumbFailed] = React.useState<Record<string, true>>({});
  const thumbFetchInFlightRef = React.useRef<Set<string>>(new Set());

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
  const { images: gatedImages, isReady: isDetailsReady } = useGatedReportImages(selectedReport);
  const isDetailsLoading = selectedReport !== null && !isDetailsReady;
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

  // True while any visible photo pin is still waiting on its CDN thumbnail —
  // drives the skeleton shimmer on markers and the legend loading hint.
  const thumbsLoading =
    showPhotoPins &&
    filteredReports.some((report) => {
      if (getReportThumb(report, photoThumbs)) return false;
      if (thumbFailed[report.id]) return false;
      return isFetchableReportId(report.id);
    });

  // When very zoomed in, photo pins need a thumbnail for every visible report —
  // but the /quadro listing often omits foto payloads. Fetch first images from
  // the CDN-backed /reporte/imagens endpoint on demand (cached, capped, batched
  // so we never hammer the backend). Results also feed the shared image cache,
  // so opening a prefetched report's details panel is instant. Reports with no
  // image anywhere are recorded in `thumbFailed` so their pins settle on the
  // fallback disc instead of shimmering forever.
  React.useEffect(() => {
    if (!showPhotoPins || filteredReports.length === 0) return;

    const missing = filteredReports.filter((report) => {
      if (getReportThumb(report, photoThumbs)) return false;
      if (thumbFailed[report.id]) return false;
      if (thumbFetchInFlightRef.current.has(report.id)) return false;
      return isFetchableReportId(report.id);
    });
    if (missing.length === 0) return;

    let cancelled = false;
    // Cap how many reports we prefetch per zoom-in (protects the backend when
    // the map holds hundreds of pins); the rest keep teardrop pins.
    const batch = missing.slice(0, 60);
    batch.forEach((report) => thumbFetchInFlightRef.current.add(report.id));

    const CONCURRENCY = 6;
    const runBatch = async () => {
      const collected: Record<string, string> = {};
      const failed: Record<string, true> = {};
      for (let i = 0; i < batch.length; i += CONCURRENCY) {
        if (cancelled) return;
        const chunk = batch.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map(async (report) => ({
            id: report.id,
            images: await getReportImages(report.id),
          }))
        );
        if (cancelled) return;
        results.forEach((result, index) => {
          const report = chunk[index];
          thumbFetchInFlightRef.current.delete(report.id);
          const images = result.status === 'fulfilled' ? result.value.images : [];
          const first = images.find(Boolean);
          if (!first) {
            failed[report.id] = true;
            return;
          }
          collected[report.id] = first;
          storeCachedReportImages(report.id, images);
        });
      }
      if (cancelled) return;
      if (Object.keys(collected).length > 0) {
        setPhotoThumbs((prev) => ({ ...prev, ...collected }));
      }
      if (Object.keys(failed).length > 0) {
        setThumbFailed((prev) => ({ ...prev, ...failed }));
      }
    };

    void runBatch();

    return () => {
      cancelled = true;
    };
  }, [showPhotoPins, filteredReports, photoThumbs, thumbFailed]);

  // Last vector style URL applied to the map. Compared inside effects so the
  // theme effect never re-applies the style the map was just constructed with.
  const appliedStyleRef = React.useRef<string | null>(null);
  // Safety-net timer so the UI can never spin forever: cleared on load/error.
  const loadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize MapLibre (once per retry; theme switches go through setStyle below).
  React.useEffect(() => {
    if (!mapContainerRef.current) return;

    mapLoadedRef.current = false;
    setIsMapLoading(true);
    setMapError(null);
    const apiKey = getCartoApiKey();
    if (!apiKey) {
      console.warn(
        '[Urbaly Map] NEXT_PUBLIC_CARTO_API_KEY is missing. ' +
          'Restart `next dev` after creating frontend/.env.local. ' +
          'Falling back to the keyless CARTO style.'
      );
    }
    // NOTE: isDark is intentionally read once here; live theme switches are
    // handled by the [isDark] effect via map.setStyle.
    const initialStyle = getCartoVectorStyle(isDark);
    appliedStyleRef.current = initialStyle;

    const clearLoadTimeout = () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
    clearLoadTimeout();

    // Self-hosted worker: Next.js/Turbopack rewrites import.meta.url, so
    // MapLibre's default worker resolution returns '' and `new Worker('')`
    // resolves to the page URL (blocked as MIME mismatch). public/maplibre/
    // is populated by scripts/copy-maplibre-worker.mjs (postinstall).
    // Same-origin => loaded directly as a module worker.
    maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        transformRequest: (url: string) => {
          // Propagate the CARTO API key to every vector tile asset
          // (tiles.json, .mvt, sprites, glyphs) that the style.json references
          // without an embedded key.
          if (apiKey && url.includes('basemaps.cartocdn.com') && !/[?&]key=/.test(url)) {
            const separator = url.includes('?') ? '&' : '?';
            return { url: `${url}${separator}key=${encodeURIComponent(apiKey)}` };
          }
          return { url };
        },
        center: [-51.065, 0.035],
        zoom: 13,
        maxZoom: 18,
        minZoom: 9,
      });
    } catch (constructionError) {
      console.error('[Urbaly Map] Failed to construct the map:', constructionError);
      // Deferred so this stays out of the synchronous effect body.
      queueMicrotask(() => {
        setIsMapLoading(false);
        setMapError(
          'O mapa não pôde ser inicializado neste navegador (WebGL indisponível?). Tente outro navegador.'
        );
      });
      return;
    }

    mapRef.current = map;

    // Track zoom from the start so pins can swap to circular CDN photo
    // previews when very zoomed in. `zoomend`/`moveend` keep React renders
    // cheap (no per-frame setState during pinch). The functional update only
    // flips state when the hysteresis band is actually crossed.
    const syncZoom = () => {
      try {
        const zoom = map.getZoom();
        setShowPhotoPins((prev) => (prev ? zoom >= PHOTO_ZOOM_EXIT : zoom >= PHOTO_ZOOM_ENTER));
      } catch {
        // getZoom is a nicety; a failed read must never break the map.
      }
    };
    syncZoom();
    map.on('zoomend', syncZoom);
    map.on('moveend', syncZoom);

    map.on('load', () => {
      mapLoadedRef.current = true;
      clearLoadTimeout();
      setMapInstance(map);
      setIsMapLoading(false);
    });

    map.on('error', (event) => {
      console.error('[Urbaly Map] MapLibre error:', event.error || 'Unknown map error');
      clearLoadTimeout();
      if (!mapLoadedRef.current) {
        setIsMapLoading(false);
        setMapError('O mapa não pôde ser carregado. Verifique sua conexão e tente novamente.');
      }
    });

    // Safety net: if neither 'load' nor 'error' fires (hung request, blocked
    // CDN, stalled style), stop spinning and offer a retry instead.
    loadTimeoutRef.current = setTimeout(() => {
      if (!mapLoadedRef.current) {
        console.error(
          '[Urbaly Map] Style load timed out after 20s. ' +
            `Style: ${initialStyle.split('?')[0]} | key present: ${apiKey ? 'yes' : 'no'}`
        );
        setIsMapLoading(false);
        setMapError('O mapa demorou demais para carregar. Verifique sua conexão e tente novamente.');
      }
    }, 20000);

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
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      map.off('zoomend', syncZoom);
      map.off('moveend', syncZoom);
      setMapInstance(null);
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRetryKey]);

  // Update vector basemap style on dark mode change without recreating the map.
  // DOM markers (MapMarker / placement pin) survive setStyle, so no state is lost.
  // Works before 'load' too: setStyle simply swaps the pending style request.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextStyle = getCartoVectorStyle(isDark);
    if (appliedStyleRef.current === nextStyle) return;
    appliedStyleRef.current = nextStyle;
    map.setStyle(nextStyle);
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
      } else {
        // Maps-like dismiss: clicking empty map closes the details panel.
        // Marker clicks stop propagation on their own element, and we
        // double-guard here so a marker click never dismisses the panel.
        const target = e.originalEvent?.target as HTMLElement | null;
        if (!target?.closest?.('.maplibregl-marker')) {
          setSelectedReport(null);
        }
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

  // Google Maps-like: keep the selected pin visible once the panel reveals,
  // offsetting for the floating card instead of centering under it.
  // Intentionally keyed on id + readiness so upvote count changes don't re-pan.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedReport || !isDetailsReady) return;
    try {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      map.easeTo({
        center: selectedReport.coordinates,
        duration: 600,
        padding: isDesktop
          ? { top: 60, bottom: 60, left: 440, right: 60 }
          : { top: 60, bottom: 320, left: 20, right: 20 },
      });
    } catch {
      // Padding-aware pan is a nicety; never break selection if it fails.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport?.id, isDetailsReady]);

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
   <div className="flex h-dvh w-full flex-col gap-2 overflow-hidden">
      {/* Top Floating Control Bar */}
      <div className="flex flex-col rounded-md backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        {/* Search & Status Filter */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1 md:max-w-md">
            {isDetailsLoading ? (
              <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
            ) : (
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isDetailsLoading ? 'Carregando ocorrência…' : 'Buscar por rua, bairro ou problema...'}
              aria-busy={isDetailsLoading}
              className="h-11 rounded-md border-border/70 bg-background/80 pl-9 text-sm shadow-none transition-[border-color,box-shadow] focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/15"
            />
            {isDetailsLoading ? (
              <span role="status" aria-live="polite" className="sr-only">
                Carregando ocorrência
              </span>
            ) : (
              searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="size-4" />
                </button>
              )
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
          'relative w-full flex-1 min-h-0 overflow-hidden rounded-md border border-border/70 bg-muted shadow-foreground/5 transition-[border-color,box-shadow]',
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
          <span className="h-3 w-px bg-border" />
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-center gap-1.5 leading-tight',
              showPhotoPins ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'size-2 rounded-full',
                showPhotoPins ? 'bg-primary' : 'bg-muted-foreground/40',
                thumbsLoading && 'animate-pulse'
              )}
            />
            <span>
              {showPhotoPins ? (thumbsLoading ? 'Carregando fotos…' : 'Modo foto') : 'Aproxime para ver fotos'}
            </span>
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
          filteredReports.map((report, index) => {
            const thumbUrl = getReportThumb(report, photoThumbs);
            // Skeleton shimmer while a fetchable thumbnail is still outstanding.
            const thumbPending =
              showPhotoPins &&
              !thumbUrl &&
              !thumbFailed[report.id] &&
              isFetchableReportId(report.id);
            return (
              <MapMarker
                // Stable key: zoom swaps and thumbnail arrivals update the
                // same marker element in place (CSS crossfade, no remount).
                key={report.id}
                map={mapInstance}
                pointer={{
                  id: report.id,
                  coordinates: report.coordinates,
                  category: report.category,
                  title: report.title,
                  imageUrl: thumbUrl,
                  imageCount:
                    report.images?.length || (report.imageUrl ? 1 : thumbUrl ? 1 : 0),
                  categoryLabel: CATEGORIES[report.category]?.label ?? report.category,
                  address: report.address,
                  status: report.status,
                  upvotes: report.upvotes,
                  showPhoto: showPhotoPins,
                  thumbPending,
                }}
                isDark={isDark}
                delayMs={index * 60}
                onClick={() => {
                  // Toggle like Maps: re-clicking the same pin dismisses the panel.
                  setSelectedReport((prev) => (prev?.id === report.id ? null : report));
                }}
              />
            );
          })}

        {/* Google Maps-style floating details: only reveals after images preload */}
        <AnimatePresence>
          {selectedReport && isDetailsReady && (
            <ReportDetailsPanel
              key={selectedReport.id}
              report={selectedReport}
              images={gatedImages}
              onClose={() => setSelectedReport(null)}
              onUpvote={handleUpvote}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Report Problem Sheet (Drawer with SmoothUI Multi-File Upload) */}
      <ReportProblemSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        coordinates={placementCoordinates}
        onSubmit={handleAddReport}
        onCancelPlacement={handleCancelPlacement}
      />
    </div>
  );
}
