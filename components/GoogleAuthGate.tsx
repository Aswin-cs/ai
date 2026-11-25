"use client";

import { signIn } from "next-auth/react";

export default function GoogleAuthGate() {
  return (
    <div className="min-h-screen w-full bg-surface-bright flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-[28px] border border-[#E0E3E1] shadow-[0_8px_32px_rgba(11,87,208,0.08)] p-8 flex flex-col items-center text-center gap-6 animate-scale-in">
        {/* Brand Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-[#0B57D0] flex items-center justify-center text-white shadow-md">
          <span className="material-symbols-outlined text-[34px]">air</span>
        </div>

        {/* Simple Introduction */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#0B57D0]">
            VayuPulse AI
          </span>
          <h1 className="text-2xl font-bold text-[#1F1F1F] font-headline tracking-tight">
            Your Personal Air-Quality Health Coach
          </h1>
          <p className="text-xs md:text-[13px] text-[#444746] leading-relaxed">
            Turn live air-quality telemetry into a simple, personalised protection plan for your family, commute, and home.
          </p>
        </div>

        {/* 3 Material Tonal Highlights */}
        <div className="w-full flex flex-col gap-2.5 text-left">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F0F4F9]">
            <div className="w-8 h-8 rounded-xl bg-[#DAE2FF] text-[#0041A2] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">show_chart</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#1F1F1F]">Live 12-Hour Air Timeline</span>
              <span className="text-[11px] text-[#444746]">Track hourly AQI &amp; find the safest outdoor window</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F0F4F9]">
            <div className="w-8 h-8 rounded-xl bg-[#E6F4EA] text-[#137333] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">family_restroom</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#1F1F1F]">Tailored for Every Member</span>
              <span className="text-[11px] text-[#444746]">Custom limits for children, seniors, and asthma care</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F0F4F9]">
            <div className="w-8 h-8 rounded-xl bg-[#FFDCC2] text-[#6D3900] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">route</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#1F1F1F]">Checkable Daily Roadmap</span>
              <span className="text-[11px] text-[#444746]">Clear actions for now, today, this week &amp; month</span>
            </div>
          </div>
        </div>

        {/* Google OAuth Button (Material 3 Pill) */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/auth-check" })}
          className="w-full h-12 rounded-full bg-white hover:bg-[#F8FAFD] border border-[#747775]/40 hover:border-[#0B57D0] text-[#1F1F1F] font-semibold text-sm flex items-center justify-center gap-3 shadow-2xs hover:shadow-sm transition-all cursor-pointer active:scale-[0.98]"
        >
          {/* Official Google G SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="text-[10.5px] text-[#747775]">
          Sign in with your Google account to save your household profile and receive live AI updates.
        </p>
      </div>
    </div>
  );
}
