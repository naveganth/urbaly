"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { ChevronDown, LogOut, Menu, Moon, Settings, Sun, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleThemeWithTransition } from "@/lib/theme-transition"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const NAV_LINKS = [
  { label: "Início", href: "/" },
  { label: "Mapa", href: "/mapa" },
  { label: "Classificação", href: "/classificacao" },
  { label: "Estatísticas", href: "/estatisticas" },
  { label: "Sobre", href: "/sobre" },
]

export interface NavbarProps {
  activeTab?: string
  onSelectTab?: (tab: string) => void
  className?: string
}

export function Navbar({
  activeTab,
  onSelectTab,
  className,
}: NavbarProps) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    toggleThemeWithTransition(resolvedTheme, setTheme)
  }

  const isLinkActive = (href: string, label: string) =>
    activeTab ? activeTab === label : pathname === href

  return (
    <header className={cn("w-full bg-background border-b border-border", className)}>
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/urbalyLogo.svg"
              alt="Urbaly"
              width={100}
              height={30}
              priority
              className="h-6 w-auto"
            />
          </Link>

          <nav className="hidden items-center gap-4 text-xs font-medium sm:flex sm:gap-6 sm:text-sm">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.href, link.label)

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => onSelectTab?.(link.label)}
                  data-active={isActive}
                  className={cn(
                    "relative py-1 outline-none cursor-pointer transition-colors duration-200 ease-out after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-foreground after:opacity-0 after:transition-[transform,opacity] after:duration-300 after:ease-out data-[active=true]:after:scale-x-100 data-[active=true]:after:opacity-100",
                    isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer">
                <span>Categorias</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 p-1">
                <DropdownMenuItem render={<Link href="/categorias/mobilidade" />}>
                  Mobilidade
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/categorias/meio-ambiente" />}>
                  Meio Ambiente
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/categorias/seguranca" />}>
                  Segurança
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/categorias/infraestrutura" />}>
                  Infraestrutura
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Sheet>
            <SheetTrigger
              aria-label="Abrir menu de navegação"
              className="inline-flex size-8 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(18rem,85vw)]">
              <SheetHeader>
                <SheetTitle>Navegação</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-4" aria-label="Menu móvel">
                {NAV_LINKS.map((link) => {
                  const isActive = isLinkActive(link.href, link.label)

                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => onSelectTab?.(link.label)}
                      data-active={isActive}
                      className={cn(
                        "border-b border-border py-3 text-sm transition-colors data-[active=true]:font-semibold data-[active=true]:text-foreground",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Abrir menu do usuário"
              className="rounded-full outline-none ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Avatar className="size-7 border border-border sm:size-8">
                <AvatarImage src="/pfp.svg" />
                <AvatarFallback className="text-[11px]">UR</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1">
              <DropdownMenuLabel className="px-2 py-2">
                Minha conta
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href="/perfil" />}>
                  <User />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/configuracoes" />}>
                  <Settings />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                  {resolvedTheme === "dark" ? "Modo claro" : "Modo escuro"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
