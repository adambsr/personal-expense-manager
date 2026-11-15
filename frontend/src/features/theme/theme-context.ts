import { createContext } from "react";

export type ColorMode = "light" | "dark";

export interface ThemeContextValue {
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
