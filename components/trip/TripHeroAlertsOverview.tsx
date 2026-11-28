"use client";

import { Info, MapPin, Pencil, ShieldAlert, Sparkles, Trash2, TrendingDown, X } from "lucide-react";
import { formatShortDate, getRiskMeta, type TripPlanResponse } from "./tripPlanUtils";

interface TripHeroAlertsOverviewProps {
  plan: TripPlanResponse;
  onEditTrip: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function TripHeroAlertsOverview({
  plan,
  onEditTrip,
  onDelete,
  onClose,
}: TripHeroAlertsOverviewProps) {
  const summaryRisk = getRiskMeta(plan.trip_summary.overall_risk);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 pb-6 border-b border-outline-variant">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Planning Assist
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${summaryRisk.bg} ${summaryRisk.text} ${summaryRisk.border}`}
            >
              <span aria-hidden="true" className={`w-2 h-2 rounded-full ${summaryRisk.dot}`} />
              {summaryRisk.label}
            </span>
            <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
              {plan.trip_summary.duration_days}{" "}
              {plan.trip_summary.duration_days === 1 ? "Day" : "Days"} • Confidence:{" "}
              <strong className="capitalize text-on-surface">{plan.data_confidence}</strong>
            </span>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-headline tracking-tight">
              {plan.trip_summary.title}
            </h2>
            <p className="text-sm md:text-base font-medium text-on-surface-variant mt-1 leading-relaxed">
              {plan.trip_summary.headline}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {plan.trip_summary.top_advice.map((tip, i) => (
              <div
                key={i}
                className="group p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant hover:border-primary/40 shadow-2xs hover:-translate-y-0.5 transition-all duration-300 flex items-start gap-2.5"
              >
                <span className="w-6 h-6 rounded-full bg-primary-fixed group-hover:bg-primary-container text-primary group-hover:text-on-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-110">
                  {i + 1}
                </span>
                <span className="text-xs text-on-surface leading-snug font-medium">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-stretch lg:items-end gap-3 shrink-0 lg:w-72">
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            <button
              type="button"
              onClick={onEditTrip}
              className="px-3.5 py-2 rounded-full bg-surface-container hover:bg-primary-fixed text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-3.5 py-2 rounded-full bg-error-container/70 hover:bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete this trip plan"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Close plan window"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Close
            </button>
          </div>

          <div className="group p-4 rounded-3xl bg-secondary-container/50 hover:bg-secondary-container/70 border border-secondary/25 shadow-2xs hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                Est. Impact
              </span>
              <span className="text-xl font-extrabold text-secondary tabular-nums">
                ~{plan.impact_summary.estimated_exposure_reduction_pct}%
              </span>
            </div>
            <p className="text-xs text-on-surface leading-snug font-medium">
              {plan.impact_summary.headline}
            </p>
          </div>
        </div>
      </div>

      {plan.alerts && plan.alerts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-error" aria-hidden="true" />
            Key Air Quality Alerts ({plan.alerts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {plan.alerts.map((alert, idx) => {
              const isCritical = alert.severity === "critical";
              const isWarning = alert.severity === "warning";
              const cardTheme = isCritical
                ? {
                    container: "bg-error-container/45 border-error/30",
                    iconWrap: "bg-error-container text-on-error-container",
                    badge: "bg-error text-on-error",
                    dateText: "text-on-error-container",
                    actionBox: "bg-surface-container-lowest/85 border-error/25",
                  }
                : isWarning
                  ? {
                      container: "bg-tertiary-fixed/50 border-tertiary/30",
                      iconWrap: "bg-tertiary-fixed text-on-tertiary-fixed",
                      badge: "bg-tertiary text-on-tertiary",
                      dateText: "text-on-tertiary-fixed",
                      actionBox: "bg-surface-container-lowest/85 border-tertiary/25",
                    }
                  : {
                      container: "bg-primary-fixed/40 border-primary/25",
                      iconWrap: "bg-primary-fixed text-primary",
                      badge: "bg-primary-container text-on-primary",
                      dateText: "text-on-primary-fixed-variant",
                      actionBox: "bg-surface-container-lowest/85 border-primary/20",
                    };

              return (
                <div
                  key={idx}
                  className={`group p-5 rounded-3xl border shadow-2xs transition-all duration-300 hover:-translate-y-0.5 flex flex-col gap-3 ${cardTheme.container}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cardTheme.iconWrap}`}
                      aria-hidden="true"
                    >
                      {isCritical || isWarning ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${cardTheme.badge}`}>
                          {alert.severity}
                        </span>
                        <span className={`text-xs font-semibold ${cardTheme.dateText}`}>
                          {formatShortDate(alert.date)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface leading-snug mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3.5 py-2.5 rounded-2xl border text-xs text-on-surface-variant leading-relaxed ${cardTheme.actionBox}`}>
                    <strong className="font-semibold text-on-surface">Action: </strong>
                    {alert.action}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {plan.places_overview && plan.places_overview.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
            Destinations Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plan.places_overview.map((p, idx) => {
              const badge = getRiskMeta(p.risk_level);
              return (
                <div
                  key={idx}
                  className="group p-5 rounded-3xl bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant hover:border-primary/40 shadow-2xs hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3.5"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="text-base font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                        {p.place}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.shortLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant">
                      Concern: <strong className="uppercase text-on-surface">{p.main_concern}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-medium">
                      Best: <strong>{formatShortDate(p.best_day)}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-medium">
                      Worst: <strong>{formatShortDate(p.worst_day)}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">{p.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
