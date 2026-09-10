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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
        </svg>
      `;
    case 'lighting':
      // Lightbulb icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>
        </svg>
      `;
    case 'pothole':
      // AlertTriangle icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      `;
    case 'drainage':
      // Droplets icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
          <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
        </svg>
      `;
    case 'signage':
      // AlertOctagon icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      `;
    case 'accessibility':
      // Footprints icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.5V16a2 2 0 0 1-2 2 2 2 0 0 1-2-2Z"/>
          <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.5V20a2 2 0 0 0 2 2 2 2 0 0 0 2-2Z"/>
        </svg>
      `;
    case 'greenery':
      // Trees icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/>
          <path d="M7 16v6"/>
          <path d="M13 19v3"/>
          <path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>
        </svg>
      `;
    case 'vandalism':
      // ShieldAlert icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      `;
    default:
      // HelpCircle icon
      return `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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
}

export function createGooglePinElement({
  category,
  isDark,
  delayMs,
  animateIn = true,
}: CreateGooglePinElementOptions): HTMLDivElement {
  const colorScheme = CATEGORY_PIN_COLORS[category] || CATEGORY_PIN_COLORS.other;
  const pinColor = isDark ? colorScheme.darkPrimary : colorScheme.primary;
  const innerBg = isDark ? '#18181b' : '#ffffff';
  const innerBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const iconColor = pinColor;

  const container = document.createElement('div');
  container.className = 'google-pin-container relative flex flex-col items-center cursor-pointer select-none';
  container.style.width = '34px';
  container.style.height = '48px';

  const pinClassName = animateIn ? 'animate-google-pin group' : 'group';
  const pinOpacity = animateIn ? '0' : '1';
  const shadowClassName = animateIn ? 'animate-google-shadow' : '';
  const shadowOpacity = animateIn ? '0' : '1';

  container.innerHTML = `
    <div
      class="${pinClassName}"
      style="
        animation-delay: ${delayMs}ms;
        transform-origin: bottom center;
        position: relative;
        width: 34px;
        height: 44px;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        opacity: ${pinOpacity};
      "
    >
      <!-- Teardrop Pin SVG -->
      <svg
        width="34"
        height="44"
        viewBox="0 0 34 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.32));"
        class="group-hover:scale-115 group-hover:-translate-y-1 transition-transform duration-200"
      >
        <!-- Outer Teardrop Body -->
        <path
          d="M17 0C7.611 0 0 7.611 0 17C0 26.5 13.8 41.8 16.1 43.9C16.6 44.4 17.4 44.4 17.9 43.9C20.2 41.8 34 26.5 34 17C34 7.611 26.389 0 17 0Z"
          fill="${pinColor}"
        />
        <!-- 3D Gloss reflection on pin crown -->
        <path
          d="M17 1.5C8.44 1.5 1.5 8.44 1.5 17C1.5 19.8 2.6 23 4.5 26.2C5.6 21 9.8 11.5 17 11.5C24.2 11.5 28.4 21 29.5 26.2C31.4 23 32.5 19.8 32.5 17C32.5 8.44 25.56 1.5 17 1.5Z"
          fill="white"
          fill-opacity="0.22"
        />
        <!-- White Circular Disc Cutout (Google Maps style) -->
        <circle
          cx="17"
          cy="16.5"
          r="9.5"
          fill="${innerBg}"
          stroke="${innerBorder}"
          stroke-width="1"
        />
      </svg>

      <!-- Exact Category SVG Icon centered inside the white disc -->
      <div
        style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 22px;
          height: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        "
        class="group-hover:scale-115 group-hover:-translate-y-1 transition-transform duration-200"
      >
        ${getCategorySvgInner(category, iconColor)}
      </div>
    </div>

    <!-- Ground Drop Shadow -->
    <div
      class="${shadowClassName}"
      style="
        width: 18px;
        height: 6px;
        border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 75%);
        margin-top: -2px;
        animation-delay: ${delayMs}ms;
        opacity: ${shadowOpacity};
      "
    ></div>
  `;

  return container;
}
