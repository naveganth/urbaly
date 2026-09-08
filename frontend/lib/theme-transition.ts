type ThemeSetter = (theme: "light" | "dark") => void

export function toggleThemeWithTransition(
  resolvedTheme: string | undefined,
  setTheme: ThemeSetter,
) {
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
  const updateTheme = () => setTheme(nextTheme)

  if ("startViewTransition" in document) {
    document.startViewTransition(updateTheme)
    return
  }

  updateTheme()
}