"use client";

import Link from "next/link";

export default function OnboardingLockScreen() {
  return (
    <div className="min-h-screen w-full bg-surface-bright flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-sm p-8 text-center flex flex-col items-center gap-5 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
          <span aria-hidden="true" className="material-symbols-outlined text-[34px]">
            lock
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-on-surface font-headline">
            Complete the Onboarding Setup
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            No active AI air quality evaluation was found for your account. Complete
            the onboarding setup to unlock your personalized VayuPulse dashboard.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="h-11 px-6 rounded-full bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            tune
          </span>
          <span>Go to Onboarding Setup</span>
        </Link>
      </div>
    </div>
  );
}
