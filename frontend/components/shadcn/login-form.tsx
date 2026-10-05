"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "cn"

import { Button } from "@/components/ui/shadcn/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/shadcn/field"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const handleGoogleLogin = () => {
    // TODO: wire Google OAuth (NextAuth / Supabase / custom Rust backend).
    console.log("Google login placeholder")
  }

  return (
    <div className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <form onSubmit={(event) => event.preventDefault()}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-3 text-center">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Urbaly — voltar ao início"
            >
              <Image
                src="/urbalyLogo.svg"
                alt="Urbaly"
                width={132}
                height={40}
                priority
                className="h-8 w-auto sm:h-10"
              />
              <span className="sr-only">Urbaly</span>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-balance sm:text-2xl">
              Bem-vindo ao Urbaly
            </h1>
            <FieldDescription className="text-center text-pretty">
              Acesse com sua conta Google para continuar.
            </FieldDescription>
          </div>
          <Field>
            <Button
              variant="outline"
              type="button"
              size="lg"
              onClick={handleGoogleLogin}
              aria-label="Continuar com Google"
              className="h-11 min-h-11 w-full touch-manipulation gap-2 text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 shrink-0"
              >
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continuar com Google
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-4 text-center text-pretty sm:px-6">
        Ao continuar, você concorda com nossos <a href="#">Termos de Uso</a>{" "}
        e <a href="#">Política de Privacidade</a>.
      </FieldDescription>
      <Link
        href="/"
        className="text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
