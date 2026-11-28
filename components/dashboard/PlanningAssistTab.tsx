"use client";

import type { RefObject } from "react";
import PlanningAssistWizard, { type TripPlanPayload } from "@/components/PlanningAssistWizard";
import TripPlanSection from "@/components/TripPlanSection";
import type { SavedTripPlanRecord } from "@/lib/api";
import { DEFAULT_COORDS } from "@/lib/constants";
import type { UserProfileState } from "@/types/airPlan";

interface PlanningAssistTabProps {
  tripSectionRef: RefObject<HTMLElement | null>;
  userProfile: UserProfileState;
  savedTripPlans: SavedTripPlanRecord[];
  openTripPlanId: string | null;
  activeTripPlan: TripPlanPayload | null;
  showPlanningWizard: boolean;
  isAddingNewTrip: boolean;
  isGeneratingTripPlan: boolean;
  tripPlanError: string | null;
  onAddTripClick: () => void;
  onToggleOpenTrip: (item: SavedTripPlanRecord, isOpen: boolean) => void;
  onDeleteTrip: (id: string) => void;
  onCancelWizard: () => void;
  onSubmitPlan: (plan: TripPlanPayload) => void;
  onProgressSaved: (
    id: string,
    progress: { roadmapSteps: string[]; packingItems: string[] }
  ) => void;
  onEditTrip: () => void;
  onCloseTripSection: () => void;
}

export default function PlanningAssistTab({
  tripSectionRef,
  userProfile,
  savedTripPlans,
  openTripPlanId,
  activeTripPlan,
  showPlanningWizard,
  isAddingNewTrip,
  isGeneratingTripPlan,
  tripPlanError,
  onAddTripClick,
  onToggleOpenTrip,
  onDeleteTrip,
  onCancelWizard,
  onSubmitPlan,
  onProgressSaved,
  onEditTrip,
  onCloseTripSection,
}: PlanningAssistTabProps) {
  const openTripRecord = savedTripPlans.find((t) => t._id === openTripPlanId) || null;

  return (
    <section ref={tripSectionRef} className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant p-5 flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-on-surface font-headline flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-2xl">
                travel_explore
              </span>
              Trip &amp; Outdoor Planning Assist
            </h1>
            <p className="text-xs text-on-surface-variant">
              Create and manage multiple exposure-aware trip plans ({savedTripPlans.length} saved)
            </p>
          </div>
          <button
            type="button"
            onClick={onAddTripClick}
            className="px-4 py-2.5 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              add
            </span>
            Add Trip Plan
          </button>
        </div>

        {savedTripPlans.length > 0 && (
          <div
            role="list"
            aria-label="Saved trip plans"
            className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-outline-variant/80"
          >
            {savedTripPlans.map((item) => {
              const isOpen = item._id === openTripPlanId;
              const title =
                item.plan?.trip_summary?.title ||
                item.destinations.map((d) => d.name).join(" → ");
              const risk = item.plan?.trip_summary?.overall_risk || "plan";
              return (
                <div
                  key={item._id}
                  role="listitem"
                  className={`inline-flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-2xl border transition-all ${
                    isOpen
                      ? "bg-primary-fixed/50 border-primary shadow-2xs"
                      : "bg-surface-container-low border-outline-variant hover:border-primary/50"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={isOpen}
                    onClick={() => onToggleOpenTrip(item, isOpen)}
                    className="flex items-center gap-2 text-left cursor-pointer"
                    title={isOpen ? "Close plan window" : "Open this trip plan"}
                  >
                    <span className="text-xs font-bold text-on-surface max-w-[200px] truncate">
                      {title}
                    </span>
                    <span className="text-xs text-on-surface-variant hidden sm:inline">
                      {item.startDate} → {item.endDate}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant text-xs font-bold uppercase text-on-surface-variant">
                      {risk}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isOpen ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {isOpen ? "• Open" : "• View"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTrip(item._id)}
                    aria-label={`Delete ${title}`}
                    className="w-6 h-6 rounded-full hover:bg-error-container text-on-surface-variant hover:text-error flex items-center justify-center cursor-pointer transition-colors"
                    title="Delete this trip plan"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-base">
                      delete
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(savedTripPlans.length === 0 || showPlanningWizard) && (
        <PlanningAssistWizard
          defaultLat={userProfile.coords?.lat ?? DEFAULT_COORDS.lat}
          defaultLng={userProfile.coords?.lng ?? DEFAULT_COORDS.lng}
          defaultLocationName={userProfile.location || DEFAULT_COORDS.label}
          initialPlan={isAddingNewTrip ? null : activeTripPlan}
          compact={false}
          onCancel={savedTripPlans.length > 0 ? onCancelWizard : undefined}
          onSubmitPlan={onSubmitPlan}
        />
      )}

      {(isGeneratingTripPlan || openTripRecord || tripPlanError) && (
        <TripPlanSection
          key={openTripRecord?._id || "trip-section"}
          tripPlanId={openTripRecord?._id || null}
          plan={openTripRecord?.plan || null}
          initialProgress={openTripRecord?.progress || null}
          isLoading={isGeneratingTripPlan}
          error={tripPlanError}
          onProgressSaved={onProgressSaved}
          onEditTrip={onEditTrip}
          onClose={onCloseTripSection}
          onDelete={() => {
            if (openTripRecord) onDeleteTrip(openTripRecord._id);
          }}
        />
      )}
    </section>
  );
}
