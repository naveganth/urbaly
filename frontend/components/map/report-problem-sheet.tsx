'use client';

import * as React from 'react';
import {
  Camera,
  X,
  Send,
  CircleAlert,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Label } from '@/components/ui/shadcn/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import AnimatedFileUpload from '@/components/ui/smoothui/animated-file-upload';
import AnimatedProgressBar from '@/components/ui/smoothui/animated-progress-bar';
import { CategoryIcon } from './category-icon';
import {
  CATEGORIES,
  ReportCategory,
  StreetReport,
} from './types';

interface ReportProblemSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: [number, number] | null;
  onSubmit: (
    report: Omit<StreetReport, 'id' | 'createdAt' | 'upvotes' | 'status'>,
  ) => void;
  onCancelPlacement?: () => void;
}

export function ReportProblemSheet({
  isOpen,
  onOpenChange,
  coordinates,
  onSubmit,
  onCancelPlacement,
}: ReportProblemSheetProps) {
  const [category, setCategory] = React.useState<ReportCategory | null>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [neighborhood, setNeighborhood] = React.useState('');
  const [referencePoint, setReferencePoint] = React.useState('');
  const [images, setImages] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [updatedAt] = React.useState(() => new Date());
  const [sheetWidth, setSheetWidth] = React.useState(736);
  const resizeStartRef = React.useRef<{ x: number; width: number } | null>(null);
  const completedRequiredFields = [
    Boolean(category),
    Boolean(title.trim()),
    Boolean(description.trim()),
  ].filter(Boolean).length;
  const requiredProgress = completedRequiredFields * (100 / 3);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(max-width: 639px)').matches) return;
    resizeStartRef.current = { x: event.clientX, width: sheetWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return;
    const nextWidth = resizeStartRef.current.width - (event.clientX - resizeStartRef.current.x);
    setSheetWidth(Math.min(960, Math.max(560, nextWidth)));
  };

  const handleResizeEnd = () => {
    resizeStartRef.current = null;
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      const newUrls = files.map((file) => URL.createObjectURL(file));
      setImages((prev) => [...prev, ...newUrls]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        coordinates,
        address:
          address.trim() ||
          `Local próximo a (${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)})`,
        neighborhood: neighborhood.trim() || undefined,
        referencePoint: referencePoint.trim() || undefined,
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
      setAddress('');
      setNeighborhood('');
      setReferencePoint('');
      setImages([]);
      onOpenChange(false);
    }, 450);
  };

  const handleClose = () => {
    onOpenChange(false);
    onCancelPlacement?.();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        showCloseButton={false}
        style={{ width: `min(${sheetWidth}px, 100vw)` }}
        className='!max-w-none overflow-y-auto border-l border-border bg-background p-0 text-foreground shadow-2xl max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:!w-full max-sm:!max-w-none max-sm:translate-x-0 max-sm:border-0'
      >
        <div
          role='separator'
          aria-label='Ajustar largura do formulário'
          aria-orientation='vertical'
          onPointerDown={handleResizeStart}
          onPointerMove={handleResize}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          className='absolute inset-y-0 left-0 z-40 hidden w-2 -translate-x-1/2 cursor-col-resize sm:block'
        >
          <span className='absolute inset-y-1/2 left-1/2 h-10 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-border opacity-0 transition-opacity hover:opacity-100' />
        </div>
        <form onSubmit={handleSubmit} className='flex flex-col min-h-full'>
          {/* Sticky Header */}
          <div className='sticky top-0 z-20 flex items-center gap-3 bg-background/95 px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pr-16 backdrop-blur-md sm:px-6 sm:py-4 sm:pr-16 lg:px-8 lg:pr-16'>
            <div className='flex min-w-0 items-center gap-3'>
              <span className='flex size-9 items-center justify-center bg-primary text-primary-foreground shrink-0'>
                <CircleAlert className='size-5' aria-hidden='true' />
              </span>
              <div className='min-w-0'>
                <SheetTitle className='truncate text-lg font-bold leading-[1.1] tracking-tight text-foreground text-balance sm:text-xl'>
                  Reportar problema
                </SheetTitle>
                <SheetDescription className='mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground text-pretty'>
                  Adicione os detalhes para registrar este problema no mapa.
                </SheetDescription>
                <p className='mt-2 text-[11px] leading-tight tracking-[0.02em] text-muted-foreground/70'>
                  Atualizado em{' '}
                  {updatedAt.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <SheetClose
              onClick={onCancelPlacement}
              render={
                <button
                  type='button'
                  className='absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:right-5 sm:top-1/2 sm:-translate-y-1/2'
                  aria-label='Fechar formulário de reporte'
                />
              }
            >
              <X className='size-4' aria-hidden='true' />
            </SheetClose>
          </div>

          {/* Form Content Body with Responsive Padding */}
          <div className='mx-auto flex w-full max-w-2xl flex-1 flex-col gap-7 px-5 py-6 pb-36 sm:px-6 sm:py-5 lg:px-8'>
            {errorMessage && (
              <div aria-live='polite' className='flex items-center gap-2.5 border-l-2 border-destructive bg-destructive/10 p-3.5 text-xs text-destructive'>
                <CircleAlert className='size-4 shrink-0' aria-hidden='true' />
                <span className='font-medium'>{errorMessage}</span>
              </div>
            )}

            {/* Multiple Photos Upload Section */}
            <div className='order-0 flex flex-col gap-3 pb-7'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Camera className='size-4 text-primary' />
                  <Label className='text-xs font-semibold leading-tight tracking-[0.02em] text-foreground'>
                    Fotos da ocorrência ({images.length}{' '}
                    {images.length === 1 ? 'foto' : 'fotos'})
                  </Label>
                </div>
                {images.length > 0 && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => setImages([])}
                    className='h-11 touch-manipulation px-2 text-[11px] text-destructive transition-colors duration-150 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive active:!scale-100 active:!translate-y-0 sm:h-6'
                  >
                    Remover todas as fotos
                  </Button>
                )}
              </div>

              {/* Upload Dropzone */}
              <AnimatedFileUpload
                accept='image/*'
                multiple={true}
                onFilesSelected={handleFilesSelected}
                className='border-dashed bg-background/50 hover:bg-muted/40 focus-within:border-primary transition-colors duration-150'
              />

              {/* Uploaded Photos Gallery Grid */}
              {images.length > 0 && (
                <div className='flex flex-col gap-2 pt-1'>
                  <span className='text-xs font-medium leading-tight tracking-[0.02em] text-foreground'>
                    Fotos adicionadas
                  </span>
                  <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3'>
                    {images.map((imgUrl, index) => (
                      <div
                        key={index}
                        className='relative group overflow-hidden border border-border bg-muted aspect-video transition-[border-color,box-shadow] duration-150 hover:border-foreground/30 hover:shadow-sm'
                      >
                        <img
                          src={imgUrl}
                          alt={`Foto da ocorrência ${index + 1}`}
                          draggable={false}
                          className='w-full h-full select-none object-cover'
                        />
                        <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-100 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 motion-reduce:transition-none'>
                          <button
                            type='button'
                            onClick={() => handleRemoveImage(index)}
                            className='flex size-11 touch-manipulation items-center justify-center bg-destructive text-destructive-foreground focus-visible:ring-2 focus-visible:ring-destructive sm:size-7'
                            title='Remover foto'
                          >
                            <X className='size-4' />
                          </button>
                        </div>
                        <span className='absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-mono tabular-nums text-white backdrop-blur-xs'>
                          #{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Title */}
            <div className='order-1'>
              <div className='flex items-center justify-between gap-3'>
                <Label
                  htmlFor='report-title'
                  className='text-xs font-semibold leading-tight tracking-[0.02em] text-foreground'
                >
                  Título do problema
                </Label>
                <span className='shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground'>
                  {title.length}/70
                </span>
              </div>
              <Input
                id='report-title'
                maxLength={70}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder='Ex: Buraco profundo na pista esquerda em frente ao comércio'
                className='mt-1.5 h-11 text-base sm:h-8 sm:text-xs'
                required
              />
            </div>

            {/* Location Section */}
            <section
              aria-labelledby='report-location-heading'
              className='order-3 flex flex-col gap-3 pb-7'
            >
              <Label
                id='report-location-heading'
                className='text-xs font-semibold leading-tight tracking-[0.02em] text-foreground'
              >
                Onde aconteceu
              </Label>

              <div className='flex flex-col gap-3'>
                <div>
                  <Label
                    htmlFor='report-address'
                    className='text-xs font-medium text-muted-foreground'
                  >
                    Rua ou avenida
                  </Label>
                  <Input
                    id='report-address'
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder='Ex: Av. FAB, esquina com Rua General Rondon'
                    className='mt-1.5 h-11 text-base sm:h-8 sm:text-xs'
                    required
                  />
                </div>

                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <div>
                    <Label
                      htmlFor='report-neighborhood'
                      className='text-xs font-medium text-muted-foreground'
                    >
                      Bairro
                    </Label>
                    <Input
                      id='report-neighborhood'
                      value={neighborhood}
                      onChange={(event) => setNeighborhood(event.target.value)}
                      placeholder='Ex: Centro / Trem / Beirol'
                      className='mt-1.5 h-11 text-base sm:h-8 sm:text-xs'
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor='report-reference-point'
                      className='text-xs font-medium text-muted-foreground'
                    >
                      Ponto de referência
                    </Label>
                    <Input
                      id='report-reference-point'
                      value={referencePoint}
                      onChange={(event) => setReferencePoint(event.target.value)}
                      placeholder='Ex: Em frente à farmácia / praça'
                      className='mt-1.5 h-11 text-base sm:h-8 sm:text-xs'
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Category Selection */}
            <div className='order-4 flex flex-col gap-2.5 pb-7'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold leading-tight tracking-[0.02em] text-foreground'>
                    Tipo de problema
                  </Label>
                  <span className='text-xs leading-relaxed text-muted-foreground'>
                    Escolha uma categoria
                  </span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  {(Object.keys(CATEGORIES) as ReportCategory[]).map(
                    (catKey) => {
                      const cat = CATEGORIES[catKey];
                      const isSelected = category === catKey;

                      return (
                        <button
                          key={catKey}
                          type='button'
                          onClick={() => setCategory(catKey)}
                          className={cn(
                            'relative flex min-h-11 touch-manipulation items-start gap-2.5 rounded-md border p-3 pr-10 text-left transition-[background-color,border-color,box-shadow] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-xs ring-1.5 ring-primary'
                              : 'border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/30 focus-visible:bg-muted/50',
                          )}
                        >
                          <span
                            className={cn(
                              'p-2 rounded-md shrink-0 mt-0.5 bg-muted text-muted-foreground',
                            )}
                          >
                            <CategoryIcon
                              category={catKey}
                              className='size-4'
                            />
                          </span>
                          <div className='flex flex-col min-w-0 flex-1'>
                            <span className='text-xs font-semibold leading-tight text-foreground'>
                              {cat.label}
                            </span>
                            <span className='mt-1 text-xs leading-relaxed text-muted-foreground text-pretty'>
                              {cat.description}
                            </span>
                          </div>
                          <span
                            aria-hidden={!isSelected}
                            className={cn(
                              'absolute right-3 top-3 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity duration-150',
                              isSelected ? 'opacity-100' : 'pointer-events-none opacity-0',
                            )}
                          >
                              <Check className='size-2.5 stroke-3' />
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className='order-2'>
                <div className='flex items-center justify-between gap-3'>
                  <Label
                    htmlFor='report-description'
                    className='text-xs font-semibold leading-tight tracking-[0.02em] text-foreground'
                  >
                    Descreva o problema
                  </Label>
                  <span className='shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground'>
                    {description.length}/400
                  </span>
                </div>
                <Textarea
                  id='report-description'
                  maxLength={400}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Explique o que aconteceu, onde afeta a via e há quanto tempo o problema existe.'
                  className='mt-1.5 min-h-28 resize-y rounded-none border-border bg-background text-base leading-relaxed sm:text-xs'
                  required
                />
              </div>

            <div className='order-5 flex items-center justify-between pb-7 text-xs'>
              <span className='text-xs leading-tight text-muted-foreground'>Você está reportando como</span>
              <span className='text-xs font-medium leading-tight text-foreground'>Usuário atual · cidadão</span>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className='sticky bottom-0 z-30 flex flex-col gap-3 bg-background/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-lg backdrop-blur-md sm:px-6 sm:py-4 lg:px-8'>
            <div className='flex items-center gap-3'>
              <AnimatedProgressBar value={requiredProgress} className='flex-1' />
              <span className='shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground'>
                {completedRequiredFields}/3
              </span>
            </div>
            <div className='flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <p className='hidden text-[11px] text-muted-foreground sm:block'>
                Campos com * são obrigatórios
              </p>
              <div className='flex w-full gap-2 sm:w-auto'>
                <Button
                  type='button'
                  variant='outline'
                  size='default'
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className='h-11 flex-1 touch-manipulation cursor-pointer text-xs transition-colors duration-150 active:!scale-100 active:!translate-y-0 sm:h-8 sm:flex-none'
                >
                  Cancelar
                </Button>

                <Button
                  type='submit'
                  size='default'
                  disabled={isSubmitting || !coordinates}
                  className='h-11 min-w-0 flex-1 touch-manipulation cursor-pointer gap-2 px-3 text-xs font-semibold shadow-sm transition-colors duration-150 active:!scale-100 active:!translate-y-0 sm:h-8 sm:min-w-[9.5rem] sm:flex-none'
                >
                  {isSubmitting ? (
                    <>
                      <span className='size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent' />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Send className='size-4' />
                      Publicar problema{' '}
                      {images.length > 0 && `(${images.length} fotos)`}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
