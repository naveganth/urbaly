'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'map',
        metadata: {
          'mapbox:autocomposite': true,
        },
        glyphs: 'https://demotile.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            ],
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
      center: [-51.07, 0.03],
      zoom: 10,
    });

    mapRef.current = map;

    map.on('error', (event) => {
      console.error('MapLibre error:', event.error || 'Unknown map error');
    });

    map.on('load', () => {
      map.fitBounds(
        [
          [-52.45, -0.4],
          [-50.05, 2.3],
        ],
        {
          padding: 40,
          maxZoom: 11,
        },
      );
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />
  );
}
