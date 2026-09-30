'use client';

import * as React from 'react';
import { getReportImages } from '@/app/actions/api';
import type { StreetReport } from './types';

const IMAGE_CACHE = new Map<string, string[]>();
const PRELOAD_TIMEOUT_MS = 8000;

function getInitialImages(report: StreetReport | null): string[] {
  if (!report) return [];
  if (report.images && report.images.length > 0) return report.images;
  if (report.imageUrl) return [report.imageUrl];
  return [];
}

function preloadImage(src: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = window.setTimeout(finish, timeoutMs);
    const img = new Image();
    img.onload = () => {
      window.clearTimeout(timer);
      finish();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish();
    };
    img.decoding = 'async';
    img.src = src;
  });
}

export interface GatedReportImages {
  images: string[];
  isReady: boolean;
  progress: number;
}

export function useGatedReportImages(report: StreetReport | null): GatedReportImages {
  const [storedImages, setImages] = React.useState<string[]>(() => getInitialImages(report));
  const [storedReady, setIsReady] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [selectionId, setSelectionId] = React.useState<string | null>(report?.id ?? null);
  const requestIdRef = React.useRef(0);

  // Selection changed: synchronously drop the previous report's images and
  // readiness during render, so stale content can never paint under the new
  // selection (e.g. report A's photos flashing on report B when clicked in
  // succession). Cached reports (fully preloaded) resolve instantly here with
  // no loader at all.
  const currentId = report?.id ?? null;
  if (currentId !== selectionId) {
    setSelectionId(currentId);
    const cached = report ? IMAGE_CACHE.get(report.id) : undefined;
    if (cached) {
      setImages(cached);
      setIsReady(true);
      setProgress(100);
    } else {
      setImages(getInitialImages(report));
      setIsReady(false);
      setProgress(0);
    }
  }

  React.useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let cancelled = false;

    const isCurrent = () => !cancelled && requestIdRef.current === requestId;

    const finish = async (owner: StreetReport, finalImages: string[]) => {
      if (!isCurrent()) return;

      const unique = Array.from(new Set(finalImages.filter(Boolean)));
      setImages(unique);
      IMAGE_CACHE.set(owner.id, unique);

      if (unique.length === 0) {
        setProgress(100);
        setIsReady(true);
        return;
      }

      let loaded = 0;
      setProgress(35);
      await Promise.all(
        unique.map((src) =>
          preloadImage(src, PRELOAD_TIMEOUT_MS).then(() => {
            if (!isCurrent()) return;
            loaded += 1;
            setProgress(35 + Math.round((loaded / unique.length) * 65));
          })
        )
      );

      if (!isCurrent()) return;
      setProgress(100);
      // One frame so the progress bar visibly completes before reveal.
      requestAnimationFrame(() => {
        if (!isCurrent()) return;
        setIsReady(true);
      });
    };

    // Deferred load for the new selection only. Reset (and cache-hit
    // resolve) already happened synchronously during render above, so this
    // only kicks off fetching and stays out of the synchronous effect body.
    queueMicrotask(() => {
      if (!isCurrent()) return;

      // Deselected or cache-hit: already resolved during render, nothing to do.
      if (!report || IMAGE_CACHE.has(report.id)) return;

      const initial = getInitialImages(report);
      setProgress(initial.length > 0 ? 20 : 5);

      const numericId = parseInt(report.id, 10);
      if (isNaN(numericId) || numericId <= 0) {
        void finish(report, initial);
        return;
      }

      // Show local images instantly in progress, then upgrade from server.
      getReportImages(numericId)
        .then((fetched) => {
          if (!isCurrent()) return initial;
          return fetched && fetched.length > 0 ? fetched : initial;
        })
        .catch((error) => {
          console.warn('Erro ao carregar imagens do reporte:', error);
          return initial;
        })
        .then((finalImages) => finish(report, finalImages));
    });

    return () => {
      cancelled = true;
    };
    // Intentionally keyed on id so upvote-count updates don't refetch images.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  return { images: storedImages, isReady: storedReady, progress };
}
