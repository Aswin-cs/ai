"use client";

import { signIn } from "next-auth/react";
import GoogleIcon from "@/components/GoogleIcon";

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
          <GoogleIcon className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>

        <p className="text-[10.5px] text-[#747775]">
          Sign in with your Google account to save your household profile and receive live AI updates.
        </p>
      </div>
    </div>
  );
}
