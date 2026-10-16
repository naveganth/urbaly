'use client';

import * as maplibregl from 'maplibre-gl';
import { cellToBoundary, cellToParent, isValidCell, polygonToCells } from 'h3-js';
import {
  CATEGORIES,
  CATEGORY_ORDER,
  categoryFromApi,
  type ReportCategory,
} from './types';
import type { HeatmapCell } from '@/app/actions/api';

export type H3Mode = 'geral' | 'ranking';
export type H3ResSetting =
  | 'auto'
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

export const H3_SOURCE_ID = 'urbaly-h3';
export const H3_FILL_LAYER_ID = 'urbaly-h3-fill';
export const H3_LINE_LAYER_ID = 'urbaly-h3-line';
export const H3_EMPTY_FILL_LAYER_ID = 'urbaly-h3-empty-fill';
export const H3_EMPTY_LINE_LAYER_ID = 'urbaly-h3-empty-line';

/** Solid hex per category for the ranking paint (pins use Tailwind classes). */
export const H3_RANKING_HEX: Record<ReportCategory, string> = {
  pothole: '#f59e0b',
  lighting: '#eab308',
  waste: '#10b981',
  drainage: '#0ea5e9',
  signage: '#f43f5e',
  accessibility: '#a855f7',
  greenery: '#16a34a',
  vandalism: '#f97316',
  other: '#64748b',
};

export function zoomToH3Res(zoom: number): number {
  if (zoom <= 9) return 5;
  if (zoom <= 10) return 6;
  if (zoom <= 11) return 7;
  if (zoom <= 13) return 8;
  return 9;
}

export function resolveH3Res(setting: H3ResSetting, zoom: number): number {
  return setting === 'auto' ? zoomToH3Res(zoom) : setting;
}

/**
 * Decimal uint64 string (precision-safe) -> h3-js hex string.
 * Returns null when the id is malformed.
 */
export function h3IdToHex(h3_id: string): string | null {
  const trimmed = h3_id.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    const hex = BigInt(trimmed).toString(16);
    return hex.length > 0 ? hex : null;
  } catch {
    return null;
  }
}

export interface H3FeatureProps {
  qtd: number;
  /** Winner category key (ranking mode). */
  cat?: ReportCategory;
  h3: string;
  /** No reports in this cell (only rendered with "empty cells" on). */
  empty?: boolean;
}

export interface H3View {
  w: number;
  s: number;
  e: number;
  n: number;
  res: number;
}

function cellToPolygon(h3_id: string): Array<[number, number]> | null {
  const hex = h3IdToHex(h3_id);
  if (!hex) return null;
  return hexToRing(hex);
}

function hexToRing(hex: string): Array<[number, number]> | null {
  try {
    if (!isValidCell(hex)) return null;
    // h3-js v4 returns [lat, lng] pairs — swap to GeoJSON [lng, lat].
    const boundary = cellToBoundary(hex) as unknown as Array<[number, number]>;
    if (!Array.isArray(boundary) || boundary.length < 3) return null;
    const ring = boundary.map(([lat, lng]) => [lng, lat] as [number, number]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first] as [number, number]);
    return ring;
  } catch {
    return null;
  }
}

function hexToDecimal(hex: string): string {
  try {
    return BigInt(`0x${hex}`).toString(10);
  } catch {
    return hex;
  }
}

/** Average H3 cell area (km²) per resolution — guards the empty-cell fill. */
const H3_AVG_AREA_KM2: Record<number, number> = {
  0: 4250546,
  1: 607220,
  2: 86745,
  3: 12392,
  4: 1770,
  5: 252.9,
  6: 36.1,
  7: 5.16,
  8: 0.737,
  9: 0.105,
  10: 0.015,
};

const MAX_EMPTY_CELLS = 8000;

/**
 * Expand a view by `factor` of its size on every side so the empty grid
 * extends a little past the viewport — panning never reveals a hard edge.
 */
export function padView(view: H3View, factor = 0.2): H3View {
  const dw = (view.e - view.w) * factor;
  const dn = (view.n - view.s) * factor;
  return { w: view.w - dw, s: view.s - dn, e: view.e + dw, n: view.n + dn, res: view.res };
}

/**
 * Full H3 covering for a bbox. Starts at `maxRes` and steps down while the
 * estimate exceeds MAX_EMPTY_CELLS, so the grid always renders *something*
 * (coarser empties + precise counts) instead of silently disappearing at
 * fine resolutions over wide views. Returns the hexes and the res used.
 */
export function coveringHexForBounds(
  view: H3View,
  maxRes?: number
): { hexes: string[]; res: number } | null {
  const midLat = ((view.s + view.n) / 2) * (Math.PI / 180);
  const widthKm = Math.max(0, view.e - view.w) * 111.32 * Math.cos(midLat);
  const heightKm = Math.max(0, view.n - view.s) * 111.32;
  const area = widthKm * heightKm;
  if (!Number.isFinite(area) || area <= 0) return { hexes: [], res: view.res };
  const top = Math.min(Math.max(maxRes ?? view.res, 0), 15);
  // h3-js v4 polygon loops are [lat, lng] pairs.
  const loop: number[][] = [
    [view.s, view.w],
    [view.s, view.e],
    [view.n, view.e],
    [view.n, view.w],
  ];
  for (let res = top; res >= 0; res--) {
    const avg = H3_AVG_AREA_KM2[res] ?? H3_AVG_AREA_KM2[8];
    if (area / avg > MAX_EMPTY_CELLS) continue;
    try {
      return { hexes: polygonToCells(loop, res), res };
    } catch {
      return null;
    }
  }
  return null;
}

export function h3CellsToGeoJSON(
  cells: HeatmapCell[],
  opts?: { showEmpty?: boolean; view?: H3View | null }
): GeoJSON.FeatureCollection<GeoJSON.Polygon, H3FeatureProps> {
  const features: Array<GeoJSON.Feature<GeoJSON.Polygon, H3FeatureProps>> = [];
  for (const cell of cells) {
    // Coerce defensively: a string count would poison the interpolate paint.
    const qtd = typeof cell?.h3_qtd === 'number' ? cell.h3_qtd : Number(cell?.h3_qtd);
    if (!cell || !Number.isFinite(qtd) || qtd <= 0) continue;
    const ring = cellToPolygon(cell.h3_id);
    if (!ring) continue;
    features.push({
      type: 'Feature',
      properties: {
        qtd,
        ...(cell.categoria === undefined
          ? {}
          : { cat: categoryFromApi(cell.categoria) }),
        h3: cell.h3_id,
      },
      geometry: { type: 'Polygon', coordinates: [ring] },
    });
  }
  if (opts?.showEmpty && opts?.view) {
    const covering = coveringHexForBounds(opts.view);
    if (covering) {
      // Cells holding counts suppress the (possibly coarser) empty cell
      // above them: compare by ancestry so a fine counted cell hides its
      // coarse empty parent instead of being buried under slate.
      // Counted cells arrive at the fetched resolution (== view res).
      const countedRes = opts.view.res;
      const filled = new Set<string>();
      for (const cell of cells) {
        const hex = h3IdToHex(cell.h3_id);
        if (!hex) continue;
        const lower = hex.toLowerCase();
        filled.add(lower);
        if (covering.res < countedRes) {
          try {
            filled.add(cellToParent(lower, covering.res).toLowerCase());
          } catch {
            // Invalid cell — exact match above already covers the res tie.
          }
        }
      }
      for (const rawHex of covering.hexes) {
        const hex = rawHex.toLowerCase();
        if (filled.has(hex)) continue;
        const ring = hexToRing(rawHex);
        if (!ring) continue;
        features.push({
          type: 'Feature',
          properties: { qtd: 0, empty: true, h3: hexToDecimal(hex) },
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
      }
    }
  }
  return { type: 'FeatureCollection', features };
}

function rankingMatchExpression(): unknown {
  // ["match", ["get","cat"], "waste", "#10b981", ..., fallback]
  const expr: unknown[] = ['match', ['get', 'cat']];
  for (const key of CATEGORY_ORDER) {
    expr.push(key, H3_RANKING_HEX[key]);
  }
  expr.push('#64748b');
  return expr;
}

function geralFillExpression(): unknown {
  return [
    'interpolate',
    ['linear'],
    ['get', 'qtd'],
    1, '#fef08a',
    5, '#fdba74',
    15, '#fb7185',
    50, '#dc2626',
  ];
}

function countOpacityExpression(): unknown {
  return ['interpolate', ['linear'], ['get', 'qtd'], 1, 0.35, 10, 0.5, 50, 0.62];
}

/** Empty cells get static paint on their own layers (see below). */
const EMPTY_FILL = '#cbd5e1';
const EMPTY_FILL_OPACITY = 0.22;
const EMPTY_LINE_OPACITY = 0.6;
const FILLED_LINE_OPACITY = 0.55;

export function ensureH3Layers(
  map: maplibregl.Map,
  mode: H3Mode,
  isDark: boolean
): boolean {
  try {
    const existing = map.getSource(H3_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!existing) {
      map.addSource(H3_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    // Filled cells: data-driven paint, plain expressions only.
    if (!map.getLayer(H3_FILL_LAYER_ID)) {
      map.addLayer({
        id: H3_FILL_LAYER_ID,
        type: 'fill',
        source: H3_SOURCE_ID,
        filter: ['!', ['has', 'empty']],
        paint: {
          'fill-color':
            mode === 'ranking' ? rankingMatchExpression() : geralFillExpression(),
          'fill-opacity': countOpacityExpression(),
        },
      } as unknown as maplibregl.FillLayerSpecification);
    }
    if (!map.getLayer(H3_LINE_LAYER_ID)) {
      map.addLayer({
        id: H3_LINE_LAYER_ID,
        type: 'line',
        source: H3_SOURCE_ID,
        filter: ['!', ['has', 'empty']],
        paint: {
          'line-color': isDark ? '#fafafa' : '#ffffff',
          'line-opacity': FILLED_LINE_OPACITY,
          'line-width': 1,
        },
      } as unknown as maplibregl.LineLayerSpecification);
    }
    // Empty cells: static paint on dedicated layers (no expressions at all).
    if (!map.getLayer(H3_EMPTY_FILL_LAYER_ID)) {
      map.addLayer({
        id: H3_EMPTY_FILL_LAYER_ID,
        type: 'fill',
        source: H3_SOURCE_ID,
        filter: ['has', 'empty'],
        paint: {
          'fill-color': EMPTY_FILL,
          'fill-opacity': EMPTY_FILL_OPACITY,
        },
      } as unknown as maplibregl.FillLayerSpecification);
    }
    if (!map.getLayer(H3_EMPTY_LINE_LAYER_ID)) {
      map.addLayer({
        id: H3_EMPTY_LINE_LAYER_ID,
        type: 'line',
        source: H3_SOURCE_ID,
        filter: ['has', 'empty'],
        paint: {
          'line-color': isDark ? '#fafafa' : '#ffffff',
          'line-opacity': EMPTY_LINE_OPACITY,
          'line-width': 1,
        },
      } as unknown as maplibregl.LineLayerSpecification);
    }
    updateH3Paint(map, mode, isDark);
    return true;
  } catch (error) {
    console.warn('[Urbaly H3] Failed to ensure H3 layers:', error);
    return false;
  }
}

export function updateH3Paint(map: maplibregl.Map, mode: H3Mode, isDark: boolean): void {
  try {
    if (map.getLayer(H3_FILL_LAYER_ID)) {
      map.setPaintProperty(
        H3_FILL_LAYER_ID,
        'fill-color',
        (mode === 'ranking' ? rankingMatchExpression() : geralFillExpression()) as never
      );
      map.setPaintProperty(H3_FILL_LAYER_ID, 'fill-opacity', countOpacityExpression() as never);
    }
    const lineColor = isDark ? '#fafafa' : '#ffffff';
    if (map.getLayer(H3_LINE_LAYER_ID)) {
      map.setPaintProperty(H3_LINE_LAYER_ID, 'line-color', lineColor);
    }
    if (map.getLayer(H3_EMPTY_LINE_LAYER_ID)) {
      map.setPaintProperty(H3_EMPTY_LINE_LAYER_ID, 'line-color', lineColor);
    }
  } catch (error) {
    console.warn('[Urbaly H3] Failed to update H3 paint:', error);
  }
}

export function setH3Data(
  map: maplibregl.Map,
  collection: GeoJSON.FeatureCollection<GeoJSON.Polygon, H3FeatureProps>
): void {
  try {
    const source = map.getSource(H3_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(collection as never);
  } catch (error) {
    console.warn('[Urbaly H3] Failed to set H3 data:', error);
  }
}

export function removeH3Layers(map: maplibregl.Map): void {
  try {
    if (map.getLayer(H3_EMPTY_LINE_LAYER_ID)) map.removeLayer(H3_EMPTY_LINE_LAYER_ID);
    if (map.getLayer(H3_EMPTY_FILL_LAYER_ID)) map.removeLayer(H3_EMPTY_FILL_LAYER_ID);
    if (map.getLayer(H3_LINE_LAYER_ID)) map.removeLayer(H3_LINE_LAYER_ID);
    if (map.getLayer(H3_FILL_LAYER_ID)) map.removeLayer(H3_FILL_LAYER_ID);
    if (map.getSource(H3_SOURCE_ID)) map.removeSource(H3_SOURCE_ID);
  } catch {
    // Teardown best-effort (map may already be removed).
  }
}

export function hasH3Layers(map: maplibregl.Map): boolean {
  try {
    return Boolean(map.getLayer(H3_FILL_LAYER_ID) ?? map.getSource(H3_SOURCE_ID));
  } catch {
    return false;
  }
}

export { CATEGORIES };
