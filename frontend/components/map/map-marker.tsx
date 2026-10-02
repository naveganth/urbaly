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
  /** First CDN image of the report, when available. */
  imageUrl?: string;
  imageCount?: number;
  categoryLabel?: string;
  address?: string;
  status?: ReportStatus;
  upvotes?: number;
  /** When true (map very zoomed in) morph to the circular photo preview. */
  showPhoto?: boolean;
  /** A CDN thumbnail is being fetched but no URL is known yet — show skeleton. */
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
 * Attaches one adaptive marker (teardrop pin + circular photo preview as
 * stacked layers) to the MapLibre map instance and handles reactive updates
 * and clean unmounting when mapping over coordinates in React state.
 *
 * Zoom swaps and late-arriving thumbnails update the SAME element in place
 * via `setPhotoMode` (CSS crossfade) — the marker is never rebuilt, so there
 * is no pop, flicker, or replayed entrance animation.
 */
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

  // Build once per map / position / category / theme. Zoom state and image
  // arrivals flow through the toggle effect below — never a rebuild.
  React.useEffect(() => {
    if (!map) return;

    const handle = createAdaptiveMarkerElement({
      category: pointer.category,
      categoryLabel: pointer.categoryLabel ?? pointer.category,
      title: pointer.title,
      address: pointer.address ?? '',
      status: pointer.status ?? 'open',
      upvotes: pointer.upvotes ?? 0,
      imageUrl: pointer.imageUrl,
      imageCount: pointer.imageCount ?? 0,
      isDark,
      delayMs,
      animateIn,
      isSelected,
    });
    handle.setPhotoMode(
      Boolean(pointer.showPhoto),
      pointer.imageUrl,
      pointer.imageCount,
      pointer.thumbPending
    );

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

  // Seamless in-place update: zoom threshold crossings, prefetched
  // thumbnails, and thumbnail loading state crossfade on the existing
  // element — no remount, no pop.
  React.useEffect(() => {
    handleRef.current?.setPhotoMode(
      Boolean(pointer.showPhoto),
      pointer.imageUrl,
      pointer.imageCount,
      pointer.thumbPending
    );
  }, [pointer.showPhoto, pointer.imageUrl, pointer.imageCount, pointer.thumbPending]);

  React.useEffect(() => {
    handleRef.current?.setSelected(isSelected);
  }, [isSelected]);

  return null;
});
