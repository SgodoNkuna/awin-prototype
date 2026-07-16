import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import logoColor from "@/assets/awin-logo-color.png";
import logoBlack from "@/assets/awin-logo-black.png";
import logoWhite from "@/assets/awin-logo-white.png";

export type LogoVariant = "color" | "orange" | "black" | "white";

// "white" (a full dark theme) is intentionally omitted from the cycle: Tailwind v4
// @theme inline doesn't propagate the overridden --foreground/--muted-foreground to
// utility classes, so dark-theme text renders dark-on-dark site-wide. The three light
// themes below all have correct contrast. Re-add "white" only with a proper dark-mode pass.
const ORDER: LogoVariant[] = ["color", "orange", "black"];
const STORAGE_KEY = "awin-logo-variant";

const LOGO_SRC: Record<LogoVariant, string> = {
  color: logoColor,
  // No dedicated orange asset — tint the black silhouette via CSS filter
  orange: logoBlack,
  black: logoBlack,
  white: logoWhite,
};

type Ctx = {
  variant: LogoVariant;
  cycle: () => void;
  setVariant: (v: LogoVariant) => void;
  /** Logo for the primary (header) surface */
  src: string;
  /** Logo best suited for a dark surface (footer) */
  srcOnDark: string;
  /** Optional CSS filter (used for the orange tint) */
  filter?: string;
};

const LogoThemeContext = createContext<Ctx | null>(null);

export function LogoThemeProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<LogoVariant>("color");

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as LogoVariant | null;
      if (stored && ORDER.includes(stored)) setVariantState(stored);
    } catch {}
  }, []);

  // Sync to <html data-theme="...">
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", variant);
    try {
      localStorage.setItem(STORAGE_KEY, variant);
    } catch {}
  }, [variant]);

  const value = useMemo<Ctx>(() => {
    const filter =
      variant === "orange"
        ? // brightness+sepia+hue-rotate trick to push a dark logo to orange
          "brightness(0) saturate(100%) invert(63%) sepia(72%) saturate(1583%) hue-rotate(360deg) brightness(99%) contrast(96%)"
        : undefined;

    return {
      variant,
      setVariant: setVariantState,
      cycle: () => {
        setVariantState((v) => ORDER[(ORDER.indexOf(v) + 1) % ORDER.length]);
      },
      src: LOGO_SRC[variant],
      srcOnDark: variant === "black" ? logoWhite : LOGO_SRC[variant],
      filter,
    };
  }, [variant]);

  return <LogoThemeContext.Provider value={value}>{children}</LogoThemeContext.Provider>;
}

export function useLogoTheme() {
  const ctx = useContext(LogoThemeContext);
  if (!ctx) throw new Error("useLogoTheme must be used within LogoThemeProvider");
  return ctx;
}
