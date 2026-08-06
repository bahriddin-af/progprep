"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ip-theme") as Theme | null;
    const initial =
      saved ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function flip() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ip-theme", next);
  }

  return (
    <button
      type="button"
      onClick={flip}
      aria-label="Temani almashtirish"
      className="mono border border-[var(--color-line-2)] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)]"
    >
      {theme === "dark" ? "light" : "dark"}
    </button>
  );
}
