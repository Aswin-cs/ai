"use client";

export interface TripPlanResponse {
  trip_summary: {
    title: string;
    start: string;
    end: string;
    duration_days: number;
    overall_risk: "low" | "moderate" | "high" | "severe";
    headline: string;
    top_advice: string[];
  };
  places_overview: Array<{
    place: string;
    risk_level: "low" | "moderate" | "high" | "severe";
    main_concern: "pm25" | "pm10" | "ozone" | "no2" | "mixed";
    best_day: string;
    worst_day: string;
    note: string;
  }>;
  days: Array<{
    date: string;
    place: string;
    risk_level: "low" | "moderate" | "high" | "severe";
    data_basis: "forecast" | "seasonal_estimate";
    headline: string;
    periods: Array<{
      period: "morning" | "afternoon" | "evening" | "night";
      time_range: string;
      risk_level: "low" | "moderate" | "high" | "severe";
      aqi?: number;
      pm25?: number;
      do: string;
      avoid: string;
      mask_advice: string;
    }>;
    best_outdoor_window: {
      available: boolean;
      start: string;
      end: string;
      reason: string;
    };
    indoor_tip: string;
    travel_tip?: string;
  }>;
  alerts: Array<{
    date: string;
    severity: "info" | "warning" | "critical";
    message: string;
    action: string;
  }>;
  better_options: Array<{
    suggestion: string;
    reason: string;
    expected_benefit: string;
    estimated: boolean;
  }>;
  packing_list: Array<{
    item: string;
    reason: string;
    priority: "must" | "recommended" | "optional";
  }>;
  roadmap: Array<{
    phase: "before_trip" | "during_trip" | "after_trip";
    title: string;
    goal: string;
    steps: Array<{
      id: string;
      action: string;
      when: string;
      who: string;
      why: string;
      impact_badge: string;
      effort: "easy" | "medium" | "hard";
      cost: "free" | "low" | "medium";
    }>;
  }>;
  impact_summary: {
    headline: string;
    estimated_exposure_reduction_pct: number;
    assumptions_note: string;
  };
  assumptions: string[];
  safety_note: string;
  data_confidence: "high" | "medium" | "low";
}

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export function getRiskMeta(risk: RiskLevel) {
  switch (risk) {
    case "low":
      return {
        label: "Low Risk",
        shortLabel: "Low",
        bg: "bg-secondary-container",
        text: "text-on-secondary-container",
        border: "border-secondary/30",
        dot: "bg-secondary",
      };
    case "moderate":
      return {
        label: "Moderate Risk",
        shortLabel: "Moderate",
        bg: "bg-tertiary-fixed",
        text: "text-on-tertiary-fixed",
        border: "border-tertiary/30",
        dot: "bg-tertiary",
      };
    case "high":
      return {
        label: "High Risk",
        shortLabel: "High",
        bg: "bg-tertiary-fixed",
        text: "text-on-tertiary-fixed-variant",
        border: "border-tertiary/40",
        dot: "bg-tertiary",
      };
    case "severe":
      return {
        label: "Severe Risk",
        shortLabel: "Severe",
        bg: "bg-error-container",
        text: "text-on-error-container",
        border: "border-error/30",
        dot: "bg-error",
      };
  }
}

export function formatShortDate(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function TripProgressBar({
  done,
  total,
  label,
  accentClass = "bg-primary",
}: {
  done: number;
  total: number;
  label: string;
  accentClass?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5 w-full">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        className="flex-1 h-2 rounded-full bg-outline-variant overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${accentClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-on-surface-variant tabular-nums shrink-0">
        {done}/{total} ({pct}%)
      </span>
    </div>
  );
}
