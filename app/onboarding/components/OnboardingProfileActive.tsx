"use client";

import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, MapPin, RotateCcw, Sparkles, User } from "lucide-react";

interface OnboardingProfileActiveProps {
  email?: string | null;
  locationQuery: string;
  vulnerabilities: string[];
  commute: string;
  onEdit: () => void;
}

export default function OnboardingProfileActive({
  email,
  locationQuery,
  vulnerabilities,
  commute,
  onEdit,
}: OnboardingProfileActiveProps) {
  return (
    <div className="w-full max-w-[680px] bg-surface-container-lowest rounded-[28px] border border-outline-variant shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-8 md:p-12 text-center space-y-6 animate-fade-in">
      <div
        aria-hidden="true"
        className="w-16 h-16 rounded-full bg-secondary-container border border-secondary/25 flex items-center justify-center mx-auto text-secondary shadow-xs"
      >
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-fixed text-primary border border-primary/25">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          Air Profile Active
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
          Your Air Profile Is Calibrated
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed max-w-md mx-auto">
          Your household profile and telemetry are active. You can edit your location, family
          members, commute, or routine below to recalibrate your AI plan anytime.
        </p>
      </div>

      <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant text-left max-w-md mx-auto space-y-2.5">
        <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
          <User className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <span className="truncate">
            Signed in as: <strong className="text-on-surface">{email}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
          <MapPin className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
          <span className="truncate">
            Location: <strong className="text-on-surface">{locationQuery}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
          <Activity className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <span className="capitalize">
            Household:{" "}
            <strong className="text-on-surface">
              {vulnerabilities.join(", ") || "Adult"}
            </strong>{" "}
            • <strong className="text-on-surface">{commute.replace("_", " ")}</strong>
          </span>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="w-full sm:w-auto h-12 px-7 rounded-full bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed-variant font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <span>Edit &amp; Recalibrate</span>
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </button>
        <Link
          href="/"
          className="w-full sm:w-auto h-12 px-8 rounded-full bg-primary-container hover:bg-primary text-on-primary font-medium text-sm flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <span>Go to Dashboard</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
