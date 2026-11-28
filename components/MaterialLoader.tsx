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
        className="w-full h-full animate-[m3-circular-rotate_1.8s_linear_infinite] motion-reduce:animate-none"
        viewBox="25 25 50 50"
        aria-hidden="true"
      >
        {/* Subtle Material track ring */}
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke="var(--color-primary-fixed)"
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
          stroke="var(--color-primary-container)"
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
      className="relative w-full h-1 bg-primary-fixed rounded-full overflow-hidden"
      role="progressbar"
      aria-label="Loading progress"
    >
      <div className="absolute top-0 bottom-0 bg-primary-container rounded-full animate-[m3-linear-1_2.1s_cubic-bezier(0.65,0.815,0.735,0.395)_infinite] motion-reduce:animate-none" />
      <div className="absolute top-0 bottom-0 bg-primary-container rounded-full animate-[m3-linear-2_2.1s_cubic-bezier(0.165,0.84,0.44,1)_1.15s_infinite] motion-reduce:animate-none" />
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
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center text-center w-full ${
        compact ? "max-w-xs px-4 py-4 gap-4" : "max-w-sm px-4 py-6 gap-5"
      } animate-fade-in select-none`}
    >
      {/* Material 3 Expressive Circular Progress with subtle tonal aura */}
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute w-20 h-20 rounded-full bg-primary-fixed/45 animate-pulse"
        />
        <MaterialCircularProgress size={64} strokeWidth={4} />
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-2xl text-primary absolute"
        >
          air
        </span>
      </div>

      {/* Title & Subtitle */}
      <div className="flex flex-col gap-1 w-full">
        <h2 className="text-xl font-semibold text-on-surface tracking-tight font-headline">
          {title}
        </h2>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Material 3 Linear Indeterminate Bar */}
      <div className="w-full max-w-[240px]">
        <MaterialLinearProgress />
      </div>

      {/* Optional Material List Steps */}
      {steps && steps.length > 0 && (
        <div className="w-full flex flex-col gap-2 text-left bg-surface-container-low/70 rounded-2xl p-3.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              {step.done ? (
                <span className="material-symbols-outlined text-base text-secondary shrink-0">
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
