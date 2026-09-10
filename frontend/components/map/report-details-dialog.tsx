'use client';

import * as React from 'react';
import {
  MapPin,
  Calendar,
  ThumbsUp,
  Share2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Star,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { CategoryIcon } from './category-icon';
import { CATEGORIES, StreetReport, ReportStatus, ReportUrgency } from './types';

interface ReportDetailsDialogProps {
  report: StreetReport | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpvote: (reportId: string) => void;
}

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

const URGENCY_LABELS: Record<ReportUrgency, { text: string; badge: string }> = {
  low: { text: 'Urgência Baixa', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  medium: { text: 'Urgência Média', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  high: { text: 'Urgência Alta', badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  critical: { text: 'Urgência Crítica', badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
};

export function ReportDetailsDialog({
  report,
  isOpen,
  onOpenChange,
  onUpvote,
}: ReportDetailsDialogProps) {
  const [hasUpvoted, setHasUpvoted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);

  // Reset photo index and upvote tracking when report changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    setHasUpvoted(false);
    setActivePhotoIndex(0);
  }, [report?.id]);

  if (!report) return null;

  const allImages = report.images && report.images.length > 0
    ? report.images
    : report.imageUrl
      ? [report.imageUrl]
      : [];

  const categoryInfo = CATEGORIES[report.category] || CATEGORIES.other;
  const statusInfo = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
  const urgencyInfo = URGENCY_LABELS[report.urgency] || URGENCY_LABELS.medium;
  const StatusIcon = statusInfo.icon;

  const handleUpvote = () => {
    if (!hasUpvoted) {
      setHasUpvoted(true);
      onUpvote(report.id);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `Problema reportado no Urbaly: "${report.title}" em ${report.address}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const formattedDate = new Date(report.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl p-0 overflow-hidden border border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
        {/* Top Image Gallery Carousel */}
        {allImages.length > 0 && (
          <div className="relative w-full h-56 bg-black/40 overflow-hidden group">
            <img
              src={allImages[activePhotoIndex]}
              alt={`${report.title} - Foto ${activePhotoIndex + 1}`}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-black/30" />

            {/* Badges on top */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs font-semibold backdrop-blur-md', urgencyInfo.badge)}>
                {urgencyInfo.text}
              </Badge>
              {allImages.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-mono backdrop-blur-md">
                  {activePhotoIndex + 1} de {allImages.length} fotos
                </span>
              )}
            </div>

            {/* Carousel navigation buttons */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/75 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/75 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="size-4" />
                </button>

                {/* Thumbnails row */}
                <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 px-4">
                  {allImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={cn(
                        'h-1.5 rounded-full transition-all cursor-pointer',
                        activePhotoIndex === idx ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Category Pill */}
              <div className="flex items-center gap-1.5">
                <span className={cn('p-1 rounded-md', categoryInfo.bgLight, categoryInfo.color)}>
                  <CategoryIcon category={report.category} className="size-3.5" />
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {categoryInfo.label}
                </span>
              </div>

              {/* Status Badge */}
              <Badge variant="outline" className={cn('text-xs font-medium gap-1', statusInfo.bg, statusInfo.color)}>
                <StatusIcon className="size-3" />
                {statusInfo.label}
              </Badge>
            </div>

            <DialogTitle className="text-lg font-bold text-foreground tracking-tight leading-snug">
              {report.title}
            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="size-3.5" />
              Relatado em {formattedDate}
            </DialogDescription>
          </DialogHeader>

          {/* Severity Star Display */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Gravidade Avaliada:</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'size-4',
                      i < report.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
            </div>

            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-background border border-border text-foreground">
              {report.rating} / 5
            </span>
          </div>

          {/* Description Text */}
          <div className="text-xs/relaxed text-muted-foreground bg-muted/20 p-3.5 rounded-xl border border-border">
            <p className="whitespace-pre-line text-foreground/90">{report.description}</p>
          </div>

          {/* Location Info */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-start gap-2 text-foreground font-medium">
              <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span>{report.address}</span>
                {report.neighborhood && (
                  <span className="text-muted-foreground ml-1">({report.neighborhood})</span>
                )}
                {report.referencePoint && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ref: {report.referencePoint}
                  </p>
                )}
              </div>
            </div>

            <div className="font-mono text-[11px] text-muted-foreground pl-6">
              Coord: {report.coordinates[1].toFixed(5)}, {report.coordinates[0].toFixed(5)}
            </div>
          </div>

          {/* Reporter & Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3.5" />
              <span>Por {report.reportedBy || 'Cidadão'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 text-xs h-8"
              >
                <Share2 className="size-3.5" />
                {copied ? 'Copiado!' : 'Compartilhar'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleUpvote}
                disabled={hasUpvoted}
                className={cn(
                  'gap-1.5 text-xs h-8',
                  hasUpvoted ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''
                )}
              >
                <ThumbsUp className={cn('size-3.5', hasUpvoted ? 'fill-current' : '')} />
                <span>{hasUpvoted ? 'Apoiado' : 'Apoiar'} ({report.upvotes})</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
