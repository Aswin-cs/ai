"use client";

import { formatTimeTo12Hour } from "@/lib/airQuality";
import type { AirPlan } from "@/types/airPlan";

interface IndoorAirLabTabProps {
  aiPlan: AirPlan;
  completedChecklist: Record<string, boolean>;
  onToggleChecklist: (id: string, nextDone: boolean) => void;
  isSavingProgress: boolean;
  progressSaved: boolean;
  hasUnsavedProgress: boolean;
  onSaveProgress: () => void;
}

export default function IndoorAirLabTab({
  aiPlan,
  completedChecklist,
  onToggleChecklist,
  isSavingProgress,
  progressSaved,
  hasUnsavedProgress,
  onSaveProgress,
}: IndoorAirLabTabProps) {
  const steps = aiPlan?.indoor_air_plan?.steps || [];
  const doneCount = steps.filter((_, i) => completedChecklist[`check-${i}`]).length;

  return (
    <section className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant"
            >
              <span className="material-symbols-outlined text-2xl">home_health</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Indoor Air Plan</h3>
              <p className="text-xs text-on-surface-variant capitalize">
                Setup: {(aiPlan?.indoor_air_plan?.setup || "natural_ventilation").replace("_", " ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 bg-surface-container text-on-surface text-xs font-semibold rounded-full">
              {doneCount} of {steps.length} Done
            </span>
            <button
              type="button"
              onClick={onSaveProgress}
              disabled={isSavingProgress}
              className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                progressSaved
                  ? "bg-secondary text-on-secondary"
                  : hasUnsavedProgress
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined text-base ${isSavingProgress ? "animate-spin" : ""}`}
                aria-hidden="true"
              >
                {isSavingProgress ? "sync" : progressSaved ? "check_circle" : "save"}
              </span>
              <span>
                {isSavingProgress ? "Saving..." : progressSaved ? "Saved!" : "Save Progress"}
              </span>
            </button>
            <span className="sr-only" aria-live="polite">
              {progressSaved ? "Checklist progress saved." : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {steps.map((item, idx) => {
            const id = `check-${idx}`;
            const done = !!completedChecklist[id];
            return (
              <label
                key={id}
                htmlFor={`indoor-check-${id}`}
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
              >
                <input
                  id={`indoor-check-${id}`}
                  aria-label={item.action}
                  type="checkbox"
                  checked={done}
                  onChange={() => onToggleChecklist(id, !done)}
                  className="mt-1 w-4 h-4 rounded border-outline text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        done ? "line-through text-on-surface-variant" : "text-on-surface"
                      }`}
                    >
                      {item.action}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container capitalize shrink-0">
                      Cost: {item.cost}
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant mt-1">When: {item.when}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {aiPlan?.member_guidance && aiPlan.member_guidance.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {aiPlan.member_guidance.map((mg, idx) => (
            <div
              key={idx}
              className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-outline-variant flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold capitalize">
                  {mg.member.replace("_", " ")}
                </span>
                <span className="text-xs font-semibold text-secondary">{mg.outdoor_limit}</span>
              </div>
              <div className="text-xs text-on-surface">
                <strong>Mask Advice:</strong> {mg.mask_advice}
              </div>
              <ul className="list-disc pl-4 text-xs text-on-surface-variant space-y-1">
                {(mg.key_tips || []).map((t, ti) => (
                  <li key={ti}>{t}</li>
                ))}
              </ul>
              {mg.warning_signs && mg.warning_signs.length > 0 && (
                <div className="p-2.5 rounded-xl bg-error-container/40 text-xs text-on-error-container">
                  <strong>Watch for:</strong> {mg.warning_signs.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aiPlan?.commute_plan && (
        <div className="bg-surface-container rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-2xl">
                commute
              </span>
              <h3 className="text-base font-bold text-on-surface capitalize">
                Commute Plan ({aiPlan.commute_plan.mode.replace("_", " ")})
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-surface-container-lowest text-xs font-semibold text-primary">
              Best Departure: {formatTimeTo12Hour(aiPlan.commute_plan.best_departure)}
            </span>
          </div>
          <p className="text-xs text-on-surface">
            <strong>Protection:</strong> {aiPlan.commute_plan.protection}
          </p>
          <ul className="list-disc pl-5 text-xs text-on-surface-variant space-y-1">
            {(aiPlan.commute_plan.tips || []).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
