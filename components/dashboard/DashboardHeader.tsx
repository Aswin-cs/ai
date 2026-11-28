"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { getHeroRiskMeta } from "@/lib/airQuality";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/validation";
import type { AirPlan, UserProfileState } from "@/types/airPlan";

interface DashboardHeaderProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  userProfile: UserProfileState;
  aiPlan: AirPlan | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  isRecalibrating: boolean;
  onRecalibrate: () => void;
}

export default function DashboardHeader({
  mobileNavOpen,
  onToggleMobileNav,
  userProfile,
  aiPlan,
  language,
  onLanguageChange,
  isRecalibrating,
  onRecalibrate,
}: DashboardHeaderProps) {
  return (
    <header className="fixed top-0 left-0 md:left-[220px] right-0 h-[72px] bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant z-20 px-4 md:px-8 flex items-center justify-between gap-2 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileNavOpen}
          aria-controls="primary-sidebar"
          className="md:hidden w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">
            {mobileNavOpen ? "close" : "menu"}
          </span>
        </button>
        {userProfile.location && (
          <Link
            href="/onboarding"
            className="border border-outline-variant hover:border-primary bg-surface-container-low hover:bg-surface-container-lowest text-on-surface font-medium text-xs rounded-full px-3 md:px-3.5 py-2 flex items-center gap-1.5 md:gap-2 shadow-2xs transition-all duration-200 cursor-pointer min-w-0"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg text-primary shrink-0">
              location_on
            </span>
            <span className="font-medium max-w-[130px] sm:max-w-[200px] md:max-w-[220px] truncate">
              {userProfile.location}
            </span>
          </Link>
        )}
      </div>

      {userProfile.aqi != null && (() => {
        const heroRisk = getHeroRiskMeta(aiPlan?.status?.risk_level, userProfile.aqi);
        return (
          <div className="hidden md:flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-full px-4 py-1.5 text-xs shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${heroRisk.dotBg}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${heroRisk.dotBg}`} />
              </span>
              <span className="text-on-surface-variant font-medium">AQI</span>
              <span className="font-bold text-on-surface text-sm">{userProfile.aqi}</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs border ${heroRisk.badgeBg} ${heroRisk.badgeText} ${heroRisk.badgeBorder}`}>
                {heroRisk.label}
              </span>
            </div>
            {userProfile.pollutants && (
              <>
                <span className="w-[1px] h-3.5 bg-outline-variant" aria-hidden="true" />
                <div className="flex items-center gap-3 font-medium text-on-surface-variant text-xs">
                  <span>
                    PM2.5 <strong className="text-on-surface font-semibold text-xs ml-0.5">{userProfile.pollutants.pm25}</strong>{" "}
                    <span className="text-xs text-on-surface-variant/80">µg/m³</span>
                  </span>
                  <span className="text-outline-variant/60" aria-hidden="true">•</span>
                  <span>
                    PM10 <strong className="text-on-surface font-semibold text-xs ml-0.5">{userProfile.pollutants.pm10}</strong>{" "}
                    <span className="text-xs text-on-surface-variant/80">µg/m³</span>
                  </span>
                  <span className="text-outline-variant/60" aria-hidden="true">•</span>
                  <span>
                    NO₂ <strong className="text-on-surface font-semibold text-xs ml-0.5">{userProfile.pollutants.no2}</strong>{" "}
                    <span className="text-xs text-on-surface-variant/80">ppb</span>
                  </span>
                </div>
              </>
            )}
          </div>
        );
      })()}

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <label className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-high rounded-full px-3 py-1.5 border border-outline-variant text-xs font-semibold text-on-surface transition-colors">
          <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">
            translate
          </span>
          <select
            aria-label="Select preferred language"
            value={language}
            onChange={(e) => {
              const nextLang = e.target.value as SupportedLanguage;
              if (nextLang !== language) {
                onLanguageChange(nextLang);
              }
            }}
            className="bg-transparent cursor-pointer text-xs font-semibold text-on-surface pr-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeLabel}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={onRecalibrate}
          disabled={isRecalibrating}
          type="button"
          className="h-9 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors text-xs font-medium shadow-2xs cursor-pointer"
        >
          <span
            aria-hidden="true"
            className={`material-symbols-outlined text-base text-primary ${isRecalibrating ? "animate-spin" : ""}`}
          >
            sync
          </span>
          <span>{isRecalibrating ? "Recalibrating..." : "Recalibrate"}</span>
        </button>
      </div>
    </header>
  );
}
