"use client";

import { useState } from "react";
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

function getRiskBadge(risk: "low" | "moderate" | "high" | "severe") {
  switch (risk) {
    case "low":
      return {
        label: "Low Risk",
        bg: "bg-[#E6F4EA]",
        text: "text-[#137333]",
        border: "border-[#CEEAD6]",
      };
    case "moderate":
      return {
        label: "Moderate Risk",
        bg: "bg-[#FEF7E0]",
        text: "text-[#B06000]",
        border: "border-[#FCE8B2]",
      };
    case "high":
      return {
        label: "High Risk",
        bg: "bg-[#FFF0E6]",
        text: "text-[#D9381E]",
        border: "border-[#FFCCB2]",
      };
    case "severe":
      return {
        label: "Severe Risk",
        bg: "bg-[#FCE8E6]",
        text: "text-[#C5221F]",
        border: "border-[#FAD2CF]",
      };
  }
}

interface TripPlanSectionProps {
  plan: TripPlanResponse | null;
  isLoading: boolean;
  error: string | null;
  onEditTrip: () => void;
  onClose: () => void;
  onDelete: () => void;
}

export default function TripPlanSection({
  plan,
  isLoading,
  error,
  onEditTrip,
  onClose,
  onDelete,
}: TripPlanSectionProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());
  const [checkedPacking, setCheckedPacking] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <section className="w-full rounded-3xl bg-surface-container-lowest border border-[#D3E3FD] shadow-xs p-6 md:p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#DAE2FF] text-[#0B57D0] flex items-center justify-center animate-pulse">
          <Route className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-on-surface">
          Building Your VayuPulse Trip &amp; Outdoor Plan...
        </h2>
        <p className="text-xs text-on-surface-variant max-w-md">
          Checking multi-day Open-Meteo air quality forecasts for your destinations and personalizing every time period for your household.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full rounded-3xl bg-[#FCE8E6]/60 border border-[#FAD2CF] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#C5221F] shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#C5221F]">Could not generate Trip Plan</p>
            <p className="text-xs text-[#444746]">{error}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEditTrip}
            className="px-3.5 py-1.5 rounded-full bg-white border border-[#C4C7C5] text-xs font-semibold text-[#1F1F1F] hover:bg-[#F8FAFD] cursor-pointer"
          >
            Edit Trip
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/70 text-[#444746] cursor-pointer"
            title="Close window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </section>
    );
  }

  if (!plan) return null;

  const summaryRisk = getRiskBadge(plan.trip_summary.overall_risk);
  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, plan.days.length - 1));
  const activeDay = plan.days[safeDayIdx];

  const toggleStep = (id: string) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePacking = (item: string) => {
    setCheckedPacking((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  return (
    <section className="w-full rounded-3xl bg-surface-container-lowest border border-[#D3E3FD] shadow-xs p-5 md:p-7 flex flex-col gap-6 animate-fade-in">
      {/* Top Bar: Trip Summary + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-[#E0E3E1]">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DAE2FF] text-[#0041A2] text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Planning Assist
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold border ${summaryRisk.bg} ${summaryRisk.text} ${summaryRisk.border}`}
            >
              {summaryRisk.label}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#F0F4F9] text-[#444746] text-[11px] font-medium">
              {plan.trip_summary.duration_days} {plan.trip_summary.duration_days === 1 ? "Day" : "Days"} • Confidence:{" "}
              <strong className="capitalize">{plan.data_confidence}</strong>
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-[#1F1F1F] font-headline">
            {plan.trip_summary.title}
          </h2>
          <p className="text-sm font-medium text-[#444746]">{plan.trip_summary.headline}</p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {plan.trip_summary.top_advice.map((tip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFD] border border-[#E0E3E1] text-xs text-[#1F1F1F]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0B57D0] shrink-0" />
                {tip}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onEditTrip}
              className="px-3.5 py-2 rounded-full bg-[#F0F4F9] hover:bg-[#DAE2FF] text-[#0B57D0] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Trip
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-3.5 py-2 rounded-full bg-[#FCE8E6] hover:bg-[#FAD2CF] text-[#C5221F] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete this trip plan"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Plan
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

          {/* Impact Summary Pill */}
          <div className="p-3.5 rounded-2xl bg-[#E6F4EA]/70 border border-[#CEEAD6] max-w-xs">
            <div className="flex items-center gap-2 text-[#137333] font-bold text-xs">
              <TrendingDown className="w-4 h-4 shrink-0" />
              <span>Est. ~{plan.impact_summary.estimated_exposure_reduction_pct}% exposure reduction</span>
            </div>
            <p className="text-[11px] text-[#1F1F1F] mt-1 leading-snug">
              {plan.impact_summary.headline}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts (if any) */}
      {plan.alerts && plan.alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plan.alerts.map((alert, idx) => {
            const isCritical = alert.severity === "critical";
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isCritical
                    ? "bg-[#FCE8E6]/70 border-[#FAD2CF]"
                    : "bg-[#FEF7E0]/80 border-[#FCE8B2]"
                }`}
              >
                <ShieldAlert
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    isCritical ? "text-[#C5221F]" : "text-[#B06000]"
                  }`}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#444746]">
                    {alert.date} • {alert.severity}
                  </span>
                  <p className="text-xs font-semibold text-[#1F1F1F]">{alert.message}</p>
                  <p className="text-[11px] text-[#444746]">Action: {alert.action}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Places Overview */}
      {plan.places_overview && plan.places_overview.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0B57D0]" />
            Destinations Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {plan.places_overview.map((p, idx) => {
              const badge = getRiskBadge(p.risk_level);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#1F1F1F] truncate">{p.place}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#444746] flex flex-wrap gap-x-3 gap-y-1">
                    <span>Concern: <strong className="uppercase">{p.main_concern}</strong></span>
                    <span>Best: <strong>{p.best_day}</strong></span>
                    <span>Worst: <strong>{p.worst_day}</strong></span>
                  </div>
                  <p className="text-xs text-[#1F1F1F] leading-snug">{p.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day-by-Day Schedule */}
      {plan.days && plan.days.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0B57D0]" />
              Day-by-Day Exposure Plan
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {plan.days.map((d, idx) => {
                const isSelected = idx === safeDayIdx;
                const badge = getRiskBadge(d.risk_level);
                return (
                  <button
                    key={`${d.date}-${idx}`}
                    type="button"
                    onClick={() => setSelectedDayIdx(idx)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-xs"
                        : "bg-white hover:bg-[#F0F4F9] text-[#1F1F1F] border-[#C4C7C5]"
                    }`}
                  >
                    <span>{d.date}</span>
                    <span className="opacity-80">• {d.place.split(",")[0]}</span>
                    {!isSelected && (
                      <span className={`w-2 h-2 rounded-full ${badge.bg} border ${badge.border}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {activeDay && (
            <div className="p-4 md:p-5 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-[#1F1F1F]">
                      {activeDay.date} — {activeDay.place}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                        getRiskBadge(activeDay.risk_level).bg
                      } ${getRiskBadge(activeDay.risk_level).text} ${
                        getRiskBadge(activeDay.risk_level).border
                      }`}
                    >
                      {getRiskBadge(activeDay.risk_level).label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#E0E3E1] text-[10px] font-medium text-[#444746]">
                      {activeDay.data_basis === "forecast" ? "Forecast Data" : "Seasonal Estimate"}
                    </span>
                  </div>
                  <p className="text-xs text-[#444746] mt-1">{activeDay.headline}</p>
                </div>

                {/* Best Outdoor Window */}
                <div className="px-3.5 py-2 rounded-xl bg-[#E6F4EA] border border-[#CEEAD6] text-xs">
                  <span className="font-bold text-[#137333] block">
                    {activeDay.best_outdoor_window.available
                      ? `Best Outdoor Window: ${activeDay.best_outdoor_window.start} – ${activeDay.best_outdoor_window.end}`
                      : "Outdoor Window: Avoid non-essential outdoor time"}
                  </span>
                  <span className="text-[11px] text-[#1F1F1F]">
                    {activeDay.best_outdoor_window.reason}
                  </span>
                </div>
              </div>

              {/* Periods Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeDay.periods.map((per, idx) => {
                  const pBadge = getRiskBadge(per.risk_level);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-[#E0E3E1] flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold capitalize text-[#1F1F1F]">
                          {per.period}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pBadge.bg} ${pBadge.text} ${pBadge.border}`}
                        >
                          {pBadge.label}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-[#444746]">{per.time_range}</span>
                      {activeDay.data_basis === "forecast" && (per.aqi || per.pm25) ? (
                        <div className="text-[11px] font-semibold text-[#0B57D0] bg-[#EAF2FD] px-2 py-1 rounded-lg">
                          {per.aqi ? `AQI ${per.aqi}` : ""}
                          {per.aqi && per.pm25 ? " • " : ""}
                          {per.pm25 ? `PM2.5 ${per.pm25} µg/m³` : ""}
                        </div>
                      ) : null}
                      <p className="text-[11px] text-[#137333] leading-snug">
                        <strong>Do:</strong> {per.do}
                      </p>
                      <p className="text-[11px] text-[#C5221F] leading-snug">
                        <strong>Avoid:</strong> {per.avoid}
                      </p>
                      <p className="text-[10.5px] text-[#444746] leading-snug border-t border-[#F0F4F9] pt-1.5">
                        <strong>Mask:</strong> {per.mask_advice}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Indoor & Travel Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E0E3E1] flex items-start gap-2.5 text-xs">
                  <Home className="w-4 h-4 text-[#0B57D0] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#1F1F1F]">Indoor Tip: </strong>
                    <span className="text-[#444746]">{activeDay.indoor_tip}</span>
                  </div>
                </div>
                {activeDay.travel_tip && (
                  <div className="p-3 rounded-xl bg-white border border-[#E0E3E1] flex items-start gap-2.5 text-xs">
                    <Car className="w-4 h-4 text-[#0B57D0] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#1F1F1F]">Travel Tip: </strong>
                      <span className="text-[#444746]">{activeDay.travel_tip}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Better Options (if any) */}
      {plan.better_options && plan.better_options.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-[#137333]" />
            Cleaner Alternatives &amp; Better Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.better_options.map((opt, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#E6F4EA]/50 border border-[#CEEAD6] flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#137333]">{opt.suggestion}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#CEEAD6] text-[10px] font-semibold text-[#137333]">
                    {opt.expected_benefit} {opt.estimated ? "(Estimated)" : ""}
                  </span>
                </div>
                <p className="text-xs text-[#1F1F1F]">{opt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap + Packing List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 3-Phase Roadmap */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
            <Route className="w-4 h-4 text-[#0B57D0]" />
            3-Phase Trip Action Roadmap
          </h3>
          <div className="flex flex-col gap-3">
            {plan.roadmap.map((phase) => (
              <div
                key={phase.phase}
                className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] flex flex-col gap-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#0B57D0] uppercase tracking-wide">
                      {phase.phase.replace("_", " ")}
                    </span>
                    <h4 className="text-sm font-bold text-[#1F1F1F]">{phase.title}</h4>
                  </div>
                  <span className="text-[11px] text-[#444746]">{phase.goal}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {phase.steps.map((s) => {
                    const done = checkedSteps.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStep(s.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          done
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
                              className={`text-xs font-semibold ${
                                done ? "line-through text-[#444746]" : "text-[#1F1F1F]"
                              }`}
                            >
                              {s.action}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#EAF2FD] text-[#0B57D0] text-[10px] font-semibold">
                              {s.impact_badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#444746] mt-0.5">
                            {s.when} • {s.who} — {s.why}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Packing List */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] flex items-center gap-1.5">
            <Backpack className="w-4 h-4 text-[#0B57D0]" />
            Packing List
          </h3>
          <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] flex flex-col gap-2">
            {plan.packing_list.map((pkg, idx) => {
              const checked = checkedPacking.has(pkg.item);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => togglePacking(pkg.item)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    checked
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
                        className={`text-xs font-semibold ${
                          checked ? "line-through text-[#444746]" : "text-[#1F1F1F]"
                        }`}
                      >
                        {pkg.item}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase ${
                          pkg.priority === "must"
                            ? "bg-[#FCE8E6] text-[#C5221F]"
                            : pkg.priority === "recommended"
                            ? "bg-[#FEF7E0] text-[#B06000]"
                            : "bg-[#F0F4F9] text-[#444746]"
                        }`}
                      >
                        {pkg.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#444746] mt-0.5">{pkg.reason}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assumptions & Safety Note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#E0E3E1]">
        <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E0E3E1] text-xs">
          <div className="font-bold text-[#1F1F1F] flex items-center gap-1.5 mb-1">
            <Info className="w-4 h-4 text-[#0B57D0]" />
            Assumptions &amp; Forecast Notes
          </div>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#444746]">
            {plan.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
            <li>{plan.impact_summary.assumptions_note}</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FCE8E6]/50 border border-[#FAD2CF] text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#C5221F] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#C5221F] block mb-0.5">Medical &amp; Safety Note</strong>
            <p className="text-[11px] text-[#1F1F1F] leading-snug">{plan.safety_note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
