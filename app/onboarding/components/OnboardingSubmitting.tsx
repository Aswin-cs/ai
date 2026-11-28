"use client";

import Link from "next/link";
import { Check, CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import type { IndoorSetupKey, OpenMeteoAirQuality, VulnerabilityKey } from "@/hooks/onboardingReducer";

interface OnboardingSubmittingProps {
  locationQuery: string;
  airQualityData: OpenMeteoAirQuality | null;
  vulnerabilities: VulnerabilityKey[];
  indoorSetup: IndoorSetupKey;
  isOnboardingSaved: boolean;
  onCancel: () => void;
}

export default function OnboardingSubmitting({
  locationQuery,
  airQualityData,
  vulnerabilities,
  indoorSetup,
  isOnboardingSaved,
  onCancel,
}: OnboardingSubmittingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!isOnboardingSaved}
      className="w-full max-w-[680px] bg-surface-container-lowest rounded-[28px] border border-outline-variant shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-8 md:p-12 text-center space-y-8 animate-fade-in"
    >
      <div className="flex flex-col items-center justify-center pt-4">
        <div className="relative w-20 h-20">
          <svg
            aria-hidden="true"
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-container)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="8"
              strokeDasharray="264"
              strokeDashoffset="66"
              strokeLinecap="round"
              className="origin-center animate-spin"
            />
          </svg>
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-on-surface mt-5">
          Creating Your Tailored Winter Air Plan
        </h2>
        <p className="text-sm text-on-surface-variant mt-1 max-w-md">
          Gemini AI is calibrating solar inversion models and microclimate physics for{" "}
          <strong className="text-on-surface">{locationQuery.trim() || "your selected area"}</strong>.
        </p>
      </div>

      <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant text-left space-y-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-on-surface">
            Fetched live PM2.5 ({airQualityData ? `${airQualityData.pm25} µg/m³` : "Live Sync"}) &amp; hourly boundary layer curve for {locationQuery.trim() || "your locality"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-on-surface">
            Evaluating exposure risks for{" "}
            {vulnerabilities
              .map((v) =>
                v === "children"
                  ? "Young Children"
                  : v === "seniors"
                    ? "Senior Citizens"
                    : v === "respiratory"
                      ? "Asthma / Respiratory"
                      : "Working Adults"
              )
              .join(", ") || "your household"}
            ...
          </span>
        </div>
        <div className="flex items-center gap-3 opacity-60">
          <Circle className="w-5 h-5 text-on-surface-variant shrink-0" aria-hidden="true" />
          <span className="text-xs text-on-surface-variant">
            Building low-emission daily routine &amp;{" "}
            {indoorSetup === "purifier" ? "HEPA purifier" : "natural ventilation"} schedule...
          </span>
        </div>
      </div>

      <div className="pt-2 flex flex-col items-center gap-3">
        {isOnboardingSaved ? (
          <Link
            href="/"
            className="h-11 px-6 rounded-full bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <span>View Dashboard Plan</span>
            <Check className="w-4 h-4" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="h-11 px-6 rounded-full bg-primary-container/60 text-on-primary text-sm font-semibold flex items-center gap-2 shadow-sm cursor-not-allowed"
          >
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Saving Your Plan...</span>
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-primary hover:underline cursor-pointer"
        >
          Cancel &amp; Edit Household Profile
        </button>
      </div>
    </div>
  );
}
