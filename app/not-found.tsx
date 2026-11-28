import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-surface flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 text-center shadow-sm space-y-4">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-4xl text-primary"
        >
          explore_off
        </span>
        <h1 className="text-xl font-bold text-on-surface font-headline">
          Page Not Found
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="h-10 px-5 rounded-full bg-primary text-on-primary text-sm font-semibold inline-flex items-center"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/onboarding"
            className="h-10 px-5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold inline-flex items-center"
          >
            Onboarding
          </Link>
        </div>
      </div>
    </main>
  );
}
