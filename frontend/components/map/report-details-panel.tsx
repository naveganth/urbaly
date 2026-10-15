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
import { isDeveloperUser } from '@/lib/auth';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button, buttonVariants } from '@/components/ui/shadcn/button';
import { Separator } from '@/components/ui/shadcn/separator';
import { SPRING_DEFAULT } from '@/components/ui/smoothui/animation';
import { CategoryIcon } from './category-icon';
import { usePublicUser } from './use-public-user';
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
  'absolute z-10 inset-x-0 bottom-0 max-h-[72dvh] md:inset-x-auto md:left-4 md:top-[136px] md:bottom-6 md:w-[400px] md:max-h-none';

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
        'flex flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-card font-sans text-card-foreground md:rounded-2xl md:border-b'
      )}
    >
      {/* Mobile grabber — desktop floats, no handle needed */}
      <div aria-hidden className="flex shrink-0 justify-center pb-1 pt-2 md:hidden">
        <span className="h-1 w-10 rounded-full bg-border" />
      </div>
      {children}
    </motion.section>
  );
}

interface ReportDetailsPanelProps {
  report: StreetReport;
  images: string[];
  onClose: () => void;
  onUpvote: (reportId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: number;
  total?: number;
}

/** Seção do autor com dados públicos (`GET /v1/auth/usuario`). */
function ReportAuthor({ report }: { report: StreetReport }) {
  const author = usePublicUser(report.authorId);

  if (author.status === 'loading') {
    return (
      <div className="flex items-center gap-3" aria-label="Carregando autor">
        <div aria-hidden className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
        <div aria-hidden className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (author.status === 'loaded') {
    const name =
      (typeof author.user.nome === 'string' && author.user.nome.trim()) ||
      (typeof author.user.name === 'string' && author.user.name.trim()) ||
      report.reportedBy ||
      'Cidadão';
    const picture =
      (typeof author.user.picture === 'string' && author.user.picture.trim()) ||
      (typeof author.user.foto === 'string' && author.user.foto.trim()) ||
      undefined;
    const isDev = isDeveloperUser(author.user.id);
    const title = isDev ? 'Desenvolvedor' : report.reporterTitle || 'Cidadão';
    return (
      <div className="flex items-center gap-3">
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={picture}
            alt={`Foto de ${name}`}
            className={cn(
              'size-10 shrink-0 rounded-full border object-cover',
              isDev && 'border-primary shadow-[0_0_0_2px_var(--primary)]'
            )}
            loading="lazy"
          />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
            <User className="size-5 text-muted-foreground" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'truncate text-sm font-semibold text-foreground',
                isDev && 'dev-name-effect font-bold'
              )}
            >
              {name}
            </span>
            {isDev && (
              <span className="shrink-0 rounded-full bg-gradient-to-r from-primary to-amber-500 px-1.5 py-px text-[10px] font-bold tracking-wide text-white">
                DEV
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
        <User className="size-5 text-muted-foreground" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-foreground">
          {report.reportedBy || 'Cidadão'}
        </span>
        {report.reporterTitle && (
          <span className="truncate text-xs text-muted-foreground">{report.reporterTitle}</span>
        )}
      </div>
    </div>
  );
}

export function ReportDetailsPanel({ report, images, onClose, onUpvote, onPrev, onNext, position, total }: ReportDetailsPanelProps) {
  const [hasUpvoted, setHasUpvoted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // State resets via parent `key={report.id}` remount — no reset effect needed.

  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      previouslyFocused?.focus?.({ preventScroll: true });
    };
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
  const coordFormat = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
  const formattedCoords = `${coordFormat.format(report.coordinates[1])}, ${coordFormat.format(report.coordinates[0])}`;
  const upvoteFormat = new Intl.NumberFormat('pt-BR');
  const showAdjacentNav = (onPrev ?? onNext) != null;

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
        className="absolute top-3 right-3 z-20 size-11 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 hover:text-white"
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
                className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                aria-label="Próxima foto"
                className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1 px-4">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    aria-label={`Ver foto ${idx + 1}`}
                    aria-current={activePhotoIndex === idx}
                    className="flex h-11 w-7 cursor-pointer touch-manipulation items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-1.5 rounded-full transition-[width,background-color] duration-200',
                        activePhotoIndex === idx ? 'w-5 bg-white' : 'w-2 bg-white/40'
                      )}
                    />
                  </button>
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
            <span className="truncate text-xs font-semibold text-foreground" title={categoryInfo.label}>{categoryInfo.label}</span>
          </div>
          <Badge variant="outline" className={cn('shrink-0 gap-1 text-[11px] font-medium', statusInfo.bg, statusInfo.color)}>
            <StatusIcon className="size-3" />
            {statusInfo.label}
          </Badge>
        </div>

        <h2 className="mt-2 font-heading text-base font-bold leading-snug tracking-tight text-foreground md:text-lg">
          {report.title}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground md:text-xs">
          <Calendar className="size-3.5 shrink-0" />
          Relatado em {formattedDate}
        </p>

        {/* Maps-like actions — primary route pill + outline pills */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: 'sm' }), 'h-10 gap-1.5 rounded-full text-xs font-semibold')}
          >
            <Navigation className="size-3.5" />
            Rotas
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleUpvote}
            disabled={hasUpvoted}
            className={cn('h-10 gap-1.5 rounded-full text-xs', hasUpvoted && 'border-primary/40 bg-primary/10 text-primary')}
          >
            <ThumbsUp className={cn('size-3.5', hasUpvoted && 'fill-current')} />
            {hasUpvoted ? 'Apoiado' : 'Apoiar'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleShare} aria-label="Compartilhar ocorrência" className="h-10 gap-1.5 truncate rounded-full text-xs">
            <Share2 className="size-3.5 shrink-0" />
            {copied ? 'Copiado!' : 'Partilhar'}
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ThumbsUp className="size-3.5" />
          <span>
            <span className="font-mono font-semibold tabular-nums text-foreground">{upvoteFormat.format(report.upvotes)}</span>{' '}
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
              aria-label={`Copiar coordenadas ${formattedCoords}`}
            >
              <Copy className="size-3" />
              {formattedCoords}
            </button>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="pb-1">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Reportado por
          </p>
          <ReportAuthor report={report} />
        </div>

        {showAdjacentNav && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center justify-between gap-2 pb-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPrev}
                disabled={!onPrev}
                aria-label="Ocorrência anterior"
                className="h-9 gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              {position != null && total != null && (
                <span
                  role="status"
                  className="font-mono text-[11px] tabular-nums text-muted-foreground"
                >
                  {upvoteFormat.format(position)} de {upvoteFormat.format(total)}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={!onNext}
                aria-label="Próxima ocorrência"
                className="h-9 gap-1 text-xs"
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </PanelShell>
  );
}
