"use client";

import type { Dispatch } from "react";
import {
  Activity,
  AppWindow,
  Baby,
  Bike,
  Car,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Fan,
  Footprints,
  HeartPulse,
  Laptop,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Train,
  User,
  X,
} from "lucide-react";
import type {
  CommuteKey,
  OnboardingAction,
  OnboardingFormState,
  VulnerabilityKey,
} from "@/hooks/onboardingReducer";

interface LifestyleStepProps {
  state: OnboardingFormState;
  dispatch: Dispatch<OnboardingAction>;
  onRefreshAq: () => void;
  onGoToStep1: () => void;
}

const VULNERABILITY_CARDS: Array<{
  key: VulnerabilityKey;
  title: string;
  description: string;
  icon: typeof Baby;
}> = [
  {
    key: "children",
    title: "Young Children / School-Goers",
    description:
      "Safe outdoor play windows, school bus exposure & pediatric mask thresholds.",
    icon: Baby,
  },
  {
    key: "seniors",
    title: "Senior Citizens (60+)",
    description:
      "Morning walk rescheduling, indoor cold drafts & cardiopulmonary vigilance.",
    icon: HeartPulse,
  },
  {
    key: "respiratory",
    title: "Asthma / Respiratory Sensitivity",
    description:
      "Strict PM2.5 spike pre-warnings, humidification advice & N95 fit alerts.",
    icon: Activity,
  },
  {
    key: "adult",
    title: "Working Adult / Wellness",
    description: "Commute exposure minimization & evening exercise window optimization.",
    icon: User,
  },
];

const COMMUTE_OPTIONS: Array<{ key: CommuteKey; label: string; icon: typeof Bike }> = [
  { key: "two_wheeler", label: "Two-Wheeler", icon: Bike },
  { key: "car", label: "Personal Car", icon: Car },
  { key: "metro", label: "Metro / Bus", icon: Train },
  { key: "walk", label: "Walk / Cycle", icon: Footprints },
  { key: "wfh", label: "Work From Home", icon: Laptop },
];

export default function LifestyleStep({
  state,
  dispatch,
  onRefreshAq,
  onGoToStep1,
}: LifestyleStepProps) {
  const {
    locationQuery,
    coords,
    aqSource,
    airQualityData,
    isFetchingAirQuality,
    vulnerabilities,
    commute,
    indoorSetup,
    windows,
    customWindowInput,
  } = state;

  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center"
          >
            2
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">
            Who are we protecting and planning for?
          </h1>
        </div>
        <p className="text-sm text-on-surface-variant pl-8 leading-relaxed">
          Two households in the same city need vastly different advice. Select all that apply to
          tailor your AI recommendations.
        </p>
      </div>

      {/* Live Area Telemetry Card */}
      <div className="bg-surface-container-lowest rounded-2xl border-2 border-primary/25 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-outline-variant/70 pb-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs"
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  OpenStreetMap Area Telemetry
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary bg-secondary-container/60 border border-secondary/25 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" aria-hidden="true" />
                  Live Sync
                </span>
              </div>
              <div className="text-sm font-bold text-on-surface truncate mt-0.5">
                {locationQuery}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant">
              {aqSource === "CPCB" ? "CPCB India (data.gov.in)" : "Open-Meteo Air Quality API"}
            </span>
            <button
              type="button"
              onClick={onRefreshAq}
              disabled={isFetchingAirQuality}
              aria-label="Refresh live air quality metrics"
              title="Refresh live metrics"
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              <RotateCcw
                className={`w-4 h-4 ${isFetchingAirQuality ? "animate-spin text-primary" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {airQualityData ? (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container rounded-xl p-3.5 border border-outline-variant">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                    Real-Time Air Index
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-on-surface leading-none">
                      {airQualityData.usAqi}
                    </span>
                    <span className="text-xs font-semibold text-on-surface-variant">
                      {aqSource === "CPCB" ? "Indian AQI" : "US AQI"}
                    </span>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-outline-variant hidden sm:block" aria-hidden="true" />
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${airQualityData.category.badgeBg} ${airQualityData.category.badgeText} ${airQualityData.category.badgeBorder}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${airQualityData.category.barColor}`} aria-hidden="true" />
                    {airQualityData.category.label}
                  </span>
                  <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                    {airQualityData.category.description}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 hidden md:block">
                <span className="text-xs text-on-surface-variant block">GPS Pin</span>
                <span className="text-xs font-mono text-on-surface">
                  {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant shadow-2xs">
                <div className="text-xs font-medium text-on-surface-variant">PM2.5 Fine Dust</div>
                <div className="text-lg font-bold text-on-surface mt-0.5">
                  {airQualityData.pm25}{" "}
                  <span className="text-xs font-normal text-on-surface-variant">µg/m³</span>
                </div>
                <div
                  className={`text-xs font-medium mt-0.5 ${
                    airQualityData.pm25 > 60 ? "text-error" : "text-secondary"
                  }`}
                >
                  {airQualityData.pm25 > 60 ? "Exceeds standard" : "Within safe zone"}
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant shadow-2xs">
                <div className="text-xs font-medium text-on-surface-variant">PM10 Coarse Dust</div>
                <div className="text-lg font-bold text-on-surface mt-0.5">
                  {airQualityData.pm10}{" "}
                  <span className="text-xs font-normal text-on-surface-variant">µg/m³</span>
                </div>
                <div className="text-xs text-on-surface-variant mt-0.5">Road &amp; construction dust</div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant shadow-2xs">
                <div className="text-xs font-medium text-on-surface-variant">NO₂ Nitrogen Dioxide</div>
                <div className="text-lg font-bold text-on-surface mt-0.5">
                  {airQualityData.no2}{" "}
                  <span className="text-xs font-normal text-on-surface-variant">µg/m³</span>
                </div>
                <div className="text-xs text-on-surface-variant mt-0.5">Vehicular &amp; commute plume</div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant shadow-2xs">
                <div className="text-xs font-medium text-on-surface-variant">O₃ Ground Ozone</div>
                <div className="text-lg font-bold text-on-surface mt-0.5">
                  {airQualityData.ozone}{" "}
                  <span className="text-xs font-normal text-on-surface-variant">µg/m³</span>
                </div>
                <div className="text-xs text-on-surface-variant mt-0.5">Photochemical afternoon</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                <span>
                  Real-time values calibrated for selected OpenStreetMap area • Sync {airQualityData.time}
                </span>
              </span>
              <button
                type="button"
                onClick={onGoToStep1}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Adjust Map Pin in Step 1
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-on-surface-variant">
            <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
            <span>Fetching live air quality from Open-Meteo API for your OpenStreetMap area...</span>
          </div>
        )}
      </div>

      {/* Vulnerabilities Multi-Select */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">
            Household Members &amp; Vulnerabilities
          </span>
          <span className="text-xs font-medium text-primary">Multi-select enabled</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VULNERABILITY_CARDS.map(({ key, title, description, icon: Icon }) => {
            const active = vulnerabilities.includes(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "TOGGLE_VULNERABILITY", key })}
                className={`text-left cursor-pointer group relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                  active
                    ? "bg-primary-fixed border-primary shadow-xs"
                    : "bg-surface-container border-transparent hover:border-outline-variant"
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-xs">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  {active ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                  ) : (
                    <Circle className="w-5 h-5 text-outline-variant" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-3">
                  <div className={`text-base font-bold ${active ? "text-on-primary-fixed" : "text-on-surface"}`}>
                    {title}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 leading-snug">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Commute Mode */}
      <div className="space-y-2">
        <span className="text-sm font-semibold text-on-surface">Primary Daily Commute Mode</span>
        <div className="flex flex-wrap gap-2 pt-1">
          {COMMUTE_OPTIONS.map(({ key, label, icon: Icon }) => {
            const isSelected = commute === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => dispatch({ type: "SET_COMMUTE", commute: key })}
                className={`h-9 px-3.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary-fixed border border-primary text-on-primary-fixed font-semibold shadow-2xs"
                    : "bg-surface-container border border-transparent hover:border-outline-variant text-on-surface-variant"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : ""}`} aria-hidden="true" />
                <span>{label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-0.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-on-surface-variant pl-1">
          Two-wheelers experience 3.4x higher particulate deposition during winter mornings compared
          to sealed transit.
        </p>
      </div>

      {/* Indoor Air Setup */}
      <div className="space-y-2">
        <span className="text-sm font-semibold text-on-surface">Indoor Air Setup</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Indoor Air Setup">
          <button
            type="button"
            role="radio"
            aria-checked={indoorSetup === "purifier"}
            onClick={() => dispatch({ type: "SET_INDOOR_SETUP", setup: "purifier" })}
            className={`text-left cursor-pointer p-4 rounded-2xl border-2 flex items-start gap-3.5 transition-all ${
              indoorSetup === "purifier"
                ? "bg-primary-fixed border-primary shadow-xs"
                : "bg-surface-container border-transparent hover:border-outline-variant"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shrink-0">
              <Fan className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-on-primary-fixed">Have HEPA Air Purifier</span>
                <span
                  aria-hidden="true"
                  className={`w-4 h-4 rounded-full bg-surface-container-lowest ${
                    indoorSetup === "purifier" ? "border-4 border-primary" : "border border-outline-variant"
                  }`}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                We optimize CADR fan schedules, night bedroom mode &amp; filter life economics.
              </p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={indoorSetup === "natural"}
            onClick={() => dispatch({ type: "SET_INDOOR_SETUP", setup: "natural" })}
            className={`text-left cursor-pointer p-4 rounded-2xl border-2 flex items-start gap-3.5 transition-all ${
              indoorSetup === "natural"
                ? "bg-primary-fixed border-primary shadow-xs"
                : "bg-surface-container border-transparent hover:border-outline-variant"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shrink-0">
              <AppWindow className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-on-surface">Natural Ventilation Only</span>
                <span
                  aria-hidden="true"
                  className={`w-4 h-4 rounded-full bg-surface-container-lowest ${
                    indoorSetup === "natural" ? "border-4 border-primary" : "border border-outline-variant"
                  }`}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                Zero-cost timed cross-ventilation, wet microfiber mopping &amp; window draft seals.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Outdoor Exposure Windows + Custom Input */}
      <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">
            Typical Household Outdoor Exposure Windows
          </span>
          <span className="text-xs font-medium text-on-surface-variant">Optional timings</span>
        </div>

        <div className="flex flex-col gap-2">
          {[
            { key: "morning" as const, label: "Morning School Run / Walk (6:30 AM – 9:00 AM)" },
            { key: "commute" as const, label: "Daytime Work Commute & Transit" },
            { key: "evening" as const, label: "Evening Park Play / Errands (5:30 PM – 7:30 PM)" },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2.5 text-xs text-on-surface cursor-pointer py-1"
            >
              <input
                type="checkbox"
                checked={windows[key]}
                onChange={(e) =>
                  dispatch({
                    type: "SET_WINDOWS",
                    windows: { ...windows, [key]: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded accent-primary border-outline-variant"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="pt-2.5 border-t border-outline-variant/70">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="custom-window-input"
              className="block text-xs font-semibold text-on-surface-variant"
            >
              Add Custom Outdoor Routine or Window:
            </label>
            <span className="text-xs text-on-surface-variant">Press Enter or Add</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Clock
                className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="custom-window-input"
                type="text"
                value={customWindowInput}
                onChange={(e) =>
                  dispatch({ type: "SET_CUSTOM_WINDOW_INPUT", value: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    dispatch({ type: "ADD_CUSTOM_WINDOW" });
                  }
                }}
                placeholder="e.g. Night Walk (9:00 PM – 10:00 PM), Dog Walk, Afternoon Sports..."
                className="w-full h-10 pl-9 pr-9 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 text-sm text-on-surface placeholder:text-on-surface-variant transition-all"
              />
              {customWindowInput && (
                <button
                  type="button"
                  aria-label="Clear custom window input"
                  onClick={() => dispatch({ type: "SET_CUSTOM_WINDOW_INPUT", value: "" })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: "ADD_CUSTOM_WINDOW" })}
              disabled={!customWindowInput.trim()}
              className="h-10 px-4 rounded-xl bg-primary-container hover:bg-primary disabled:bg-outline-variant disabled:text-on-surface-variant text-on-primary text-sm font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>

          {windows.customList && windows.customList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {windows.customList.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-primary text-on-primary-fixed text-xs font-medium shadow-2xs animate-fade-in"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item}`}
                    onClick={() => dispatch({ type: "REMOVE_CUSTOM_WINDOW", index: idx })}
                    title="Remove window"
                    className="ml-1 text-on-surface-variant hover:text-error transition-colors p-0.5 rounded hover:bg-surface-container cursor-pointer"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
