/**
 * Google Maps-like basemap for MapLibre GL, built on OpenMapTiles-schema
 * vector tiles.
 *
 * Primary: OpenFreeMap (keyless, no limits) —
 *   light: https://tiles.openfreemap.org/styles/positron
 *   dark:  https://tiles.openfreemap.org/styles/dark
 * Fallback: CARTO basemaps (kept so an existing CARTO_API_KEY still helps
 *   when OpenFreeMap is unreachable).
 *
 * Why a local "library" instead of an npm package / Google raster tiles:
 * - No Google Terms-of-Service violation (raster scraping is forbidden).
 * - Zero new dependencies; resilient to upstream schema drift because we
 *   fetch the base style.json and only re-paint its layers.
 * - OpenFreeMap Positron/Dark are forks of the same positron/dark-matter
 *   styles the CARTO bases come from, so the layer IDs below apply to both.
 *
 * Usage:
 *   const style = await fetchGoogleLikeStyle(isDark, apiKey);
 *   new maplibregl.Map({ style, transformRequest, ... });
 *   map.setStyle(await fetchGoogleLikeStyle(nextIsDark, apiKey));
 */

export interface GooglePalette {
  background: string;
  water: string;
  waterLabel: string;
  park: string;
  civic: string;
  building: string;
  buildingOutline: string;
  roadCasing: string;
  roadFill: string;
  highwayCasing: string;
  highwayFill: string;
  path: string;
  rail: string;
  boundary: string;
  runway: string;
  roadLabel: string;
  placeLabel: string;
  suburbLabel: string;
  poiLabel: string;
  poiParkLabel: string;
  halo: string;
}

export const GOOGLE_LIGHT: GooglePalette = {
  // User-specified light palette.
  background: '#f4f3f0',
  water: '#a2c4c9',
  waterLabel: '#4d7282',
  park: '#c4e8c2',
  civic: '#c4e8c2',
  building: '#e5e3df',
  buildingOutline: '#d6d5d0',
  roadCasing: '#d6d5d0',
  roadFill: '#ffffff',
  highwayCasing: '#4a7e97',
  highwayFill: '#61a0bf',
  path: '#ffffff',
  rail: '#b3b7bc',
  boundary: '#d6d5d0',
  runway: '#e5e3df',
  roadLabel: '#5f6368',
  placeLabel: '#3c4043',
  suburbLabel: '#80868b',
  poiLabel: '#c7742c',
  poiParkLabel: '#188038',
  halo: '#ffffff',
};

export const GOOGLE_DARK: GooglePalette = {
  // User-specified dark palette.
  background: '#242f3e',
  water: '#17263c',
  waterLabel: '#8ab4f8',
  park: '#263b3e',
  civic: '#263b3e',
  building: '#2b2b2b',
  buildingOutline: '#3a3a3a',
  roadCasing: '#242f3e',
  roadFill: '#2c3848',
  highwayCasing: '#242f3e',
  highwayFill: '#38414e',
  path: '#2c3848',
  rail: '#5f6368',
  boundary: '#5f6368',
  runway: '#2b2b2b',
  roadLabel: '#9b9b9b',
  placeLabel: '#9b9b9b',
  suburbLabel: '#9b9b9b',
  poiLabel: '#fdd663',
  poiParkLabel: '#81c995',
  halo: '#242f3e',
};

export function getCartoBaseStyleUrl(isDark: boolean): string {
  return isDark
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

/** Keyless OpenFreeMap base style (primary). */
export function getOpenFreeMapBaseStyleUrl(isDark: boolean): string {
  return isDark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/positron';
}

/** Instant-boot style URL: OpenFreeMap, no API key required. */
export function getInitialBasemapStyleUrl(isDark: boolean): string {
  return getOpenFreeMapBaseStyleUrl(isDark);
}

/** CARTO fallback style URL (used only when OpenFreeMap is unreachable). */
export function getCartoVectorStyleUrl(isDark: boolean, apiKey: string): string {
  const base = getCartoBaseStyleUrl(isDark);
  return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
}

/* ------------------------------------------------------------------ */
/* Switchable basemaps                                                  */
/* ------------------------------------------------------------------ */

export type BasemapId = 'google' | 'bright' | 'liberty' | 'dark' | 'fiord';

export interface BasemapOption {
  id: BasemapId;
  label: string;
  hint: string;
}

/** Light-mode choices: repainted positron plus two colorful stock styles. */
export const LIGHT_BASEMAPS: BasemapOption[] = [
  { id: 'google', label: 'Padrão', hint: 'Cores estilo Google' },
  { id: 'bright', label: 'Bright', hint: 'Claro, colorido e detalhado' },
  { id: 'liberty', label: 'Liberty 3D', hint: 'Com prédios em 3D' },
];

/** Dark-mode choices: repainted dark plus two stock dark styles. */
export const DARK_BASEMAPS: BasemapOption[] = [
  { id: 'google', label: 'Padrão', hint: 'Cores estilo Google' },
  { id: 'dark', label: 'Dark', hint: 'Escuro minimalista' },
  { id: 'fiord', label: 'Fiord', hint: 'Escuro em tons de azul' },
];

/** Instant-boot style URL for a basemap (keyless OpenFreeMap in all cases). */
export function getBasemapStyleUrl(basemap: BasemapId, isDark: boolean): string {
  switch (basemap) {
    case 'bright':
      return 'https://tiles.openfreemap.org/styles/bright';
    case 'liberty':
      return 'https://tiles.openfreemap.org/styles/liberty';
    case 'dark':
      return 'https://tiles.openfreemap.org/styles/dark';
    case 'fiord':
      return 'https://tiles.openfreemap.org/styles/fiord';
    case 'google':
    default:
      return getInitialBasemapStyleUrl(isDark);
  }
}

function withApiKeyUrls(style: Record<string, unknown>, apiKey: string): void {
  if (!apiKey) return;
  const appendKey = (url: unknown): string | undefined => {
    if (typeof url !== 'string') return undefined;
    if (!url.includes('basemaps.cartocdn.com') && !url.includes('cartocdn.com')) return url;
    if (/[?&]key=/.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
  };
  const sources = style.sources as Record<string, Record<string, unknown>> | undefined;
  if (sources) {
    for (const source of Object.values(sources)) {
      const next = appendKey(source.url);
      if (next) source.url = next;
    }
  }
  const sprite = appendKey(style.sprite);
  if (sprite) style.sprite = sprite;
  const glyphs = appendKey(style.glyphs);
  if (glyphs) style.glyphs = glyphs;
}

function isHighwayLayer(id: string): boolean {
  // CARTO convention (_mot_/_trunk_) + OpenFreeMap convention
  // (motorway/major; minor/path stay street-colored).
  return (
    id.includes('_mot_') ||
    id.includes('_trunk_') ||
    id.includes('motorway') ||
    id.includes('_major')
  );
}

function isRampLayer(id: string): boolean {
  return id.includes('_ramp');
}

function patchLayer(layer: Record<string, unknown>, palette: GooglePalette): void {
  const id = (layer.id as string) ?? '';
  const type = layer.type as string | undefined;
  const paint = (layer.paint ?? {}) as Record<string, unknown>;
  layer.paint = paint;

  // --- Polygons / background ------------------------------------------------
  if (id === 'background' && type === 'background') {
    paint['background-color'] = palette.background;
    return;
  }
  if (id === 'landcover' || id.startsWith('park_') || id === 'park' || id === 'landuse_park' || id === 'landcover_wood') {
    if (type === 'fill') paint['fill-color'] = palette.park;
    return;
  }
  if (id === 'landuse_residential') {
    // Google hides the residential tint — blend into the background.
    if (type === 'fill') {
      paint['fill-color'] = palette.background;
      paint['fill-opacity'] = 1;
    }
    return;
  }
  if (id === 'landuse') {
    if (type === 'fill') paint['fill-color'] = palette.civic;
    return;
  }
  if ((id === 'landcover_ice_shelf' || id === 'landcover_glacier') && type === 'fill') {
    // Google renders ice caps near-white; blend into the background.
    paint['fill-color'] = palette.background;
    paint['fill-opacity'] = 1;
    return;
  }
  if ((id === 'aeroway-area' || id === 'road_area_pier') && type === 'fill') {
    paint['fill-color'] = palette.runway;
    paint['fill-opacity'] = 1;
    return;
  }
  if (id === 'water' || id === 'water_shadow') {
    if (type === 'fill') {
      if (id === 'water') {
        paint['fill-color'] = palette.water;
        paint['fill-opacity'] = 1;
      } else {
        // Positron/Dark draw a soft offset shadow under water; Google doesn't.
        paint['fill-opacity'] = 0;
      }
    }
    return;
  }
  if (id === 'building' || id === 'building-top') {
    if (type === 'fill') {
      paint['fill-color'] = palette.building;
      paint['fill-outline-color'] = palette.buildingOutline;
      paint['fill-opacity'] = 1;
    }
    return;
  }

  // --- Lines ----------------------------------------------------------------
  if (id === 'waterway' && type === 'line') {
    paint['line-color'] = palette.water;
    return;
  }
  if (id.startsWith('boundary_') && type === 'line') {
    paint['line-color'] = palette.boundary;
    return;
  }
  if ((id.startsWith('aeroway-runway') || id.startsWith('aeroway-taxiway')) && type === 'line') {
    paint['line-color'] = palette.runway;
    return;
  }
  if ((id.startsWith('rail') || id.startsWith('railway')) && type === 'line') {
    paint['line-color'] = palette.rail;
    return;
  }
  if (
    id === 'tunnel_path' ||
    id === 'road_path' ||
    id === 'bridge_path' ||
    id === 'highway_path' ||
    id === 'road_pier'
  ) {
    if (type === 'line') {
      paint['line-color'] = palette.path;
      paint['line-opacity'] = 1;
    }
    return;
  }

  // Road network: every class is split into a casing/underlay layer plus an
  // inner layer, for road/tunnel/bridge/highway. CARTO names them
  // `_case`/`_fill`; OpenFreeMap names them `_casing`/`_inner` (plus
  // `_subtle` narrow variants). Recolor both so minor streets render
  // white-with-gray-casing and motorways yellow, Google-style.
  const isRoadNetwork =
    id.startsWith('tunnel_') ||
    id.startsWith('road_') ||
    id.startsWith('bridge_') ||
    id.startsWith('highway_');
  if (isRoadNetwork && type === 'line') {
    const highway = isHighwayLayer(id);
    const isCase = id.endsWith('_case') || id.endsWith('_ramp') || id.endsWith('_casing');
    if (isCase) {
      paint['line-color'] = highway ? palette.highwayCasing : palette.roadCasing;
    } else {
      paint['line-color'] = highway ? palette.highwayFill : palette.roadFill;
    }
    paint['line-opacity'] = 1;
    // Ramps render one step narrower on Google; the base widths already
    // encode this, so no width rewrite needed — color alone sells the look.
    void isRampLayer;
    return;
  }

  // --- Labels ---------------------------------------------------------------
  // Covers CARTO ids plus both OpenFreeMap variants (positron uses
  // `label_*` / `highway-name-*`; dark uses `place_*` / `highway_name_*`).
  if (type === 'symbol') {
    if (
      id === 'waterway_label' ||
      id === 'waterway_line_label' ||
      id === 'water_name' ||
      id.startsWith('watername_') ||
      id.startsWith('water_name')
    ) {
      paint['text-color'] = palette.waterLabel;
      paint['text-halo-color'] = palette.halo;
      paint['text-halo-width'] = 1;
      return;
    }
    if (
      id.startsWith('roadname_') ||
      id === 'housenumber' ||
      id.startsWith('highway-name') ||
      id.startsWith('highway_name_') ||
      id.startsWith('highway-shield') ||
      id === 'road_shield_us'
    ) {
      paint['text-color'] = palette.roadLabel;
      paint['text-halo-color'] = palette.halo;
      paint['text-halo-width'] = 1.5;
      return;
    }
    if (id.startsWith('place_') || id.startsWith('label_') || id === 'airport') {
      const suburb =
        id.includes('suburb') ||
        id.includes('hamlet') ||
        id.includes('village') ||
        id.includes('town') ||
        id.includes('other');
      paint['text-color'] = suburb ? palette.suburbLabel : palette.placeLabel;
      paint['text-halo-color'] = palette.halo;
      paint['text-halo-width'] = 1.5;
      return;
    }
    if (id.startsWith('poi_')) {
      paint['text-color'] = id === 'poi_park' ? palette.poiParkLabel : palette.poiLabel;
      paint['text-halo-color'] = palette.halo;
      paint['text-halo-width'] = 1.5;
      return;
    }
  }
}

export function toGoogleLikeStyle(
  base: Record<string, unknown>,
  isDark: boolean,
  apiKey = ''
): Record<string, unknown> {
  const palette = isDark ? GOOGLE_DARK : GOOGLE_LIGHT;
  const style: Record<string, unknown> = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  style.name = isDark ? 'Urbaly Google Dark' : 'Urbaly Google Light';
  withApiKeyUrls(style, apiKey);
  const layers = style.layers as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(layers)) {
    for (const layer of layers) patchLayer(layer, palette);
  }
  return style;
}

const styleCache = new Map<string, Record<string, unknown>>();

/**
 * Fetch a basemap style for immediate `map.setStyle` use.
 * `google` returns the Google-painted clone (with CARTO fallback chain);
 * every other basemap returns its stock OpenFreeMap style JSON, degrading
 * to the Google-painted clone when the stock fetch fails so the map never
 * goes blank from a switch.
 */
export async function fetchBasemapStyle(
  basemap: BasemapId,
  isDark: boolean,
  apiKey = ''
): Promise<Record<string, unknown> | string> {
  if (basemap === 'google') return fetchGoogleLikeStyle(isDark, apiKey);
  const url = getBasemapStyleUrl(basemap, isDark);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenFreeMap style ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  } catch (error) {
    console.warn(`[Urbaly Map] Basemap "${basemap}" fetch failed, using default style:`, error);
    return fetchGoogleLikeStyle(isDark, apiKey);
  }
}

/**
 * Fetch the OpenFreeMap base style and return a Google-painted clone.
 * Falls back to the CARTO base style (with API key when available), then to
 * the raw OpenFreeMap base URL string so the map can still boot (caller
 * should handle `string | object`).
 */
export async function fetchGoogleLikeStyle(
  isDark: boolean,
  apiKey = ''
): Promise<Record<string, unknown> | string> {
  const cacheKey = `${isDark ? 'dark' : 'light'}|${apiKey ? 'key' : 'nokey'}`;
  const cached = styleCache.get(cacheKey);
  if (cached) return cached;

  const openFreeMapUrl = getOpenFreeMapBaseStyleUrl(isDark);
  try {
    const res = await fetch(openFreeMapUrl);
    if (!res.ok) throw new Error(`OpenFreeMap style ${res.status}`);
    const base = (await res.json()) as Record<string, unknown>;
    const patched = toGoogleLikeStyle(base, isDark);
    styleCache.set(cacheKey, patched);
    return patched;
  } catch (openFreeMapError) {
    console.warn('[Urbaly Map] OpenFreeMap style fetch failed, trying CARTO fallback:', openFreeMapError);
  }

  const cartoUrl = getCartoVectorStyleUrl(isDark, apiKey);
  try {
    const res = await fetch(cartoUrl);
    if (!res.ok) throw new Error(`CARTO style ${res.status}`);
    const base = (await res.json()) as Record<string, unknown>;
    const patched = toGoogleLikeStyle(base, isDark, apiKey);
    styleCache.set(cacheKey, patched);
    return patched;
  } catch (error) {
    console.warn('[Urbaly Map] Google style fetch failed, using base OpenFreeMap style:', error);
    return openFreeMapUrl;
  }
}
