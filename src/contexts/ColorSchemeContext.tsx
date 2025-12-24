import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MantineColorScheme } from "@mantine/core";

type ColorSchemePreference = "auto" | "light" | "dark";

interface ColorSchemeContextValue {
  preference: ColorSchemePreference;
  setPreference: (preference: ColorSchemePreference) => void;
  effectiveColorScheme: MantineColorScheme;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | undefined>(undefined);

const STORAGE_KEY = "mantine-color-scheme-preference";

function getStoredPreference(): ColorSchemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "auto" || stored === "light" || stored === "dark") {
    return stored;
  }
  return "auto";
}

function getSystemColorScheme(): MantineColorScheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface ColorSchemeProviderProps {
  children: ReactNode;
}

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const [preference, setPreferenceState] = useState<ColorSchemePreference>(getStoredPreference);
  const [systemColorScheme, setSystemColorScheme] = useState<MantineColorScheme>(getSystemColorScheme);

  const effectiveColorScheme: MantineColorScheme =
    preference === "auto" ? systemColorScheme : preference;

  const setPreference = (newPreference: ColorSchemePreference) => {
    setPreferenceState(newPreference);
    localStorage.setItem(STORAGE_KEY, newPreference);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemColorScheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <ColorSchemeContext.Provider value={{ preference, setPreference, effectiveColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error("useColorScheme must be used within a ColorSchemeProvider");
  }
  return context;
}
