import MaterialLoader from "@/components/MaterialLoader";

export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-surface-bright flex items-center justify-center p-6 animate-fade-in">
      <MaterialLoader
        title="VayuPulse"
        subtitle="Syncing real-time air telemetry & AI strategy..."
        compact
      />
    </div>
  );
}
