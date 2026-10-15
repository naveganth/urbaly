type ThemeSetter = (theme: "light" | "dark") => void;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function supportsViewTransition(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof (document as Document & { startViewTransition?: unknown })
      .startViewTransition === "function"
  );
}

export function toggleThemeWithTransition(
  resolvedTheme: string | undefined,
  setTheme: ThemeSetter,
) {
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const updateTheme = () => setTheme(nextTheme);

  if (!supportsViewTransition() || prefersReducedMotion()) {
    updateTheme();
    return;
  }

  // The ::view-transition-new(root) rule in globals.css expands a
  // circle from the viewport center (50% 50%) — no per-click origin
  // needed for the "center circle" effect.
  (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(updateTheme);
}