"use client";

import { signIn } from "next-auth/react";
import GoogleIcon from "@/components/GoogleIcon";

export default function GoogleAuthGate() {
  return (
    <div className="min-h-screen w-full bg-surface-bright flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-[28px] border border-outline-variant shadow-sm p-8 flex flex-col items-center text-center gap-6 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary shadow-md">
          <span aria-hidden="true" className="material-symbols-outlined text-4xl">
            air
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            VayuPulse AI
          </span>
          <h1 className="text-2xl font-bold text-on-surface font-headline tracking-tight">
            Your Personal Air-Quality Health Coach
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
            Turn live air-quality telemetry into a simple, personalised protection plan for your family, commute, and home.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 text-left">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                show_chart
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface">Live 12-Hour Air Timeline</span>
              <span className="text-xs text-on-surface-variant">
                Track hourly AQI &amp; find the safest outdoor window
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low">
            <div className="w-8 h-8 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                family_restroom
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface">Tailored for Every Member</span>
              <span className="text-xs text-on-surface-variant">
                Custom limits for children, seniors, and asthma care
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low">
            <div className="w-8 h-8 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center shrink-0">
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                route
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface">Checkable Daily Roadmap</span>
              <span className="text-xs text-on-surface-variant">
                Clear actions for now, today, this week &amp; month
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/auth-check" })}
          className="w-full h-12 rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-outline/40 hover:border-primary text-on-surface font-semibold text-sm flex items-center justify-center gap-3 shadow-2xs hover:shadow-sm transition-all cursor-pointer active:scale-[0.98]"
        >
          <GoogleIcon className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>

        <p className="text-xs text-on-surface-variant">
          Sign in with your Google account to save your household profile and receive live AI updates.
        </p>
      </div>
    </div>
  );
}
