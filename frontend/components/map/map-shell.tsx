'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Check,
  Home,
  Info,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  Menu,
  Moon,
  SlidersHorizontal,
  Sun,
  Trophy,
  User,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/lib/auth-context';
import { getAvatarUrl, getInitials } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shadcn/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/shadcn/sheet';
import { CATEGORIES, CATEGORY_ORDER, type ReportCategory } from './types';
import { CategoryIcon } from './category-icon';
import type { BasemapId, BasemapOption } from './google-maps-style';

export type MapNavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const MAP_NAV_ITEMS: MapNavItem[] = [
  { label: 'Início', href: '/', icon: Home },
  { label: 'Mapa', href: '/mapa', icon: MapIcon },
  { label: 'Classificação', href: '/classificacao', icon: Trophy },
  { label: 'Estatísticas', href: '/estatisticas', icon: BarChart3 },
  { label: 'Sobre', href: '/sobre', icon: Info },
];

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------------ */
/* Icon rail — desktop only, Navbar items as icons                     */
/* ------------------------------------------------------------------ */

export function MapIconRail({ className }: { className?: string }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border/70 bg-background py-3 md:flex',
        className
      )}
    >
      <Link
        href="/"
        aria-label="Urbaly — início"
        className="mb-2 flex size-11 items-center justify-center rounded-xl text-sm font-bold text-primary"
      >
        U
      </Link>

      {MAP_NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            aria-current={active ? 'page' : undefined}
            data-active={active}
            className={cn(
              'flex size-11 touch-manipulation flex-col items-center justify-center rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-5" />
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={resolvedTheme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Nav drawer — shared by mobile + desktop hamburger                   */
/* ------------------------------------------------------------------ */

export function MapNavDrawer({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
}) {
  const pathname = usePathname();
  const { status } = useAuth();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        aria-label="Abrir menu de navegação"
        className="flex size-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(true);
        }}
      >
        {trigger}
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(19rem,85vw)] p-0" showCloseButton={false}>
        <SheetHeader className="flex-row items-center justify-between border-b border-border/70 px-4 py-3">
          <SheetTitle className="text-base font-bold">Urbaly</SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar menu"
            className="flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>
        </SheetHeader>
        <nav aria-label="Menu" className="flex flex-col overflow-y-auto px-2 py-2">
          {MAP_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          {status !== 'authenticated' && (
            <Link
              href="/login"
              onClick={() => onOpenChange(false)}
              className="mt-1 flex min-h-12 items-center gap-3 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <User className="size-5 shrink-0" />
              Entrar
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Basemap style switcher — floating Layers button + style picker       */
/* ------------------------------------------------------------------ */

export function MapBasemapButton({
  options,
  value,
  onChange,
}: {
  options: BasemapOption[];
  value: BasemapId;
  onChange: (basemap: BasemapId) => void;
}) {
  const active = options.find((option) => option.id === value) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Estilo do mapa: ${active.label}. Trocar estilo do mapa`}
        title={`Estilo do mapa: ${active.label}`}
        className="flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground backdrop-blur-md transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted dark:bg-zinc-900/95"
      >
        <Layers className="size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-[min(17rem,calc(100vw-2rem))] rounded-xl border-border/70 p-1.5 shadow-md"
      >
        <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
          Estilo do mapa
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 mb-1" />

        {options.map((option) => {
          const isSelected = option.id === value;
          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => onChange(option.id)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-150',
                isSelected && 'bg-accent/60'
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[13px] font-medium tracking-[-0.01em]"
                  title={option.label}
                >
                  {option.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {option.hint}
                </span>
              </span>
              {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* Floating search card — menu + query + clear, Maps-style             */
/* ------------------------------------------------------------------ */

export function MapSearchCard({
  searchQuery,
  onSearchChange,
  isLoading,
  drawerOpen,
  onDrawerChange,
  rightSlot,
  className,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  drawerOpen: boolean;
  onDrawerChange: (open: boolean) => void;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      role="search"
      className={cn(
        'flex h-12 items-center gap-1 rounded-full border border-border/70 bg-background/95 py-1 pl-1 pr-1.5 backdrop-blur-md dark:bg-zinc-900/95',
        className
      )}
    >
      <span className="shrink-0 md:hidden">
        <MapNavDrawer
          open={drawerOpen}
          onOpenChange={onDrawerChange}
          trigger={drawerOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        />
      </span>
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isLoading ? 'Carregando…' : 'Buscar no mapa...'}
          aria-label="Buscar ocorrências"
          aria-busy={isLoading}
          className="h-10 w-full rounded-full bg-transparent pl-3 pr-8 font-sans text-sm tracking-[-0.01em] outline-none placeholder:text-muted-foreground"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
            aria-label="Limpar busca"
            className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      {rightSlot}
    </div>
  );
}

/* Small auth-aware button used inside the search card on desktop. */
export function MapAccountButton() {
  const router = useRouter();
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <div aria-hidden className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />;
  }

  if (status !== 'authenticated') {
    return (
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="h-10 shrink-0 cursor-pointer touch-manipulation rounded-full border border-transparent bg-primary px-4 font-sans text-xs font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Entrar
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/perfil')}
      aria-label="Abrir meu perfil"
      className="shrink-0 cursor-pointer rounded-full border border-border/70 bg-background p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-900"
    >
      <Avatar className="size-9 border-0">
        <AvatarImage src={getAvatarUrl(user) ?? '/pfp.svg'} />
        <AvatarFallback className="text-[11px]">{getInitials(user)}</AvatarFallback>
      </Avatar>
    </button>
  );
}

/* Unified category filter trigger — lives inside the search card. */
export function MapFilterButton({
  selectedCategory,
  onCategoryChange,
  categoryCounts,
}: {
  selectedCategory: ReportCategory | 'all';
  onCategoryChange: (category: ReportCategory | 'all') => void;
  categoryCounts?: Record<ReportCategory, number>;
}) {
  const hasActive = selectedCategory !== 'all';
  const activeInfo = hasActive ? CATEGORIES[selectedCategory] : null;

  return (
    <>
      <span aria-hidden className="h-6 w-px shrink-0 bg-border/70" />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={
            hasActive && activeInfo ? `Filtro ativo: ${activeInfo.label}` : 'Filtrar por categoria'
          }
          className={cn(
            'relative inline-flex h-10 shrink-0 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full px-2.5 text-xs font-medium outline-none transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-muted',
            hasActive ? 'bg-primary/10 text-foreground ring-1 ring-primary/30' : 'text-muted-foreground'
          )}
        >
          <SlidersHorizontal className="size-4 shrink-0" />
          <span className="hidden sm:inline">Filtrar</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="max-h-[72vh] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border-border/70 p-1.5 shadow-md"
        >
          <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
            Categorias
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-1 mb-1" />

          <DropdownMenuItem
            onClick={() => onCategoryChange('all')}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-150',
              !hasActive && 'bg-accent/60'
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
                {new Intl.NumberFormat('pt-BR').format(
                  Object.values(categoryCounts).reduce((sum, n) => sum + n, 0)
                )}
              </span>
            ) : null}
            {!hasActive ? <Check className="size-4 shrink-0 text-primary" /> : null}
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
    </>
  );
}
