'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ImageIcon,
  MapPin,
  Navigation,
  Share2,
  ThumbsUp,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button, buttonVariants } from '@/components/ui/shadcn/button';
import { Separator } from '@/components/ui/shadcn/separator';
import { SPRING_DEFAULT } from '@/components/ui/smoothui/animation';
import { CategoryIcon } from './category-icon';
import { CATEGORIES, type ReportStatus, type StreetReport } from './types';

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  open: {
    label: 'Em Aberto',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/15 border-amber-500/30',
    icon: Clock,
  },
  investigating: {
    label: 'Em Análise',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/15 border-sky-500/30',
    icon: AlertTriangle,
  },
  resolved: {
    label: 'Resolvido',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    icon: CheckCircle2,
  },
};

const PANEL_POSITION =
  'absolute z-10 inset-x-3 bottom-14 max-h-[62dvh] md:inset-x-auto md:left-3 md:top-3 md:bottom-16 md:w-[400px] md:max-h-none';

function PanelShell({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      role="dialog"
      aria-modal="false"
      aria-label={label}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -28, y: 12 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20, y: 8 }}
      transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
      className={cn(
        PANEL_POSITION,
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl'
      )}
    >
      {children}
    </motion.section>
  );
}

interface ReportDetailsPanelProps {
  report: StreetReport;
  images: string[];
  onClose: () => void;
  onUpvote: (reportId: string) => void;
}

export function ReportDetailsPanel({ report, images, onClose, onUpvote }: ReportDetailsPanelProps) {
  const [hasUpvoted, setHasUpvoted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // State resets via parent `key={report.id}` remount — no reset effect needed.

  React.useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [report.id]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const categoryInfo = CATEGORIES[report.category] || CATEGORIES.other;
  const statusInfo = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
  const StatusIcon = statusInfo.icon;

  const formattedDate = new Date(report.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleUpvote = () => {
    if (!hasUpvoted) {
      setHasUpvoted(true);
      onUpvote(report.id);
    }
  };

  const handleShare = async () => {
    const text = `Problema reportado no Urbaly: "${report.title}" em ${report.address}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyCoords = async () => {
    try {
      await navigator.clipboard.writeText(`${report.coordinates[1]}, ${report.coordinates[0]}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const nextPhoto = () => {
    if (images.length > 0) setActivePhotoIndex((prev) => (prev + 1) % images.length);
  };

  const prevPhoto = () => {
    if (images.length > 0) setActivePhotoIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.coordinates[1]},${report.coordinates[0]}`;

  return (
    <PanelShell label={`Detalhes da ocorrência ${report.title}`}>
      {/* Close */}
      <Button
        ref={closeRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Fechar detalhes da ocorrência"
        className="absolute top-3 right-3 z-20 size-8 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 hover:text-white"
      >
        <X className="size-4" />
      </Button>

      {/* Hero gallery */}
      {images.length > 0 ? (
        <div className="group relative h-52 w-full shrink-0 overflow-hidden bg-muted md:h-56">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={`${report.id}-${activePhotoIndex}`}
              src={images[activePhotoIndex]}
              alt={`${report.title} - Foto ${activePhotoIndex + 1}`}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.03 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

          {images.length > 1 && (
            <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white backdrop-blur-md">
              {activePhotoIndex + 1} de {images.length}
            </span>
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                aria-label="Próxima foto"
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 px-4">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    aria-label={`Ver foto ${idx + 1}`}
                    className={cn(
                      'h-1.5 cursor-pointer rounded-full transition-all',
                      activePhotoIndex === idx ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex w-full shrink-0 items-center gap-3 border-b border-border/60 bg-muted/40 px-4 pt-10 pb-4">
          <span className={cn('rounded-xl p-2.5', categoryInfo.bgLight, categoryInfo.color)}>
            <CategoryIcon category={report.category} className="size-5" />
          </span>
          <div className="flex flex-col pr-10">
            <span className="text-xs font-semibold text-foreground">Registro sem fotos anexadas</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ImageIcon className="size-3" />
              Localização e detalhes confirmados pelo usuário
            </span>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn('rounded-md p-1', categoryInfo.bgLight, categoryInfo.color)}>
              <CategoryIcon category={report.category} className="size-3.5" />
            </span>
            <span className="truncate text-xs font-semibold text-foreground">{categoryInfo.label}</span>
          </div>
          <Badge variant="outline" className={cn('shrink-0 gap-1 text-[11px] font-medium', statusInfo.bg, statusInfo.color)}>
            <StatusIcon className="size-3" />
            {statusInfo.label}
          </Badge>
        </div>

        <h2 className="mt-2 text-base font-bold leading-snug tracking-tight text-foreground md:text-lg">
          {report.title}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground md:text-xs">
          <Calendar className="size-3.5 shrink-0" />
          Relatado em {formattedDate}
        </p>

        {/* Maps-like actions */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={handleUpvote}
            disabled={hasUpvoted}
            className={cn('h-9 gap-1.5 text-xs', hasUpvoted && 'bg-primary/15 text-primary hover:bg-primary/20')}
          >
            <ThumbsUp className={cn('size-3.5', hasUpvoted && 'fill-current')} />
            {hasUpvoted ? 'Apoiado' : 'Apoiar'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleShare} className="h-9 gap-1.5 text-xs">
            <Share2 className="size-3.5" />
            {copied ? 'Copiado!' : 'Compar.'}
          </Button>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-9 gap-1.5 text-xs')}
          >
            <Navigation className="size-3.5" />
            Rota
          </a>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ThumbsUp className="size-3.5" />
          <span>
            <span className="font-mono font-semibold tabular-nums text-foreground">{report.upvotes}</span>{' '}
            apoios da comunidade
          </span>
        </div>

        <Separator className="my-3" />

        <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">{report.description}</p>

        <Separator className="my-3" />

        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">{report.address}</p>
            {report.neighborhood && (
              <p className="text-[11px] text-muted-foreground">({report.neighborhood})</p>
            )}
            {report.referencePoint && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">Ref: {report.referencePoint}</p>
            )}
            <button
              type="button"
              onClick={handleCopyCoords}
              className="mt-1.5 flex cursor-pointer items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground"
              title="Copiar coordenadas"
            >
              <Copy className="size-3" />
              {report.coordinates[1].toFixed(5)}, {report.coordinates[0].toFixed(5)}
            </button>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center gap-1.5 pb-1 text-xs text-muted-foreground">
          <User className="size-3.5 shrink-0" />
          <span className="truncate">
            Por {report.reportedBy || 'Cidadão'}
            {report.reporterTitle ? ` · ${report.reporterTitle}` : ''}
          </span>
        </div>
      </div>
    </PanelShell>
  );
}
