"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import MaterialLoader from "@/components/MaterialLoader";
import TripDaysPanel from "@/components/trip/TripDaysPanel";
import TripHeroAlertsOverview from "@/components/trip/TripHeroAlertsOverview";
import TripRoadmapPacking from "@/components/trip/TripRoadmapPacking";
import type { TripPlanResponse } from "@/components/trip/tripPlanUtils";
import { saveTripProgressApi } from "@/lib/api";

export type { TripPlanResponse };

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
        className="w-full rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-xs p-8 md:p-10 flex items-center justify-center"
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
        className="w-full rounded-3xl bg-error-container/60 border border-error/30 p-5 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-error shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-error">Could not generate Trip Plan</p>
            <p className="text-xs text-on-surface-variant">{error}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEditTrip}
            className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
          >
            Edit Trip
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close error message"
            className="p-2 rounded-full hover:bg-surface-container-lowest/70 text-on-surface-variant cursor-pointer"
            title="Close window"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }

  if (!plan) return null;

  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, plan.days.length - 1));

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
      const data = await saveTripProgressApi(payload);
      setHasUnsavedChanges(false);
      setProgressSaved(true);
      onProgressSaved?.(tripPlanId, {
        roadmapSteps: data.progress?.roadmapSteps ?? payload.roadmapSteps,
        packingItems: data.progress?.packingItems ?? payload.packingItems,
      });
      setTimeout(() => setProgressSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save selections.");
    } finally {
      setIsSavingProgress(false);
    }
  };

  return (
    <section className="w-full rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-xs p-5 md:p-8 flex flex-col gap-7 animate-fade-in">
      <TripHeroAlertsOverview
        plan={plan}
        onEditTrip={onEditTrip}
        onDelete={onDelete}
        onClose={onClose}
      />

      <TripDaysPanel
        plan={plan}
        selectedDayIdx={safeDayIdx}
        onSelectDay={setSelectedDayIdx}
      />

      <TripRoadmapPacking
        plan={plan}
        tripPlanId={tripPlanId}
        checkedSteps={checkedSteps}
        checkedPacking={checkedPacking}
        sortedPackingList={sortedPackingList}
        completedRoadmapSteps={completedRoadmapSteps}
        totalRoadmapSteps={totalRoadmapSteps}
        completedPackingCount={completedPackingCount}
        isSavingProgress={isSavingProgress}
        progressSaved={progressSaved}
        hasUnsavedChanges={hasUnsavedChanges}
        saveError={saveError}
        showAssumptions={showAssumptions}
        onToggleStep={toggleStep}
        onTogglePacking={togglePacking}
        onSaveProgress={() => {
          void handleSaveTripProgress();
        }}
        onToggleAssumptions={() => setShowAssumptions((prev) => !prev)}
      />
    </section>
  );
}
