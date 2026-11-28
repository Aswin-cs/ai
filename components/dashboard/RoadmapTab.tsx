"use client";

import type { RoadmapPhaseFilter } from "@/hooks/useDashboardUi";
import { formatTimeTo12Hour } from "@/lib/airQuality";
import type { AirPlan } from "@/types/airPlan";

interface RoadmapTabProps {
  aiPlan: AirPlan;
  aiEvalMeta: { modelUsed?: string; updatedAt?: string } | null;
  roadmapCompleted: Record<string, boolean>;
  onToggleStep: (stepKey: string, nextDone: boolean) => void;
  phaseFilter: RoadmapPhaseFilter;
  onChangePhaseFilter: (phase: RoadmapPhaseFilter) => void;
  isSavingProgress: boolean;
  progressSaved: boolean;
  hasUnsavedProgress: boolean;
  onSaveProgress: () => void;
}

const PHASE_FILTERS: Array<{ id: RoadmapPhaseFilter; label: string }> = [
  { id: "all", label: "All Phases" },
  { id: "now", label: "Now (1-2h)" },
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
];

export default function RoadmapTab({
  aiPlan,
  aiEvalMeta,
  roadmapCompleted,
  onToggleStep,
  phaseFilter,
  onChangePhaseFilter,
  isSavingProgress,
  progressSaved,
  hasUnsavedProgress,
  onSaveProgress,
}: RoadmapTabProps) {
  const phases = aiPlan?.roadmap || [];
  const allSteps = phases.flatMap((p) => p.steps || []);
  const completedCount = allSteps.filter((st) => roadmapCompleted[st.id]).length;
  const progressPct =
    allSteps.length > 0 ? Math.round((completedCount / allSteps.length) * 100) : 0;

  const phaseStyle = (phase: string) => {
    if (phase === "now") return "bg-error-container text-on-error-container";
    if (phase === "today") return "bg-primary-fixed text-on-primary-fixed-variant";
    if (phase === "this_week") return "bg-secondary-container text-on-secondary-container";
    return "bg-tertiary-fixed text-on-tertiary-fixed";
  };

  return (
    <section className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-11 h-11 rounded-2xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant"
            >
              <span className="material-symbols-outlined text-2xl">route</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                Your Personalized Air Protection Roadmap
              </h2>
              <p className="text-xs text-on-surface-variant">
                Extracted from your active AI Evaluation
                {aiEvalMeta?.modelUsed ? ` • Model: ${aiEvalMeta.modelUsed}` : ""}
                {aiEvalMeta?.updatedAt
                  ? ` • Updated ${new Date(aiEvalMeta.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3.5 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold">
              {completedCount} of {allSteps.length} Done ({progressPct}%)
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
              {progressSaved ? "Action roadmap progress saved." : ""}
            </span>
          </div>
        </div>

        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {PHASE_FILTERS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              aria-pressed={phaseFilter === pill.id}
              onClick={() => onChangePhaseFilter(pill.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                phaseFilter === pill.id
                  ? "bg-primary text-on-primary shadow-2xs"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {phases
        .filter((p) => phaseFilter === "all" || p.phase === phaseFilter)
        .map((phaseGroup, pIdx) => (
          <div
            key={pIdx}
            className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${phaseStyle(phaseGroup.phase)}`}
                  >
                    {phaseGroup.phase.replace("_", " ")}
                  </span>
                  <h3 className="text-sm font-bold text-on-surface">{phaseGroup.title}</h3>
                </div>
                <p className="text-xs text-on-surface-variant">{phaseGroup.goal}</p>
              </div>
            </div>

            <div className="relative flex flex-col gap-4 pl-6 border-l-2 border-primary-fixed ml-2">
              {(phaseGroup.steps || []).map((step, stepIdx) => {
                const stepKey = step.id || `${phaseGroup.phase}-${stepIdx}`;
                const isDone = !!roadmapCompleted[stepKey];
                return (
                  <label
                    key={stepKey}
                    htmlFor={`roadmap-step-${stepKey}`}
                    className={`relative block p-4 rounded-2xl border transition-all cursor-pointer ${
                      isDone
                        ? "bg-surface-container-low/60 border-outline-variant opacity-75"
                        : "bg-surface-container-low hover:bg-surface-container border-outline-variant"
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`absolute -left-[35px] top-4 w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface-container-lowest shadow-2xs transition-colors ${
                        isDone ? "bg-secondary text-on-secondary" : "bg-primary text-on-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {isDone ? "check" : "bolt"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-primary">
                            {formatTimeTo12Hour(step.when)}
                          </span>
                          <span aria-hidden="true" className="text-on-surface-variant">•</span>
                          <span className="font-semibold text-on-surface-variant">
                            For: {step.who}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant font-semibold capitalize">
                            Effort: {step.effort}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container border border-secondary/25 font-semibold capitalize">
                            Cost: {step.cost}
                          </span>
                        </div>

                        <h4
                          className={`text-xs font-bold ${
                            isDone ? "line-through text-on-surface-variant" : "text-on-surface"
                          }`}
                        >
                          {step.action}
                        </h4>
                        <p className="text-xs text-on-surface-variant leading-snug">{step.why}</p>
                        {step.impact_badge && (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-0.5">
                            <span aria-hidden="true" className="material-symbols-outlined text-sm">
                              insights
                            </span>
                            <span>{step.impact_badge} (est.)</span>
                          </div>
                        )}
                      </div>

                      <input
                        id={`roadmap-step-${stepKey}`}
                        aria-label={step.action}
                        type="checkbox"
                        checked={isDone}
                        onChange={() => onToggleStep(stepKey, !isDone)}
                        className="mt-1 w-4 h-4 rounded border-outline text-primary accent-primary cursor-pointer shrink-0"
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
    </section>
  );
}
