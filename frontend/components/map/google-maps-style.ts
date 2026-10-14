/**
 * Google Maps-like basemap for MapLibre GL, built on top of the existing
 * CARTO vector tiles (OpenMapTiles schema).
 *
 * Why a local "library" instead of an npm package / Google raster tiles:
 * - Keeps your free CARTO tiles + API key (no new provider, no billing).
 * - No Google Terms-of-Service violation (raster scraping is forbidden).
 * - Zero new dependencies; resilient to upstream schema drift because we
 *   fetch the pinned CARTO style.json and only re-paint its layers.
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
  return id.includes('_mot_') || id.includes('_trunk_');
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
  if (id === 'landcover' || id.startsWith('park_')) {
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
  if (id === 'water' || id === 'water_shadow') {
    if (type === 'fill') {
      if (id === 'water') {
        paint['fill-color'] = palette.water;
        paint['fill-opacity'] = 1;
      } else {
        // CARTO draws a soft offset shadow under water; Google doesn't.
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
  if ((id === 'aeroway-runway' || id === 'aeroway-taxiway') && type === 'line') {
    paint['line-color'] = palette.runway;
    return;
  }
  if ((id === 'rail' || id === 'rail_dash' || id === 'tunnel_rail' || id === 'tunnel_rail_dash') && type === 'line') {
    paint['line-color'] = palette.rail;
    return;
  }
  if (id === 'tunnel_path' || id === 'road_path' || id === 'bridge_path') {
    if (type === 'line') {
      paint['line-color'] = palette.path;
      paint['line-opacity'] = 1;
    }
    return;
  }

  // Road network: CARTO splits every class into `_case` (casing/underlay)
  // + `_fill` (inner) layers for road/tunnel/bridge. Recolor both so minor
  // streets render white-with-gray-casing and motorways yellow, Google-style.
  const isRoadNetwork =
    id.startsWith('tunnel_') || id.startsWith('road_') || id.startsWith('bridge_');
  if (isRoadNetwork && type === 'line') {
    const highway = isHighwayLayer(id);
    const isCase = id.endsWith('_case') || id.endsWith('_ramp');
    if (isCase) {
      paint['line-color'] = highway ? palette.highwayCasing : palette.roadCasing;
    } else {
      paint['line-color'] = highway ? palette.highwayFill : palette.roadFill;
    }
    paint['line-opacity'] = 1;
    // Ramps render one step narrower on Google; CARTO widths already encode
    // this, so no width rewrite needed — color alone sells the look.
    void isRampLayer;
    return;
  }

  // --- Labels ---------------------------------------------------------------
  if (type === 'symbol') {
    if (id === 'waterway_label' || id.startsWith('watername_')) {
      paint['text-color'] = palette.waterLabel;
      paint['text-halo-color'] = palette.halo;
      paint['text-halo-width'] = 1;
      return;
    }
    if (id.startsWith('roadname_') || id === 'housenumber') {
      paint['text-color'] = palette.roadLabel;
      paint['text-halo-color'] = palette.halo;
      paint['text-halo-width'] = 1.5;
      return;
    }
    if (id.startsWith('place_')) {
      const suburb = id.includes('suburb') || id.includes('hamlet') || id.includes('village');
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
 * Fetch the CARTO base style and return a Google-painted clone.
 * Falls back to the raw base URL string when the network fails so the map
 * can still boot (caller should handle `string | object`).
 */
export async function fetchGoogleLikeStyle(
  isDark: boolean,
  apiKey = ''
): Promise<Record<string, unknown> | string> {
  const cacheKey = `${isDark ? 'dark' : 'light'}|${apiKey ? 'key' : 'nokey'}`;
  const cached = styleCache.get(cacheKey);
  if (cached) return cached;

  const baseUrl = getCartoBaseStyleUrl(isDark);
  const url = apiKey ? `${baseUrl}?key=${encodeURIComponent(apiKey)}` : baseUrl;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CARTO style ${res.status}`);
    const base = (await res.json()) as Record<string, unknown>;
    const patched = toGoogleLikeStyle(base, isDark, apiKey);
    styleCache.set(cacheKey, patched);
    return patched;
  } catch (error) {
    console.warn('[Urbaly Map] Google style fetch failed, using base CARTO style:', error);
    return url;
  }
}
