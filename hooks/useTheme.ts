"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "@/lib/constants";

const THEME_EVENT = "vayupulse-theme-change";

function getPreferredTheme(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
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

export function useTheme() {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getPreferredTheme,
    () => false
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    localStorage.setItem(STORAGE_KEYS.theme, next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, [isDark]);

  return { isDark, toggleTheme };
}
