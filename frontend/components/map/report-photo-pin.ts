'use client';

import { CATEGORY_PIN_COLORS, getCategorySvgInner } from './google-pin';
import type { ReportCategory, ReportStatus } from './types';

export interface ReportPhotoPinData {
  category: ReportCategory;
  categoryLabel: string;
  title: string;
  address: string;
  status: ReportStatus;
  upvotes: number;
  imageUrl: string;
  imageCount: number;
  isDark: boolean;
  delayMs?: number;
  animateIn?: boolean;
}

const STATUS_META: Record<ReportStatus, { label: string; dot: string }> = {
  open: { label: 'Em aberto', dot: '#f59e0b' },
  investigating: { label: 'Em análise', dot: '#0284c7' },
  resolved: { label: 'Resolvido', dot: '#10b981' },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Circular CDN photo pin shown when the map is very zoomed in.
 *
 * Designed as a layer inside the adaptive marker: the outer container owns
 * the `group` hover scope and all a11y attributes, visibility is driven by
 * the parent's `.is-photo` class (pure CSS crossfade, no remount), and the
 * `<img>` fades in via `.is-loaded` once decoded — including thumbnails that
 * arrive after mount (zoom prefetch). An empty `imageUrl` omits `src`
 * entirely so the category-icon fallback disc shows with no bogus request.
 *
 * Styling follows the shadcn card tokens (bg-card / border-border /
 * rounded-xl / shadow-2xl) with SmoothUI motion values (250ms EASE_OUT).
 * Tailwind classes below are written literally so the Tailwind v4 scanner
 * picks them up from this .ts file.
 */
export function createReportPhotoElement(data: ReportPhotoPinData): HTMLDivElement {
  const {
    category,
    categoryLabel,
    title,
    address,
    status,
    upvotes,
    imageUrl,
    imageCount,
    isDark,
    delayMs = 0,
    animateIn = true,
  } = data;

  const scheme = CATEGORY_PIN_COLORS[category] ?? CATEGORY_PIN_COLORS.other;
  const ringColor = isDark ? scheme.darkPrimary : scheme.primary;
  const statusMeta = STATUS_META[status] ?? STATUS_META.open;

  const safeTitle = escapeHtml(title);
  const safeAddress = escapeHtml(address);
  const safeCategory = escapeHtml(categoryLabel);
  const safeStatus = escapeHtml(statusMeta.label);
  const safeSrc = escapeHtml(imageUrl);

  const container = document.createElement('div');
  container.className = 'report-photo-container relative flex flex-col items-center select-none';
  container.style.width = '62px';
  container.style.height = '70px';

  const popClass = animateIn ? 'animate-photo-pin' : '';
  const extraCount = imageCount > 1 ? imageCount - 1 : 0;
  // Omit `src` when unknown so no request fires; the fallback disc shows until
  // the adaptive marker assigns the prefetched thumbnail later.
  const srcAttr = safeSrc ? `src="${safeSrc}"` : '';
  // Fallback glyph painted UNDER the photo: if the CDN image 404s or is
  // blocked, the <img> removes itself and the circle still shows the report's
  // category icon on a tinted disc instead of an empty hole.
  const fallbackIcon = getCategorySvgInner(category, ringColor);

  container.innerHTML = `
    <div class="${popClass} relative transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105 group-focus-visible:-translate-y-1 group-focus-visible:scale-105"
      style="animation-delay: ${delayMs}ms; transform-origin: bottom center; width: 58px; height: 58px;">
      <div class="absolute inset-0 rounded-full transition-shadow duration-200 group-hover:shadow-2xl"
        style="padding: 2.5px; background: ${ringColor}; box-shadow: 0 10px 26px rgba(0,0,0,0.30);">
        <div class="marker-photo-frame relative h-full w-full overflow-hidden rounded-full" style="background: ${isDark ? '#18181b' : '#ffffff'};">
          <div class="absolute inset-0 flex items-center justify-center" style="background: ${ringColor}22;">
            <div style="transform: scale(1.8); display: flex;">${fallbackIcon}</div>
          </div>
          <img ${srcAttr} alt="Foto da ocorrência ${safeTitle}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
            onerror="this.remove()" class="js-photo-img marker-photo-img absolute inset-0 h-full w-full object-cover" draggable="false" />
          <div class="js-photo-shimmer marker-photo-shimmer pointer-events-none absolute inset-0" aria-hidden="true"></div>
        </div>
      </div>
      <span class="absolute -bottom-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-r border-b"
        style="background: ${ringColor}; border-color: rgba(0,0,0,0.15);"></span>
      <span class="js-photo-count absolute -top-1 -right-1 items-center justify-center rounded-full border border-border bg-card px-1 font-mono text-[10px] font-semibold tabular-nums text-card-foreground shadow-md ${extraCount > 0 ? 'flex h-5 min-w-5' : 'hidden'}">+${extraCount}</span>
      <span class="absolute bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-950" style="background: ${ringColor};"></span>
    </div>
    <div class="pointer-events-none absolute bottom-[calc(100%_+_12px)] left-1/2 z-50 hidden w-60 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 md:block"
      role="tooltip">
      <div class="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <div class="flex items-center gap-2.5 border-b border-border/60 bg-muted/40 p-2.5">
          <span class="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
            <img ${srcAttr} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()" class="js-photo-img marker-photo-img absolute inset-0 h-full w-full object-cover" draggable="false" />
            <span class="js-photo-shimmer marker-photo-shimmer pointer-events-none absolute inset-0" aria-hidden="true"></span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-semibold leading-tight text-foreground">${safeTitle}</span>
            <span class="mt-0.5 block truncate text-[11px] text-muted-foreground">${safeCategory}</span>
          </span>
        </div>
        <div class="px-3 pt-2">
          <p class="truncate text-[11px] text-muted-foreground">${safeAddress}</p>
        </div>
        <div class="flex items-center justify-between px-3 py-2 text-[11px]">
          <span class="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span class="h-1.5 w-1.5 rounded-full" style="background: ${statusMeta.dot};"></span>${safeStatus}
          </span>
          <span class="font-mono tabular-nums text-muted-foreground">▲ ${upvotes}</span>
        </div>
      </div>
      <span class="mx-auto block h-2.5 w-2.5 -translate-y-[7px] rotate-45 border-r border-b border-border bg-card"></span>
    </div>
  `;

  return container;
}
