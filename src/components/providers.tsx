"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";

type Theme = "cyan" | "purple";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("cyan");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("cybernexus-theme") as Theme | null;
      if (savedTheme === "purple" || savedTheme === "cyan") {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme("cyan");
      }
    } catch {
      applyTheme("cyan");
    }
    setMounted(true);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "purple") {
      root.setAttribute("data-theme", "purple");
    } else {
      root.removeAttribute("data-theme");
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem("cybernexus-theme", newTheme);
    } catch (e) {
      console.error("Failed to save theme in localStorage:", e);
    }
  };

  const toggleTheme = () => {
    const next = theme === "cyan" ? "purple" : "cyan";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div className={mounted ? "" : "opacity-0 transition-opacity duration-150"}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}
