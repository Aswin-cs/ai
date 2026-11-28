"use client";

import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      title={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      className="group min-h-9 h-9 px-3 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:rotate-12 ${
          isDark ? "text-[#FABB05]" : "text-primary"
        }`}
      >
        {isDark ? "light_mode" : "dark_mode"}
      </span>
      <span className="hidden sm:inline">{isDark ? "Day" : "Night"}</span>
    </button>
  );
}
