import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Navbar />
      <main className="page-transition flex-1 w-full px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Início</h1>
          <p className="text-muted-foreground">Urbaly</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
