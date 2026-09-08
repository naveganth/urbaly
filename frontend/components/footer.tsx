import Link from "next/link"
import Image from "next/image"
import { Send } from "lucide-react"
import { SiInstagram, SiX, SiYoutube } from "react-icons/si"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MENU_LINKS = [
  { label: "Sobre", href: "/sobre" },
  { label: "Mapa", href: "/mapa" },
  { label: "Estatísticas", href: "/estatisticas" },
  { label: "Classificações", href: "/classificacao" },
]

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", icon: SiInstagram },
  { label: "X", href: "#", icon: SiX },
  { label: "YouTube", href: "#", icon: SiYoutube },
]

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border bg-slate-950 text-slate-300 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.35fr_0.75fr_1.35fr] md:gap-16">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center transition-opacity hover:opacity-80"
            >
              <Image
                src="/urbalyLogo.svg"
                alt="Urbaly"
                width={130}
                height={38}
                className="h-8 w-auto"
              />
              <span className="sr-only">Página inicial</span>
            </Link>
            <p className="mt-5 text-sm leading-6 text-slate-400">
              Plataforma colaborativa de monitoramento e análise de dados
              urbanos para o estado do Amapá. Conectando cidadãos e gestão
              pública por uma cidade mais transparente e acessível.
            </p>
          </div>

          <nav aria-label="Menu do rodapé" className="flex flex-col items-start gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Menu</h2>
            {MENU_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 transition-colors hover:text-emerald-400"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="max-w-md">
            <h2 className="text-sm font-semibold text-slate-100">Se inscreva!</h2>
            <p className="mt-3 text-sm leading-5 text-slate-400">
              Se inscreva no nosso <em>newsletter</em> para receber notícias +
              atualizações referentes ao estado do Amapá!
            </p>
            <form className="mt-4 flex h-9 items-center border border-slate-700 bg-slate-900/70 pl-3 transition-colors focus-within:border-emerald-500">
              <label htmlFor="newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              <Input
                id="newsletter-email"
                name="email"
                type="email"
                placeholder="seuemail@gmail.com"
                className="h-auto min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-slate-100 shadow-none placeholder:text-slate-500 focus-visible:border-0 focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="icon-sm"
                variant="ghost"
                aria-label="Inscrever e-mail"
                className="mr-0.5 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <Send />
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-slate-800 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Urbaly</p>
          <p className="text-center md:text-left">
            Desenvolvido como TCC para o curso de Engenharia de Computação -
            Centro Universitário Meta (UNIMETA).
          </p>
          <div className="flex items-center gap-2 self-end md:self-auto">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className="inline-flex size-7 items-center justify-center text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <Icon aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
