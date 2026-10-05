import type { Metadata } from "next"
import { LoginForm } from "@/components/shadcn/login-form"

export const metadata: Metadata = {
  title: "Entrar | Urbaly",
  description: "Acesse o Urbaly com sua conta Google.",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-8 sm:px-6 sm:py-12 md:p-10">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
