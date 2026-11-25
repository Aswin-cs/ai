export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-surface-bright flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        {/* Animated Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-primary/15 animate-ping"></div>
          <div className="absolute w-20 h-20 rounded-3xl bg-primary-fixed animate-pulse"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-lg">
            <span className="material-symbols-outlined text-[34px] animate-pulse">air</span>
          </div>
        </div>

        {/* Brand & Status */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-on-surface tracking-tight font-headline">
            VayuPulse
          </h1>
          <p className="text-xs font-medium text-on-surface-variant">
            Syncing real-time air telemetry &amp; AI strategy...
          </p>
        </div>

        {/* Sleek Progress Bar */}
        <div className="w-48 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-primary rounded-full animate-[progressSlide_1.4s_ease-in-out_infinite]"></div>
        </div>
      </div>

      <style>{`
        @keyframes progressSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
