"use client";

import {
  Backpack,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Info,
  Loader2,
  Route,
  Save,
  ShieldAlert,
} from "lucide-react";
import { TripProgressBar, type TripPlanResponse } from "./tripPlanUtils";

interface TripRoadmapPackingProps {
  plan: TripPlanResponse;
  tripPlanId: string | null;
  checkedSteps: Set<string>;
  checkedPacking: Set<string>;
  sortedPackingList: TripPlanResponse["packing_list"];
  completedRoadmapSteps: number;
  totalRoadmapSteps: number;
  completedPackingCount: number;
  isSavingProgress: boolean;
  progressSaved: boolean;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  showAssumptions: boolean;
  onToggleStep: (id: string) => void;
  onTogglePacking: (item: string) => void;
  onSaveProgress: () => void;
  onToggleAssumptions: () => void;
}

export default function TripRoadmapPacking({
  plan,
  tripPlanId,
  checkedSteps,
  checkedPacking,
  sortedPackingList,
  completedRoadmapSteps,
  totalRoadmapSteps,
  completedPackingCount,
  isSavingProgress,
  progressSaved,
  hasUnsavedChanges,
  saveError,
  showAssumptions,
  onToggleStep,
  onTogglePacking,
  onSaveProgress,
  onToggleAssumptions,
}: TripRoadmapPackingProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 shrink-0">
              <Route className="w-4 h-4 text-primary" aria-hidden="true" />
              3-Phase Action Roadmap
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="sm:w-48">
                <TripProgressBar
                  done={completedRoadmapSteps}
                  total={totalRoadmapSteps}
                  label="Trip action roadmap progress"
                  accentClass="bg-primary"
                />
              </div>
              {tripPlanId && (
                <button
                  type="button"
                  onClick={onSaveProgress}
                  disabled={isSavingProgress}
                  className={`h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                    progressSaved
                      ? "bg-secondary text-on-secondary"
                      : hasUnsavedChanges
                        ? "bg-primary-container hover:bg-primary text-on-primary"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant"
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
          <span className="sr-only" aria-live="polite">
            {progressSaved ? "Trip progress saved." : ""}
          </span>
          {saveError && (
            <p role="alert" className="text-xs text-error font-medium">
              {saveError}
            </p>
          )}

          <div className="flex flex-col gap-3.5">
            {plan.roadmap.map((phase) => {
              const phaseDone = phase.steps.filter((s) => checkedSteps.has(s.id)).length;
              return (
                <div
                  key={phase.phase}
                  className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        {phase.phase.replace("_", " ")}
                      </span>
                      <h4 className="text-sm font-bold text-on-surface">{phase.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant">{phase.goal}</span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant text-xs font-bold text-primary">
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
                          onClick={() => onToggleStep(s.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                            done
                              ? "bg-secondary-container/40 border-secondary/25 opacity-75"
                              : "bg-surface-container-lowest border-outline-variant hover:border-primary/40"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                          ) : (
                            <Circle className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" aria-hidden="true" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span
                                className={`text-xs font-semibold ${
                                  done ? "line-through text-on-surface-variant" : "text-on-surface"
                                }`}
                              >
                                {s.action}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-primary-fixed/60 text-primary text-xs font-semibold">
                                {s.impact_badge}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 leading-snug">{s.why}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-on-surface-variant">
                              <span className="px-2 py-0.5 rounded-md bg-surface-container">{s.when}</span>
                              <span className="px-2 py-0.5 rounded-md bg-surface-container">{s.who}</span>
                              <span className="px-2 py-0.5 rounded-md bg-surface-container capitalize">
                                {s.effort} effort
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-surface-container capitalize">
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

        <div className="lg:col-span-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <Backpack className="w-4 h-4 text-primary" aria-hidden="true" />
              Packing Checklist
            </h3>
            <TripProgressBar
              done={completedPackingCount}
              total={sortedPackingList.length}
              label="Packing checklist progress"
              accentClass="bg-secondary"
            />
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col gap-2">
            {sortedPackingList.map((pkg, idx) => {
              const checked = checkedPacking.has(pkg.item);
              return (
                <button
                  key={idx}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onTogglePacking(pkg.item)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    checked
                      ? "bg-secondary-container/40 border-secondary/25 opacity-75"
                      : "bg-surface-container-lowest border-outline-variant hover:border-primary/40"
                  }`}
                >
                  {checked ? (
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <Circle className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`text-xs font-semibold ${
                          checked ? "line-through text-on-surface-variant" : "text-on-surface"
                        }`}
                      >
                        {pkg.item}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase shrink-0 ${
                          pkg.priority === "must"
                            ? "bg-error-container text-on-error-container"
                            : pkg.priority === "recommended"
                              ? "bg-tertiary-fixed text-on-tertiary-fixed"
                              : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {pkg.priority}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">{pkg.reason}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-outline-variant">
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant text-xs">
          <button
            type="button"
            aria-expanded={showAssumptions}
            aria-controls="trip-assumptions-list"
            onClick={onToggleAssumptions}
            className="w-full flex items-center justify-between gap-2 font-bold text-on-surface cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" aria-hidden="true" />
              Assumptions &amp; Forecast Notes ({plan.assumptions.length + 1})
            </span>
            {showAssumptions ? (
              <ChevronUp className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />
            )}
          </button>
          {showAssumptions && (
            <ul
              id="trip-assumptions-list"
              className="list-disc pl-4 space-y-1.5 text-xs text-on-surface-variant mt-2.5 pt-2 border-t border-outline-variant"
            >
              {plan.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
              <li>{plan.impact_summary.assumptions_note}</li>
            </ul>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-error-container/45 border border-error/25 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="text-error block mb-0.5">Medical &amp; Safety Note</strong>
            <p className="text-xs text-on-surface leading-relaxed">{plan.safety_note}</p>
          </div>
        </div>
      </div>
    </>
  );
}
