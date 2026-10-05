"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google"
import { cn } from "cn"

import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/shadcn/field"
import { useAuth } from "@/lib/auth-context"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

function LoginFormInner({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, error, loginWithGoogle } = useAuth()
  const [pending, setPending] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)

  const isBusy = pending || status === "loading"
  const displayError = localError ?? error

  const handleSuccess = async (credential: string | undefined) => {
    if (!credential) {
      setLocalError("O Google não retornou a credencial. Tente de novo.")
      return
    }
    setPending(true)
    setLocalError(null)
    try {
      await loginWithGoogle(credential)
      const next = searchParams.get("next") || "/"
      router.push(next)
      router.refresh()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Não foi possível entrar.")
    } finally {
      setPending(false)
    }
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
            {GOOGLE_CLIENT_ID ? (
              <div className="flex w-full justify-center">
                <GoogleLogin
                  text="continue_with"
                  shape="rectangular"
                  width="320"
                  onSuccess={(res) => void handleSuccess(res.credential)}
                  onError={() =>
                    setLocalError("Não foi possível conectar ao Google.")
                  }
                />
              </div>
            ) : (
              <p className="text-center text-sm text-destructive">
                NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.
              </p>
            )}
            {isBusy && (
              <p role="status" className="text-center text-sm text-muted-foreground">
                Entrando…
              </p>
            )}
            {displayError && (
              <p role="alert" className="text-center text-sm text-destructive">
                {displayError}
              </p>
            )}
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

function LoginFormFallback(props: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex w-full flex-col gap-6", props.className)}>
      <div
        aria-hidden
        className="flex min-h-11 items-center justify-center rounded-none border border-border bg-muted text-sm text-muted-foreground"
      >
        Carregando login…
      </div>
    </div>
  )
}

export function LoginForm(props: React.ComponentProps<"div">) {
  const form = GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginFormInner {...props} />
    </GoogleOAuthProvider>
  ) : (
    <LoginFormInner {...props} />
  )
  return (
    <React.Suspense fallback={<LoginFormFallback {...props} />}>
      {form}
    </React.Suspense>
  )
}
