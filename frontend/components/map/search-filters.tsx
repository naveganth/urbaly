'use client';

import * as React from 'react';
import { Search, X, SlidersHorizontal, Check, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/shadcn/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/shadcn/dropdown-menu';
import {
  ReportCategory,
  CATEGORIES,
  CATEGORY_ORDER,
} from './types';
import { CategoryIcon } from './category-icon';

export interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: ReportCategory | 'all';
  onCategoryChange: (cat: ReportCategory | 'all') => void;
  reports: { category: ReportCategory }[];
  isDetailsLoading?: boolean;
}

export function SearchFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  reports,
  isDetailsLoading = false,
}: SearchFiltersProps) {
  const hasFilter = selectedCategory !== 'all';
  const activeCategory = hasFilter ? CATEGORIES[selectedCategory] : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar container */}
      <div
        role="search"
        className="flex items-center gap-1 rounded-2xl border border-border/70 bg-background/95 py-1.5 pl-2 pr-1.5 shadow-xl backdrop-blur-md dark:bg-zinc-900/95"
      >
        {/* Search input */}
        <div className="relative min-w-0 flex-1">
          {isDetailsLoading ? (
            <Loader2 className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isDetailsLoading ? 'Carregando ocorrência...' : 'Buscar por rua, bairro ou problema...'}
            aria-busy={isDetailsLoading}
            aria-label="Buscar ocorrências"
            className="h-10 rounded-xl border-0 bg-transparent pl-8 pr-8 text-sm shadow-none transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <AnimatePresence>
            {!isDetailsLoading && searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <span className="h-5 w-px shrink-0 bg-border/60" />

        {/* Unified Category Filter Button */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={hasFilter && activeCategory ? `Filtro ativo: ${activeCategory.label}` : 'Filtrar por categoria'}
            className={cn(
              'relative inline-flex h-10 shrink-0 cursor-pointer touch-manipulation items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              hasFilter
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {hasFilter && activeCategory ? (
              <>
                <CategoryIcon
                  category={selectedCategory}
                  className={cn('size-3.5 shrink-0', activeCategory.color)}
                />
                <span className="max-w-[90px] truncate font-semibold text-foreground sm:max-w-[130px]">
                  {activeCategory.label}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCategoryChange('all');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onCategoryChange('all');
                    }
                  }}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
                  aria-label="Remover filtro"
                >
                  <X className="size-3" />
                </span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="size-4 shrink-0" />
                <span className="hidden sm:inline">Categorias</span>
                <ChevronDown className="size-3 opacity-50" />
              </>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="max-h-[min(30rem,72vh)] w-60 overflow-y-auto p-1.5 text-xs"
          >
            {/* "Todas" option */}
            <DropdownMenuItem
              onClick={() => onCategoryChange('all')}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <SlidersHorizontal className="size-3" />
              </span>
              <span className="flex-1 font-medium">Todas as categorias</span>
              <span className="font-mono tabular-nums text-muted-foreground">({reports.length})</span>
              {selectedCategory === 'all' && (
                <Check className="size-3.5 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            {/* Per-category options */}
            {CATEGORY_ORDER.map((catKey) => {
              const cat = CATEGORIES[catKey];
              const count = reports.filter((r) => r.category === catKey).length;
              const isSelected = selectedCategory === catKey;
              return (
                <DropdownMenuItem
                  key={catKey}
                  onClick={() => onCategoryChange(catKey)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5"
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md',
                      cat.bgLight
                    )}
                  >
                    <CategoryIcon category={catKey} className={cn('size-3', cat.color)} />
                  </span>
                  <span className="flex-1 leading-snug">{cat.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">({count})</span>
                  {isSelected && (
                    <Check className="size-3.5 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}

            {/* Clear filter */}
            {hasFilter && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => onCategoryChange('all')}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <X className="size-3.5" />
                  Limpar filtro de categoria
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
