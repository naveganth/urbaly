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
  /** Shows the spinner inside the search field (e.g. details panel preloading). */
  isLoading?: boolean;
  className?: string;
}

/**
 * Google Maps-style search + category filter in a single card.
 *
 * Search field plus one filter button that opens the category list.
 * The list is driven by CATEGORY_ORDER, so new categories need no UI change.
 */
export function SearchFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
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
          className="h-10 rounded-full border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        {!isLoading && searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpar busca"
            className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

      {/* Category filter */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={
            hasActiveCategory ? `Filtro: ${activeInfo?.label}. Abrir categorias` : 'Filtrar por categoria'
          }
          className={cn(
            'relative flex size-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted',
            hasActiveCategory ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
          )}
        >
          {hasActiveCategory && activeInfo ? (
            <span className={cn('rounded-md p-1', activeInfo.bgLight, activeInfo.color)}>
              <CategoryIcon category={selectedCategory as ReportCategory} className="size-4" />
            </span>
          ) : (
            <SlidersHorizontal className="size-4" />
          )}
          {hasActiveCategory ? (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
            />
          ) : null}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="max-h-[72vh] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-lg p-1 text-xs shadow-xl"
        >
          <DropdownMenuLabel className="px-2 pt-1 text-[11px] font-semibold tracking-wide uppercase">
            Categorias
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onCategoryChange('all')}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <LayoutGrid className="size-3" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">Todas</span>
            {!hasActiveCategory ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
          </DropdownMenuItem>

          {CATEGORY_ORDER.map((catKey) => {
            const info = CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            return (
              <DropdownMenuItem
                key={catKey}
                onClick={() => onCategoryChange(isSelected ? 'all' : catKey)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2"
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
                <span className="min-w-0 flex-1 truncate font-medium">{info.label}</span>
                {isSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
