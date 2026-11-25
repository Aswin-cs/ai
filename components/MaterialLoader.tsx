"use client";

import React from "react";

interface MaterialLoaderProps {
  title?: string;
  subtitle?: string;
  steps?: Array<{ label: string; active?: boolean; done?: boolean }>;
  compact?: boolean;
}

/**
 * Google Material Design 3 (Material You) Indeterminate Progress Loader
 * Combines M3 Circular Progress Indicator + M3 Two-Bar Linear Indeterminate Track.
 */
export function MaterialCircularProgress({ size = 48, strokeWidth = 4 }: { size?: number; strokeWidth?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="Loading"
    >
      <svg
        className="w-full h-full animate-[m3-circular-rotate_1.8s_linear_infinite]"
        viewBox="25 25 50 50"
      >
        {/* Subtle Material track ring */}
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke="#DAE2FF"
          strokeWidth={strokeWidth}
          opacity={0.45}
        />
        {/* Active Material 3 variable-arc stroke */}
        <circle
          className="animate-[m3-circular-dash_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite]"
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke="#0B57D0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeMiterlimit="10"
        />
      </svg>
    </div>
  );
}

export function MaterialLinearProgress() {
  return (
    <div
      className="relative w-full h-1 bg-[#DAE2FF] rounded-full overflow-hidden"
      role="progressbar"
      aria-label="Loading progress"
    >
      <div className="absolute top-0 bottom-0 bg-[#0B57D0] rounded-full animate-[m3-linear-1_2.1s_cubic-bezier(0.65,0.815,0.735,0.395)_infinite]" />
      <div className="absolute top-0 bottom-0 bg-[#0B57D0] rounded-full animate-[m3-linear-2_2.1s_cubic-bezier(0.165,0.84,0.44,1)_1.15s_infinite]" />
    </div>
  );
}

export default function MaterialLoader({
  title = "VayuPulse",
  subtitle = "Syncing real-time air telemetry & AI strategy...",
  steps,
  compact = false,
}: MaterialLoaderProps) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-[28px] border border-[#E0E3E1] shadow-[0_4px_24px_rgba(0,0,0,0.06)] flex flex-col items-center text-center w-full ${
        compact ? "max-w-sm p-7 gap-5" : "max-w-md p-8 gap-6"
      } animate-scale-in select-none`}
    >
      {/* Material 3 Circular Progress with subtle brand mark */}
      <div className="relative flex items-center justify-center">
        <MaterialCircularProgress size={60} strokeWidth={4} />
        <span className="material-symbols-outlined text-[22px] text-[#0B57D0] absolute">
          air
        </span>
      </div>

      {/* Title & Subtitle */}
      <div className="flex flex-col gap-1.5 w-full">
        <h2 className="text-[19px] font-semibold text-on-surface tracking-tight font-headline">
          {title}
        </h2>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Material 3 Linear Indeterminate Bar */}
      <div className="w-full px-2">
        <MaterialLinearProgress />
      </div>

      {/* Optional Material List Steps */}
      {steps && steps.length > 0 && (
        <div className="w-full flex flex-col gap-2 text-left bg-surface-container-low rounded-2xl p-3.5 border border-[#E0E3E1]/60">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              {step.done ? (
                <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
                  check_circle
                </span>
              ) : step.active ? (
                <MaterialCircularProgress size={14} strokeWidth={5} />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-outline-variant shrink-0 ml-[1px]" />
              )}
              <span
                className={
                  step.active
                    ? "font-medium text-on-surface"
                    : step.done
                    ? "text-on-surface-variant"
                    : "text-on-surface-variant/70"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
