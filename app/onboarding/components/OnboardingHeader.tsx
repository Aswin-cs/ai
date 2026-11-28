"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { signIn, signOut } from "next-auth/react";
import { LogOut, Wind } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

interface OnboardingHeaderProps {
  isSubmitting: boolean;
  currentStep: 1 | 2;
  session: Session | null;
}

export default function OnboardingHeader({
  isSubmitting,
  currentStep,
  session,
}: OnboardingHeaderProps) {
  return (
    <header className="h-16 bg-surface-container-low border-b border-outline-variant px-4 sm:px-6 md:px-12 sticky top-0 z-40 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
        <div
          aria-hidden="true"
          className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform"
        >
          <Wind className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-on-surface leading-none group-hover:text-primary transition-colors">
            VayuPulse
          </span>
          <span className="text-xs font-medium text-on-surface-variant tracking-wide mt-0.5">
            Urban Air Quality Assistant
          </span>
        </div>
      </Link>

      <div className="hidden sm:flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1.5">
          <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-semibold text-on-surface tracking-wide">
            {isSubmitting
              ? "Calibrating Air Guidance..."
              : currentStep === 1
                ? "Step 1 of 2 • Household Location Setup"
                : "Step 2 of 2 • Household Profile & Lifestyle"}
          </span>
        </div>
        <div className="w-56 md:w-72 h-1.5 bg-primary-fixed rounded-full overflow-hidden relative">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: isSubmitting || currentStep === 2 ? "100%" : "50%" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {session?.user ? (
          <>
            <div className="flex items-center gap-2.5 bg-surface-container-lowest border border-outline-variant rounded-full pl-1.5 pr-3 py-1 shadow-xs">
              <div className="relative">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover border border-outline-variant"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
                    {(session.user.name || "U")[0]}
                  </div>
                )}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-2xs"
                >
                  <GoogleIcon className="w-2.5 h-2.5" />
                </span>
              </div>
              <span className="text-xs font-medium text-on-surface">
                {session.user.name?.split(" ")[0] || "User"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              aria-label="Sign out"
              title="Sign out"
              className="h-9 px-3.5 rounded-full bg-surface-container-lowest hover:bg-error-container border border-outline-variant hover:border-error/30 text-on-surface-variant hover:text-error text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void signIn("google", { callbackUrl: "/auth-check" })}
            className="flex items-center gap-2 bg-surface-container-lowest hover:bg-surface-container border border-primary text-primary rounded-full px-3 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <GoogleIcon className="w-3.5 h-3.5" />
            <span>Sign in</span>
          </button>
        )}
        <Link
          href="/"
          className="text-xs font-medium text-on-surface-variant hover:text-primary px-2 py-1 rounded transition-colors"
        >
          Exit
        </Link>
      </div>
    </header>
  );
}
