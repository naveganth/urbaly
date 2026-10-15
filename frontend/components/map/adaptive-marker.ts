'use client';

import { createGooglePinElement } from './google-pin';
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
   * Kept for API compat — pins are stable across zoom, so this is a no-op
   * that only guarantees the pin layer stays visible.
   */
  setPhotoMode(show: boolean, imageUrl?: string, imageCount?: number, thumbnailPending?: boolean): void;
  /** Lift + ring highlight for the currently selected report. */
  setSelected(selected: boolean): void;
}

/**
 * Single stable teardrop-pin marker element.
 *
 * Previously this held both the pin and a circular photo preview as stacked
 * layers swapped by zoom level — that crossfade is what made markers appear
 * to vanish/re-appear on every zoom-threshold crossing. Pins now stay
 * constant: one pin layer, no zoom listener, no swap, always in the map.
 */
export function createAdaptiveMarkerElement(data: AdaptiveMarkerData): AdaptiveMarkerHandle {
  const {
    category,
    categoryLabel,
    title,
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

  container.appendChild(pinLayer);

  const setPhotoMode = (): void => {
    // No-op: pins never enter photo mode. Ensure the class stays off so the
    // pin layer can never be hidden by a stale zoom state.
    container.classList.remove('is-photo', 'is-loading');
  };

  const setSelected = (selected: boolean): void => {
    container.classList.toggle('is-selected', selected);
  };

  return { element: container, setPhotoMode, setSelected };
}
