# VayuPulse Architecture

## Overview
VayuPulse is a Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 air-quality health assistant that combines real-time Indian CPCB / Open-Meteo telemetry with Google Gemini structured planning and MongoDB persistence.

## Directory Structure
- `app/`: App Router pages (`/`, `/onboarding`, `/auth-check`), error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`), and REST API route handlers (`app/api/**`).
- `components/`: Reusable UI modules organized by feature (`dashboard/`, `chat/`, `onboarding/`, `ThemeToggle.tsx`, `MaterialLoader.tsx`, `PlanningAssistWizard.tsx`, `TripPlanSection.tsx`).
- `hooks/`: Custom React hooks (`useTheme.ts`).
- `lib/`: Core services and utilities:
  - `lib/gemini/`: Modular Gemini AI client (`client.ts`), JSON schemas (`schemas.ts`), prompt builders (`prompts.ts`), and fallback engine (`generate.ts`), re-exported via `lib/gemini.ts`.
  - `lib/cpcb.ts` & `lib/airQuality.ts`: Official CPCB CAAQMS (`data.gov.in`) ground-station lookup (35 km radius) and Open-Meteo hourly forecast / AQI helpers.
  - `lib/apiHandler.ts`, `lib/apiAuth.ts`, `lib/rateLimit.ts`, `lib/validation.ts`: Shared authenticated API wrapper, sliding-window rate limiter, and input sanitization.
  - `lib/api.ts`: Typed client-side API helpers.
  - `lib/logger.ts` & `lib/constants.ts`: Production-safe logger and shared constants.
- `models/`: Mongoose schemas (`User.ts`, `AiEvaluation.ts`, `TripPlan.ts`).
- `types/`: Shared TypeScript interfaces (`types/airPlan.ts`).
- `tests/`: Node.js built-in test runner suite (`npm test`).

## Key Data Flows
1. **Authentication & Onboarding Gate:** NextAuth (Google OAuth + JWT) checks `User` and `AiEvaluation` in MongoDB via `/api/user/status`. Users without an active `AiEvaluation` are routed to `/onboarding` and locked out of `/`.
2. **Telemetry Calibration:** `/api/air-quality` and `lib/autoUpdatePlan.ts` query CPCB (`data.gov.in` resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`) and Open-Meteo in parallel, preferring CPCB ground readings when a station is within 35 km.
3. **AI Plan & Chat Generation:** Authenticated requests pass through `withAuthApiHandler` (session check + sliding-window rate limit + safe 5xx error masking), validate inputs (`lib/validation.ts`), and invoke `generateWithGeminiFallback` across the configured Gemini/Gemma model chain.
4. **Stale Plan Auto-Refresh:** Plans older than 6 hours are automatically regenerated on `/api/user/status` or via `CRON_SECRET`-authenticated `GET /api/ai/plan/auto-update`.
