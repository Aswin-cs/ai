"use client";

import type { AirPlan } from "@/types/airPlan";

interface HeroStatusBannerProps {
  status: NonNullable<AirPlan["status"]>;
  doThisNow?: AirPlan["do_this_now"];
  dataConfidence?: AirPlan["data_confidence"];
}

export default function HeroStatusBanner({
  status,
  doThisNow,
  dataConfidence,
}: HeroStatusBannerProps) {
  const bannerSurface =
    status.risk_level === "severe"
      ? "bg-error-container/60 border-error/25"
      : status.risk_level === "high"
        ? "bg-tertiary-fixed/70 border-tertiary/25"
        : status.risk_level === "moderate"
          ? "bg-tertiary-fixed/50 border-outline-variant"
          : "bg-secondary-container/45 border-secondary/25";

  const badgeTone =
    status.risk_level === "severe" || status.risk_level === "high"
      ? "bg-error text-on-error"
      : status.risk_level === "moderate"
        ? "bg-tertiary text-on-tertiary"
        : "bg-secondary text-on-secondary";

  return (
    <div
      className={`rounded-3xl p-6 border shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-5 items-center animate-fade-in ${bannerSurface}`}
    >
      <div className="lg:col-span-7 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeTone}`}
          >
            {status.risk_level} risk
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/90 border border-outline-variant text-xs font-semibold text-on-surface uppercase">
            Focus: {status.main_concern}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/80 text-xs font-medium text-on-surface-variant capitalize">
            Data Confidence: {dataConfidence || "medium"}
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-on-surface font-headline tracking-tight">
          {status.headline}
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
          {status.plain_explanation}
        </p>
      </div>

      {doThisNow && (
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-4.5 border border-outline-variant shadow-2xs flex items-start gap-3.5">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0 mt-0.5"
          >
            <span className="material-symbols-outlined text-xl">bolt</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Do This Right Now
            </span>
            <p className="text-sm font-bold text-on-surface leading-snug">
              {doThisNow.action}
            </p>
            <p className="text-xs text-on-surface-variant leading-snug">
              {doThisNow.reason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
