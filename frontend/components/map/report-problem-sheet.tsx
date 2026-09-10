'use client';

import * as React from 'react';
import {
  MapPin,
  Camera,
  X,
  Sparkles,
  Send,
  User,
  ShieldCheck,
  AlertCircle,
  Clock,
  Compass,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Label } from '@/components/ui/shadcn/label';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import AnimatedFileUpload from '@/components/ui/smoothui/animated-file-upload';
import { RatingInput } from './rating-input';
import { CategoryIcon } from './category-icon';
import { CATEGORIES, ReportCategory, ReportUrgency, StreetReport } from './types';

interface ReportProblemSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: [number, number] | null;
  onSubmit: (report: Omit<StreetReport, 'id' | 'createdAt' | 'upvotes' | 'status'>) => void;
  onCancelPlacement?: () => void;
}

const URGENCY_OPTIONS: { id: ReportUrgency; label: string; color: string; desc: string }[] = [
  { id: 'low', label: 'Baixa', color: 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10', desc: 'Não afeta o tráfego' },
  { id: 'medium', label: 'Média', color: 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10', desc: 'Requer atenção' },
  { id: 'high', label: 'Alta', color: 'border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10', desc: 'Tráfego prejudicado' },
  { id: 'critical', label: 'Crítica', color: 'border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10', desc: 'Risco iminente' },
];

const SAMPLE_PRESET_IMAGES = [
  { label: '+ Buraco no Asfalto', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80' },
  { label: '+ Poste Apagado', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80' },
  { label: '+ Lixo Acumulado', url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80' },
  { label: '+ Alagamento', url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80' },
  { label: '+ Sinalização Danificada', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80' },
];

export function ReportProblemSheet({
  isOpen,
  onOpenChange,
  coordinates,
  onSubmit,
  onCancelPlacement,
}: ReportProblemSheetProps) {
  const [category, setCategory] = React.useState<ReportCategory>('pothole');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [neighborhood, setNeighborhood] = React.useState('');
  const [referencePoint, setReferencePoint] = React.useState('');
  const [urgency, setUrgency] = React.useState<ReportUrgency>('medium');
  const [rating, setRating] = React.useState(3);
  const [images, setImages] = React.useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [reporterName, setReporterName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // When coordinates change, prefill address coordinates
  React.useEffect(() => {
    if (coordinates) {
      const [lng, lat] = coordinates;
      setAddress((prev) => prev || `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, [coordinates]);

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      const newUrls = files.map((file) => URL.createObjectURL(file));
      setImages((prev) => [...prev, ...newUrls]);
    }
  };

  const handleAddPresetImage = (url: string) => {
    setImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinates) {
      setErrorMessage('Por favor, clique em um ponto no mapa para definir o local do problema.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Por favor, dê um título breve para a ocorrência.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Por favor, forneça uma descrição detalhada do problema.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        urgency,
        rating,
        coordinates,
        address: address.trim() || `Local próximo a (${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)})`,
        neighborhood: neighborhood.trim() || undefined,
        referencePoint: referencePoint.trim() || undefined,
        images,
        imageUrl: images[0] || undefined,
        reportedBy: isAnonymous ? 'Anônimo' : reporterName.trim() || 'Cidadão',
        isAnonymous,
      });

      // Reset form
      setIsSubmitting(false);
      setTitle('');
      setDescription('');
      setAddress('');
      setNeighborhood('');
      setReferencePoint('');
      setImages([]);
      setRating(3);
      setUrgency('medium');
      onOpenChange(false);
    }, 450);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onCancelPlacement) onCancelPlacement();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-2xl overflow-y-auto p-0 border-l border-border bg-background text-foreground shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 shrink-0">
                <AlertCircle className="size-5" />
              </span>
              <div>
                <SheetTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Reportar Problema na Rua
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Preencha as informações para registrar a ocorrência no mapa urbano.
                </SheetDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground rounded-full size-8 shrink-0"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Form Content Body with Responsive Padding */}
          <div className="px-5 sm:px-6 py-5 flex-1 flex flex-col gap-6 pb-24">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="size-4 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Location & Coordinates Card */}
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <MapPin className="size-4 text-primary" />
                  <span>Localização Selecionada no Mapa</span>
                </div>
                {coordinates ? (
                  <Badge variant="outline" className="font-mono text-xs bg-muted text-foreground border-border">
                    {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Nenhum ponto fixado
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="address" className="text-xs font-medium text-foreground">
                    Rua / Avenida *
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Av. FAB, esquina com Rua General Rondon"
                    className="mt-1 h-9 text-xs bg-background"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="neighborhood" className="text-xs font-medium text-foreground">
                      Bairro
                    </Label>
                    <Input
                      id="neighborhood"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Centro / Trem / Beirol"
                      className="mt-1 h-9 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reference" className="text-xs font-medium text-foreground">
                      Ponto de Referência
                    </Label>
                    <Input
                      id="reference"
                      value={referencePoint}
                      onChange={(e) => setReferencePoint(e.target.value)}
                      placeholder="Ex: Em frente à farmácia / praça"
                      className="mt-1 h-9 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Selection: Fully readable, NO truncation */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Categoria do Problema *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Selecione o tipo de ocorrência
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(CATEGORIES) as ReportCategory[]).map((catKey) => {
                  const cat = CATEGORIES[catKey];
                  const isSelected = category === catKey;

                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-150 relative cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs ring-1.5 ring-primary dark:bg-primary/20'
                          : 'border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/30'
                      )}
                    >
                      <span className={cn('p-2 rounded-lg shrink-0 mt-0.5', cat.bgLight, cat.color)}>
                        <CategoryIcon category={catKey} className="size-4" />
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-xs text-foreground leading-snug">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          {cat.description}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="size-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="report-title" className="text-xs font-semibold text-foreground">
                    Título da Ocorrência *
                  </Label>
                  <span className="text-[11px] text-muted-foreground">{title.length}/70</span>
                </div>
                <Input
                  id="report-title"
                  maxLength={70}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Buraco profundo na pista esquerda em frente ao comércio"
                  className="mt-1.5 text-xs h-9 bg-card"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="report-description" className="text-xs font-semibold text-foreground">
                    Descrição Detalhada *
                  </Label>
                  <span className="text-[11px] text-muted-foreground">{description.length}/400</span>
                </div>
                <Textarea
                  id="report-description"
                  maxLength={400}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o problema, impactos no trânsito, riscos percebidos, há quantos dias persiste..."
                  className="mt-1.5 text-xs bg-card resize-y"
                  required
                />
              </div>
            </div>

            {/* Severity Rating & Urgency */}
            <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Avaliação de Gravidade (1 a 5 estrelas)
                </Label>
                <div className="mt-2">
                  <RatingInput value={rating} onChange={setRating} />
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Label className="text-xs font-semibold text-foreground">
                  Nível de Urgência
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {URGENCY_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setUrgency(item.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all text-xs cursor-pointer',
                        urgency === item.id
                          ? item.color + ' font-bold ring-1.5 ring-current shadow-xs'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <span className="font-semibold text-xs">{item.label}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Multiple Photos Upload Section */}
            <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="size-4 text-primary" />
                  <Label className="text-xs font-semibold text-foreground">
                    Fotos da Ocorrência ({images.length} {images.length === 1 ? 'foto' : 'fotos'})
                  </Label>
                </div>
                {images.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setImages([])}
                    className="text-destructive text-[11px] h-6 px-2 hover:bg-destructive/10 cursor-pointer"
                  >
                    Remover todas
                  </Button>
                )}
              </div>

              {/* Upload Dropzone */}
              <AnimatedFileUpload
                accept="image/*"
                multiple={true}
                onFilesSelected={handleFilesSelected}
                className="border-dashed bg-background/50 hover:bg-muted/40 transition-colors"
              />

              {/* Uploaded Photos Gallery Grid */}
              {images.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-xs font-medium text-foreground">Fotos Anexadas:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {images.map((imgUrl, index) => (
                      <div
                        key={index}
                        className="relative group rounded-xl overflow-hidden border border-border bg-muted aspect-video shadow-xs"
                      >
                        <img
                          src={imgUrl}
                          alt={`Foto da ocorrência ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="size-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            title="Remover foto"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-mono text-white backdrop-blur-xs">
                          #{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset quick test photos */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" />
                  Fotos rápidas para teste:
                </span>
                {SAMPLE_PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleAddPresetImage(preset.url)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer font-medium"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reporter Identification */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">Identificação do Cidadão</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-4"
                  />
                  <span className="text-muted-foreground">Publicar de forma anônima</span>
                </label>
              </div>

              {!isAnonymous && (
                <div>
                  <Label htmlFor="reporter-name" className="text-xs text-muted-foreground">
                    Seu Nome Completo ou Apelido (opcional)
                  </Label>
                  <Input
                    id="reporter-name"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="mt-1 h-9 text-xs bg-background"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-md px-5 sm:px-6 py-4 border-t border-border flex items-center justify-between gap-3 shadow-lg">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="default"
              disabled={isSubmitting || !coordinates}
              className="gap-2 font-semibold px-5 shadow-sm text-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Publicar Ocorrência {images.length > 0 && `(${images.length} fotos)`}
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
