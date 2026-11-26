"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "vayupulse_theme";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", prefersDark);
    setIsDark(prefersDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      title={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      className="group h-9 px-3 rounded-full bg-surface-container hover:bg-surface-container-high border border-[#E0E3E1] text-on-surface flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] text-xs font-semibold shadow-2xs cursor-pointer active:scale-95"
    >
      <span
        aria-hidden="true"
        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:rotate-12 ${
          isDark ? "text-[#FABB05]" : "text-[#0B57D0]"
        }`}
      >
        {isDark ? "light_mode" : "dark_mode"}
      </span>
      <span className="hidden sm:inline">{isDark ? "Day" : "Night"}</span>
    </button>
  );
}
