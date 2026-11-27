"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "vayupulse_theme";
const THEME_EVENT = "vayupulse-theme-change";

function getPreferredTheme(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(STORAGE_KEY);
  return (
    saved === "dark" ||
    (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getPreferredTheme,
    () => false
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event(THEME_EVENT));
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
