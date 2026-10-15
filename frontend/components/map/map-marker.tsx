'use client';

import * as React from 'react';
import * as maplibregl from 'maplibre-gl';
import { ReportCategory, ReportStatus } from './types';
import { createAdaptiveMarkerElement, AdaptiveMarkerHandle } from './adaptive-marker';

export interface MapMarkerPointer {
  id: string;
  coordinates: [number, number];
  category: ReportCategory;
  title: string;
  /** Kept for API compat — pins stay constant, photo previews are disabled. */
  imageUrl?: string;
  imageCount?: number;
  categoryLabel?: string;
  address?: string;
  status?: ReportStatus;
  upvotes?: number;
  /** Kept for API compat — always rendered as pin, never photo. */
  showPhoto?: boolean;
  /** Kept for API compat — unused, pins never show a skeleton. */
  thumbPending?: boolean;
}

interface MapMarkerProps {
  map: maplibregl.Map | null;
  pointer: MapMarkerPointer;
  isDark: boolean;
  delayMs?: number;
  animateIn?: boolean;
  isSelected?: boolean;
  onClick: (pointer: MapMarkerPointer) => void;
}

/**
 * Dedicated React Map Marker component.
 * Attaches one stable teardrop pin to the MapLibre map instance and handles
 * reactive updates and clean unmounting when mapping over coordinates in
 * React state.
 *
 * Pins never depend on zoom or viewport: the same element stays mounted for
 * the life of the report, so panning/zooming never hides, swaps, or replays
 * markers. The drop-in entrance plays exactly once per report id per session
 * (tracked in `animatedMarkerIds`) — any later remount (theme switch, map
 * retry, filter change) paints the pin instantly instead of replaying the
 * staggered animation, so markers are simply shown with no reappearing.
 */

// Report ids that already played their entrance animation this session.
// Later remounts render instantly (no stagger replay after pan/zoom/filter).
const animatedMarkerIds = new Set<string>();

export const MapMarker = React.memo(function MapMarker({
  map,
  pointer,
  isDark,
  delayMs = 0,
  animateIn = true,
  isSelected = false,
  onClick,
}: MapMarkerProps) {
  const markerRef = React.useRef<maplibregl.Marker | null>(null);
  const handleRef = React.useRef<AdaptiveMarkerHandle | null>(null);

  // Build once per map / position / category / theme. The pin is static
  // afterwards — no zoom/viewport-driven updates, never a rebuild for
  // pan or zoom. The entrance animation runs only the first time a report
  // id mounts; remounts paint instantly so markers just stay shown.
  React.useEffect(() => {
    if (!map) return;

    const shouldAnimate = animateIn && !animatedMarkerIds.has(pointer.id);
    animatedMarkerIds.add(pointer.id);
    // Bound the session set so long-lived sessions never grow it without limit.
    if (animatedMarkerIds.size > 2000) animatedMarkerIds.clear();

    const handle = createAdaptiveMarkerElement({
      category: pointer.category,
      categoryLabel: pointer.categoryLabel ?? pointer.category,
      title: pointer.title,
      address: pointer.address ?? '',
      status: pointer.status ?? 'open',
      upvotes: pointer.upvotes ?? 0,
      imageUrl: undefined,
      imageCount: 0,
      isDark,
      delayMs: shouldAnimate ? delayMs : 0,
      animateIn: shouldAnimate,
      isSelected,
    });

    const el = handle.element;

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClick(pointer);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClick(pointer);
      }
    };

    el.addEventListener('click', handleClick);
    el.addEventListener('keydown', handleKeyDown as EventListener);

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(pointer.coordinates)
      .addTo(map);

    markerRef.current = marker;
    handleRef.current = handle;

    return () => {
      el.removeEventListener('click', handleClick);
      el.removeEventListener('keydown', handleKeyDown as EventListener);
      marker.remove();
      markerRef.current = null;
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointer.coordinates[0], pointer.coordinates[1], pointer.category, isDark]);

  React.useEffect(() => {
    handleRef.current?.setSelected(isSelected);
  }, [isSelected]);

  return null;
});
