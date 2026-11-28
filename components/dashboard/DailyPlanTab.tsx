"use client";

import HourlyForecastChart from "./HourlyForecastChart";
import type { DashboardTab } from "@/hooks/useDashboardUi";
import { formatTimeTo12Hour } from "@/lib/airQuality";
import type { AirPlan, HourlyTimelinePoint } from "@/types/airPlan";

interface DailyPlanTabProps {
  aiPlan: AirPlan;
  locationName?: string;
  hourlyTimeline: HourlyTimelinePoint[];
  timelineMetric: "aqi" | "pm25";
  onChangeMetric: (metric: "aqi" | "pm25") => void;
  hoveredHourIdx: number | null;
  onHoverHour: (idx: number | null) => void;
  isLoadingTimeline: boolean;
  onNavigateTab: (tab: DashboardTab) => void;
}

export default function DailyPlanTab({
  aiPlan,
  locationName,
  hourlyTimeline,
  timelineMetric,
  onChangeMetric,
  hoveredHourIdx,
  onHoverHour,
  isLoadingTimeline,
  onNavigateTab,
}: DailyPlanTabProps) {
  return (
    <section className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container"
            >
              <span className="material-symbols-outlined text-xl">verified_user</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Safe Outdoor Window</h2>
              <p className="text-xs text-on-surface-variant">
                Best time for outdoor activities today
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-secondary-container/30 border border-secondary/25 flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-secondary text-3xl">
                  schedule
                </span>
                <span className="text-2xl font-bold text-secondary font-headline">
                  {aiPlan?.safe_outdoor_window
                    ? aiPlan.safe_outdoor_window.available
                      ? `${formatTimeTo12Hour(aiPlan.safe_outdoor_window.start)} – ${formatTimeTo12Hour(aiPlan.safe_outdoor_window.end)}`
                      : "No Safe Outdoor Window Today"
                    : `${formatTimeTo12Hour(aiPlan?.safeOutdoorWindow?.startTime) || "1:30 PM"} – ${formatTimeTo12Hour(aiPlan?.safeOutdoorWindow?.endTime) || "4:00 PM"}`}
                </span>
              </div>
              {(aiPlan?.safe_outdoor_window?.expected_pm25 != null ||
                aiPlan?.safeOutdoorWindow?.lowestEstimatedPm25 != null) && (
                <span className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-semibold">
                  Est. PM2.5:{" "}
                  {aiPlan?.safe_outdoor_window?.expected_pm25 ??
                    aiPlan?.safeOutdoorWindow?.lowestEstimatedPm25}{" "}
                  µg/m³
                </span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {aiPlan?.safe_outdoor_window?.reason ||
                aiPlan?.safeOutdoorWindow?.reasoning ||
                "Solar irradiation causes planetary boundary layer expansion, dispersing ground particulates."}
            </p>
            {aiPlan?.safe_outdoor_window?.best_for &&
              aiPlan.safe_outdoor_window.best_for.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiPlan.safe_outdoor_window.best_for.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/90 border border-secondary/25 text-xs font-medium text-secondary"
                    >
                      Best for: {tag}
                    </span>
                  ))}
                </div>
              )}
          </div>

          <HourlyForecastChart
            locationName={locationName}
            riskLevel={aiPlan?.status?.risk_level}
            hourlyTimeline={hourlyTimeline}
            timelineMetric={timelineMetric}
            onChangeMetric={onChangeMetric}
            hoveredHourIdx={hoveredHourIdx}
            onHoverHour={onHoverHour}
            isLoading={isLoadingTimeline}
          />
        </div>

        <div className="lg:col-span-4 bg-surface-container rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            {aiPlan?.impact_summary && (
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-bold text-sm shrink-0">
                  ~{aiPlan.impact_summary.estimated_exposure_reduction_pct}%
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Estimated Protection
                  </span>
                  <span className="text-xs font-semibold text-on-surface leading-snug">
                    {aiPlan.impact_summary.headline}
                  </span>
                </div>
              </div>
            )}

            {aiPlan?.outdoor_window_review && aiPlan.outdoor_window_review.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Your Usual Windows Review
                </span>
                {aiPlan.outdoor_window_review.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-on-surface">
                        {rev.usual_activity}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          rev.verdict === "keep"
                            ? "bg-secondary-container text-on-secondary-container"
                            : rev.verdict === "shift"
                              ? "bg-tertiary-fixed text-on-tertiary-fixed"
                              : "bg-error-container text-on-error-container"
                        }`}
                      >
                        {rev.verdict}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant leading-snug">
                      {rev.suggestion}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {aiPlan?.member_guidance && aiPlan.member_guidance.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Member Outdoor Limits
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("indoor-air-lab")}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    View all tips
                  </button>
                </div>
                {aiPlan.member_guidance.map((mg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant text-xs"
                  >
                    <span className="font-semibold text-on-surface capitalize">
                      {mg.member.replace("_", " ")}
                    </span>
                    <span className="text-secondary font-medium truncate max-w-[165px]">
                      {mg.outdoor_limit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("roadmap")}
            className="w-full h-10 rounded-full bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              route
            </span>
            <span>Open Checkable Roadmap</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-secondary text-2xl">
            schedule
          </span>
          <h3 className="text-lg font-bold text-on-surface">Daily Routine Plan</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(aiPlan?.daily_routine || []).map((routine, idx) => (
            <div
              key={idx}
              className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-outline-variant flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      routine.risk_level === "severe" || routine.risk_level === "high"
                        ? "bg-error-container text-on-error-container"
                        : routine.risk_level === "moderate"
                          ? "bg-tertiary-fixed text-on-tertiary-fixed"
                          : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    {routine.period} • {formatTimeTo12Hour(routine.time_range)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {routine.instead_of && (
                    <span className="text-xs text-on-surface-variant line-through">
                      Instead of: {routine.instead_of}
                    </span>
                  )}
                  <p className="text-xs font-bold text-on-surface leading-relaxed">
                    {routine.do_this}
                  </p>
                </div>

                {routine.why_it_matters && (
                  <details className="text-xs text-on-surface-variant">
                    <summary className="cursor-pointer font-semibold text-primary hover:underline">
                      Why it matters
                    </summary>
                    <p className="mt-1 leading-snug">{routine.why_it_matters}</p>
                  </details>
                )}
              </div>

              {routine.impact?.badge && (
                <div className="mt-4 p-2.5 rounded-2xl bg-surface-container flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary text-base shrink-0">
                    insights
                  </span>
                  <span className="text-xs font-semibold text-on-surface">
                    {routine.impact.badge}
                  </span>
                  {routine.impact.estimated && (
                    <span className="text-xs text-on-surface-variant ml-auto">(est.)</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {aiPlan?.safety_note && (
        <div className="p-4 rounded-2xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-xs text-on-surface">
          <span aria-hidden="true" className="material-symbols-outlined text-error text-xl shrink-0">
            medical_services
          </span>
          <p className="leading-relaxed">{aiPlan.safety_note}</p>
        </div>
      )}
    </section>
  );
}
