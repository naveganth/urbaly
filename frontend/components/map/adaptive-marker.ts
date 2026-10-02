'use client';

import { createGooglePinElement } from './google-pin';
import { createReportPhotoElement } from './report-photo-pin';
import type { ReportCategory, ReportStatus } from './types';

export interface AdaptiveMarkerData {
  category: ReportCategory;
  categoryLabel: string;
  title: string;
  address: string;
  status: ReportStatus;
  upvotes: number;
  imageUrl?: string;
  imageCount?: number;
  isDark: boolean;
  delayMs?: number;
  animateIn?: boolean;
  isSelected?: boolean;
}

export interface AdaptiveMarkerHandle {
  element: HTMLDivElement;
  /**
   * Seamlessly swap between teardrop pin and circular photo preview.
   * Pure class toggle + img src assignment — never rebuilds the marker, so
   * zooming in/out crossfades in place with no pop or remount.
   * `thumbnailPending` shows the shimmer skeleton while a thumbnail is being
   * fetched but no `imageUrl` is known yet.
   */
  setPhotoMode(show: boolean, imageUrl?: string, imageCount?: number, thumbnailPending?: boolean): void;
  /** Lift + ring highlight for the currently selected report. */
  setSelected(selected: boolean): void;
}

/**
 * Single marker element holding BOTH the teardrop pin and the circular CDN
 * photo preview as stacked layers. Visibility is driven by the `.is-photo`
 * class (see globals.css crossfade, SmoothUI 250ms EASE_OUT). Thumbnails that
 * arrive after mount (zoom prefetch) fade in via `.is-loaded` on decode.
 */
export function createAdaptiveMarkerElement(data: AdaptiveMarkerData): AdaptiveMarkerHandle {
  const {
    category,
    categoryLabel,
    title,
    address,
    status,
    upvotes,
    imageUrl,
    imageCount = 0,
    isDark,
    delayMs = 0,
    animateIn = true,
    isSelected = false,
  } = data;

  const container = document.createElement('div');
  container.className =
    'adaptive-marker group relative flex cursor-pointer select-none flex-col items-center';
  container.style.width = '62px';
  container.style.height = '70px';
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute(
    'aria-label',
    `${title} — ${categoryLabel}. Pressione Enter para ver detalhes.`
  );
  // Native fallback tooltip for touch / keyboard users.
  container.setAttribute('title', `${title} · ${categoryLabel}`);
  if (isSelected) container.classList.add('is-selected');

  const pinLayer = document.createElement('div');
  pinLayer.className = 'marker-pin-layer';
  pinLayer.appendChild(
    createGooglePinElement({ category, isDark, delayMs, animateIn })
  );

  const photoLayer = document.createElement('div');
  photoLayer.className = 'marker-photo-layer';
  photoLayer.appendChild(
    createReportPhotoElement({
      category,
      categoryLabel,
      title,
      address,
      status,
      upvotes,
      imageUrl: imageUrl ?? '',
      imageCount,
      isDark,
      animateIn: false,
    })
  );

  container.appendChild(pinLayer);
  container.appendChild(photoLayer);

  // Reveal each photo <img> (circle + tooltip thumb) the moment it decodes,
  // fading over the category-icon fallback disc. Capture phase catches the
  // non-bubbling `load` events of current and future imgs alike.
  container.addEventListener(
    'load',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'IMG' && target.classList.contains('js-photo-img')) {
        target.classList.add('is-loaded');
      }
    },
    true
  );

  let currentSrc = imageUrl ?? '';

  const setPhotoMode = (
    show: boolean,
    nextSrc?: string,
    nextCount?: number,
    thumbnailPending?: boolean
  ): void => {
    container.classList.toggle('is-photo', show);

    if (nextSrc && nextSrc !== currentSrc) {
      currentSrc = nextSrc;
      container.querySelectorAll<HTMLImageElement>('img.js-photo-img').forEach((img) => {
        img.classList.remove('is-loaded');
        img.setAttribute('src', nextSrc);
      });
    }

    // Skeleton shimmer only while photo mode is on and we are still waiting
    // for a thumbnail URL. Once a src exists, the sibling-selector CSS takes
    // over (shimmer until decode); with no image expected, the fallback disc
    // shows instead.
    container.classList.toggle('is-loading', show && !currentSrc && !!thumbnailPending);

    if (typeof nextCount === 'number') {
      const badge = container.querySelector<HTMLElement>('.js-photo-count');
      if (badge) {
        const extra = nextCount - 1;
        if (extra > 0) {
          badge.textContent = `+${extra}`;
          badge.classList.remove('hidden');
          badge.classList.add('flex', 'h-5', 'min-w-5');
        } else {
          badge.classList.add('hidden');
          badge.classList.remove('flex', 'h-5', 'min-w-5');
        }
      }
    }
  };

  const setSelected = (selected: boolean): void => {
    container.classList.toggle('is-selected', selected);
  };

  return { element: container, setPhotoMode, setSelected };
}
