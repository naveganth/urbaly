'use client';

import * as React from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import {
  Camera,
  X,
  Send,
  CircleAlert,
  Check,
  Loader2,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImageKeepingExif } from '@/lib/image-compress';
import {
  validatePhotoFreshness,
  PHOTO_FRESHNESS_MINUTES,
} from '@/lib/exif-freshness';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Label } from '@/components/ui/shadcn/label';
import AnimatedFileUpload from '@/components/ui/smoothui/animated-file-upload';
import AnimatedProgressBar from '@/components/ui/smoothui/animated-progress-bar';
import { SPRING_DEFAULT } from '@/components/ui/smoothui/animation';
import { CategoryIcon } from './category-icon';
import {
  CATEGORIES,
  CATEGORY_ORDER,
  ReportCategory,
  StreetReport,
} from './types';

interface ReportProblemSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: [number, number] | null;
  onSubmit: (
    report: Omit<StreetReport, 'id' | 'createdAt' | 'upvotes' | 'status'>,
  ) => void | Promise<void>;
  onCancelPlacement?: () => void;
  /** False when the user is logged out — submit requires a Google JWT. */
  isAuthenticated?: boolean;
}

const photoPlural = new Intl.PluralRules('pt-BR');

// Maps-style placement: floating right card on desktop (clear of the
// top-right map controls), bottom sheet on mobile. Rendered inside the map
// container (absolute) so it floats over the basemap instead of docking.
const PANEL_POSITION =
  'absolute z-30 inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-h-[82dvh] md:inset-x-auto md:right-4 md:top-[132px] md:bottom-4 md:w-[400px] md:max-h-none';

export function ReportProblemSheet({
  isOpen,
  onOpenChange,
  coordinates,
  onSubmit,
  onCancelPlacement,
  isAuthenticated = true,
}: ReportProblemSheetProps) {
  const [category, setCategory] = React.useState<ReportCategory | null>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [images, setImages] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [rejectedPhotos, setRejectedPhotos] = React.useState<
    { name: string; detail: string }[]
  >([]);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const errorAlertRef = React.useRef<HTMLDivElement>(null);
  const [updatedAt] = React.useState(() => new Date());
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();
  // Card slides in from the side it docks to: right on desktop, bottom sheet
  // on mobile. Subscription is SSR-safe (false until hydrated).
  const isDesktop = React.useSyncExternalStore(
    (subscribe) => {
      const query = window.matchMedia('(min-width: 768px)');
      query.addEventListener('change', subscribe);
      return () => query.removeEventListener('change', subscribe);
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  );
  const completedRequiredFields = [
    Boolean(category),
    Boolean(title.trim()),
    Boolean(description.trim()),
    images.length > 0,
  ].filter(Boolean).length;
  const requiredProgress = completedRequiredFields * (100 / 4);

  // Explicit dismiss clears the placement pin too (single predictable path:
  // X, Cancel, ESC, scrim tap, and header drag-down all behave the same).
  const handleClose = React.useCallback(() => {
    onOpenChange(false);
    onCancelPlacement?.();
  }, [onOpenChange, onCancelPlacement]);

  // Focus the close action on open (Maps keeps keyboard context on the card)
  // and restore whatever had focus before.
  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  // ESC dismisses the card.
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  // Validation / upload errors move focus to the alert so they are seen
  // and announced instead of sitting silently above the viewport.
  React.useEffect(() => {
    if (isOpen && errorMessage) errorAlertRef.current?.focus({ preventScroll: false });
  }, [isOpen, errorMessage]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length > 0) {
      setIsCompressing(true);
      setErrorMessage(null);
      setRejectedPhotos([]);
      try {
        for (const file of files) {
          // Fresh EXIF capture data required (CreateDate / DateTimeOriginal / ModifyDate).
          const freshness = await validatePhotoFreshness(file);
          if (!freshness.accepted) {
            const detail =
              freshness.detail ??
              (freshness.reason === 'too-old' && freshness.ageMinutes !== null
                ? `tirada há ${Math.round(freshness.ageMinutes)} min (limite: ${PHOTO_FRESHNESS_MINUTES} min)`
                : freshness.reason === 'no-exif'
                  ? 'sem data de captura EXIF — tire uma foto agora'
                  : 'não foi possível ler a data da foto');
            setRejectedPhotos((prev) => [...prev, { name: file.name, detail }]);
            continue;
          }
          const { dataUrl, originalSizeKB, sizeKB, exifKept } =
            await compressImageKeepingExif(file, {
              maxSizeKB: 280, // strictly under 290KB
            });
          console.info(
            '[Urbaly] Tamanho da imagem antes/depois da compressão:',
            JSON.stringify({
              name: file.name,
              beforeKB: originalSizeKB,
              afterKB: sizeKB,
              exifKept,
            }),
          );
          if (!exifKept) {
            // Backend needs EXIF dates; this file would only bounce back.
            setRejectedPhotos((prev) => [
              ...prev,
              {
                name: file.name,
                detail: 'os dados EXIF se perderam na conversão — use uma foto JPEG da câmera',
              },
            ]);
            continue;
          }
          setImages((prev) => [...prev, dataUrl]);
        }
      } catch (err) {
        console.error('Error compressing image:', err);
        setErrorMessage('Não foi possível otimizar a imagem selecionada.');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinates) {
      setErrorMessage(
        'Por favor, clique em um ponto no mapa para definir o local do problema.',
      );
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Adicione um título breve para o problema.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage(
        'Por favor, forneça uma descrição detalhada do problema.',
      );
      return;
    }
    if (!category) {
      setErrorMessage('Escolha uma categoria para o problema.');
      return;
    }
    // Backend needs EXIF evidence: a photo-less report can never be stored.
    if (images.length === 0) {
      setErrorMessage(
        'Adicione pelo menos uma foto tirada agora: o servidor exige os dados EXIF da câmera.'
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // Links the sent payload to the `[Urbaly] EXIF kept` audit line.
      console.info(
        '[Urbaly] Report submit images:',
        JSON.stringify({
          count: images.length,
          sizesKB: images.map((dataUrl) => Math.round(((dataUrl.split(',')[1] ?? '').length * 3) / 4 / 1024)),
          category,
        }),
      );
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        coordinates,
        address: `Local próximo a (${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)})`,
        images,
        imageUrl: images[0] || undefined,
        reportedBy: 'Usuário atual',
        reporterTitle: 'Cidadão',
        updatedAt: updatedAt.toISOString(),
      });

      // Reset form
      setIsSubmitting(false);
      setCategory(null);
      setTitle('');
      setDescription('');
      setImages([]);
      setRejectedPhotos([]);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error submitting report:', error);
      setIsSubmitting(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar o problema. Tente novamente.'
      );
    }
  };

  // Mobile bottom-sheet gesture: drag the header down to dismiss.
  // Desktop keeps the card fixed (no drag), like Maps.
  const handleDragEnd = (
    _: unknown,
    info: { offset: { y: number }; velocity: { y: number } },
  ) => {
    if (window.matchMedia('(min-width: 768px)').matches) return;
    if (info.offset.y > 110 || info.velocity.y > 550) handleClose();
  };

  const startHeaderDrag = (event: React.PointerEvent) => {
    if (window.matchMedia('(min-width: 768px)').matches) return;
    if ((event.target as HTMLElement).closest('button, input, textarea, a')) return;
    dragControls.start(event);
  };

  const shortCoords = coordinates
    ? `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`
    : 'escolha um ponto no mapa';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile scrim only: desktop stays an interactive floating card. */}
          <motion.div
            key="report-scrim"
            aria-hidden="true"
            onClick={handleClose}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="absolute inset-0 z-20 bg-black/20 md:hidden"
          />
          <motion.section
            key="report-card"
            role="dialog"
            aria-modal="false"
            aria-label="Reportar problema no mapa"
            drag={shouldReduceMotion ? false : 'y'}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, x: isDesktop ? 48 : 0, y: isDesktop ? 0 : 48 }
            }
            animate={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: isDesktop ? 32 : 0, y: isDesktop ? 0 : 32 }
            }
            transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
            className={cn(
              PANEL_POSITION,
              'flex flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl md:rounded-2xl',
            )}
          >
            {/* Draggable header: grab bar (mobile) + title + close */}
            <div
              onPointerDown={startHeaderDrag}
              className="shrink-0 cursor-grab touch-none active:cursor-grabbing md:cursor-default"
            >
              <div aria-hidden="true" className="flex justify-center pt-2.5 md:hidden">
                <span className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="flex items-center gap-3 px-4 pt-2 pb-3 md:px-5 md:pt-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <CircleAlert className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold leading-tight tracking-tight text-foreground">
                    Reportar problema
                  </h2>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <MapPin className="size-3 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate font-mono tabular-nums">{shortCoords}</span>
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={handleClose}
                  aria-label="Fechar formulário de reporte"
                  className="flex size-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-all duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <AnimatedProgressBar value={requiredProgress} className="mx-4 rounded-full md:mx-5" />
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              {/* Scrollable body */}
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
                {!isAuthenticated && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100">
                    <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
                    <span>
                      Você está sem entrar. Entre com sua conta Google para publicar, seus dados e fotos ficam no formulário.
                    </span>
                  </div>
                )}
                {errorMessage && (
                  <div ref={errorAlertRef} tabIndex={-1} role="alert" id="report-form-error" className="flex items-center gap-2.5 rounded-xl border-l-2 border-destructive bg-destructive/10 p-3 text-xs text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive">
                    <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                )}

                {/* Photos */}
                <section aria-labelledby="report-photos-label" className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span id="report-photos-label" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Camera aria-hidden="true" className="size-4 text-primary" />
                      Fotos <span aria-hidden="true" className="text-destructive">*</span>
                      <span className="font-mono font-normal tabular-nums text-muted-foreground">
                        {images.length} {photoPlural.select(images.length) === 'one' ? 'foto' : 'fotos'}
                      </span>
                    </span>
                    {images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setImages([])}
                        className="flex h-11 cursor-pointer touch-manipulation items-center rounded-lg px-2 text-[11px] font-medium text-destructive transition-all duration-200 ease-out hover:bg-destructive/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                      >
                        Remover todas
                      </button>
                    )}
                  </div>

                  <AnimatedFileUpload
                    accept="image/*"
                    multiple={true}
                    onFilesSelected={handleFilesSelected}
                    className="border-dashed bg-background/50 transition-colors duration-150 hover:bg-muted/40 focus-within:border-primary"
                  />

                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (files.length > 0) void handleFilesSelected(files);
                        event.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-11 cursor-pointer gap-2 rounded-xl text-xs font-medium transition-all duration-200 ease-out active:scale-[0.98]"
                    >
                      <Camera className="size-4 text-primary" />
                      Tirar foto agora
                    </Button>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Só aceitamos fotos tiradas nos últimos {PHOTO_FRESHNESS_MINUTES} minutos
                      (validado pela data EXIF da câmera).
                    </p>
                  </div>

                  {rejectedPhotos.length > 0 && (
                    <div
                      aria-live="polite"
                      className="flex flex-col gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100"
                    >
                      <span className="font-semibold">
                        {rejectedPhotos.length}{' '}
                        {photoPlural.select(rejectedPhotos.length) === 'one' ? 'foto recusada' : 'fotos recusadas'}:
                      </span>
                      {rejectedPhotos.map((rejected, index) => (
                        <span key={`${rejected.name}-${index}`} className="leading-relaxed">
                          {rejected.name} — {rejected.detail}
                        </span>
                      ))}
                    </div>
                  )}

                  {isCompressing && (
                    <div className="flex animate-pulse items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Otimizando imagens (&lt;290KB, preservando EXIF)...</span>
                    </div>
                  )}

                  {/* Maps-style photo strip: horizontal scroll, not a grid */}
                  {images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x">
                      {images.map((imgUrl, index) => (
                        <div
                          key={index}
                          className="relative h-20 w-28 shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-muted"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={`Foto da ocorrência ${index + 1}`}
                            draggable={false}
                            className="h-full w-full select-none object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            aria-label={`Remover foto ${index + 1}`}
                            className="absolute top-1 right-1 flex size-8 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all duration-200 ease-out hover:bg-black/80 hover:scale-105 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white before:absolute before:-inset-2 before:content-['']"
                          >
                            <X aria-hidden="true" className="size-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white">
                            #{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="report-title"
                      className="text-xs font-semibold leading-tight tracking-[0.02em] text-foreground"
                    >
                      Título do problema <span aria-hidden="true" className="text-destructive">*</span>
                    </Label>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {title.length}/70
                    </span>
                  </div>
                  <Input
                    id="report-title"
                    maxLength={70}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex: Buraco profundo na pista esquerda"
                    className="mt-1.5 h-11 text-base sm:text-sm"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMessage) && !title.trim() ? true : undefined}
                    aria-describedby={errorMessage ? 'report-form-error' : undefined}
                  />
                </div>

                {/* Category: Maps-style chips, horizontal scroll.
                    Toggle buttons (aria-pressed): a category is required, so
                    picking one always sticks — re-tapping never clears it. */}
                <section aria-labelledby="report-category-label" className="flex flex-col gap-2">
                  <span id="report-category-label" className="text-xs font-semibold leading-tight tracking-[0.02em] text-foreground">
                    Tipo de problema <span aria-hidden="true" className="text-destructive">*</span>
                  </span>
                  <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x">
                    {CATEGORY_ORDER.map((catKey) => {
                      const cat = CATEGORIES[catKey];
                      const isSelected = category === catKey;
                      return (
                        <motion.button
                          key={catKey}
                          type="button"
                          aria-pressed={isSelected}
                          title={cat.description}
                          onClick={() => setCategory(catKey)}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                          transition={SPRING_DEFAULT}
                          className={cn(
                            'flex h-11 shrink-0 snap-start cursor-pointer touch-manipulation items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-[background-color,border-color,box-shadow,color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected
                              ? 'border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30'
                              : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground hover:shadow-sm active:shadow-none',
                          )}
                        >
                          <CategoryIcon category={catKey} className="size-4 shrink-0" />
                          {cat.label}
                          <AnimatePresence initial={false}>
                            {isSelected && (
                              <motion.span
                                key="check"
                                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.4 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                                transition={SPRING_DEFAULT}
                                className="flex shrink-0"
                              >
                                <Check className="size-3.5 text-primary" aria-hidden="true" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                  <p aria-live="polite" className="text-[11px] leading-relaxed text-muted-foreground">
                    {category ? CATEGORIES[category].description : 'Escolha a categoria que melhor descreve o problema.'}
                  </p>
                </section>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="report-description"
                      className="text-xs font-semibold leading-tight tracking-[0.02em] text-foreground"
                    >
                      Descreva o problema <span aria-hidden="true" className="text-destructive">*</span>
                    </Label>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {description.length}/400
                    </span>
                  </div>
                  <Textarea
                    id="report-description"
                    maxLength={400}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="O que aconteceu, onde afeta a via e há quanto tempo existe."
                    className="mt-1.5 min-h-24 resize-y rounded-xl border-border bg-background text-base leading-relaxed sm:text-sm"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMessage) && !description.trim() ? true : undefined}
                    aria-describedby={errorMessage ? 'report-form-error' : undefined}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Reportando como</span>
                  <span className="font-medium text-foreground">Usuário atual · cidadão</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Atualizado em{' '}
                  {updatedAt.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  {' '}· campos com * são obrigatórios
                </p>
              </div>

              {/* Sticky action footer */}
              <div className="shrink-0 border-t border-border bg-card/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:px-5">
                <div className="mb-2.5 flex items-center gap-3">
                  <AnimatedProgressBar value={requiredProgress} className="flex-1 rounded-full" />
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {completedRequiredFields}/4
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="h-11 flex-1 cursor-pointer touch-manipulation text-xs transition-all duration-200 ease-out active:scale-[0.97] sm:flex-none sm:px-5"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="default"
                    disabled={isSubmitting || isCompressing || !coordinates || images.length === 0}
                    className="h-11 min-w-0 flex-1 cursor-pointer touch-manipulation gap-2 overflow-hidden px-3 text-xs font-semibold shadow-sm transition-all duration-200 ease-out active:scale-[0.97] disabled:active:scale-100 sm:flex-none sm:px-5"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isCompressing ? (
                        <motion.span
                          key="compressing"
                          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 className="size-4 animate-spin" />
                          Otimizando...
                        </motion.span>
                      ) : isSubmitting ? (
                        <motion.span
                          key="submitting"
                          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-2"
                        >
                          <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          Publicando...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-2"
                        >
                          <Send className="size-4" />
                          Publicar{images.length > 0 && ` (${images.length})`}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </div>
            </form>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
