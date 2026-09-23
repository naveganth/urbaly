'use client';

import * as React from 'react';
import * as maplibregl from 'maplibre-gl';
import { ReportCategory } from './types';
import { createGooglePinElement } from './google-pin';

export interface MapMarkerPointer {
  id: string;
  coordinates: [number, number];
  category: ReportCategory;
  title: string;
}

interface MapMarkerProps {
  map: maplibregl.Map | null;
  pointer: MapMarkerPointer;
  isDark: boolean;
  delayMs?: number;
  animateIn?: boolean;
  onClick: (pointer: MapMarkerPointer) => void;
}

/**
 * Dedicated React Map Marker component.
 * Attaches a Google-style teardrop pin to the MapLibre map instance and handles
 * reactive updates and clean unmounting when mapping over coordinates in React state.
 */
export const MapMarker = React.memo(function MapMarker({
  map,
  pointer,
  isDark,
  delayMs = 0,
  animateIn = true,
  onClick,
}: MapMarkerProps) {
  const markerRef = React.useRef<maplibregl.Marker | null>(null);

  React.useEffect(() => {
    if (!map) return;

    const el = createGooglePinElement({
      category: pointer.category,
      isDark,
      delayMs,
      animateIn,
    });

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClick(pointer);
    };

    el.addEventListener('click', handleClick);

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(pointer.coordinates)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      el.removeEventListener('click', handleClick);
      marker.remove();
      markerRef.current = null;
    };
  }, [map, pointer.coordinates[0], pointer.coordinates[1], pointer.category, isDark]);

  return null;
});
