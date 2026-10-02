import { ReportCategory } from './types';

// Category color palettes matching Google Maps vibrant palette & Urbaly dark mode
export const CATEGORY_PIN_COLORS: Record<
  ReportCategory,
  { primary: string; darkPrimary: string; label: string }
> = {
  pothole: { primary: '#f59e0b', darkPrimary: '#fbbf24', label: 'Buraco / Asfalto' },
  lighting: { primary: '#eab308', darkPrimary: '#facc15', label: 'Iluminação Pública' },
  waste: { primary: '#10b981', darkPrimary: '#34d399', label: 'Lixo e Entulho' },
  drainage: { primary: '#0284c7', darkPrimary: '#38bdf8', label: 'Alagamento / Drenagem' },
  signage: { primary: '#ef4444', darkPrimary: '#f87171', label: 'Sinalização / Trânsito' },
  accessibility: { primary: '#8b5cf6', darkPrimary: '#a78bfa', label: 'Calçada / Acessibilidade' },
  greenery: { primary: '#16a34a', darkPrimary: '#4ade80', label: 'Árvores / Praças' },
  vandalism: { primary: '#ea580c', darkPrimary: '#fb923c', label: 'Vandalismo / Patrimônio' },
  other: { primary: '#64748b', darkPrimary: '#94a3b8', label: 'Outro Problema' },
};

// Precise SVG icons corresponding to the report type
export function getCategorySvgInner(category: ReportCategory, color: string): string {
  switch (category) {
    case 'waste':
      // Trash2 icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
        </svg>
      `;
    case 'lighting':
      // Lightbulb icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>
        </svg>
      `;
    case 'pothole':
      // AlertTriangle icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      `;
    case 'drainage':
      // Droplets icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
          <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
        </svg>
      `;
    case 'signage':
      // AlertOctagon icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      `;
    case 'accessibility':
      // Footprints icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.5V16a2 2 0 0 1-2 2 2 2 0 0 1-2-2Z"/>
          <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.5V20a2 2 0 0 0 2 2 2 2 0 0 0 2-2Z"/>
        </svg>
      `;
    case 'greenery':
      // Trees icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/>
          <path d="M7 16v6"/>
          <path d="M13 19v3"/>
          <path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>
        </svg>
      `;
    case 'vandalism':
      // ShieldAlert icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      `;
    default:
      // HelpCircle icon
      return `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <path d="M12 17h.01"/>
        </svg>
      `;
  }
}

interface CreateGooglePinElementOptions {
  category: ReportCategory;
  isDark: boolean;
  delayMs: number;
  animateIn?: boolean;
  isSelected?: boolean;
}

export function createGooglePinElement({
  category,
  isDark,
  delayMs,
  animateIn = true,
  isSelected = false,
}: CreateGooglePinElementOptions): HTMLDivElement {
  const colorScheme = CATEGORY_PIN_COLORS[category] || CATEGORY_PIN_COLORS.other;
  const pinColor = isDark ? colorScheme.darkPrimary : colorScheme.primary;
  const innerBg = isDark ? '#18181b' : '#ffffff';
  const innerBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  const iconColor = pinColor;

  const container = document.createElement('div');
  container.className =
    'google-pin-container relative flex flex-col items-center cursor-pointer select-none';
  container.style.width = '30px';
  container.style.height = '46px';

  const pinClassName = animateIn ? 'animate-google-pin group' : 'group';
  const pinOpacity = animateIn ? '0' : '1';
  const shadowClassName = animateIn ? 'animate-google-shadow' : '';
  const shadowOpacity = animateIn ? '0' : '1';

  container.innerHTML = `
    <div
      class="${pinClassName}${isSelected ? ' is-selected' : ''}"
      style="
        animation-delay: ${delayMs}ms;
        transform-origin: bottom center;
        position: relative;
        width: 30px;
        height: 42px;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
        opacity: ${pinOpacity};
      "
    >
      <!-- Slim teardrop pin -->
      <svg
        width="30"
        height="42"
        viewBox="0 0 30 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="filter: drop-shadow(0 6px 14px rgba(0,0,0,0.26)); display: block;"
        class="google-pin-svg"
      >
        <path
          d="M15 0.5C6.716 0.5 0 7.216 0 15.5C0 24.7 12.2 39.5 14.2 41.4C14.65 41.85 15.35 41.85 15.8 41.4C17.8 39.5 30 24.7 30 15.5C30 7.216 23.284 0.5 15 0.5Z"
          fill="${pinColor}"
        />
        <!-- Soft top highlight -->
        <ellipse cx="15" cy="9" rx="8.5" ry="5" fill="white" fill-opacity="0.14" />
        <!-- White disc -->
        <circle
          cx="15"
          cy="15"
          r="8.5"
          fill="${innerBg}"
          stroke="${innerBorder}"
          stroke-width="1"
        />
        ${isSelected ? `<circle cx="15" cy="15" r="11.5" fill="none" stroke="${pinColor}" stroke-width="1.6" stroke-opacity="0.55" />` : ''}
      </svg>

      <!-- Category glyph centered in the disc -->
      <div
        style="
          position: absolute;
          top: 5px;
          left: 5px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        "
        class="google-pin-glyph"
      >
        ${getCategorySvgInner(category, iconColor)}
      </div>
    </div>

    <!-- Soft ground shadow -->
    <div
      class="${shadowClassName}"
      style="
        width: 16px;
        height: 5px;
        border-radius: 9999px;
        background: radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 72%);
        margin-top: -1px;
        animation-delay: ${delayMs}ms;
        opacity: ${shadowOpacity};
      "
    ></div>
  `;

  return container;
}
