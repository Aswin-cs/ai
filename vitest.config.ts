import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/vitest.setup.ts"],
    include: ["tests/**/*.spec.{ts,tsx}"],
    globals: true,
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "hooks/**/*.{ts,tsx}",
        "components/chat/**/*.{ts,tsx}",
        "components/dashboard/**/*.{ts,tsx}",
        "components/ThemeToggle.tsx",
        "components/trip/TripDestinationStep.tsx",
        "components/trip/TripScheduleStep.tsx",
        "app/onboarding/components/OnboardingHeader.tsx",
        "app/onboarding/components/LocationStep.tsx",
        "lib/airQuality.ts",
        "lib/api.ts",
        "lib/constants.ts",
        "lib/logger.ts",
        "lib/validation.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
