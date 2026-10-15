'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Camera, Check, ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Label } from '@/components/ui/shadcn/label';
import AnimatedFileUpload from '@/components/ui/smoothui/animated-file-upload';
import { SPRING_DEFAULT } from '@/components/ui/smoothui/animation';
import { PHOTO_FRESHNESS_MINUTES } from '@/lib/exif-freshness';
import { CategoryIcon } from './category-icon';
import { CATEGORIES, CATEGORY_ORDER, type ReportCategory } from './types';

/* ------------------------------------------------------------------ */
/* Step 0 — Photos                                                     */
/* ------------------------------------------------------------------ */

export interface WizardPhotosProps {
  images: string[];
  rejectedPhotos: { name: string; detail: string }[];
  isCompressing: boolean;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: File[]) => void;
  onCameraClick: () => void;
  onRemoveImage: (index: number) => void;
  onClearAll: () => void;
}

export function WizardStepPhotos({
  images,
  rejectedPhotos,
  isCompressing,
  cameraInputRef,
  onFilesSelected,
  onCameraClick,
  onRemoveImage,
  onClearAll,
}: WizardPhotosProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Camera-first hero: distinct from the old dashed dropzone-only layout */}
      <button
        type="button"
        onClick={onCameraClick}
        className="group flex cursor-pointer touch-manipulation items-center gap-3 rounded-2xl bg-primary p-3.5 text-left text-primary-foreground shadow-md transition-all duration-200 ease-out hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20 transition-transform duration-200 group-active:scale-95">
          <Camera className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-tight">Tirar foto agora</span>
          <span className="block truncate text-[11px] opacity-80">
            Validação EXIF dos últimos {PHOTO_FRESHNESS_MINUTES} min
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 font-mono text-[11px] tabular-nums">
          {images.length}
        </span>
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) void onFilesSelected(files);
          event.target.value = '';
        }}
      />

      <AnimatedFileUpload
        accept="image/*"
        multiple
        onFilesSelected={onFilesSelected}
        className="min-h-24 bg-background/50 hover:bg-muted/40"
      />

      {rejectedPhotos.length > 0 && (
        <div
          aria-live="polite"
          className="flex flex-col gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100"
        >
          <span className="font-semibold">{rejectedPhotos.length} recusada(s):</span>
          {rejectedPhotos.map((rejected, index) => (
            <span key={`${rejected.name}-${index}`} className="leading-relaxed">
              {rejected.name} — {rejected.detail}
            </span>
          ))}
        </div>
      )}

      {isCompressing && (
        <div className="flex animate-pulse items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          <span>Otimizando imagens (&lt;290KB, preservando EXIF)...</span>
        </div>
      )}

      {images.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ImagePlus className="size-3.5 text-primary" aria-hidden="true" />
              Anexadas
              <span className="font-mono font-normal tabular-nums text-muted-foreground">
                {images.length}
              </span>
            </span>
            <button
              type="button"
              onClick={onClearAll}
              className="flex h-9 cursor-pointer touch-manipulation items-center rounded-lg px-2 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              Remover todas
            </button>
          </div>
          {/* Numbered 2-col card grid — new vs the old horizontal strip */}
          <div className="grid grid-cols-2 gap-2">
            {images.map((imgUrl, index) => (
              <motion.figure
                key={`${imgUrl.slice(-24)}-${index}`}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING_DEFAULT}
                className="relative h-28 overflow-hidden rounded-2xl border border-border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={`Foto da ocorrência ${index + 1}`}
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
                  <span className="font-mono text-[10px] font-semibold tabular-nums text-white">
                    FOTO {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    aria-label={`Remover foto ${index + 1}`}
                    className="flex size-7 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </span>
              </motion.figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1 — Details (2-col category grid, fresh vs old chip rail)       */
/* ------------------------------------------------------------------ */

export interface WizardDetailsProps {
  category: ReportCategory | null;
  title: string;
  description: string;
  shouldReduceMotion: boolean | null;
  onCategoryChange: (category: ReportCategory) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function WizardStepDetails({
  category,
  title,
  description,
  shouldReduceMotion,
  onCategoryChange,
  onTitleChange,
  onDescriptionChange,
}: WizardDetailsProps) {
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="wizard-category-label" className="flex flex-col gap-2">
        <span
          id="wizard-category-label"
          className="text-xs font-bold tracking-[0.04em] text-foreground uppercase"
        >
          Tipo de problema <span aria-hidden="true" className="text-destructive">*</span>
        </span>
        <div role="radiogroup" aria-label="Categoria do problema" className="grid grid-cols-2 gap-2">
          {CATEGORY_ORDER.map((catKey) => {
            const cat = CATEGORIES[catKey];
            const isSelected = category === catKey;
            return (
              <motion.button
                key={catKey}
                type="button"
                role="radio"
                aria-checked={isSelected}
                title={cat.description}
                onClick={() => onCategoryChange(catKey)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                transition={SPRING_DEFAULT}
                className={cn(
                  'flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 rounded-2xl border-2 p-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-muted-foreground/40',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl',
                    cat.bgLight,
                    cat.color,
                  )}
                >
                  <CategoryIcon category={catKey} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-[11px] leading-tight font-semibold text-foreground">
                  {cat.label}
                </span>
                {isSelected && <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
              </motion.button>
            );
          })}
        </div>
      </section>

      <div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="wizard-title" className="text-xs font-bold tracking-[0.04em] uppercase">
            Título <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {title.length}/70
          </span>
        </div>
        <Input
          id="wizard-title"
          maxLength={70}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Ex: Buraco profundo na pista esquerda"
          className="mt-1.5 h-11 rounded-2xl text-base sm:text-sm"
          required
          aria-required="true"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="wizard-description" className="text-xs font-bold tracking-[0.04em] uppercase">
            Descrição <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {description.length}/400
          </span>
        </div>
        <Textarea
          id="wizard-description"
          maxLength={400}
          rows={4}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="O que aconteceu, onde afeta a via e há quanto tempo existe."
          className="mt-1.5 min-h-28 resize-y rounded-2xl text-base leading-relaxed sm:text-sm"
          required
          aria-required="true"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Review summary                                             */
/* ------------------------------------------------------------------ */

export interface WizardReviewProps {
  images: string[];
  category: ReportCategory | null;
  title: string;
  description: string;
  shortCoords: string;
  isAuthenticated: boolean;
}

export function WizardStepReview({
  images,
  category,
  title,
  description,
  shortCoords,
  isAuthenticated,
}: WizardReviewProps) {
  const categoryInfo = category ? CATEGORIES[category] : null;
  return (
    <div className="flex flex-col gap-3">
      {!isAuthenticated && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100">
          Você está sem entrar. Entre com sua conta Google para publicar — seus dados ficam salvos aqui.
        </div>
      )}
      {/* Summary ticket: new stacked-ticket visual, not the old details panel */}
      <div className="overflow-hidden rounded-2xl border border-border">
        {images[0] && (
          <div className="relative h-32 w-full bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt="Capa do reporte"
              draggable={false}
              className="h-full w-full select-none object-cover"
            />
            <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white backdrop-blur-md">
              {images.length} {images.length === 1 ? 'foto' : 'fotos'}
            </span>
          </div>
        )}
        <dl className="flex flex-col divide-y divide-border bg-card">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <dt className="sr-only">Categoria</dt>
            <dd className="flex min-w-0 items-center gap-2">
              {categoryInfo && (
                <span className={cn('rounded-lg p-1.5', categoryInfo.bgLight, categoryInfo.color)}>
                  <CategoryIcon category={category as ReportCategory} className="size-4" />
                </span>
              )}
              <span className="truncate text-xs font-semibold text-foreground">
                {categoryInfo?.label ?? '—'}
              </span>
            </dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Título
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">{title || '—'}</dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Descrição
            </dt>
            <dd className="mt-0.5 line-clamp-4 text-xs leading-relaxed whitespace-pre-line text-foreground/90">
              {description || '—'}
            </dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Local
            </dt>
            <dd className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-muted-foreground">
              {shortCoords}
            </dd>
          </div>
        </dl>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Confira tudo antes de publicar. Dá para voltar e ajustar fotos ou detalhes.
      </p>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {images.slice(1).map((imgUrl, index) => (
          <div
            key={index}
            className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt={`Foto extra ${index + 2}`}
              draggable={false}
              className="h-full w-full select-none object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
