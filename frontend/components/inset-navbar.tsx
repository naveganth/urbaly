"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, Search, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV_LINKS = [
  { label: "Mapa", href: "#mapa" },
  { label: "Classificações", href: "#classificacoes" },
  { label: "Estatísticas", href: "#estatisticas" },
  { label: "Sobre", href: "#sobre" },
]

export interface InsetNavbarProps {
  activeTab?: string
  onSelectTab?: (tab: string) => void
  className?: string
}

export function InsetNavbar({
  activeTab = "Mapa",
  onSelectTab,
  className,
}: InsetNavbarProps) {
  const [current, setCurrent] = React.useState(activeTab)

  const handleTabClick = (label: string) => {
    setCurrent(label)
    if (onSelectTab) onSelectTab(label)
  }

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
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleTabClick(link.label)}
                className={cn(
                  "relative py-1 transition-colors outline-none cursor-pointer",
                  current === link.label
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {current === link.label && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-foreground" />
                )}
              </button>
            ))}

            {/* Categories Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer">
                <span>Categorias</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 p-1">
                <DropdownMenuItem className="cursor-pointer">Mobilidade</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Meio Ambiente</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Segurança</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Infraestrutura</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Right: Actions & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
          <button
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Cart"
          >
            <ShoppingBag className="size-4" />
          </button>
          <Avatar className="size-7 sm:size-8 border border-border">
            <AvatarImage src="pfp.svg" />
            <AvatarFallback className="text-[11px]">UR</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
