import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type ColorMode } from "./theme-context";

const COLOR_MODE_STORAGE_KEY = "pem.color-mode";

function initialColorMode(): ColorMode {
  const savedPreference = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  if (savedPreference === "light" || savedPreference === "dark") return savedPreference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyColorMode(colorMode: ColorMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", colorMode === "dark");
  root.style.colorScheme = colorMode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    colorMode === "dark" ? "#0b1120" : "#f8f9ff",
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode);

  useLayoutEffect(() => {
    applyColorMode(colorMode);
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

  const toggleColorMode = useCallback(() => {
    setColorMode((mode) => mode === "light" ? "dark" : "light");
  }, []);
  const value = useMemo(() => ({ colorMode, toggleColorMode }), [colorMode, toggleColorMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
