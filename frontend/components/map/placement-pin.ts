'use client';

interface CreatePlacementMarkerOptions {
  isDark?: boolean;
  pinColor?: string;
}

/**
 * Google Maps-style placement pin used while picking a report location.
 * Shares the report-pin teardrop silhouette (30×42) but uses the app primary
 * color with a soft pulsing halo so it reads as "your new pin" rather than
 * another report. Entrance/bob keyframes live in globals.css
 * (.map-placement-marker / .map-placement-halo).
 */
export function createPlacementMarkerElement(
  options: CreatePlacementMarkerOptions = {}
): HTMLDivElement {
  const { isDark = false, pinColor = '#0d9f6e' } = options;
  const innerBg = isDark ? '#18181b' : '#ffffff';

  const el = document.createElement('div');
  el.className = 'google-placement-marker select-none';
  el.innerHTML = `
    <div class="map-placement-marker">
      <span class="map-placement-halo" aria-hidden="true"></span>
      <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; filter: drop-shadow(0 8px 16px rgba(13,159,110,0.40));">
        <path d="M15 0.5C6.716 0.5 0 7.216 0 15.5C0 24.7 12.2 39.5 14.2 41.4C14.65 41.85 15.35 41.85 15.8 41.4C17.8 39.5 30 24.7 30 15.5C30 7.216 23.284 0.5 15 0.5Z" fill="${pinColor}" />
        <ellipse cx="15" cy="9" rx="8.5" ry="5" fill="white" fill-opacity="0.18" />
        <circle cx="15" cy="15" r="8.5" fill="${innerBg}" />
      </svg>
      <div class="map-placement-icon" style="color: ${pinColor};">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </div>
    </div>
  `;
  return el;
}
