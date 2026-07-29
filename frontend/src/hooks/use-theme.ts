import { useEffect, useState } from "react";

export type Theme = "dark" | "dark-premium" | "cherry-blossom" | "winter-light";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("momentum-theme");
      if (
        stored === "dark" ||
        stored === "dark-premium" ||
        stored === "cherry-blossom" ||
        stored === "winter-light"
      ) {
        return stored;
      }
      if (stored === "light") return "cherry-blossom";
    }
    return "dark"; // Canonical default
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "dark-premium", "cherry-blossom", "winter-light", "light");
    root.classList.add(theme);
    localStorage.setItem("momentum-theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    setThemeState((prev) => {
      if (prev === "dark") return "dark-premium";
      if (prev === "dark-premium") return "cherry-blossom";
      if (prev === "cherry-blossom") return "winter-light";
      return "dark";
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return { theme, cycleTheme, setTheme };
}
