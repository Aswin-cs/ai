"use client";

import type { AirPlan } from "@/types/airPlan";

interface SwapsImpactTabProps {
  aiPlan: AirPlan;
  copiedNotice: boolean;
  onCopyCommunityNote: (note?: string) => void;
}

export default function SwapsImpactTab({
  aiPlan,
  copiedNotice,
  onCopyCommunityNote,
}: SwapsImpactTabProps) {
  return (
    <section className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant"
            >
              <span className="material-symbols-outlined text-2xl">swap_horiz</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Sustainable Lifestyle Swaps
              </h3>
              <p className="text-xs text-on-surface-variant">
                Lower-emission habits tailored to your household
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {(aiPlan?.sustainable_swaps || []).map((swap, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/70 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-on-surface-variant line-through">
                    From: {swap.from_habit}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-xs font-semibold capitalize border border-outline-variant">
                    Effort: {swap.effort}
                  </span>
                </div>
                <span className="text-xs font-bold text-on-surface">To: {swap.to_habit}</span>
                <p className="text-xs text-on-surface-variant">{swap.benefit_to_family}</p>
                <p className="text-xs text-primary font-medium">{swap.benefit_to_air}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface-container rounded-3xl p-6 shadow-xs border border-outline-variant flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-4">
            <span className="text-base font-bold text-on-surface">Impact Summary</span>
            {aiPlan?.impact_summary ? (
              <>
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant flex flex-col items-center text-center gap-2">
                  <span className="text-3xl font-bold text-primary font-headline">
                    ~{aiPlan.impact_summary.estimated_exposure_reduction_pct}%
                  </span>
                  <span className="text-xs font-semibold text-on-surface">
                    {aiPlan.impact_summary.headline}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant text-xs text-on-surface-variant space-y-2.5">
                  <p>
                    <strong>Assumptions (Estimated):</strong> {aiPlan.impact_summary.assumptions}
                  </p>
                  <p>
                    <strong>Community Effect:</strong> {aiPlan.impact_summary.community_note}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onCopyCommunityNote(aiPlan.impact_summary?.community_note)}
                    className="flex-1 h-10 rounded-full bg-secondary text-on-secondary text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      {copiedNotice ? "check" : "content_copy"}
                    </span>
                    <span>{copiedNotice ? "Copied Note!" : "Copy Community Note"}</span>
                  </button>
                  <span className="sr-only" aria-live="polite">
                    {copiedNotice ? "Community note copied to clipboard." : ""}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-on-surface-variant">
                Recalibrate plan to view updated impact summary.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
