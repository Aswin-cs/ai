"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 text-center space-y-4">
          <h1 className="text-xl font-bold font-headline">
            Application Error
          </h1>
          <p className="text-sm text-on-surface-variant">
            VayuPulse encountered a critical error. Please reload to continue.
          </p>
          <button
            type="button"
            onClick={reset}
            className="h-10 px-5 rounded-full bg-primary text-on-primary text-sm font-semibold cursor-pointer"
          >
            Reload App
          </button>
        </div>
      </body>
    </html>
  );
}
