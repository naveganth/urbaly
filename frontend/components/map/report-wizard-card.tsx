'use client';

import * as React from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleAlert,
  ClipboardList,
  Eye,
  Loader2,
  MapPin,
  Send,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImageKeepingExif } from '@/lib/image-compress';
import { validatePhotoFreshness, PHOTO_FRESHNESS_MINUTES } from '@/lib/exif-freshness';
import { Button } from '@/components/ui/shadcn/button';
import { SPRING_DEFAULT } from '@/components/ui/smoothui/animation';
import { CATEGORIES, type ReportCategory, type StreetReport } from './types';
import {
  WizardStepDetails,
  WizardStepPhotos,
  WizardStepReview,
} from './report-wizard-steps';

interface ReportWizardSheetProps {
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

const STEPS = [
  { id: 'photos', label: 'Fotos', icon: Camera },
  { id: 'details', label: 'Detalhes', icon: ClipboardList },
  { id: 'review', label: 'Revisar', icon: Eye },
] as const;

// New docking: same map-overlay idea, own measurements — wider desktop card,
// taller mobile sheet, distinct radius + ring so it never reads as the old one.
const WIZARD_POSITION =
  'absolute z-30 inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-h-[86dvh] md:inset-x-auto md:right-4 md:top-[120px] md:bottom-4 md:w-[420px] md:max-h-none';

export function ReportWizardSheet({
  isOpen,
  onOpenChange,
  coordinates,
  onSubmit,
  onCancelPlacement,
  isAuthenticated = true,
}: ReportWizardSheetProps) {
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
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
  const isDesktop = React.useSyncExternalStore(
    (subscribe) => {
      const query = window.matchMedia('(min-width: 768px)');
      query.addEventListener('change', subscribe);
      return () => query.removeEventListener('change', subscribe);
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  );

  const goToStep = React.useCallback((next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(2, next)));
    setErrorMessage(null);
  }, [step]);

  const handleClose = React.useCallback(() => {
    onOpenChange(false);
    onCancelPlacement?.();
  }, [onOpenChange, onCancelPlacement]);

  // Fresh open always lands on step 0; field values persist like the old sheet.
  // Render-phase adjustment (documented pattern for syncing state to props),
  // not an effect — avoids cascading renders.
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setStep(0);
      setDirection(1);
      setErrorMessage(null);
    }
  }

  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  React.useEffect(() => {
    if (isOpen && errorMessage) errorAlertRef.current?.focus({ preventScroll: false });
  }, [isOpen, errorMessage]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setIsCompressing(true);
    setErrorMessage(null);
    setRejectedPhotos([]);
    try {
      for (const file of files) {
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
          await compressImageKeepingExif(file, { maxSizeKB: 280 });
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
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleNext = () => {
    if (step === 0) {
      if (images.length === 0) {
        setErrorMessage(
          'Adicione pelo menos uma foto tirada agora: o servidor exige os dados EXIF da câmera.',
        );
        return;
      }
      goToStep(1);
      return;
    }
    if (step === 1) {
      if (!category) {
        setErrorMessage('Escolha uma categoria para o problema.');
        return;
      }
      if (!title.trim()) {
        setErrorMessage('Adicione um título breve para o problema.');
        return;
      }
      if (!description.trim()) {
        setErrorMessage('Por favor, forneça uma descrição detalhada do problema.');
        return;
      }
      goToStep(2);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!coordinates) {
      setErrorMessage('Por favor, clique em um ponto no mapa para definir o local do problema.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Adicione um título breve para o problema.');
      goToStep(1);
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Por favor, forneça uma descrição detalhada do problema.');
      goToStep(1);
      return;
    }
    if (!category) {
      setErrorMessage('Escolha uma categoria para o problema.');
      goToStep(1);
      return;
    }
    if (images.length === 0) {
      setErrorMessage(
        'Adicione pelo menos uma foto tirada agora: o servidor exige os dados EXIF da câmera.',
      );
      goToStep(0);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      console.info(
        '[Urbaly] Report submit images:',
        JSON.stringify({
          count: images.length,
          sizesKB: images.map(
            (dataUrl) => Math.round(((dataUrl.split(',')[1] ?? '').length * 3) / 4 / 1024),
          ),
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

      setIsSubmitting(false);
      setStep(0);
      setDirection(1);
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
          : 'Não foi possível enviar o problema. Tente novamente.',
      );
    }
  };

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

  const categoryTint = category ? CATEGORIES[category].bgLight : 'bg-primary/10';
  const canAdvance =
    step === 0
      ? images.length > 0 && !isCompressing
      : step === 1
        ? Boolean(category && title.trim() && description.trim())
        : Boolean(coordinates && images.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="wizard-scrim"
            aria-hidden="true"
            onClick={handleClose}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="absolute inset-0 z-20 bg-black/20 md:hidden"
          />
          <motion.section
            key="wizard-card"
            role="dialog"
            aria-modal="false"
            aria-label="Novo reporte em 3 passos"
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
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: isDesktop ? 32 : 0, y: isDesktop ? 0 : 32 }
            }
            transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
            className={cn(
              WIZARD_POSITION,
              'flex flex-col overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-2xl ring-1 ring-black/5',
            )}
          >
            {/* Accent wash keyed to the chosen category — new signature detail */}
            <div
              aria-hidden="true"
              className={cn('h-1.5 w-full transition-colors duration-300', categoryTint)}
            />

            {/* Draggable header with stepper */}
            <div
              onPointerDown={startHeaderDrag}
              className="shrink-0 cursor-grab touch-none active:cursor-grabbing md:cursor-default"
            >
              <div aria-hidden="true" className="flex justify-center pt-2.5 md:hidden">
                <span className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="flex items-center gap-2.5 px-4 pt-2 pb-2 md:px-5">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold leading-tight tracking-tight text-foreground">
                    Novo reporte
                  </h2>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <MapPin className="size-3 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate font-mono tabular-nums">{shortCoords}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {step + 1}/3
                </span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={handleClose}
                  aria-label="Fechar assistente de reporte"
                  className="flex size-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-all duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {/* Segmented stepper — new vs the old linear progress bar */}
              <ol aria-label="Passos do reporte" className="flex items-center gap-1.5 px-4 pb-3 md:px-5">
                {STEPS.map((s, index) => {
                  const StepIcon = s.icon;
                  const isDone = index < step;
                  const isCurrent = index === step;
                  return (
                    <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          // Allow revisiting completed steps only.
                          if (index < step) goToStep(index);
                        }}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-label={`${s.label}${isDone ? ' (concluído)' : ''}`}
                        disabled={index > step}
                        className={cn(
                          'flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                          isCurrent
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : isDone
                              ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                              : 'border-border bg-muted/50 text-muted-foreground',
                        )}
                      >
                        {isDone ? (
                          <Check className="size-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <StepIcon className="size-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span className="hidden truncate min-[380px]:inline">{s.label}</span>
                      </button>
                      {index < STEPS.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-px w-2 shrink-0 rounded-full',
                            index < step ? 'bg-primary' : 'bg-border',
                          )}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 md:px-5">
                {errorMessage && (
                  <div
                    ref={errorAlertRef}
                    tabIndex={-1}
                    role="alert"
                    className="mb-3 flex items-center gap-2.5 rounded-2xl border-l-2 border-destructive bg-destructive/10 p-3 text-xs text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                )}

                <AnimatePresence
                  mode="wait"
                  initial={false}
                  custom={direction}
                >
                  <motion.div
                    key={step}
                    custom={direction}
                    initial={
                      shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 32 * direction }
                    }
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
                    transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
                  >
                    {step === 0 && (
                      <WizardStepPhotos
                        images={images}
                        rejectedPhotos={rejectedPhotos}
                        isCompressing={isCompressing}
                        cameraInputRef={cameraInputRef}
                        onFilesSelected={(files) => void handleFilesSelected(files)}
                        onCameraClick={() => cameraInputRef.current?.click()}
                        onRemoveImage={handleRemoveImage}
                        onClearAll={() => setImages([])}
                      />
                    )}
                    {step === 1 && (
                      <WizardStepDetails
                        category={category}
                        title={title}
                        description={description}
                        shouldReduceMotion={shouldReduceMotion}
                        onCategoryChange={setCategory}
                        onTitleChange={setTitle}
                        onDescriptionChange={setDescription}
                      />
                    )}
                    {step === 2 && (
                      <WizardStepReview
                        images={images}
                        category={category}
                        title={title}
                        description={description}
                        shortCoords={shortCoords}
                        isAuthenticated={isAuthenticated}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Step-aware footer — new vs the old Cancel/Publish split */}
              <div className="shrink-0 border-t border-border bg-card/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:px-5">
                <div className="flex gap-2">
                  {step === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="h-11 flex-1 cursor-pointer touch-manipulation rounded-2xl text-xs active:scale-[0.97]"
                    >
                      Cancelar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => goToStep(step - 1)}
                      disabled={isSubmitting}
                      className="h-11 flex-1 cursor-pointer touch-manipulation gap-1.5 rounded-2xl text-xs active:scale-[0.97]"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Voltar
                    </Button>
                  )}
                  {step < 2 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!canAdvance || isSubmitting}
                      className="h-11 flex-1 cursor-pointer touch-manipulation gap-1.5 rounded-2xl text-xs font-semibold shadow-sm active:scale-[0.97]"
                    >
                      Continuar
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!canAdvance || isSubmitting || isCompressing || !coordinates}
                      className="h-11 flex-1 cursor-pointer touch-manipulation gap-2 rounded-2xl text-xs font-semibold shadow-sm active:scale-[0.97]"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {isSubmitting ? (
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
                            <Send className="size-4" aria-hidden="true" />
                            Publicar{images.length > 0 && ` (${images.length})`}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  )}
                </div>
                {isCompressing && step !== 0 && (
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                    Finalizando otimização das fotos...
                  </p>
                )}
              </div>
            </form>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
