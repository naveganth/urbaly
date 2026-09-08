"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV_LINKS = [
  { label: "Início", href: "/" },
  { label: "Mapa", href: "/map" },
  { label: "Classificações", href: "/classificacoes" },
  { label: "Estatísticas", href: "/estatisticas" },
  { label: "Sobre", href: "/sobre" },
]

export interface InsetNavbarProps {
  activeTab?: string
  onSelectTab?: (tab: string) => void
  className?: string
}

export function InsetNavbar({
  activeTab,
  onSelectTab,
  className,
}: InsetNavbarProps) {
  const pathname = usePathname()

  return (
    <header className={cn("w-full bg-background", className)}>
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Links */}
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

          <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium">
            {NAV_LINKS.map((link) => {
              const isActive = activeTab
                ? activeTab === link.label
                : pathname === link.href

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => onSelectTab?.(link.label)}
                  className={cn(
                    "relative py-1 transition-colors outline-none cursor-pointer",
                    isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-foreground" />
                  )}
                </Link>
              )
            })}

            {/* Categories Dropdown */}
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

        {/* Right: Actions & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="size-7 sm:size-8 border border-border">
            <AvatarImage src="/pfp.svg" />
            <AvatarFallback className="text-[11px]">UR</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
