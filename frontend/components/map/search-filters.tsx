'use client';

import * as React from 'react';
import { Check, LayoutGrid, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/shadcn/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { CATEGORIES, CATEGORY_ORDER, type ReportCategory } from './types';
import { CategoryIcon } from './category-icon';

export type CategoryFilter = ReportCategory | 'all';

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  /** Occurrence count per category — shown on the right of each row. */
  categoryCounts?: Record<ReportCategory, number>;
  /** Shows the spinner inside the search field (e.g. details panel preloading). */
  isLoading?: boolean;
  className?: string;
}

/**
 * Search + category dropdown in a single floating card.
 *
 * One filter button opens a clean category list with refined type scale:
 * small-caps section label, 13px medium item labels, tinted icon tiles.
 * The list is driven by CATEGORY_ORDER, so new categories need no UI change.
 */
export function SearchFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categoryCounts,
  isLoading = false,
  className,
}: SearchFiltersProps) {
  const hasActiveCategory = selectedCategory !== 'all';
  const activeInfo = hasActiveCategory ? CATEGORIES[selectedCategory] : null;

  return (
    <div
      role="search"
      className={cn(
        'flex items-center gap-1 rounded-full border border-border/70 bg-background/95 py-1 pl-1 pr-2 shadow-lg backdrop-blur-md dark:bg-zinc-900/95',
        className
      )}
    >
      {/* Search field */}
      <div className="relative min-w-0 flex-1">
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isLoading ? 'Carregando ocorrência…' : 'Buscar no mapa...'}
          aria-busy={isLoading}
          aria-label="Buscar ocorrências"
          className="h-11 rounded-full border-0 bg-transparent pl-9 text-sm tracking-[-0.01em] shadow-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        {!isLoading && searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpar busca"
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground before:absolute before:-inset-2 before:content-['']"
          >
            <X className="size-4" />
          </button>
        ) : null}
        {isLoading ? (
          <span role="status" aria-live="polite" className="sr-only">
            Carregando ocorrência
          </span>
        ) : null}
      </div>

      {/* Unified category filter button */}
      <span aria-hidden className="h-6 w-px shrink-0 bg-border/70" />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={
            hasActiveCategory && activeInfo
              ? `Filtro ativo: ${activeInfo.label}`
              : 'Filtrar por categoria'
          }
          className={cn(
            'relative inline-flex h-11 shrink-0 cursor-pointer touch-manipulation items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium outline-none transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted',
            hasActiveCategory
              ? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
              : 'text-muted-foreground'
          )}
        >
          <SlidersHorizontal className="size-4 shrink-0" />
          <span className="hidden sm:inline">Filtrar</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="max-h-[72vh] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border-border/70 p-1.5 shadow-xl"
        >
          <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Categorias
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-1 mb-1" />

          <DropdownMenuItem
            onClick={() => onCategoryChange('all')}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-150',
              !hasActiveCategory && 'bg-accent/60'
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <LayoutGrid className="size-3" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em]" title="Todas">
              Todas
            </span>
            {categoryCounts ? (
              <span className="font-sans text-[11px] tabular-nums text-muted-foreground">
                {new Intl.NumberFormat('pt-BR').format(Object.values(categoryCounts).reduce((sum, n) => sum + n, 0))}
              </span>
            ) : null}
            {!hasActiveCategory ? <Check className="size-4 shrink-0 text-primary" /> : null}
          </DropdownMenuItem>

          {CATEGORY_ORDER.map((catKey) => {
            const info = CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            return (
              <DropdownMenuItem
                key={catKey}
                onClick={() => onCategoryChange(isSelected ? 'all' : catKey)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-150',
                  isSelected && 'bg-accent/60'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md',
                    info.bgLight,
                    info.color
                  )}
                >
                  <CategoryIcon category={catKey} className="size-3" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em]" title={info.label}>
                  {info.label}
                </span>
                {categoryCounts ? (
                  <span className="font-sans text-[11px] tabular-nums text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR').format(categoryCounts[catKey] ?? 0)}
                  </span>
                ) : null}
                {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
