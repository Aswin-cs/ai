"use client";

import { ArrowLeft, ArrowRight, Calendar, Clock, Navigation } from "lucide-react";
import type { TripDestination } from "@/components/PlanningAssistWizard";

interface TripScheduleStepProps {
  destinations: TripDestination[];
  todayStr: string;
  startDate: string;
  startTime: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onStartTimeChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onBackStep: () => void;
  onConfirmPlan: () => void;
}

export default function TripScheduleStep({
  destinations,
  todayStr,
  startDate,
  startTime,
  endDate,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onBackStep,
  onConfirmPlan,
}: TripScheduleStepProps) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {destinations.map((d, i) => (
          <span
            key={d.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant text-xs font-medium text-on-surface"
          >
            <Navigation className="w-3 h-3 text-primary" aria-hidden="true" />
            <span>
              {i + 1}. {d.name} (AQI {d.usAqi})
            </span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 bg-surface-container-lowest border border-outline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 rounded-xl px-3 py-2">
          <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            Start date
          </span>
          <input
            type="date"
            min={todayStr}
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="text-xs font-medium text-on-surface bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          />
        </label>

        <label className="flex flex-col gap-1 bg-surface-container-lowest border border-outline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 rounded-xl px-3 py-2">
          <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            Start time
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="text-xs font-medium text-on-surface bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          />
        </label>

        <label className="flex flex-col gap-1 bg-surface-container-lowest border border-outline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 rounded-xl px-3 py-2">
          <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            End date
          </span>
          <input
            type="date"
            min={startDate || todayStr}
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="text-xs font-medium text-on-surface bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBackStep}
          className="px-3 py-2 rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-outline text-on-surface text-xs font-medium flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back</span>
        </button>
        <button
          type="button"
          disabled={!startDate || !startTime || !endDate}
          onClick={onConfirmPlan}
          className="px-4 py-2 rounded-full bg-primary-container hover:bg-primary disabled:bg-surface-container-highest disabled:text-on-surface-variant text-on-primary text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
        >
          <span>Generate Trip Air Plan</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
