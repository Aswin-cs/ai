"use client";

import { Ban, Calendar, Car, CheckCircle2, Clock, Home, Moon, Shield, Sun, Sunrise, Sunset, Wind } from "lucide-react";
import { formatTimeTo12Hour } from "@/lib/airQuality";
import { formatShortDate, getRiskMeta, type TripPlanResponse } from "./tripPlanUtils";

function PeriodIcon({ period }: { period: "morning" | "afternoon" | "evening" | "night" }) {
  switch (period) {
    case "morning":
      return <Sunrise className="w-4 h-4 text-tertiary" aria-hidden="true" />;
    case "afternoon":
      return <Sun className="w-4 h-4 text-tertiary" aria-hidden="true" />;
    case "evening":
      return <Sunset className="w-4 h-4 text-error" aria-hidden="true" />;
    case "night":
      return <Moon className="w-4 h-4 text-primary" aria-hidden="true" />;
  }
}

interface TripDaysPanelProps {
  plan: TripPlanResponse;
  selectedDayIdx: number;
  onSelectDay: (idx: number) => void;
}

export default function TripDaysPanel({
  plan,
  selectedDayIdx,
  onSelectDay,
}: TripDaysPanelProps) {
  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, plan.days.length - 1));
  const activeDay = plan.days[safeDayIdx];

  return (
    <>
      {plan.days && plan.days.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
                Day-by-Day Exposure Plan
              </h3>
              <span className="text-xs text-on-surface-variant">
                Select a day to view morning-to-night guidance
              </span>
            </div>

            <div role="tablist" aria-label="Trip days" className="flex items-center gap-2 overflow-x-auto pb-1">
              {plan.days.map((d, idx) => {
                const isSelected = idx === safeDayIdx;
                const badge = getRiskMeta(d.risk_level);
                return (
                  <button
                    key={`${d.date}-${idx}`}
                    id={`trip-day-tab-${idx}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls="trip-day-tabpanel"
                    onClick={() => onSelectDay(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") {
                        e.preventDefault();
                        const next = (idx + 1) % plan.days.length;
                        onSelectDay(next);
                        document.getElementById(`trip-day-tab-${next}`)?.focus();
                      } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        const prev = (idx - 1 + plan.days.length) % plan.days.length;
                        onSelectDay(prev);
                        document.getElementById(`trip-day-tab-${prev}`)?.focus();
                      }
                    }}
                    className={`shrink-0 px-3.5 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 min-w-[140px] ${
                      isSelected
                        ? "bg-primary-container text-on-primary border-primary shadow-sm"
                        : "bg-surface-container-lowest hover:bg-surface-container text-on-surface border-outline-variant"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isSelected ? "bg-surface-container-lowest" : badge.dot
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold leading-tight">
                        Day {idx + 1} • {formatShortDate(d.date)}
                      </span>
                      <span
                        className={`text-xs truncate ${
                          isSelected ? "text-on-primary/85" : "text-on-surface-variant"
                        }`}
                      >
                        {d.place.split(",")[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {activeDay && (
            <div
              id="trip-day-tabpanel"
              role="tabpanel"
              aria-labelledby={`trip-day-tab-${safeDayIdx}`}
              className="p-4 md:p-6 rounded-3xl bg-surface-container-low border border-outline-variant flex flex-col gap-5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-7 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-on-surface font-headline">
                      {formatShortDate(activeDay.date)} — {activeDay.place}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        getRiskMeta(activeDay.risk_level).bg
                      } ${getRiskMeta(activeDay.risk_level).text} ${
                        getRiskMeta(activeDay.risk_level).border
                      }`}
                    >
                      {getRiskMeta(activeDay.risk_level).label}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant text-xs font-medium text-on-surface-variant">
                      {activeDay.data_basis === "forecast" ? "Forecast Data" : "Seasonal Estimate"}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
                    {activeDay.headline}
                  </p>
                </div>

                <div
                  className={`group lg:col-span-5 p-4 rounded-3xl border shadow-2xs hover:-translate-y-0.5 transition-all duration-300 flex items-start gap-3 ${
                    activeDay.best_outdoor_window.available
                      ? "bg-secondary-container/50 border-secondary/25"
                      : "bg-error-container/50 border-error/25"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 ${
                      activeDay.best_outdoor_window.available ? "text-secondary" : "text-error"
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        activeDay.best_outdoor_window.available ? "text-secondary" : "text-error"
                      }`}
                    >
                      Best Outdoor Window
                    </span>
                    <span className="text-sm font-extrabold text-on-surface">
                      {activeDay.best_outdoor_window.available
                        ? `${formatTimeTo12Hour(activeDay.best_outdoor_window.start)} – ${formatTimeTo12Hour(activeDay.best_outdoor_window.end)}`
                        : "Avoid Non-Essential Outdoor Time"}
                    </span>
                    <span className="text-xs text-on-surface-variant leading-snug">
                      {activeDay.best_outdoor_window.reason}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {activeDay.periods.map((per, idx) => {
                  const pBadge = getRiskMeta(per.risk_level);
                  return (
                    <div
                      key={idx}
                      className="group p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 shadow-2xs hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-primary-fixed/50 flex items-center justify-center shrink-0">
                            <PeriodIcon period={per.period} />
                          </div>
                          <div>
                            <span className="text-sm font-semibold capitalize text-on-surface group-hover:text-primary transition-colors block leading-tight">
                              {per.period}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {formatTimeTo12Hour(per.time_range)}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${pBadge.bg} ${pBadge.text} ${pBadge.border}`}>
                          {pBadge.shortLabel}
                        </span>
                      </div>

                      {activeDay.data_basis === "forecast" && (per.aqi || per.pm25) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {per.aqi ? (
                            <span className="text-xs font-bold text-primary bg-primary-fixed/60 px-2.5 py-0.5 rounded-full">
                              AQI {per.aqi}
                            </span>
                          ) : null}
                          {per.pm25 ? (
                            <span className="text-xs font-semibold text-on-primary-fixed-variant bg-primary-fixed/60 px-2.5 py-0.5 rounded-full">
                              PM2.5 {per.pm25} µg/m³
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-2 text-xs leading-snug">
                        <div className="p-2.5 rounded-2xl bg-secondary-container/40 border border-secondary/20 flex items-start gap-1.5 text-secondary">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            <strong>Do:</strong> <span className="text-on-surface">{per.do}</span>
                          </span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-error-container/45 border border-error/20 flex items-start gap-1.5 text-error">
                          <Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            <strong>Avoid:</strong>{" "}
                            <span className="text-on-surface">{per.avoid}</span>
                          </span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-surface-container flex items-start gap-1.5 text-on-surface-variant">
                          <Shield className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            <strong className="text-on-surface">Mask:</strong> {per.mask_advice}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-2xs flex items-start gap-3 text-xs">
                  <div aria-hidden="true" className="w-9 h-9 rounded-full bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-on-surface block mb-0.5">Indoor Air Tip</strong>
                    <span className="text-on-surface-variant leading-relaxed">
                      {activeDay.indoor_tip}
                    </span>
                  </div>
                </div>
                {activeDay.travel_tip && (
                  <div className="p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-2xs flex items-start gap-3 text-xs">
                    <div aria-hidden="true" className="w-9 h-9 rounded-full bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-on-surface block mb-0.5">Commute &amp; Travel Tip</strong>
                      <span className="text-on-surface-variant leading-relaxed">
                        {activeDay.travel_tip}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {plan.better_options && plan.better_options.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-secondary" aria-hidden="true" />
            Cleaner Alternatives &amp; Better Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {plan.better_options.map((opt, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-secondary-container/40 hover:bg-secondary-container/60 border border-secondary/25 shadow-2xs transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-secondary leading-snug">
                    {opt.suggestion}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest border border-secondary/25 text-xs font-bold text-secondary shrink-0">
                    {opt.expected_benefit} {opt.estimated ? "(Est.)" : ""}
                  </span>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">{opt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
