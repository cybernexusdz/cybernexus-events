"use client";

import * as React from "react";
import { useTheme } from "./providers";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="relative flex items-center gap-2 border-border/80 bg-card/60 backdrop-blur px-3 py-1.5 hover:border-primary transition-all duration-200"
      title={`Switch to ${theme === "cyan" ? "Purple" : "Cyan"} theme`}
    >
      <Sparkles
        className={`h-4 w-4 transition-transform duration-300 ${
          theme === "purple" ? "text-purple-400 rotate-180" : "text-cyan-400"
        }`}
      />
      <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider">
        {theme === "cyan" ? (
          <span className="text-cyan-400 font-semibold">CYAN</span>
        ) : (
          <span className="text-purple-400 font-semibold">PURPLE</span>
        )}
      </span>
      <span
        className={`h-2 w-2 rounded-full transition-all duration-300 ${
          theme === "cyan"
            ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
            : "bg-fuchsia-400 shadow-[0_0_8px_#e879f9]"
        }`}
      />
    </Button>
  );
}
