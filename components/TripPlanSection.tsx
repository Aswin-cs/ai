"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialLoader from "@/components/MaterialLoader";
import {
  MapPin,
  Calendar,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Circle,
  ShieldAlert,
  Backpack,
  Route,
  Wind,
  Home,
  Car,
  TrendingDown,
  Info,
  Pencil,
  Trash2,
  X,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Clock,
  Ban,
  Shield,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Check,
} from "lucide-react";

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

type RiskLevel = "low" | "moderate" | "high" | "severe";

function getRiskMeta(risk: RiskLevel) {
  switch (risk) {
    case "low":
      return {
        label: "Low Risk",
        shortLabel: "Low",
        bg: "bg-[#E6F4EA]",
        text: "text-[#137333]",
        border: "border-[#CEEAD6]",
        leftBorder: "border-l-[#137333]",
        dot: "bg-[#137333]",
      };
    case "moderate":
      return {
        label: "Moderate Risk",
        shortLabel: "Moderate",
        bg: "bg-[#FEF7E0]",
        text: "text-[#B06000]",
        border: "border-[#FCE8B2]",
        leftBorder: "border-l-[#E37400]",
        dot: "bg-[#E37400]",
      };
    case "high":
      return {
        label: "High Risk",
        shortLabel: "High",
        bg: "bg-[#FFF0E6]",
        text: "text-[#D9381E]",
        border: "border-[#FFCCB2]",
        leftBorder: "border-l-[#D9381E]",
        dot: "bg-[#D9381E]",
      };
    case "severe":
      return {
        label: "Severe Risk",
        shortLabel: "Severe",
        bg: "bg-[#FCE8E6]",
        text: "text-[#C5221F]",
        border: "border-[#FAD2CF]",
        leftBorder: "border-l-[#C5221F]",
        dot: "bg-[#C5221F]",
      };
  }
}

function getPeriodIcon(period: "morning" | "afternoon" | "evening" | "night") {
  switch (period) {
    case "morning":
      return <Sunrise className="w-4 h-4 text-[#E37400]" />;
    case "afternoon":
      return <Sun className="w-4 h-4 text-[#D97706]" />;
    case "evening":
      return <Sunset className="w-4 h-4 text-[#D9381E]" />;
    case "night":
      return <Moon className="w-4 h-4 text-[#0B57D0]" />;
  }
}

function formatShortDate(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function ProgressBar({
  done,
  total,
  label,
  accentClass = "bg-[#0B57D0]",
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
        className="flex-1 h-2 rounded-full bg-[#E0E3E1] overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${accentClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-[#444746] tabular-nums shrink-0">
        {done}/{total} ({pct}%)
      </span>
    </div>
  );
}

interface TripPlanProgress {
  roadmapSteps?: string[];
  packingItems?: string[];
}

interface TripPlanSectionProps {
  tripPlanId?: string | null;
  plan: TripPlanResponse | null;
  initialProgress?: TripPlanProgress | null;
  isLoading: boolean;
  error: string | null;
  onEditTrip: () => void;
  onClose: () => void;
  onDelete: () => void;
  onProgressSaved?: (
    tripPlanId: string,
    progress: { roadmapSteps: string[]; packingItems: string[] }
  ) => void;
}

export default function TripPlanSection({
  tripPlanId = null,
  plan,
  initialProgress = null,
  isLoading,
  error,
  onEditTrip,
  onClose,
  onDelete,
  onProgressSaved,
}: TripPlanSectionProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(
    () => new Set(initialProgress?.roadmapSteps || [])
  );
  const [checkedPacking, setCheckedPacking] = useState<Set<string>>(
    () => new Set(initialProgress?.packingItems || [])
  );
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressSaved, setProgressSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setCheckedSteps(new Set(initialProgress?.roadmapSteps || []));
    setCheckedPacking(new Set(initialProgress?.packingItems || []));
    setHasUnsavedChanges(false);
    setProgressSaved(false);
    setSaveError(null);
  }, [tripPlanId, initialProgress]);

  const totalRoadmapSteps = useMemo(
    () => (plan?.roadmap || []).reduce((acc, ph) => acc + ph.steps.length, 0),
    [plan]
  );
  const completedRoadmapSteps = useMemo(
    () =>
      (plan?.roadmap || []).reduce(
        (acc, ph) => acc + ph.steps.filter((s) => checkedSteps.has(s.id)).length,
        0
      ),
    [plan, checkedSteps]
  );

  const sortedPackingList = useMemo(() => {
    const priorityOrder: Record<"must" | "recommended" | "optional", number> = {
      must: 0,
      recommended: 1,
      optional: 2,
    };
    return [...(plan?.packing_list || [])].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }, [plan]);

  const completedPackingCount = useMemo(
    () => sortedPackingList.filter((p) => checkedPacking.has(p.item)).length,
    [sortedPackingList, checkedPacking]
  );

  if (isLoading) {
    return (
      <section
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="w-full rounded-3xl bg-surface-container-lowest border border-[#D3E3FD] shadow-xs p-8 md:p-10 flex items-center justify-center"
      >
        <MaterialLoader
          title="Building Your Trip & Outdoor Plan"
          subtitle="Checking multi-day Open-Meteo air quality forecasts for your destinations and personalizing every time period for your household..."
          steps={[
            { label: "Fetching hourly air quality for destinations", done: true },
            { label: "Evaluating household exposure windows", active: true },
            { label: "Generating packing list & cleaner alternatives" },
          ]}
        />
      </section>
    );
  }

  if (error) {
    return (
      <section
        role="alert"
        className="w-full rounded-3xl bg-[#FCE8E6]/60 border border-[#FAD2CF] p-5 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#C5221F] shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-[#C5221F]">Could not generate Trip Plan</p>
            <p className="text-xs text-[#444746]">{error}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEditTrip}
            className="px-4 py-2 rounded-full bg-white border border-[#C4C7C5] text-xs font-semibold text-[#1F1F1F] hover:bg-[#F8FAFD] cursor-pointer"
          >
            Edit Trip
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close error message"
            className="p-2 rounded-full hover:bg-white/70 text-[#444746] cursor-pointer"
            title="Close window"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }

  if (!plan) return null;

  const summaryRisk = getRiskMeta(plan.trip_summary.overall_risk);
  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, plan.days.length - 1));
  const activeDay = plan.days[safeDayIdx];

  const toggleStep = (id: string) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setHasUnsavedChanges(true);
    setProgressSaved(false);
    setSaveError(null);
  };

  const togglePacking = (item: string) => {
    setCheckedPacking((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
    setHasUnsavedChanges(true);
    setProgressSaved(false);
    setSaveError(null);
  };

  const handleSaveTripProgress = async () => {
    if (!tripPlanId) return;
    setIsSavingProgress(true);
    setProgressSaved(false);
    setSaveError(null);
    const payload = {
      tripPlanId,
      roadmapSteps: Array.from(checkedSteps),
      packingItems: Array.from(checkedPacking),
    };
    try {
      const res = await fetch("/api/ai/trip-plan/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setSaveError(data?.error || "Failed to save selections.");
      } else {
        setHasUnsavedChanges(false);
        setProgressSaved(true);
        onProgressSaved?.(tripPlanId, {
          roadmapSteps: data.progress?.roadmapSteps ?? payload.roadmapSteps,
          packingItems: data.progress?.packingItems ?? payload.packingItems,
        });
        setTimeout(() => setProgressSaved(false), 3000);
      }
    } catch {
      setSaveError("Network error while saving selections.");
    } finally {
      setIsSavingProgress(false);
    }
  };

  return (
    <section className="w-full rounded-3xl bg-surface-container-lowest border border-[#D3E3FD] shadow-xs p-5 md:p-8 flex flex-col gap-7 animate-fade-in">
      {/* 1. HERO SUMMARY HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 pb-6 border-b border-[#E0E3E1]">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DAE2FF] text-[#0041A2] text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Planning Assist
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${summaryRisk.bg} ${summaryRisk.text} ${summaryRisk.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${summaryRisk.dot}`} />
              {summaryRisk.label}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#F0F4F9] text-[#444746] text-[11px] font-medium">
              {plan.trip_summary.duration_days}{" "}
              {plan.trip_summary.duration_days === 1 ? "Day" : "Days"} • Confidence:{" "}
              <strong className="capitalize text-[#1F1F1F]">{plan.data_confidence}</strong>
            </span>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1F1F1F] font-headline tracking-tight">
              {plan.trip_summary.title}
            </h2>
            <p className="text-sm md:text-base font-medium text-[#444746] mt-1 leading-relaxed">
              {plan.trip_summary.headline}
            </p>
          </div>

          {/* Top 3 Advice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {plan.trip_summary.top_advice.map((tip, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-[#DAE2FF] text-[#0B57D0] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-[#1F1F1F] leading-snug font-medium">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Actions + Impact Card */}
        <div className="flex flex-col items-stretch lg:items-end gap-3 shrink-0 lg:w-72">
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <button
              type="button"
              onClick={onEditTrip}
              className="px-3.5 py-2 rounded-full bg-[#F0F4F9] hover:bg-[#DAE2FF] text-[#0B57D0] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-3.5 py-2 rounded-full bg-[#FCE8E6] hover:bg-[#FAD2CF] text-[#C5221F] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete this trip plan"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-full bg-[#F0F4F9] hover:bg-[#E0E3E1] text-[#444746] text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Close plan window"
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#E6F4EA]/80 border border-[#CEEAD6] flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#137333] flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 shrink-0" />
                Est. Impact
              </span>
              <span className="text-xl font-extrabold text-[#137333] tabular-nums">
                ~{plan.impact_summary.estimated_exposure_reduction_pct}%
              </span>
            </div>
            <p className="text-xs text-[#1F1F1F] leading-snug font-medium">
              {plan.impact_summary.headline}
            </p>
          </div>
        </div>
      </div>

      {/* 2. ALERTS (IF ANY) */}
      {plan.alerts && plan.alerts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#C5221F]" />
            Key Air Quality Alerts ({plan.alerts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.alerts.map((alert, idx) => {
              const isCritical = alert.severity === "critical";
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border border-l-4 flex items-start gap-3 ${isCritical
                      ? "bg-[#FCE8E6]/70 border-[#FAD2CF] border-l-[#C5221F]"
                      : "bg-[#FEF7E0]/80 border-[#FCE8B2] border-l-[#E37400]"
                    }`}
                >
                  <ShieldAlert
                    className={`w-5 h-5 shrink-0 mt-0.5 ${isCritical ? "text-[#C5221F]" : "text-[#B06000]"
                      }`}
                  />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isCritical
                            ? "bg-[#C5221F] text-white"
                            : "bg-[#E37400] text-white"
                          }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] font-bold text-[#444746]">
                        {formatShortDate(alert.date)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#1F1F1F] leading-snug">{alert.message}</p>
                    <p className="text-[11px] text-[#444746] bg-white/70 px-2.5 py-1.5 rounded-lg border border-black/5">
                      <strong className="text-[#1F1F1F]">Action:</strong> {alert.action}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DESTINATIONS OVERVIEW */}
      {plan.places_overview && plan.places_overview.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0B57D0]" />
            Destinations Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {plan.places_overview.map((p, idx) => {
              const badge = getRiskMeta(p.risk_level);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] border-l-4 ${badge.leftBorder} flex flex-col gap-2.5`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#1F1F1F] truncate">{p.place}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.shortLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E0E3E1] text-[#444746]">
                      Concern: <strong className="uppercase text-[#1F1F1F]">{p.main_concern}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#137333] font-medium">
                      Best: <strong>{formatShortDate(p.best_day)}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#FCE8E6] text-[#C5221F] font-medium">
                      Worst: <strong>{formatShortDate(p.worst_day)}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-[#444746] leading-relaxed">{p.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. DAY-BY-DAY EXPOSURE PLAN */}
      {plan.days && plan.days.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0B57D0]" />
                Day-by-Day Exposure Plan
              </h3>
              <span className="text-[11px] text-[#444746]">
                Select a day to view morning-to-night guidance
              </span>
            </div>

            {/* Horizontal Scrollable Day Strip */}
            <div
              role="tablist"
              aria-label="Trip days"
              className="flex items-center gap-2 overflow-x-auto pb-1"
            >
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
                    onClick={() => setSelectedDayIdx(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") {
                        e.preventDefault();
                        const next = (idx + 1) % plan.days.length;
                        setSelectedDayIdx(next);
                        document.getElementById(`trip-day-tab-${next}`)?.focus();
                      } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        const prev = (idx - 1 + plan.days.length) % plan.days.length;
                        setSelectedDayIdx(prev);
                        document.getElementById(`trip-day-tab-${prev}`)?.focus();
                      }
                    }}
                    className={`shrink-0 px-3.5 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 min-w-[140px] ${isSelected
                        ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-sm"
                        : "bg-white hover:bg-[#F0F4F9] text-[#1F1F1F] border-[#C4C7C5]"
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? "bg-white" : badge.dot
                        }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold leading-tight">
                        Day {idx + 1} • {formatShortDate(d.date)}
                      </span>
                      <span
                        className={`text-[10.5px] truncate ${isSelected ? "text-white/85" : "text-[#444746]"
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
              className="p-4 md:p-6 rounded-3xl bg-[#F8FAFD] border border-[#E0E3E1] flex flex-col gap-5"
            >
              {/* Active Day Header + Prominent Best Outdoor Window */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-7 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-[#1F1F1F] font-headline">
                      {formatShortDate(activeDay.date)} — {activeDay.place}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getRiskMeta(activeDay.risk_level).bg
                        } ${getRiskMeta(activeDay.risk_level).text} ${getRiskMeta(activeDay.risk_level).border
                        }`}
                    >
                      {getRiskMeta(activeDay.risk_level).label}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E0E3E1] text-[10.5px] font-medium text-[#444746]">
                      {activeDay.data_basis === "forecast" ? "Forecast Data" : "Seasonal Estimate"}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-[#444746] leading-relaxed">
                    {activeDay.headline}
                  </p>
                </div>

                {/* Best Outdoor Window Spotlight */}
                <div
                  className={`lg:col-span-5 p-4 rounded-2xl border flex items-start gap-3 ${activeDay.best_outdoor_window.available
                      ? "bg-[#E6F4EA] border-[#CEEAD6]"
                      : "bg-[#FCE8E6]/80 border-[#FAD2CF]"
                    }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeDay.best_outdoor_window.available
                        ? "bg-white text-[#137333]"
                        : "bg-white text-[#C5221F]"
                      }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={`text-[10.5px] font-bold uppercase tracking-wider ${activeDay.best_outdoor_window.available
                          ? "text-[#137333]"
                          : "text-[#C5221F]"
                        }`}
                    >
                      Best Outdoor Window
                    </span>
                    <span className="text-sm font-extrabold text-[#1F1F1F]">
                      {activeDay.best_outdoor_window.available
                        ? `${activeDay.best_outdoor_window.start} – ${activeDay.best_outdoor_window.end}`
                        : "Avoid Non-Essential Outdoor Time"}
                    </span>
                    <span className="text-[11px] text-[#444746] leading-snug">
                      {activeDay.best_outdoor_window.reason}
                    </span>
                  </div>
                </div>
              </div>

              {/* Time-of-Day Periods Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {activeDay.periods.map((per, idx) => {
                  const pBadge = getRiskMeta(per.risk_level);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl bg-white border border-[#E0E3E1] border-l-4 ${pBadge.leftBorder} flex flex-col gap-3 shadow-2xs`}
                    >
                      {/* Period Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#F0F4F9] flex items-center justify-center shrink-0">
                            {getPeriodIcon(per.period)}
                          </div>
                          <div>
                            <span className="text-xs font-bold capitalize text-[#1F1F1F] block leading-tight">
                              {per.period}
                            </span>
                            <span className="text-[10.5px] text-[#444746]">{per.time_range}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${pBadge.bg} ${pBadge.text} ${pBadge.border}`}
                        >
                          {pBadge.shortLabel}
                        </span>
                      </div>

                      {/* Forecast Numbers */}
                      {activeDay.data_basis === "forecast" && (per.aqi || per.pm25) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {per.aqi ? (
                            <span className="text-[11px] font-bold text-[#0B57D0] bg-[#EAF2FD] px-2 py-0.5 rounded-md">
                              AQI {per.aqi}
                            </span>
                          ) : null}
                          {per.pm25 ? (
                            <span className="text-[11px] font-semibold text-[#0041A2] bg-[#EAF2FD] px-2 py-0.5 rounded-md">
                              PM2.5 {per.pm25} µg/m³
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Do / Avoid / Mask Distinct Blocks */}
                      <div className="flex flex-col gap-2 text-[11px] leading-snug">
                        <div className="p-2 rounded-xl bg-[#E6F4EA]/60 border border-[#CEEAD6]/70 flex items-start gap-1.5 text-[#137333]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <strong>Do:</strong> <span className="text-[#1F1F1F]">{per.do}</span>
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#FCE8E6]/60 border border-[#FAD2CF]/70 flex items-start gap-1.5 text-[#C5221F]">
                          <Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            <strong>Avoid:</strong>{" "}
                            <span className="text-[#1F1F1F]">{per.avoid}</span>
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#F0F4F9] flex items-start gap-1.5 text-[#444746]">
                          <Shield className="w-3.5 h-3.5 text-[#0B57D0] shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-[#1F1F1F]">Mask:</strong> {per.mask_advice}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indoor & Travel Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-[#E0E3E1] flex items-start gap-3 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF2FD] text-[#0B57D0] flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#1F1F1F] block mb-0.5">Indoor Air Tip</strong>
                    <span className="text-[#444746] leading-relaxed">{activeDay.indoor_tip}</span>
                  </div>
                </div>
                {activeDay.travel_tip && (
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E0E3E1] flex items-start gap-3 text-xs">
                    <div className="w-8 h-8 rounded-xl bg-[#EAF2FD] text-[#0B57D0] flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-[#1F1F1F] block mb-0.5">Commute &amp; Travel Tip</strong>
                      <span className="text-[#444746] leading-relaxed">{activeDay.travel_tip}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. BETTER OPTIONS (IF ANY) */}
      {plan.better_options && plan.better_options.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-[#137333]" />
            Cleaner Alternatives &amp; Better Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {plan.better_options.map((opt, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#E6F4EA]/55 border border-[#CEEAD6] flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-[#137333] leading-snug">
                    {opt.suggestion}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#CEEAD6] text-[10px] font-bold text-[#137333] shrink-0">
                    {opt.expected_benefit} {opt.estimated ? "(Est.)" : ""}
                  </span>
                </div>
                <p className="text-xs text-[#1F1F1F] leading-relaxed">{opt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ROADMAP + PACKING LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3-Phase Roadmap */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5 shrink-0">
              <Route className="w-4 h-4 text-[#0B57D0]" />
              3-Phase Action Roadmap
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="sm:w-48">
                <ProgressBar
                  done={completedRoadmapSteps}
                  total={totalRoadmapSteps}
                  label="Trip action roadmap progress"
                  accentClass="bg-[#0B57D0]"
                />
              </div>
              {tripPlanId && (
                <button
                  type="button"
                  onClick={handleSaveTripProgress}
                  disabled={isSavingProgress}
                  className={`h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                    progressSaved
                      ? "bg-[#137333] text-white"
                      : hasUnsavedChanges
                        ? "bg-[#0B57D0] hover:bg-[#0842A0] text-white"
                        : "bg-[#F0F4F9] hover:bg-[#E1E7F0] text-[#1F1F1F] border border-[#E0E3E1]"
                  }`}
                >
                  {isSavingProgress ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : progressSaved ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {isSavingProgress ? "Saving..." : progressSaved ? "Saved!" : "Save Progress"}
                  </span>
                </button>
              )}
            </div>
          </div>
          {saveError && (
            <p role="alert" className="text-xs text-[#C5221F] font-medium">
              {saveError}
            </p>
          )}

          <div className="flex flex-col gap-3.5">
            {plan.roadmap.map((phase) => {
              const phaseDone = phase.steps.filter((s) => checkedSteps.has(s.id)).length;
              return (
                <div
                  key={phase.phase}
                  className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10.5px] font-bold text-[#0B57D0] uppercase tracking-wider">
                        {phase.phase.replace("_", " ")}
                      </span>
                      <h4 className="text-sm font-bold text-[#1F1F1F]">{phase.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#444746]">{phase.goal}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-[#E0E3E1] text-[10.5px] font-bold text-[#0B57D0]">
                        {phaseDone}/{phase.steps.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {phase.steps.map((s) => {
                      const done = checkedSteps.has(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          onClick={() => toggleStep(s.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${done
                              ? "bg-[#E6F4EA]/50 border-[#CEEAD6] opacity-75"
                              : "bg-white border-[#E0E3E1] hover:border-[#A8C7FA]"
                            }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#747775] shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span
                                className={`text-xs font-semibold ${done ? "line-through text-[#444746]" : "text-[#1F1F1F]"
                                  }`}
                              >
                                {s.action}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-[#EAF2FD] text-[#0B57D0] text-[10px] font-semibold">
                                {s.impact_badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#444746] mt-1 leading-snug">{s.why}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-[#444746]">
                              <span className="px-2 py-0.5 rounded-md bg-[#F0F4F9]">{s.when}</span>
                              <span className="px-2 py-0.5 rounded-md bg-[#F0F4F9]">{s.who}</span>
                              <span className="px-2 py-0.5 rounded-md bg-[#F0F4F9] capitalize">
                                {s.effort} effort
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#F0F4F9] capitalize">
                                {s.cost} cost
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Packing List */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
              <Backpack className="w-4 h-4 text-[#0B57D0]" />
              Packing Checklist
            </h3>
            <ProgressBar
              done={completedPackingCount}
              total={sortedPackingList.length}
              label="Packing checklist progress"
              accentClass="bg-[#137333]"
            />
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] flex flex-col gap-2">
            {sortedPackingList.map((pkg, idx) => {
              const checked = checkedPacking.has(pkg.item);
              return (
                <button
                  key={idx}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => togglePacking(pkg.item)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${checked
                      ? "bg-[#E6F4EA]/50 border-[#CEEAD6] opacity-75"
                      : "bg-white border-[#E0E3E1] hover:border-[#A8C7FA]"
                    }`}
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#747775] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`text-xs font-semibold ${checked ? "line-through text-[#444746]" : "text-[#1F1F1F]"
                          }`}
                      >
                        {pkg.item}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase shrink-0 ${pkg.priority === "must"
                            ? "bg-[#FCE8E6] text-[#C5221F]"
                            : pkg.priority === "recommended"
                              ? "bg-[#FEF7E0] text-[#B06000]"
                              : "bg-[#F0F4F9] text-[#444746]"
                          }`}
                      >
                        {pkg.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#444746] mt-0.5 leading-snug">{pkg.reason}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. ASSUMPTIONS & SAFETY NOTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-[#E0E3E1]">
        <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] text-xs">
          <button
            type="button"
            aria-expanded={showAssumptions}
            aria-controls="trip-assumptions-list"
            onClick={() => setShowAssumptions((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 font-bold text-[#1F1F1F] cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#0B57D0]" aria-hidden="true" />
              Assumptions &amp; Forecast Notes ({plan.assumptions.length + 1})
            </span>
            {showAssumptions ? (
              <ChevronUp className="w-4 h-4 text-[#444746]" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#444746]" aria-hidden="true" />
            )}
          </button>
          {showAssumptions && (
            <ul id="trip-assumptions-list" className="list-disc pl-4 space-y-1.5 text-[11px] text-[#444746] mt-2.5 pt-2 border-t border-[#E0E3E1]">
              {plan.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
              <li>{plan.impact_summary.assumptions_note}</li>
            </ul>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-[#FCE8E6]/55 border border-[#FAD2CF] text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#C5221F] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#C5221F] block mb-0.5">Medical &amp; Safety Note</strong>
            <p className="text-[11px] text-[#1F1F1F] leading-relaxed">{plan.safety_note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
