'use client';

import * as React from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/components/theme-provider';
import {
  X,
  CircleAlert,
  Crosshair,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import { createMapReport, getMapReports } from '@/app/actions/api';
import { useAuth } from '@/lib/auth-context';
import { AnimatePresence } from 'motion/react';
import { INITIAL_REPORTS } from '@/data/mock-reports';
import {
  StreetReport,
  ReportCategory,
  CATEGORIES,
  CATEGORY_ORDER,
  categoryFromApi,
  categoryToApi,
  REPORT_IMAGE_CDN,
} from './types';
import { MapAccountButton, MapCategoryPills, MapFilterButton, MapIconRail, MapSearchCard } from './map-shell';
import { ReportWizardSheet } from './report-wizard-card';
import { ReportDetailsPanel } from './report-details-panel';
import {
  useGatedReportImages,
} from './use-report-images';
import { MapMarker } from './map-marker';
import { createPlacementMarkerElement } from './placement-pin';
import { fetchGoogleLikeStyle, getCartoBaseStyleUrl } from './google-maps-style';
import { usePublicConfig } from '@/lib/public-config';

function getCartoVectorStyle(isDark: boolean, apiKey: string) {
  const base = getCartoBaseStyleUrl(isDark);
  return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const countFormat = new Intl.NumberFormat('pt-BR');
function formatCount(value: number): string {
  return countFormat.format(value);
}

export default function Map() {
  const { resolvedTheme } = useTheme();
  const { jwt, user } = useAuth();
  // Hydration gate for browser-only map work. useSyncExternalStore returns
  // false during SSR/prerender and true after hydration — no effect needed
  // (avoids react-hooks/set-state-in-effect).
  const hasMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isDark = hasMounted && resolvedTheme === 'dark';

  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = React.useRef(false);
  const placementMarkerRef = React.useRef<maplibregl.Marker | null>(null);

  // Reactive Map instance state to trigger React child components (MapMarker)
  const [mapInstance, setMapInstance] = React.useState<maplibregl.Map | null>(null);

  // React state array for reports / marker coordinates
  const [reports, setReports] = React.useState<StreetReport[]>([]);
  const [reportsError, setReportsError] = React.useState<string | null>(null);
  const [isReportsLoading, setIsReportsLoading] = React.useState(true);
  const [isOffline, setIsOffline] = React.useState(false);
  const [mapRetryKey, setMapRetryKey] = React.useState(0);

  // Fetch reports from API using Server Action.
  // Initial state is already loading=true/error=null, and retries reset via
  // handleRetryMap — state updates here happen only in async callbacks.
  React.useEffect(() => {
    let cancelled = false;

    getMapReports()
      .then((apiReports) => {
        if (cancelled) return;
        if (apiReports && apiReports.length > 0) {
          setReports(
            apiReports.map((report) => ({
              id: String(report.id),
              title: report.titulo,
              description: report.descricao || 'Sem descrição informada.',
              category: categoryFromApi(report.categoria),
              coordinates: report.ponto,
              address: `Localização: ${report.ponto[1].toFixed(4)}, ${report.ponto[0].toFixed(4)}`,
              images: report.foto_nome
                ? [
                    `${REPORT_IMAGE_CDN}/${report.foto_nome
                      .replace(/^\/+/, '')
                      .split('/')
                      .map((segment) => encodeURIComponent(segment))
                      .join('/')}`,
                  ]
                : report.foto_data?.map((image) => `data:image/webp;base64,${image}`) ?? [],
              createdAt: report.data_criacao,
              updatedAt: report.data_atualizacao,
              authorId:
                typeof report.id_user === 'number' && report.id_user > 0
                  ? report.id_user
                  : undefined,
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
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<StreetReport | null>(null);
  const { images: gatedImages, isReady: isDetailsReady } = useGatedReportImages(selectedReport);
  const isDetailsLoading = selectedReport !== null && !isDetailsReady;
  const [isMapLoading, setIsMapLoading] = React.useState(true);
  const [mapError, setMapError] = React.useState<string | null>(null);
  // Retry resets loading/error in the event handler (not in the effect body)
  // so the fetch effect above never calls setState synchronously.
  const handleRetryMap = React.useCallback(() => {
    setIsReportsLoading(true);
    setReportsError(null);
    setMapError(null);
    setIsMapLoading(true);
    setMapRetryKey((value) => value + 1);
  }, []);
  // Delayed loader (avoids flash on fast boots) + slow-network hint.
  const [showMapLoader, setShowMapLoader] = React.useState(false);
  const [slowMap, setSlowMap] = React.useState(false);

  React.useEffect(() => {
    if (!isMapLoading || mapError) {
      // Deferred out of the synchronous effect body.
      queueMicrotask(() => {
        setShowMapLoader(false);
        setSlowMap(false);
      });
      return;
    }
    const flashTimer = window.setTimeout(() => setShowMapLoader(true), 200);
    const slowTimer = window.setTimeout(() => setSlowMap(true), 8000);
    return () => {
      window.clearTimeout(flashTimer);
      window.clearTimeout(slowTimer);
    };
  }, [isMapLoading, mapError]);

  // Search and filter state (Google Maps-style pills). Initialized from the
  // URL so result sets survive reload, back, and sharing.
  const [searchQuery, setSearchQuery] = React.useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });
  const [selectedCategory, setSelectedCategory] = React.useState<ReportCategory | 'all'>(() => {
    if (typeof window === 'undefined') return 'all';
    const raw = new URLSearchParams(window.location.search).get('categoria');
    return raw && (CATEGORY_ORDER as string[]).includes(raw) ? (raw as ReportCategory) : 'all';
  });

  // Keep the query + filters in the URL (shareable, back-button safe).
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
    const params = new URLSearchParams(window.location.search);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    else params.delete('q');
    if (selectedCategory !== 'all') params.set('categoria', selectedCategory);
    else params.delete('categoria');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', next);
  }, [searchQuery, selectedCategory]);

  // Filter reports reactively
  const filteredReports = React.useMemo(() => {
    return reports.filter((report) => {
      const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        report.title.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        report.address.toLowerCase().includes(q) ||
        (report.neighborhood && report.neighborhood.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [reports, selectedCategory, searchQuery]);

  const hasActiveFilters =
    selectedCategory !== 'all' || searchQuery.trim().length > 0;

  // All filtered reports mount markers — including off-viewport ones — so
  // panning never pops pins in late and the pins always match the legend
  // count. (Viewport virtualization was intentionally removed.)
  const markerReports = filteredReports;

  // Per-category occurrence counts for the filter rows.
  const categoryCounts = React.useMemo(() => {
    const counts = Object.fromEntries(CATEGORY_ORDER.map((cat) => [cat, 0])) as Record<
      ReportCategory,
      number
    >;
    for (const report of reports) {
      counts[report.category] = (counts[report.category] ?? 0) + 1;
    }
    return counts;
  }, [reports]);

  // Last theme applied to the basemap. Compared inside effects so the
  // theme effect never re-applies the style the map was just constructed with.
  const appliedStyleRef = React.useRef<boolean | null>(null);
  // Safety-net timer so the UI can never spin forever: cleared on load/error.
  const loadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Public runtime config (CARTO key) served by /api/public-config.
  // The map waits for it before initializing; missing key falls back to the
  // keyless CARTO style (server logs the warning once).
  const publicConfig = usePublicConfig();
  const cartoApiKey = publicConfig?.cartoApiKey ?? '';

  // Initialize MapLibre (once per retry; theme switches go through setStyle below).
  React.useEffect(() => {
    if (!mapContainerRef.current || !publicConfig) return;

    mapLoadedRef.current = false;
    setIsMapLoading(true);
    setMapError(null);
    const apiKey = cartoApiKey;
    // NOTE: isDark is intentionally read once here; live theme switches are
    // handled by the [isDark] effect via map.setStyle.
    const initialIsDark = isDark;
    const initialStyle = getCartoVectorStyle(initialIsDark, apiKey);
    appliedStyleRef.current = initialIsDark;
    let cancelled = false;

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

    // Fail fast without WebGL (some mobile browsers disable it).
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
      if (!gl) throw new Error('WebGL context unavailable');
      // Release the probe context immediately; the map creates its own.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch (webglError) {
      console.error('[Urbaly Map] WebGL unavailable:', webglError);
      queueMicrotask(() => {
        setIsMapLoading(false);
        setMapError(
          'Este aparelho ou navegador não oferece WebGL, necessário para o mapa. Tente outro navegador.'
        );
      });
      return;
    }

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

    // Upgrade the CARTO base style to the user-palette repaint once the
    // patched style JSON resolves. The map boots instantly on the base URL;
    // this swaps colors in place (markers survive setStyle).
    void fetchGoogleLikeStyle(initialIsDark, apiKey).then((googleStyle) => {
      if (cancelled) return;
      if (typeof googleStyle !== 'object' || googleStyle === null) return;
      try {
        map.setStyle(googleStyle as unknown as string);
      } catch (styleError) {
        console.warn('[Urbaly Map] Palette style apply failed, keeping base style:', styleError);
      }
    });

    // Mobile safety: URL-bar changes, rotation, and zero-size first paints
    // can leave the canvas mis-sized — keep the map synced to its container.
    let resizeObserver: ResizeObserver | null = null;
    try {
      const container = mapContainerRef.current;
      if (container && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          try {
            map.resize();
          } catch {
            // Resize is a nicety; never break the map over it.
          }
        });
        resizeObserver.observe(container);
      }
    } catch {
      // ResizeObserver unavailable — the map still works, just unsynced.
    }
    // Nudge a first resize once laid out (mobile often reports 0x0 first).
    requestAnimationFrame(() => {
      try {
        map.resize();
      } catch {
        // Ignored — see above.
      }
    });

    // Whichever usable signal (load/idle) arrives first wins.
    const settleLoaded = (via: string) => {
      if (mapLoadedRef.current) return;
      mapLoadedRef.current = true;
      clearLoadTimeout();
      setMapInstance(map);
      setIsMapLoading(false);
      if (via !== 'load') console.info(`[Urbaly Map] Map ready via ${via}.`);
    };

    // Markers are plain DOM pins pinned to coordinates — they never depend
    // on zoom, so no zoom/move listeners are attached. All markers stay
    // mounted regardless of viewport or zoom level.

    map.on('load', () => {
      settleLoaded('load');
    });

    // Fallback: if 'load' misfires but the map idles usable (slow tiles),
    // reveal it instead of spinning forever.
    map.once('idle', () => {
      if (!mapLoadedRef.current) {
        console.warn('[Urbaly Map] Revealing via idle fallback (load never fired).');
        settleLoaded('idle');
      }
    });

    // Track whether the style arrived so the timeout can blame
    // "no connection" vs "tiles hanging" correctly.
    let styleArrived = false;
    const onStyleData = () => {
      styleArrived = true;
    };
    map.on('styledata', onStyleData);

    map.on('error', (event) => {
      console.error('[Urbaly Map] MapLibre error:', event.error || 'Unknown map error');
      clearLoadTimeout();
      if (!mapLoadedRef.current) {
        setIsMapLoading(false);
        setMapError('O mapa não pôde ser carregado. Verifique sua conexão e tente novamente.');
      }
    });

    // Safety net: neither 'load'/'idle' nor 'error' fired in 20s.
    loadTimeoutRef.current = setTimeout(() => {
      if (!mapLoadedRef.current) {
        console.error(
          '[Urbaly Map] Style load timed out after 20s. ' +
          `Style: ${initialStyle.split('?')[0]} | key present: ${apiKey ? 'yes' : 'no'} | ` +
          `style arrived: ${styleArrived ? 'yes' : 'no'}`
        );
        setIsMapLoading(false);
        setMapError(
          styleArrived
            ? 'O mapa conectou, mas os blocos estão demorando (rede lenta?). Aguarde ou tente novamente.'
            : 'O mapa demorou demais para carregar. Verifique sua conexão e tente novamente.'
        );
      }
    }, 20000);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: true,
      }),
      'bottom-right'
    );

    return () => {
      cancelled = true;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      map.off('styledata', onStyleData);
      resizeObserver?.disconnect();
      setMapInstance(null);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRetryKey, publicConfig]);

  // Update user-palette basemap on dark mode change without recreating the map.
  // DOM markers (MapMarker / placement pin) survive setStyle, so no state is lost.
  // Works before 'load' too: setStyle simply swaps the pending style request.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !publicConfig) return;
    if (appliedStyleRef.current === isDark) return;
    appliedStyleRef.current = isDark;
    const apiKey = cartoApiKey;
    void fetchGoogleLikeStyle(isDark, apiKey).then((nextStyle) => {
      if (mapRef.current !== map) return;
      try {
        map.setStyle(nextStyle as unknown as string);
      } catch (styleError) {
        console.warn('[Urbaly Map] Theme style apply failed:', styleError);
      }
    });
  }, [isDark, publicConfig, cartoApiKey]);

  // Handle map click for point placement mode
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (isPlacementMode) {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setPlacementCoordinates(coords);

        // Render or move placement marker (shared teardrop silhouette in
        // app-primary with a pulsing halo — see placement-pin.ts)
        if (placementMarkerRef.current) {
          placementMarkerRef.current.setLngLat(coords);
        } else {
          const el = createPlacementMarkerElement({ isDark });
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
  }, [isPlacementMode, isDark]);

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
      if (prefersReducedMotion()) {
        map.jumpTo({ center: selectedReport.coordinates });
        return;
      }
      map.easeTo({
        center: selectedReport.coordinates,
        duration: 600,
        padding: isDesktop
          ? { top: 150, bottom: 60, left: 448, right: 60 }
          : { top: 130, bottom: 340, left: 20, right: 20 },
      });
    } catch {
      // Padding-aware pan is a nicety; never break selection if it fails.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport?.id, isDetailsReady]);

  // Maps-like: keep the placement pin visible once the form card reveals,
  // offsetting for the right-docked card instead of centering under it.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !isSheetOpen || !placementCoordinates) return;
    try {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      if (prefersReducedMotion()) {
        map.jumpTo({ center: placementCoordinates });
        return;
      }
      map.easeTo({
        center: placementCoordinates,
        duration: 600,
        padding: isDesktop
          ? { top: 150, bottom: 60, left: 32, right: 460 }
          : { top: 130, bottom: 400, left: 20, right: 20 },
      });
    } catch {
      // Padding-aware pan is a nicety; never break placement if it fails.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSheetOpen]);

  // Detail-view coverage: the open record names itself in the tab title.
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!selectedReport) return;
    const previous = document.title;
    document.title = `${selectedReport.title} — Urbaly`;
    return () => {
      document.title = previous;
    };
    // Intentionally keyed on id so title/author updates don't re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport?.id]);

  // Adjacent-record navigation through the filtered list (no list round-trip).
  const selectedIndex = selectedReport
    ? filteredReports.findIndex((report) => report.id === selectedReport.id)
    : -1;
  const handleSelectAdjacent = React.useCallback(
    (direction: 1 | -1) => {
      if (filteredReports.length === 0) return;
      const next =
        selectedIndex < 0
          ? 0
          : (selectedIndex + direction + filteredReports.length) % filteredReports.length;
      setSelectedReport(filteredReports[next]);
    },
    [filteredReports, selectedIndex]
  );

  // Backend errors are terse; expand the known ones, keeping the original text searchable.
  const translateReportError = (error: string | undefined): string => {
    if (!error) return 'Não foi possível enviar o reporte.';
    if (/token mal-formado|não autenticado|unauthorized|\b401\b|\b403\b/i.test(error))
      return 'Você precisa entrar com sua conta Google para enviar reportes. Toque em Entrar no menu e tente de novo.';
    if (/erro interno/i.test(error))
      return 'Sua sessão expirou ou é inválida. Saia e entre de novo para enviar o reporte.';
    if (/cloudflare|bad gateway|origin.*(overload|misconfig)|error 502|\b502\b/i.test(error))
      return 'O servidor está indisponível no momento (erro 502). Aguarde cerca de 1 minuto e tente de novo — seus dados e fotos estão preservados.';
    if (/muito grandes/i.test(error))
      return 'As imagens ultrapassaram o limite de ~300KB por foto do servidor. Remova uma foto ou use uma imagem menor e tente de novo.';
    if (/inválida/i.test(error))
      return `O servidor recusou as imagens (erro: ${error}). Se persistir com outra foto, o problema está no servidor — avise a equipe com o horário do envio.`;
    return error;
  };

  // Add new report submitted from Sheet without full page refresh
  const handleAddReport = async (
    newReportData: Omit<StreetReport, 'id' | 'createdAt' | 'upvotes' | 'status'>
  ) => {
    // O backend exige Authorization: Bearer desde a ativação do auth (testado:
    // POST sem JWT -> 400 "Token mal-formado"). Barra cedo com mensagem clara.
    if (!jwt) {
      throw new Error(
        'Você precisa entrar com sua conta Google para enviar reportes. Toque em Entrar no menu e tente de novo.'
      );
    }
    let createdId: string | undefined;

    const res = await createMapReport(
      {
        titulo: newReportData.title,
        descricao: newReportData.description,
        categoria: categoryToApi(newReportData.category),
        ponto: newReportData.coordinates,
        fotoData: newReportData.images,
      },
      jwt,
    );

    if (res.success && res.id) {
      createdId = String(res.id);
    }
    if (!res.success) {
      throw new Error(translateReportError(res.error));
    }

    const createdReport: StreetReport = {
      ...newReportData,
      id: createdId || `pending-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      upvotes: 0,
      authorId: typeof user?.id === 'number' ? user.id : newReportData.authorId,
      reportedBy:
        (typeof user?.nome === 'string' && user.nome) ||
        (typeof user?.name === 'string' && user.name) ||
        newReportData.reportedBy,
    };

    // Dynamically update coordinates in React state array -> markers appear without refresh!
    setReports((previous) => [createdReport, ...previous]);

    // Animate map fly-to (instant jump for reduced-motion users)
    if (mapRef.current) {
      if (prefersReducedMotion()) {
        mapRef.current.jumpTo({ center: newReportData.coordinates, zoom: 15 });
      } else {
        mapRef.current.flyTo({
          center: newReportData.coordinates,
          zoom: 15,
          duration: 1200,
          essential: true,
        });
      }
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
    <div className="flex h-full w-full overflow-hidden bg-background">
      <MapIconRail />

      {/* Map column — offline banner floats over the basemap */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {(isOffline || reportsError) && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-x-3 top-3 z-30 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 backdrop-blur-md md:left-4 dark:text-amber-100"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {isOffline
                ? 'Você está offline. O mapa pode mostrar dados desatualizados; tente novamente quando a conexão voltar.'
                : reportsError}
            </span>
          </div>
        )}

        {/* Interactive Map Container — Maps shell floats over the canvas */}
        <div
          ref={mapContainerRef}
          role="application"
          aria-label="Mapa de ocorrências. Use Tab para navegar entre os marcadores e Enter para ver detalhes."
          className={cn(
            'relative min-h-0 w-full flex-1 overflow-hidden bg-muted transition-[border-color,box-shadow]',
            isPlacementMode && 'placement-mode-active'
          )}
        >
          {/* Floating Maps chrome: search card + category pills */}
          <div className="absolute inset-x-3 top-3 z-20 md:inset-x-auto md:left-4 md:top-4 md:w-[440px]">
            <MapSearchCard
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isLoading={isDetailsLoading}
              drawerOpen={isNavOpen}
              onDrawerChange={setIsNavOpen}
              rightSlot={
                <>
                  <MapFilterButton
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    categoryCounts={categoryCounts}
                  />
                  {/* Mobile keeps the account inside the search card like the Maps app */}
                  <span className="md:hidden">
                    <MapAccountButton />
                  </span>
                </>
              }
            />
          </div>

          {/* Floating account — desktop top-right like Google Maps */}
          <div className="absolute top-4 right-4 z-20 hidden md:block">
            <MapAccountButton />
          </div>

          <div className="absolute inset-x-3 top-[68px] z-20 md:left-4 md:right-4 md:top-[72px] md:inset-x-auto">
            <MapCategoryPills
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categoryCounts={categoryCounts}
            />
          </div>

          {showMapLoader && !mapError && (
            <div
              role="status"
              aria-live="polite"
              aria-label="Carregando mapa"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-muted"
            >
              <div className="h-10 w-10 animate-pulse rounded-md border border-border/70 bg-card shadow-sm" />
              <span className="text-xs font-medium text-muted-foreground">Carregando mapa…</span>
              {slowMap && (
                <span className="text-[11px] text-muted-foreground">
                  Ainda carregando — sua rede parece lenta. Aguarde um pouco mais.
                </span>
              )}
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
                  onClick={handleRetryMap}
                  className="h-10 rounded-md px-4"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {/* Placement Mode Top Overlay Banner — sits below pills.
              Hidden once the form card takes over (the point is already picked). */}
          {isPlacementMode && !isSheetOpen && (
            <div role="status" className="absolute left-3 right-3 top-[122px] z-10 mx-auto flex max-w-xl items-center justify-center gap-2.5 rounded-2xl border border-primary/35 bg-background/95 px-3 py-2.5 text-center text-xs font-semibold text-foreground shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 motion-reduce:animate-none sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-4 md:top-[128px] dark:bg-zinc-900/95">
              <span aria-hidden="true" className="flex size-2 rounded-full bg-primary animate-ping motion-reduce:animate-none" />
              <Crosshair aria-hidden="true" className="size-4 text-primary" />
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

          {/* Bottom Legend — count only; pins are stable across zoom */}
          <div className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border/80 bg-background/90 py-1.5 pl-3.5 pr-3.5 text-[11px] shadow-lg backdrop-blur-md md:left-4 dark:bg-zinc-900/90">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-mono font-semibold tabular-nums text-foreground">{formatCount(filteredReports.length)}</span>
              <span className="leading-tight">no mapa</span>
            </div>
          </div>

          {/* Empty state hint */}
          {filteredReports.length === 0 &&
            !isMapLoading &&
            !isReportsLoading &&
            !mapError &&
            !reportsError && (
              <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-4">
                <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-background/95 px-4 py-3 text-center text-xs text-muted-foreground shadow-xl backdrop-blur-md dark:bg-zinc-900/95">
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
                      } else {
                        setIsPlacementMode(true);
                      }
                    }}
                    className="mt-1 h-9 rounded-full px-4 text-xs"
                  >
                    {hasActiveFilters ? 'Limpar filtros' : 'Reportar um problema'}
                  </Button>
                </div>
              </div>
            )}

          {/* Dynamic Map Markers — every filtered report mounts a stable pin
              marker that never changes with zoom, so zooming in/out never
              hides, swaps, or replays markers */}
          {mapInstance &&
            markerReports.map((report, index) => {
              return (
                <MapMarker
                  // Stable key: the same marker element stays mounted for the
                  // life of the report — no zoom-driven remount or swap.
                  key={report.id}
                  map={mapInstance}
                  pointer={{
                    id: report.id,
                    coordinates: report.coordinates,
                    category: report.category,
                    title: report.title,
                    imageUrl: undefined,
                    imageCount: 0,
                    categoryLabel: CATEGORIES[report.category]?.label ?? report.category,
                    address: report.address,
                    status: report.status,
                    upvotes: report.upvotes,
                    showPhoto: false,
                    thumbPending: false,
                  }}
                  isDark={isDark}
                  delayMs={Math.min(index, 12) * 40}
                  isSelected={selectedReport?.id === report.id}
                  onClick={() => {
                    // Toggle like Maps: re-clicking the same pin dismisses the panel.
                    setSelectedReport((prev) => (prev?.id === report.id ? null : report));
                  }}
                />
              );
            })}

          {/* Report FAB — Maps-style floating action above bottom-right controls */}
          <Button
            type="button"
            onClick={() => {
              setIsPlacementMode((prev) => !prev);
              if (isPlacementMode) {
                handleCancelPlacement();
              }
            }}
            aria-pressed={isPlacementMode}
            aria-label={isPlacementMode ? 'Cancelar modo de marcação' : 'Reportar problema no mapa'}
            aria-describedby={!jwt && !isPlacementMode ? 'report-fab-auth-hint' : undefined}
            title={!jwt && !isPlacementMode ? 'Entre com sua conta Google para publicar' : undefined}
            className={cn(
              'absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[calc(0.75rem+env(safe-area-inset-right))] z-20 h-12 cursor-pointer touch-manipulation gap-2 rounded-full px-5 text-sm font-semibold shadow-xl transition-[transform,opacity,background-color] duration-150 active:scale-[0.97] md:bottom-8 md:right-4',
              selectedReport &&
              'pointer-events-none translate-y-2 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100',
              // The right-docked form card owns the FAB corner on every
              // breakpoint while the reporting flow is active.
              isSheetOpen && 'pointer-events-none translate-y-2 opacity-0',
              isPlacementMode
                ? 'bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600'
                : 'bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90'
            )}
          >
            {isPlacementMode ? (
              <>
                <X className="size-4" />
                Cancelar
              </>
            ) : (
              <>
                <CircleAlert className="report-action-icon size-4" aria-hidden="true" />
                Reportar
              </>
            )}
          </Button>
          {!jwt && !isPlacementMode && (
            <span id="report-fab-auth-hint" className="sr-only">
              Para publicar um reporte, entre com sua conta Google.
            </span>
          )}

          {/* Maps-style floating details: skeleton mirrors the panel
              layout while images preload (no CLS on reveal) */}
          <AnimatePresence>
            {selectedReport && !isDetailsReady && (
              <div
                key={`skeleton-${selectedReport.id}`}
                role="status"
                aria-label="Carregando detalhes da ocorrência"
                aria-busy="true"
                className="absolute z-10 inset-x-0 bottom-0 max-h-[72dvh] md:inset-x-auto md:left-4 md:top-[136px] md:bottom-6 md:w-[400px] md:max-h-none flex flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-card shadow-2xl md:rounded-2xl md:border-b"
              >
                <div aria-hidden="true" className="h-52 w-full shrink-0 animate-pulse bg-muted md:h-56" />
                <div aria-hidden="true" className="flex flex-col gap-2.5 px-4 py-4 md:px-5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            )}
            {selectedReport && isDetailsReady && (
              <ReportDetailsPanel
                key={selectedReport.id}
                report={selectedReport}
                images={gatedImages}
                onClose={() => setSelectedReport(null)}
                onUpvote={handleUpvote}
                onPrev={
                  filteredReports.length > 1 ? () => handleSelectAdjacent(-1) : undefined
                }
                onNext={
                  filteredReports.length > 1 ? () => handleSelectAdjacent(1) : undefined
                }
                position={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
                total={filteredReports.length > 1 ? filteredReports.length : undefined}
              />
            )}
          </AnimatePresence>

          {/* Report form: 3-step wizard card / bottom sheet over the basemap */}
          <ReportWizardSheet
            isOpen={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            coordinates={placementCoordinates}
            onSubmit={handleAddReport}
            onCancelPlacement={handleCancelPlacement}
            isAuthenticated={!!jwt}
          />
        </div>
      </div>
    </div>
  );
}
