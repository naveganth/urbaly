'use client';

import * as React from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/components/theme-provider';
import {
  X,
  Crosshair,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import { createMapReport, getHeatmapGeral, getHeatmapRanking, getMapReports } from '@/app/actions/api';
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
  MACAPA_BOUNDS,
  REPORT_IMAGE_CDN,
} from './types';
import type { HeatmapBoundsInput, HeatmapCell } from '@/app/actions/api';
import { MapAccountButton, MapBasemapButton, MapFilterButton, MapIconRail, MapSearchCard } from './map-shell';
import {
  ensureH3Layers,
  h3CellsToGeoJSON,
  H3_FILL_LAYER_ID,
  H3_RANKING_HEX,
  padView,
  removeH3Layers,
  resolveH3Res,
  setH3Data,
  type H3Mode,
  type H3ResSetting,
  type H3View,
} from './h3-layer';
import { ReportWizardSheet } from './report-wizard-card';
import { ReportDetailsPanel } from './report-details-panel';
import {
  useGatedReportImages,
} from './use-report-images';
import { MapMarker, resetMarkerEntranceAnimation } from './map-marker';
import { createPlacementMarkerElement } from './placement-pin';
import {
  DARK_BASEMAPS,
  LIGHT_BASEMAPS,
  fetchBasemapStyle,
  getBasemapStyleUrl,
  type BasemapId,
} from './google-maps-style';
import { usePublicConfig } from '@/lib/public-config';

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

// Initial camera — the reset-view control restores exactly this.
const DEFAULT_CENTER: [number, number] = [-51.065, 0.035];
const DEFAULT_ZOOM = 13;

// H3 response cache: pans/zooms revisit the same quantized viewports, and
// toggling mode/res back and forth would otherwise refetch every time.
// TTL keeps long sessions from going stale. Module-level so retries and
// remounts share it.
const H3_CACHE_TTL_MS = 90_000;
const H3_CACHE_MAX_ENTRIES = 40;
const h3ResponseCache = new globalThis.Map<
  string,
  { at: number; cells: HeatmapCell[]; sampleKeys: string[] }
>();

function readH3Cache(key: string): { cells: HeatmapCell[]; sampleKeys: string[] } | null {
  const entry = h3ResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > H3_CACHE_TTL_MS) {
    h3ResponseCache.delete(key);
    return null;
  }
  // Refresh recency.
  h3ResponseCache.delete(key);
  h3ResponseCache.set(key, entry);
  return { cells: entry.cells, sampleKeys: entry.sampleKeys };
}

function writeH3Cache(key: string, cells: HeatmapCell[], sampleKeys: string[]): void {
  h3ResponseCache.set(key, { at: Date.now(), cells, sampleKeys });
  while (h3ResponseCache.size > H3_CACHE_MAX_ENTRIES) {
    const oldest = h3ResponseCache.keys().next();
    if (oldest.done) break;
    h3ResponseCache.delete(oldest.value);
  }
}

/**
 * Client-side ranking fallback: when /heatmap/ranking returns cells with no
 * usable winner field, derive dominance locally from per-category
 * /heatmap/geral counts (winner = argmax, qtd = total). Uses the proven
 * geral endpoint, so ranking always has an answer.
 */
async function computeRankingFromGeral(
  body: Omit<HeatmapBoundsInput, 'categoria'>
): Promise<{ cells: HeatmapCell[]; sampleKeys: string[] }> {
  const settled = await Promise.all(
    CATEGORY_ORDER.map((cat) =>
      getHeatmapGeral({ ...body, categoria: categoryToApi(cat) })
        .then((res) => ({ cat, res }))
        .catch(() => null)
    )
  );
  const acc = new globalThis.Map<string, { total: number; best: number; bestCat: number }>();
  let sampleKeys: string[] = [];
  for (const item of settled) {
    if (!item) continue;
    if (sampleKeys.length === 0) sampleKeys = item.res.sampleKeys;
    const catApi = categoryToApi(item.cat);
    for (const cell of item.res.heatmap) {
      const prev = acc.get(cell.h3_id) ?? { total: 0, best: -1, bestCat: catApi };
      prev.total += cell.h3_qtd;
      if (cell.h3_qtd > prev.best) {
        prev.best = cell.h3_qtd;
        prev.bestCat = catApi;
      }
      acc.set(cell.h3_id, prev);
    }
  }
  return {
    cells: [...acc.entries()].map(([h3_id, v]) => ({
      h3_id,
      h3_qtd: v.total,
      categoria: v.bestCat,
    })),
    sampleKeys,
  };
}

// External snapshots read after hydration (never during render on the
// server) so SSR and the first client render always agree. `useState`
// initializers and mount effects that read window/localStorage caused
// hydration mismatches whenever saved values differed from the defaults.
function subscribeNoop(): () => void {
  return () => {};
}

function getStoredBasemap(): BasemapId {
  try {
    const raw = window.localStorage.getItem('urbaly-basemap');
    return raw === 'bright' || raw === 'liberty' || raw === 'dark' || raw === 'fiord'
      ? raw
      : 'google';
  } catch {
    return 'google';
  }
}

function getUrlQuery(): string {
  try {
    return new URLSearchParams(window.location.search).get('q') ?? '';
  } catch {
    return '';
  }
}

const EMPTY_CATEGORIES: ReportCategory[] = [];

let cachedCategoriesSearch: string | null = null;
let cachedCategories: ReportCategory[] = EMPTY_CATEGORIES;

function getUrlCategories(): ReportCategory[] {
  // useSyncExternalStore requires a cached snapshot: returning a fresh
  // array per call trips "getServerSnapshot should be cached" and loops.
  // Cache by query string (subscribe is a noop; URL changes remount state
  // through the draft or a navigation re-render with a new search key).
  try {
    const search = window.location.search;
    if (search === cachedCategoriesSearch) return cachedCategories;
    const raw = new URLSearchParams(search).get('categoria');
    if (!raw) {
      cachedCategoriesSearch = search;
      cachedCategories = EMPTY_CATEGORIES;
      return cachedCategories;
    }
    const valid = raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => (CATEGORY_ORDER as string[]).includes(part)) as ReportCategory[];
    // De-dupe while preserving CATEGORY_ORDER order.
    const result = CATEGORY_ORDER.filter((cat) => valid.includes(cat));
    cachedCategoriesSearch = search;
    cachedCategories = result.length === 0 ? EMPTY_CATEGORIES : result;
    return cachedCategories;
  } catch {
    return cachedCategories;
  }
}

function getStoredH3Enabled(): boolean {
  try {
    return window.localStorage.getItem('urbaly-h3-enabled') === '1';
  } catch {
    return false;
  }
}

function getStoredH3Mode(): H3Mode {
  try {
    const raw = window.localStorage.getItem('urbaly-h3-mode');
    return raw === 'ranking' ? 'ranking' : 'geral';
  } catch {
    return 'geral';
  }
}

function getStoredH3Res(): H3ResSetting {
  try {
    const raw = window.localStorage.getItem('urbaly-h3-res');
    if (raw === 'auto') return 'auto';
    const num = Number(raw);
    return Number.isInteger(num) && num >= 1 && num <= 10 ? (num as H3ResSetting) : 'auto';
  } catch {
    return 'auto';
  }
}

function getStoredH3ShowEmpty(): boolean {
  try {
    return window.localStorage.getItem('urbaly-h3-empty') === '1';
  } catch {
    return false;
  }
}

// Reset-view glyph: the lucide "compass" icon (same library as every other
// app icon), inlined as a string because native MapLibre controls are plain
// DOM. Note MapLibre forces its own sprite span to width/height:100% (its
// selector beats our 18px override), so the Find-my-location glyph actually
// renders ~26px ink in the 44px button — hence 28px here for equal ink.
// The needle polygon keeps pointing north via rotate(-45 - bearing): the
// lucide needle nominally points north-east (45°), so -45° centers it and
// -bearing counters map rotation.
const RESET_VIEW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon class="reset-view-needle" points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none"/></svg>`;

/**
 * Native MapLibre control that stacks under Find-my-location in the
 * bottom-right group (inheriting its exact look) and resets bearing, pitch,
 * center, and zoom. Always active — no disabled state.
 */
class ResetViewControl implements maplibregl.IControl {
  private container: HTMLElement | null = null;
  private map: maplibregl.Map | null = null;

  constructor(private readonly onReset: () => void) {}

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;
    const container = document.createElement('div');
    // Same classes as the stock controls (geolocate, zoom): this is what
    // gives the button its sizing, corner margins, and click-through.
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-ctrl-reset-view';
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Redefinir vista do mapa';
    button.setAttribute('aria-label', 'Redefinir vista do mapa (norte para cima, zoom inicial)');
    button.innerHTML = RESET_VIEW_SVG;
    button.addEventListener('click', this.handleClick);
    container.appendChild(button);
    this.container = container;
    map.on('rotate', this.syncNeedle);
    this.syncNeedle();
    return container;
  }

  onRemove(map: maplibregl.Map): void {
    map.off('rotate', this.syncNeedle);
    this.container?.querySelector('button')?.removeEventListener('click', this.handleClick);
    this.container = null;
    this.map = null;
  }

  private handleClick = () => {
    this.onReset();
  };

  private syncNeedle = () => {
    const needle = this.container?.querySelector('.reset-view-needle');
    const bearing = this.map?.getBearing() ?? 0;
    needle?.setAttribute('transform', `rotate(${-45 - bearing} 12 12)`);
  };
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
  const [geoHint, setGeoHint] = React.useState<string | null>(null);
  // Find-my-location + entry prompt state.
  const geolocateControlRef = React.useRef<maplibregl.GeolocateControl | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [hasLocation, setHasLocation] = React.useState(false);
  const [showGeoPrompt, setShowGeoPrompt] = React.useState(false);
  // Tracks the last applied theme so basemap-only switches can use the
  // center-circle reveal while theme-driven swaps rely on the root theme
  // transition (avoids a double animation).
  const prevIsDarkRef = React.useRef<boolean | null>(null);
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

  // Entry localization prompt: ask once per browser until answered.
  // Never fires the native permission itself — only the soft prompt;
  // the native request runs on "Ativar localização" tap (user gesture).
  React.useEffect(() => {
    if (isMapLoading || mapError || hasLocation) return;
    let dismissed = false;
    let granted = false;
    try {
      dismissed = window.localStorage.getItem('urbaly-geo-prompt') === 'dismissed';
      granted = window.localStorage.getItem('urbaly-geo-granted') === '1';
    } catch {
      // Private-mode storage failure: still show the prompt once.
    }
    if (dismissed || granted) return;
    // If the OS permission is already granted, skip the prompt — the
    // locate button will just work.
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          if (status.state === 'granted') {
            try {
              window.localStorage.setItem('urbaly-geo-granted', '1');
            } catch {
              // Ignored — see above.
            }
            return;
          }
          if (status.state !== 'denied') {
            const timer = window.setTimeout(() => setShowGeoPrompt(true), 900);
            void timer;
          }
        })
        .catch(() => {
          const timer = window.setTimeout(() => setShowGeoPrompt(true), 900);
          void timer;
        });
      return;
    }
    const timer = window.setTimeout(() => setShowGeoPrompt(true), 900);
    return () => window.clearTimeout(timer);
  }, [isMapLoading, mapError, hasLocation]);

  const handleDismissGeoPrompt = React.useCallback(() => {
    setShowGeoPrompt(false);
    try {
      window.localStorage.setItem('urbaly-geo-prompt', 'dismissed');
    } catch {
      // Ignored — the prompt simply shows again next visit.
    }
  }, []);

  const handleAcceptGeoPrompt = React.useCallback(() => {
    setShowGeoPrompt(false);
    setGeoHint(null);
    setIsLocating(true);
    try {
      geolocateControlRef.current?.trigger();
    } catch {
      setIsLocating(false);
      setGeoHint(
        'Não conseguimos abrir a solicitação de localização. Toque no botão de localização no canto inferior direito.'
      );
    }
  }, []);

  // Search and multi-category filter state (Google Maps-style pills).
  // Persisted URL values come from a hydration-safe external store;
  // keystrokes and picks made this session live in drafts. Empty selection
  // means "Todas" (no filter). Legacy single `?categoria=x` URLs still parse.
  const persistedQuery = React.useSyncExternalStore(subscribeNoop, getUrlQuery, () => '');
  const persistedCategories = React.useSyncExternalStore(
    subscribeNoop,
    getUrlCategories,
    () => EMPTY_CATEGORIES
  );
  const [queryDraft, setQueryDraft] = React.useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = React.useState<ReportCategory[] | null>(null);
  const searchQuery = queryDraft ?? persistedQuery;
  const selectedCategories = categoryDraft ?? persistedCategories;
  const setSearchQuery = React.useCallback((value: string) => setQueryDraft(value), []);
  const toggleCategory = React.useCallback((category: ReportCategory) => {
    const base = categoryDraft ?? persistedCategories;
    setCategoryDraft(
      base.includes(category)
        ? base.filter((cat) => cat !== category)
        : [...base, category]
    );
  }, [categoryDraft, persistedCategories]);
  const clearCategories = React.useCallback(() => setCategoryDraft([]), []);

  // Keep the query + filters in the URL (shareable, back-button safe).
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
    const params = new URLSearchParams(window.location.search);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    else params.delete('q');
    if (selectedCategories.length > 0) params.set('categoria', selectedCategories.join(','));
    else params.delete('categoria');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', next);
  }, [searchQuery, selectedCategories]);

  // Filter reports reactively
  const filteredReports = React.useMemo(() => {
    return reports.filter((report) => {
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(report.category);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        report.title.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        report.address.toLowerCase().includes(q) ||
        (report.neighborhood && report.neighborhood.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [reports, selectedCategories, searchQuery]);

  const hasActiveFilters =
    selectedCategories.length > 0 || searchQuery.trim().length > 0;

  // All filtered reports mount markers — including off-viewport ones — so
  // panning never pops pins in late and the pins always match the legend
  // count. (Viewport virtualization was intentionally removed.)
  const markerReports = filteredReports;

  // Entrance cascade, top of the screen to bottom: rank pins by latitude
  // descending (north paints first at the boot viewport) and stagger the
  // drop-in delay by rank. Same timing budget as before (40ms steps,
  // capped) so the cascade stays snappy. Already-animated ids ignore the
  // delay (see animatedMarkerIds) — only the first paint cascades.
  const markerDelays = React.useMemo(() => {
    const ranked = [...markerReports].sort(
      (a, b) => b.coordinates[1] - a.coordinates[1]
    );
    const delays = new globalThis.Map<string, number>();
    ranked.forEach((report, rank) => {
      delays.set(report.id, Math.min(rank, 12) * 40);
    });
    return delays;
  }, [markerReports]);

  // Replay the entrance cascade every time the page is entered: leaving
  // /mapa unmounts Map, so clear the ledger on unmount only (empty deps —
  // retries and theme switches keep the component mounted and stay instant).
  React.useEffect(() => {
    return () => {
      resetMarkerEntranceAnimation();
    };
  }, []);

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

  // Last basemap + theme applied. Compared inside effects so the style
  // effect never re-applies the style the map was just constructed with.
  const appliedStyleRef = React.useRef<string | null>(null);
  // Safety-net timer so the UI can never spin forever: cleared on load/error.
  const loadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Switchable basemap (Layers button). One stored preference; the effective
  // choice is clamped to the current theme's options so a light-only pick
  // (e.g. Liberty) degrades to Padrão in dark mode and restores on return.
  const basemapOptions = isDark ? DARK_BASEMAPS : LIGHT_BASEMAPS;
  // Stored preference comes from a hydration-safe external store; picks
  // made this session live in a draft (persisted alongside).
  const persistedBasemap = React.useSyncExternalStore(
    subscribeNoop,
    getStoredBasemap,
    () => 'google' as BasemapId
  );
  const [basemapDraft, setBasemapDraft] = React.useState<BasemapId | null>(null);
  const basemap = basemapDraft ?? persistedBasemap;
  const effectiveBasemap = basemapOptions.some((option) => option.id === basemap)
    ? basemap
    : 'google';
  const handleBasemapChange = React.useCallback((next: BasemapId) => {
    setBasemapDraft(next);
    try {
      window.localStorage.setItem('urbaly-basemap', next);
    } catch {
      // Private-mode storage failure: the choice still applies this session.
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /* H3 heatmap layer — toggle lives on top of the Layers menu.        */
  /* Off by default, remembered in localStorage like the basemap.      */
  /* ---------------------------------------------------------------- */
  const persistedH3Enabled = React.useSyncExternalStore(
    subscribeNoop,
    getStoredH3Enabled,
    () => false
  );
  const persistedH3Mode = React.useSyncExternalStore(
    subscribeNoop,
    getStoredH3Mode,
    () => 'geral' as H3Mode
  );
  const persistedH3Res = React.useSyncExternalStore(
    subscribeNoop,
    getStoredH3Res,
    () => 'auto' as H3ResSetting
  );
  const persistedH3ShowEmpty = React.useSyncExternalStore(
    subscribeNoop,
    getStoredH3ShowEmpty,
    () => false
  );
  const [h3EnabledDraft, setH3EnabledDraft] = React.useState<boolean | null>(null);
  const [h3ModeDraft, setH3ModeDraft] = React.useState<H3Mode | null>(null);
  const [h3ResDraft, setH3ResDraft] = React.useState<H3ResSetting | null>(null);
  const [h3ShowEmptyDraft, setH3ShowEmptyDraft] = React.useState<boolean | null>(null);
  const h3Enabled = h3EnabledDraft ?? persistedH3Enabled;
  const h3Mode = h3ModeDraft ?? persistedH3Mode;
  const h3Res = h3ResDraft ?? persistedH3Res;
  const h3ShowEmpty = h3ShowEmptyDraft ?? persistedH3ShowEmpty;

  const handleH3Toggle = React.useCallback(() => {
    setH3EnabledDraft((previous) => {
      const current = previous ?? getStoredH3Enabled();
      const next = !current;
      try {
        window.localStorage.setItem('urbaly-h3-enabled', next ? '1' : '0');
      } catch {
        // Private-mode storage failure: still applies this session.
      }
      return next;
    });
  }, []);
  const handleH3ModeChange = React.useCallback((mode: H3Mode) => {
    setH3ModeDraft(mode);
    try {
      window.localStorage.setItem('urbaly-h3-mode', mode);
    } catch {
      // Ignored — see above.
    }
  }, []);
  const handleH3ResChange = React.useCallback((res: H3ResSetting) => {
    setH3ResDraft(res);
    try {
      window.localStorage.setItem('urbaly-h3-res', String(res));
    } catch {
      // Ignored — see above.
    }
  }, []);
  const handleH3ToggleEmpty = React.useCallback(() => {
    setH3ShowEmptyDraft((previous) => {
      const current = previous ?? getStoredH3ShowEmpty();
      const next = !current;
      try {
        window.localStorage.setItem('urbaly-h3-empty', next ? '1' : '0');
      } catch {
        // Private-mode storage failure: still applies this session.
      }
      return next;
    });
  }, []);

  const [h3Cells, setH3Cells] = React.useState<HeatmapCell[]>([]);
  const [h3SampleKeys, setH3SampleKeys] = React.useState<string[]>([]);
  // Last successfully covered viewport (clamped to the pins' quadro bounds)
  // — drives the "empty cells" fill without refetching.
  const [h3LastView, setH3LastView] = React.useState<H3View | null>(null);
  const [h3Loading, setH3Loading] = React.useState(false);
  const [h3Error, setH3Error] = React.useState<string | null>(null);
  const [h3RetryKey, setH3RetryKey] = React.useState(0);
  const [h3ViewportKey, setH3ViewportKey] = React.useState(0);
  const h3RequestRef = React.useRef(0);

  const handleH3Retry = React.useCallback(() => {
    setH3Error(null);
    setH3RetryKey((value) => value + 1);
  }, []);

  // Track viewport moves so the heatmap refetches for the visible bbox.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapInstance) return;
    let debounce: number | null = null;
    const bump = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => setH3ViewportKey((value) => value + 1), 500);
    };
    map.on('moveend', bump);
    map.on('zoomend', bump);
    return () => {
      if (debounce) window.clearTimeout(debounce);
      map.off('moveend', bump);
      map.off('zoomend', bump);
    };
  }, [mapInstance]);

  // Fetch heatmap cells for the current viewport when enabled.
  // Responses are cached by quantized viewport + mode + res + categories,
  // so panning back, toggling mode/res, or re-selecting filters is instant.
  const selectedCategoriesKey = selectedCategories.join(',');
  React.useEffect(() => {
    const map = mapRef.current;
    if (!h3Enabled || !map || !mapInstance) return;
    const requestId = h3RequestRef.current + 1;
    h3RequestRef.current = requestId;
    let cancelled = false;

    const bounds = map.getBounds();
    const resolucao = resolveH3Res(h3Res, map.getZoom());
    // Full viewport drives the empty-cell grid (grid works everywhere);
    // the fetch itself is clamped to the pins' quadro bounds
    // (/reportes/quadro only loads pins inside MACAPA_BOUNDS — unclamped
    // counts render cells that can never have a matching pin).
    const view: H3View = {
      w: +bounds.getWest().toFixed(3),
      s: +bounds.getSouth().toFixed(3),
      e: +bounds.getEast().toFixed(3),
      n: +bounds.getNorth().toFixed(3),
      res: resolucao,
    };
    // Track the viewport immediately so the empty grid renders even while
    // counts load (or when the fetch fails) — grid must not depend on fetch.
    setH3LastView(view);
    const west = Math.max(view.w, MACAPA_BOUNDS[0]);
    const south = Math.max(view.s, MACAPA_BOUNDS[1]);
    const east = Math.min(view.e, MACAPA_BOUNDS[2]);
    const north = Math.min(view.n, MACAPA_BOUNDS[3]);
    if (west >= east || south >= north) {
      // Viewport outside the data region: no counts, grid still renders.
      setH3Cells([]);
      setH3SampleKeys([]);
      setH3Loading(false);
      setH3Error(null);
      return;
    }
    const body = {
      lon1: +west.toFixed(3),
      lat1: +south.toFixed(3),
      lon2: +east.toFixed(3),
      lat2: +north.toFixed(3),
      resolucao,
    };
    // All categories selected == unfiltered: one request instead of N.
    const effectiveCats =
      selectedCategories.length >= CATEGORY_ORDER.length ? [] : selectedCategories;
    const cacheKey = [
      h3Mode,
      body.resolucao,
      body.lon1,
      body.lat1,
      body.lon2,
      body.lat2,
      h3Mode === 'ranking' ? '' : effectiveCats.join(','),
    ].join('|');

    const cached = readH3Cache(cacheKey);
    if (cached) {
      setH3Cells(cached.cells);
      setH3SampleKeys(cached.sampleKeys);
      setH3Loading(false);
      setH3Error(null);
      return;
    }
    setH3Loading(true);
    setH3Error(null);

    const timer = window.setTimeout(() => {
      (async () => {
        try {
          let cells: HeatmapCell[];
          let sampleKeys: string[] = [];
          if (h3Mode === 'ranking') {
            const res = await getHeatmapRanking(body);
            if (res.heatmap.some((cell) => cell.categoria !== undefined)) {
              cells = res.heatmap;
              sampleKeys = res.sampleKeys;
            } else {
              // Backend ranking carries no winner: derive it locally from
              // per-category counts instead of rendering gray mush.
              console.info(
                '[Urbaly H3] ranking sem categoria dominante — calculando localmente via /heatmap/geral'
              );
              const computed = await computeRankingFromGeral(body);
              cells = computed.cells;
              sampleKeys = computed.sampleKeys;
            }
          } else if (effectiveCats.length === 0) {
            const res = await getHeatmapGeral(body);
            cells = res.heatmap;
            sampleKeys = res.sampleKeys;
          } else if (effectiveCats.length === 1) {
            const res = await getHeatmapGeral({
              ...body,
              categoria: categoryToApi(effectiveCats[0]),
            });
            cells = res.heatmap;
            sampleKeys = res.sampleKeys;
          } else {
            // Backend takes a scalar categoria: fan out one request per
            // selected category and merge counts per cell.
            const settled = await Promise.all(
              effectiveCats.map((cat) =>
                getHeatmapGeral({ ...body, categoria: categoryToApi(cat) })
                  .then((res) => res)
                  .catch(() => null)
              )
            );
            const merged = new globalThis.Map<string, HeatmapCell>();
            for (const res of settled) {
              if (!res) continue;
              if (sampleKeys.length === 0) sampleKeys = res.sampleKeys;
              for (const cell of res.heatmap) {
                const prev = merged.get(cell.h3_id);
                merged.set(cell.h3_id, {
                  h3_id: cell.h3_id,
                  h3_qtd: (prev?.h3_qtd ?? 0) + cell.h3_qtd,
                });
              }
            }
            cells = [...merged.values()];
          }
          if (cancelled || h3RequestRef.current !== requestId) return;
          writeH3Cache(cacheKey, cells, sampleKeys);
          setH3Cells(cells);
          setH3SampleKeys(sampleKeys);
        } catch (error: unknown) {
          if (cancelled || h3RequestRef.current !== requestId) return;
          console.warn('[Urbaly H3] Heatmap fetch failed:', error);
          setH3Error(
            error instanceof Error && error.message.trim()
              ? error.message.length > 90
                ? 'Heatmap indisponível. Tente de novo.'
                : error.message
              : 'Heatmap indisponível. Tente de novo.'
          );
        } finally {
          if (!cancelled && h3RequestRef.current === requestId) setH3Loading(false);
        }
      })();
    }, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // selectedCategoriesKey avoids re-running on array identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h3Enabled, h3Mode, h3Res, selectedCategoriesKey, mapInstance, h3ViewportKey, h3RetryKey]);

  // Paint H3 source/layers; re-ensure after basemap setStyle swaps.
  // h3Mode/isDark/h3GeoJSON are captured directly — the effect re-subscribes
  // on every change so the styledata handler never goes stale.
  const h3GeoJSON = React.useMemo(
    () =>
      h3CellsToGeoJSON(h3Cells, {
        showEmpty: h3ShowEmpty,
        view: h3LastView ? padView(h3LastView) : null,
      }),
    [h3Cells, h3ShowEmpty, h3LastView]
  );
  // Ranking without any winner category degrades to density paint so the
  // layer never renders an all-gray mystery when the backend omits it.
  const h3WinnerCount = React.useMemo(
    () => h3Cells.reduce((n, cell) => n + (cell.categoria === undefined ? 0 : 1), 0),
    [h3Cells]
  );
  const h3PaintMode: H3Mode =
    h3Mode === 'ranking' && h3Cells.length > 0 && h3WinnerCount === 0 ? 'geral' : h3Mode;
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapInstance) return;
    if (!h3Enabled) {
      removeH3Layers(map);
      return;
    }
    ensureH3Layers(map, h3PaintMode, isDark);
    setH3Data(map, h3GeoJSON);
    // setStyle (basemap/theme switch) drops custom layers: rebuild only when
    // they are actually gone. styledata fires on every tile load, so an
    // unconditional setData here repainted constantly (visible flicker).
    const reapply = () => {
      try {
        if (map.getLayer(H3_FILL_LAYER_ID)) return;
      } catch {
        // Layer query failed — fall through and rebuild below.
      }
      if (ensureH3Layers(map, h3PaintMode, isDark)) {
        setH3Data(map, h3GeoJSON);
      }
    };
    map.on('styledata', reapply);
    return () => {
      map.off('styledata', reapply);
    };
  }, [mapInstance, h3Enabled, h3GeoJSON, h3PaintMode, isDark]);

  // Winner categories present (ranking legend dots).
  const h3Winners = React.useMemo(() => {
    if (h3Mode !== 'ranking') return [];
    const seen = new globalThis.Map<string, number>();
    for (const cell of h3Cells) {
      if (cell.categoria === undefined) continue;
      seen.set(categoryFromApi(cell.categoria), (seen.get(categoryFromApi(cell.categoria)) ?? 0) + cell.h3_qtd);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [h3Cells, h3Mode]);

  // One-line diagnosis per payload shape: open devtools and paste this line
  // if ranking ever looks wrong — it shows exactly what the backend sent.
  const loggedH3ShapeRef = React.useRef('');
  React.useEffect(() => {
    if (!h3Enabled || h3Cells.length === 0) return;
    const shape = `${h3Mode}|${h3SampleKeys.join(',')}`;
    if (loggedH3ShapeRef.current === shape) return;
    loggedH3ShapeRef.current = shape;
    console.info(
      `[Urbaly H3] mode=${h3Mode} cells=${h3Cells.length} ` +
        `withWinner=${h3WinnerCount} sampleKeys=${h3SampleKeys.join(',') || '(none)'}`
    );
  }, [h3Enabled, h3Mode, h3Cells.length, h3WinnerCount, h3SampleKeys]);

  // Public runtime config served by /api/public-config. The CARTO key is
  // fallback-only now: the map boots immediately on keyless OpenFreeMap and
  // never blocks waiting for this. Missing key degrades to the keyless
  // CARTO fallback style (server logs the warning once).
  const publicConfig = usePublicConfig();
  const cartoApiKey = publicConfig?.cartoApiKey ?? '';

  // Reset-view state: restores the default camera (zoom/bearing/pitch)
  // at the point the user is at — keeps the current center and clears
  // any panel padding so the point is truly centered on every
  // breakpoint. The control is always active — no disabled state.
  const handleResetView = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const center = map.getCenter();
      const padding = { top: 0, bottom: 0, left: 0, right: 0 };
      if (prefersReducedMotion()) {
        map.jumpTo({ center, zoom: DEFAULT_ZOOM, bearing: 0, pitch: 0, padding });
      } else {
        map.easeTo({
          center,
          zoom: DEFAULT_ZOOM,
          bearing: 0,
          pitch: 0,
          padding,
          duration: 600,
        });
      }
    } catch {
      // Reset is a nicety; never break the map if the camera call fails.
    }
  }, []);

  // Initialize MapLibre (once per retry; theme switches go through setStyle below).
  React.useEffect(() => {
    if (!mapContainerRef.current) return;

    mapLoadedRef.current = false;
    setIsMapLoading(true);
    setMapError(null);
    const apiKey = cartoApiKey;
    // NOTE: isDark / basemap are intentionally read once here; live switches
    // are handled by the [isDark + basemap] effect via map.setStyle.
    const initialIsDark = isDark;
    const initialBasemap = effectiveBasemap;
    const initialStyle = getBasemapStyleUrl(initialBasemap, initialIsDark);
    const initialStyleKey = `${initialBasemap}|${initialIsDark ? 'dark' : 'light'}`;
    appliedStyleRef.current = initialStyleKey;
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
        attributionControl: false,
        transformRequest: (url: string) => {
          // CARTO fallback only: propagate the API key to every vector tile
          // asset (tiles.json, .mvt, sprites, glyphs) that the fallback
          // style.json references without an embedded key. OpenFreeMap URLs
          // are keyless and pass through untouched.
          if (apiKey && url.includes('basemaps.cartocdn.com') && !/[?&]key=/.test(url)) {
            const separator = url.includes('?') ? '&' : '?';
            return { url: `${url}${separator}key=${encodeURIComponent(apiKey)}` };
          }
          return { url };
        },
        center: [...DEFAULT_CENTER] as [number, number],
        zoom: DEFAULT_ZOOM,
        maxZoom: 20,
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

    // Upgrade the base style to the resolved basemap (Google repaint or
    // stock style) once it resolves. The map boots instantly on the base
    // URL; this swaps in place (markers survive setStyle). Skipped when a
    // newer basemap/theme switch already superseded this boot.
    void fetchBasemapStyle(initialBasemap, initialIsDark, apiKey).then((basemapStyle) => {
      if (cancelled || appliedStyleRef.current !== initialStyleKey) return;
      if (typeof basemapStyle !== 'object' || basemapStyle === null) return;
      try {
        map.setStyle(basemapStyle as unknown as string);
      } catch (styleError) {
        console.warn('[Urbaly Map] Basemap style apply failed, keeping base style:', styleError);
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
          `Style: ${initialStyle} | provider: openfreemap (carto fallback key: ${apiKey ? 'yes' : 'no'}) | ` +
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

    map.addControl(
      new maplibregl.AttributionControl({ compact: false }),
      'bottom-left'
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
      trackUserLocation: false,
      showUserLocation: true,
      showAccuracyCircle: true,
    });
    geolocateControlRef.current = geolocateControl;
    // Fly to the user once located; explain failures inline (no alert()).
    // Clears panel padding so the user dot is truly centered on mobile too.
    geolocateControl.on('geolocate', (position) => {
      setGeoHint(null);
      setIsLocating(false);
      setHasLocation(true);
      try {
        window.localStorage.setItem('urbaly-geo-granted', '1');
      } catch {
        // Private-mode storage failure: location still works this session.
      }
      try {
        const coords = (position as unknown as { coords?: { longitude?: unknown; latitude?: unknown } })?.coords;
        if (typeof coords?.longitude !== 'number' || typeof coords?.latitude !== 'number') return;
        const center: [number, number] = [coords.longitude, coords.latitude];
        const padding = { top: 0, bottom: 0, left: 0, right: 0 };
        if (prefersReducedMotion()) {
          map.jumpTo({ center, zoom: Math.max(map.getZoom(), 15), padding });
        } else {
          map.easeTo({
            center,
            zoom: Math.max(map.getZoom(), 15),
            padding,
            duration: 600,
          });
        }
      } catch {
        // Framing the user location is a nicety; the dot still shows.
      }
    });
    geolocateControl.on('error', (event) => {
      setIsLocating(false);
      const code = (event as unknown as { code?: number })?.code;
      if (code === 1) {
        setGeoHint(
          'Localização bloqueada. Permita o acesso à localização nas configurações do navegador para reportar e centralizar o mapa.'
        );
      } else if (code === 3) {
        setGeoHint(
          'A localização demorou demais (rede/GPS lento?). Tente de novo em local aberto.'
        );
      } else {
        setGeoHint(
          'Não conseguimos sua localização. Verifique o GPS e tente de novo.'
        );
      }
    });
    map.addControl(geolocateControl, 'bottom-right');
    // Localize the stock button (MapLibre ships English labels) and track
    // the locating spinner state for the pulse affordance.
    try {
      const locateButton = map
        .getContainer()
        .querySelector('.maplibregl-ctrl-geolocate button');
      if (locateButton instanceof HTMLButtonElement) {
        locateButton.setAttribute('aria-label', 'Encontrar minha localização');
        locateButton.title = 'Encontrar minha localização';
        locateButton.addEventListener('click', () => {
          setGeoHint(null);
          setIsLocating(true);
        });
      }
    } catch {
      // Label nicety; the control works without it.
    }
    // Reset view stacks natively under Find-my-location.
    map.addControl(new ResetViewControl(handleResetView), 'bottom-right');

    return () => {
      cancelled = true;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      map.off('styledata', onStyleData);
      resizeObserver?.disconnect();
      setMapInstance(null);
      geolocateControlRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRetryKey]);

  // Update the basemap on dark mode or Layers-button change without
  // recreating the map. DOM markers (MapMarker / placement pin) survive
  // setStyle, so no state is lost. Works before 'load' too: setStyle simply
  // swaps the pending style request.
  // Basemap-only switches play the shared center-circle wipe
  // (::view-transition-new(root) — just the circle, no tint). Theme-driven
  // swaps apply directly: the root theme transition already covers them.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const styleKey = `${effectiveBasemap}|${isDark ? 'dark' : 'light'}`;
    if (appliedStyleRef.current === styleKey) {
      prevIsDarkRef.current = isDark;
      return;
    }
    const themeChanged = prevIsDarkRef.current !== null && prevIsDarkRef.current !== isDark;
    prevIsDarkRef.current = isDark;
    appliedStyleRef.current = styleKey;
    const apiKey = cartoApiKey;
    void fetchBasemapStyle(effectiveBasemap, isDark, apiKey).then((nextStyle) => {
      if (mapRef.current !== map || appliedStyleRef.current !== styleKey) return;
      const applyStyle = () => {
        try {
          map.setStyle(nextStyle as unknown as string);
        } catch (styleError) {
          console.warn('[Urbaly Map] Basemap style apply failed:', styleError);
        }
      };
      if (themeChanged || prefersReducedMotion()) {
        applyStyle();
        return;
      }
      try {
        const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
        if (typeof doc.startViewTransition === 'function') {
          doc.startViewTransition(applyStyle);
          return;
        }
      } catch {
        // Fall through to direct apply below.
      }
      applyStyle();
    });
  }, [isDark, effectiveBasemap, cartoApiKey]);

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
  const handleCancelPlacement = React.useCallback(() => {
    setIsPlacementMode(false);
    setPlacementCoordinates(null);
    if (placementMarkerRef.current) {
      placementMarkerRef.current.remove();
      placementMarkerRef.current = null;
    }
  }, []);

  // Report gate: reporting requires an enabled location. Without it,
  // re-open the entry prompt instead of entering placement mode.
  const handleReportClick = React.useCallback(() => {
    if (!hasLocation) {
      setShowGeoPrompt(true);
      setGeoHint(
        'Você só pode reportar com a localização ativada. Toque em “Ativar localização”.'
      );
      return;
    }
    if (isPlacementMode) {
      handleCancelPlacement();
    } else {
      setIsPlacementMode(true);
    }
  }, [hasLocation, isPlacementMode, handleCancelPlacement]);

  // Locating pulse on the stock button while the fix is in flight.
  React.useEffect(() => {
    try {
      const locateButton = mapContainerRef.current?.querySelector(
        '.maplibregl-ctrl-geolocate button'
      );
      if (locateButton instanceof HTMLButtonElement) {
        locateButton.classList.toggle('is-locating', isLocating);
        if (isLocating) {
          locateButton.setAttribute('aria-busy', 'true');
        } else {
          locateButton.removeAttribute('aria-busy');
        }
      }
    } catch {
      // Visual nicety only.
    }
  }, [isLocating, mapInstance]);

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
          ? { top: 90, bottom: 60, left: 448, right: 60 }
          : { top: 100, bottom: 340, left: 20, right: 20 },
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
          ? { top: 90, bottom: 60, left: 32, right: 460 }
          : { top: 100, bottom: 400, left: 20, right: 20 },
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
          {/* Floating Maps chrome: search card only (filters live in the card) */}
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
                    selected={selectedCategories}
                    onToggleCategory={toggleCategory}
                    onClear={clearCategories}
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

          {/* Entry localization prompt — soft ask, native request only on tap.
              Reporting is gated on location (see handleReportClick). */}
          {showGeoPrompt && !hasLocation && !mapError && (
            <div
              role="dialog"
              aria-live="polite"
              aria-label="Usar minha localização"
              className="absolute inset-x-3 top-[68px] z-20 mx-auto flex max-w-md flex-col gap-2.5 rounded-2xl border border-primary/30 bg-background/95 px-4 py-3.5 backdrop-blur-md animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none md:left-4 md:right-auto md:top-[76px] md:mx-0 dark:bg-zinc-900/95"
            >
              <div className="flex items-start gap-2.5">
                <Crosshair aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm font-semibold text-foreground">
                    Usar minha localização?
                  </p>
                  <p className="mt-0.5 font-sans text-xs leading-relaxed text-muted-foreground">
                    Você só pode reportar com a localização ativada. Usamos sua posição para
                    centralizar o mapa e anexar o local do reporte.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismissGeoPrompt}
                  aria-label="Agora não"
                  className="flex size-9 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex gap-2 pl-7">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAcceptGeoPrompt}
                  disabled={isLocating}
                  className="h-9 flex-1 rounded-full px-4 text-xs font-semibold"
                >
                  {isLocating ? 'Localizando…' : 'Ativar localização'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleDismissGeoPrompt}
                  className="h-9 rounded-full px-4 text-xs"
                >
                  Agora não
                </Button>
              </div>
            </div>
          )}

          {/* Location feedback — friendly, dismissible, never a native alert */}
          {geoHint && !showGeoPrompt && (
            <div
              role="status"
              className="absolute inset-x-3 top-[68px] z-20 mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-border/70 bg-background/95 px-3 py-2.5 text-xs font-medium text-foreground backdrop-blur-md animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none md:left-4 md:right-auto md:top-[76px] md:mx-0 dark:bg-zinc-900/95"
            >
              <Crosshair aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">{geoHint}</span>
              <button
                type="button"
                onClick={() => setGeoHint(null)}
                aria-label="Dispensar aviso de localização"
                className="flex size-9 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

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
            <div role="status" className="absolute left-3 right-3 top-[76px] z-10 mx-auto flex max-w-xl items-center justify-center gap-2.5 rounded-2xl border border-primary/35 bg-background/95 px-3 py-2.5 text-center font-sans text-xs font-semibold text-foreground backdrop-blur-md animate-in fade-in slide-in-from-top-3 motion-reduce:animate-none sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-4 md:top-[84px] dark:bg-zinc-900/95">
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

          {/* Bottom-left column anchored at the bottom edge: Layers button
              above the report-count legend with a structural gap */}
          <div className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-10 flex flex-col items-start gap-3 md:left-4">
            <MapBasemapButton
              options={basemapOptions}
              value={effectiveBasemap}
              onChange={handleBasemapChange}
              h3={{
                enabled: h3Enabled,
                mode: h3Mode,
                res: h3Res,
                showEmpty: h3ShowEmpty,
                isLoading: h3Loading,
                error: h3Error,
                onToggle: handleH3Toggle,
                onModeChange: handleH3ModeChange,
                onResChange: handleH3ResChange,
                onToggleEmpty: handleH3ToggleEmpty,
                onRetry: handleH3Retry,
              }}
            />

            {/* Report count legend with label */}
            <div
              role="status"
              aria-live="polite"
              aria-label={`${formatCount(filteredReports.length)} ${filteredReports.length === 1 ? 'reporte' : 'reportes'} no mapa`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border/80 bg-background/90 py-1.5 pl-3.5 pr-3.5 font-sans text-[11px] backdrop-blur-md dark:bg-zinc-900/90"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-sans font-semibold tabular-nums text-foreground">{formatCount(filteredReports.length)}</span>
                <span className="leading-tight">{filteredReports.length === 1 ? 'reporte no mapa' : 'reportes no mapa'}</span>
              </div>
            </div>

            {/* H3 legend — only while the heatmap is on */}
            {h3Enabled ? (
              <div
                role="status"
                aria-live="polite"
                aria-label={
                  h3PaintMode === 'ranking'
                    ? `Heatmap por categoria dominante, ${h3Cells.length} células`
                    : `Heatmap de densidade, ${h3Cells.length} células`
                }
                className="flex max-w-[calc(100vw-6rem)] flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border border-border/80 bg-background/90 py-1.5 pl-3.5 pr-3.5 font-sans text-[11px] backdrop-blur-md dark:bg-zinc-900/90"
              >
                {h3Loading && h3Cells.length === 0 ? (
                  <span className="text-muted-foreground">Carregando heatmap…</span>
                ) : h3PaintMode === 'geral' ? (
                  <>
                    <span
                      aria-hidden
                      className="h-2 w-16 shrink-0 rounded-full"
                      style={{
                        background:
                          'linear-gradient(to right, #fef08a, #fdba74, #fb7185, #dc2626)',
                      }}
                    />
                    <span className="text-muted-foreground">Pouco</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">Muito</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCount(h3Cells.length)} {h3Cells.length === 1 ? 'célula' : 'células'}
                    </span>
                    {h3Mode === 'ranking' ? (
                      <span
                        className="text-muted-foreground"
                        title="O ranking não trouxe categoria dominante — mostrando densidade"
                      >
                        (ranking sem categoria)
                      </span>
                    ) : null}
                  </>
                ) : h3Winners.length === 0 ? (
                  <span className="text-muted-foreground">
                    Sem células nesta vista ({formatCount(h3Cells.length)})
                  </span>
                ) : (
                  <>
                    {h3Winners.map(([cat]) => (
                      <span key={cat} className="flex items-center gap-1 text-muted-foreground">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{
                            backgroundColor:
                              H3_RANKING_HEX[cat as ReportCategory] ?? '#64748b',
                          }}
                        />
                        <span className="leading-tight">
                          {CATEGORIES[cat as ReportCategory]?.label ?? cat}
                        </span>
                      </span>
                    ))}
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Empty state hint */}
          {filteredReports.length === 0 &&
            !isMapLoading &&
            !isReportsLoading &&
            !mapError &&
            !reportsError && (
              <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-4">
                <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-background/95 px-4 py-3 text-center font-sans text-xs text-muted-foreground backdrop-blur-md dark:bg-zinc-900/95">
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
                        clearCategories();
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
              hides, swaps, or replays markers. Entrance cascades top to
              bottom on first paint (see markerDelays). */}
          {mapInstance &&
            markerReports.map((report) => {
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
                  delayMs={markerDelays.get(report.id) ?? 0}
                  isSelected={selectedReport?.id === report.id}
                  onClick={() => {
                    // Toggle like Maps: re-clicking the same pin dismisses the panel.
                    setSelectedReport((prev) => (prev?.id === report.id ? null : report));
                  }}
                />
              );
            })}

          {/* Report FAB — flat Maps-style action above bottom-right controls.
              Gated on location: without it, re-opens the entry prompt. */}
          <button
            type="button"
            onClick={handleReportClick}
            aria-pressed={isPlacementMode}
            aria-label={isPlacementMode ? 'Cancelar modo de marcação' : 'Reportar problema no mapa'}
            aria-describedby={!hasLocation && !isPlacementMode ? 'report-fab-geo-hint' : undefined}
            title={!hasLocation && !isPlacementMode ? 'Ative sua localização para reportar' : undefined}
            className={cn(
              'absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-[calc(0.75rem+env(safe-area-inset-right))] z-20 flex h-12 cursor-pointer touch-manipulation items-center gap-2 rounded-full border border-transparent px-5 font-sans text-sm font-semibold outline-none transition-[transform,opacity,background-color] duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring md:bottom-3 md:right-4',
              selectedReport &&
              'pointer-events-none translate-y-2 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100',
              // The right-docked form card owns the FAB corner on every
              // breakpoint while the reporting flow is active.
              isSheetOpen && 'pointer-events-none translate-y-2 opacity-0',
              isPlacementMode
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isPlacementMode ? (
              <>
                <X className="size-4" />
                Cancelar
              </>
            ) : (
              <>Reportar</>
            )}
          </button>
          {!hasLocation && !isPlacementMode && (
            <span id="report-fab-geo-hint" className="sr-only">
              Você só pode reportar com a localização ativada.
            </span>
          )}
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
                className="absolute z-10 inset-x-0 bottom-0 max-h-[72dvh] md:inset-x-auto md:left-4 md:top-[84px] md:bottom-6 md:w-[400px] md:max-h-none flex flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-card md:rounded-2xl md:border-b"
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
