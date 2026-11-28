"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("VayuPulse route error:", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-surface flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 text-center shadow-sm space-y-4">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-4xl text-error"
        >
          error
        </span>
        <h1 className="text-xl font-bold text-on-surface font-headline">
          Something went wrong
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          We ran into an unexpected problem loading this page. Your saved profile
          and plans are safe.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="h-10 px-5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="h-10 px-5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold inline-flex items-center transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
