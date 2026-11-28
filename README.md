# VayuPulse — GenAI Urban Air Quality & Smog Protection Coach

**VayuPulse** is a GenAI-powered web application built with **Next.js 16**, **Google Gemini (`@google/genai`)**, **Indian CPCB Air Quality API (`data.gov.in`)**, **Open-Meteo Air Quality API**, **OpenStreetMap + Leaflet**, **NextAuth (Google OAuth)**, and **MongoDB** to help families and communities navigate severe winter smog and urban air pollution.

---

## Problem Statement Alignment Check

> *"Create a GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. The application should suggest low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to their location and lifestyle, while clearly explaining the direct impact of their choices."*

| Requirement | How VayuPulse Meets It | Implementation |
| --- | --- | --- |
| **GenAI-powered assistant** | Structured JSON daily & trip planning plus conversational Q&A powered by `@google/genai` with automatic multi-model free-tier fallback across Gemini 4 / 3 / 2.5 and Gemma 4 models. | `lib/gemini/client.ts`, `lib/gemini/generate.ts`, `lib/gemini/prompts.ts`, `lib/gemini/schemas.ts`, `app/api/ai/plan/route.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/trip-plan/route.ts` |
| **Navigate severe winter smog & urban air pollution** | Hyperlocal CPCB & Open-Meteo telemetry (`us_aqi`, `pm2_5`, `pm10`, `no2`, `ozone`, `co`, `so2`), 12-hour hourly AQI/PM2.5 timeline, inversion/smog risk alerts, safe outdoor windows, and automatic 6-hour background plan refresh. | `lib/airQuality.ts`, `lib/cpcb.ts`, `lib/autoUpdatePlan.ts`, `hooks/useAirQuality.ts`, `components/dashboard/HeroStatusBanner.tsx`, `components/dashboard/HourlyForecastChart.tsx` |
| **Tailored to location & lifestyle (families & communities)** | Interactive `/onboarding` wizard using dynamic Leaflet + OpenStreetMap Nominatim search to pin exact locality coordinates, household vulnerability profiling, commute mode, indoor setup, and multilingual guidance across 6 languages (`en`, `hi`, `ta`, `te`, `ml`, `kn`). | `app/onboarding/page.tsx`, `app/onboarding/components/LocationStep.tsx`, `app/onboarding/components/LifestyleStep.tsx`, `app/onboarding/components/LeafletMap.tsx`, `hooks/useOnboardingForm.ts`, `models/User.ts` |
| **Low-emission daily routines** | Time-blocked `daily_routine` (`morning`, `afternoon`, `evening`, `night`) with `instead_of` vs `do_this` guidance, `outdoor_window_review` (`keep` / `shift` / `cancel`), commute protection plans, and checkable `now / today / this_week / this_month` roadmaps saved in MongoDB. | `components/dashboard/DailyPlanTab.tsx`, `components/dashboard/RoadmapTab.tsx`, `hooks/usePlan.ts`, `lib/api.ts`, `lib/apiHandler.ts`, `app/api/ai/plan/progress/route.ts` |
| **Indoor air quality hacks** | Dedicated `Family & Home` tab with `indoor_air_plan` tailored to HEPA purifier vs. natural ventilation homes, checkable indoor air actions, and ventilation window timing. | `components/dashboard/IndoorAirLabTab.tsx`, `models/AiEvaluation.ts` |
| **Sustainable alternatives & direct impact of choices** | Dedicated `Swaps & Impact` tab with sustainable lifestyle swaps, conservative estimated exposure reduction badges (`estimated: true`), trip alternatives, and clear `"why_it_matters"` explanations for every action. | `components/dashboard/SwapsImpactTab.tsx`, `components/trip/TripDaysPanel.tsx`, `components/trip/TripRoadmapPacking.tsx`, `components/chat/ChatWidget.tsx` |

---

## Key Features

### 1. Google OAuth Gate & Location Onboarding (`/onboarding`)
- Protected routes (`/` and `/onboarding`) via NextAuth Google OAuth (`components/GoogleAuthGate.tsx`).
- Interactive **Leaflet + OpenStreetMap** map with Nominatim place search, GPS geolocation, and draggable pin.
- Live **CPCB / Open-Meteo Air Quality** fetch (`US AQI`, `European AQI`, `PM2.5`, `PM10`, `NO₂`, `O₃`, `CO`, `SO₂`) for the selected coordinates.
- Household profile calibration: vulnerable groups, commute mode, indoor air setup, and routine outdoor windows.

### 2. Schema-Driven Dashboard (`/`)
- **Daily Plan**: Current risk banner, *Do This Right Now* action card, *Safe Outdoor Window*, interactive **12-Hour Air Quality Timeline** (US AQI / PM2.5 toggle with screen-reader summary), and period-by-period routine cards.
- **Unified Risk & Live AQI Sync**: Consistent 4-tier risk badges (`Low Risk`, `Moderate Risk`, `High Risk`, `Severe Risk`) and live telemetry synchronized across the Hero Banner, Header, 12-Hour Timeline, and Chatbot (`getHeroRiskMeta`).
- **Day / Night Mode**: Material Design 3 Light & Dark theme toggle in the top navbar (`components/ThemeToggle.tsx`) using `useSyncExternalStore` and `localStorage` persistence.
- **Action Roadmap**: Filterable (`Now`, `Today`, `This Week`, `This Month`), keyboard-accessible checkable actions with **Save Progress** persistence to MongoDB.
- **Family & Home**: Member-specific exposure limits, mask advice, warning signs, and indoor air quality hacks checklist.
- **Swaps & Impact**: Sustainable low-emission lifestyle alternatives and calculated exposure-reduction impact.
- **Multilingual Support**: Instant switching across **6 supported languages** (`en` English, `hi` Hindi, `ta` Tamil, `te` Telugu, `ml` Malayalam, and `kn` Kannada).
- **Responsive & Accessible**: Mobile/tablet slide-over navigation drawer, keyboard-accessible controls, and Web Audio API alert chimes (`lib/sound.ts`) when AI routes respond.

### 3. Dedicated Trip & Outdoor Planning Assist (`Planning Assist` Tab)
- Multi-destination planner supporting **up to 3 destinations** searched via OpenStreetMap Nominatim or pinned on Leaflet, with live Open-Meteo air quality fetched per stop.
- Accepts **Start Date**, **Start Time**, and **End Date** (up to 14 days), plus the user's saved household profile.
- Generates a structured JSON trip plan (`/api/ai/trip-plan`) persisted in MongoDB (`models/TripPlan.ts`):
  - **Trip Summary & Impact** (`estimated_exposure_reduction_pct`, top 3 advice items, confidence level)
  - **Alerts** & **Destinations Overview**
  - **Day-by-Day Plan** (4 periods/day, best outdoor window, indoor & travel tips, forecast vs. seasonal estimate indicator)
  - **Cleaner Alternatives (`better_options`)**, **3-Phase Roadmap** (`before_trip`, `during_trip`, `after_trip`), **Packing List** with **Save Progress** persistence (`/api/ai/trip-plan/progress`), **Assumptions**, and **Safety Note**
- Supports **multiple saved trip plans** with **Add Trip Plan**, **Open / Close Window**, and **Delete Plan** actions.

### 4. VayuPulse AI Chatbot Widget
- Expandable Material 3 chat drawer (`Compact` and `Expanded` view) with an auto-expanding `<textarea>` (`Enter` to send, `Shift+Enter` for newline) and drag-to-slide Assist Chips bar.
- **Smart Plan Routing & Cover Screen**: Short-plan queries output directly in plain text, while multi-day trip requests prompt a one-click **Open Planning Assist Mode** button that opens the trip wizard inside the chat drawer.
- **Image Upload (< 5 MB, 1 image at a time, JPG/PNG/WebP/GIF)** with AI-generated image detection before real-world air-quality/indoor hazard analysis.
- **Saved Trips** paginated picker (`3` plans per page from MongoDB): selecting a saved trip triggers a fresh live Open-Meteo air quality check for every destination before answering.

---

## Tech Stack

- **Framework**: Next.js `16.4.6` (App Router, React `19.3`, TypeScript `5`)
- **Styling & Icons**: Tailwind CSS `4`, Google Material 3 semantic tokens (`app/globals.css`), `lucide-react`, and a self-hosted subset Material Symbols Outlined variable font (`app/fonts/material-symbols-subset.woff2`, **54 icons**, **~41 KB** / `41,724` bytes, down from `4,025,760` bytes)
- **GenAI**: `@google/genai` (`lib/gemini/`)
- **Authentication**: `next-auth` (`GoogleProvider`)
- **Database**: MongoDB with `mongoose` (`User`, `AiEvaluation`, `TripPlan`)
- **Maps & Telemetry**: `leaflet` + OpenStreetMap Nominatim + **Indian CPCB Air Quality API (`data.gov.in`)** + **Open-Meteo Air Quality API**

---

## Security

- **Authentication Wrapper**: All user-scoped API routes wrap handlers with `withAuthApiHandler` (`lib/apiHandler.ts` + `lib/apiAuth.ts`), enforcing server-side NextAuth session verification and returning consistent `{ success: false, error: { code, message } }` JSON payloads.
- **Per-User & Per-IP Rate Limiting**: Sliding-window rate limiting (`lib/rateLimit.ts`, configured in `lib/constants.ts`) guards chat (`30/min`), daily plan generation (`12/min`), trip plan generation (`10/min`), `/api/ai/plan/auto-update` POST (`5 / 10 min`), onboarding (`15 / 10 min`), progress/read endpoints (`60/min`), and public telemetry (`60/min` per IP). Exceeding any limit returns HTTP `429` with a `Retry-After` header.
- **Forced-Update Cooldown**: `POST /api/ai/plan/auto-update` enforces a server-side 15-minute cooldown (`PLAN_FORCE_COOLDOWN_MS`) on `force: true` requests using the latest `AiEvaluation` timestamp, returning the existing evaluation with `updated: false` and `Retry-After` without calling Gemini. Non-boolean `force` values return `400`.
- **In-Memory Limiter & IP Trust Caveat**: Rate-limit buckets (`DEFAULT_MAX_BUCKETS = 5000`) and telemetry TTL caches run in-memory per Node/serverless instance; for multi-instance production deployments with strict global quotas, replace the backing store with Redis / Upstash. `getClientIp` prioritizes platform-provided headers (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`) before `x-forwarded-for` so clients cannot spoof the leftmost hop behind supported proxies.
- **Input Validation, Size Caps & Stripping**:
  - `POST /api/user/onboarding` (`lib/onboardingValidation.ts`) caps bodies at `200 KB` (`413 PAYLOAD_TOO_LARGE`), validates `aiPlan` against the Gemini response schema enums/ranges/array bounds, bounds telemetry coordinates & AQI metrics, strips unknown and server-controlled fields (`role`, `_id`, `googleId`, timestamps), and avoids persisting untrusted client `rawResponse`/`promptText` blobs.
  - `POST /api/ai/plan/progress` and `POST /api/ai/trip-plan/progress` enforce `32 KB` body caps, strict types (booleans/strings), and filter IDs against the user's persisted plan roadmap/checklist/packing items.
  - `POST /api/ai/chat` bounds message length (`<= 2000` chars), array length/size of `history` (`<= 50` entries, sanitized to single-line entries), and validates image uploads (`JPG`, `PNG`, `WebP`, `GIF` only, `< 5 MB`).
- **Cron Endpoint Protection**: `GET /api/ai/plan/auto-update` requires `Authorization: Bearer <CRON_SECRET>` validated via constant-time `crypto.timingSafeEqual` (returning `503` when `CRON_SECRET` is unconfigured).
- **Security Headers & CSP (`next.config.ts`)**: Disables `X-Powered-By` and sets `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies: none`, `X-DNS-Prefetch-Control: on`, and `Content-Security-Policy` (`default-src 'self'`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'self'`, `form-action 'self'`, OpenStreetMap & Google avatar `img-src`, Open-Meteo & Nominatim `connect-src`). *Tradeoff*: Next.js 16 `cacheComponents` and `partialPrefetching` pre-render static shells incompatible with per-request nonces, so `script-src`/`style-src` retain `'unsafe-inline'`, with `'unsafe-eval'` strictly limited to development.
- **Startup Env & Dependency Audit**: `validateProductionEnv()` (`lib/env.ts`, called from `lib/auth.ts`) logs clear missing-variable errors in production runtime while keeping builds clean (`NEXT_PHASE=phase-production-build`). Production dependencies (`npm audit --omit=dev`) report **0 vulnerabilities**.

---

## Performance & Efficiency

- **Self-Hosted Subset Icon Font**: `app/fonts/material-symbols-subset.woff2` (`41,724` bytes, `font-display: block`) replaces the ~4 MB full package font (`4,025,760` bytes) while preserving all 4 variable axes (`FILL`, `GRAD`, `opsz`, `wght`).
- **Dynamic Map Loading**: `LeafletMap` is loaded via `next/dynamic` (`ssr: false`) on client screens only when needed, keeping server bundles and initial routes lean.
- **TTL Caches & Deduplication**: Open-Meteo current AQ fetches use a 5-minute, 100-entry TTL cache with concurrent in-flight request deduplication (`lib/airQuality.ts`); CPCB national station snapshots cache for 15 minutes (`lib/cpcb.ts`).
- **Parallel Fetches & Request Timeouts**: Upstream Open-Meteo + CPCB calls run concurrently (`Promise.all`) with 8-second timeouts (`AbortSignal.timeout(8000)`), and client hooks abort stale fetches on unmount or re-query.
- **Database Reuse & Staleness Guard**: Global Mongoose connection caching (`lib/mongodb.ts`), indexed schema lookups (`User`, `AiEvaluation`, `TripPlan`), bounded in-memory rate-limit eviction (`DEFAULT_MAX_BUCKETS = 5000`), and a 6-hour AI plan staleness threshold (`PLAN_STALE_THRESHOLD_MS`) minimize redundant DB connects and Gemini calls.

---

## Tool Usage & Architecture

- **GenAI SDK & Models (`@google/genai`)**: `lib/gemini/client.ts` & `lib/gemini/generate.ts` manage `GoogleGenAI` calls using structured `responseSchema` definitions (`lib/gemini/schemas.ts`), grounded prompts (`lib/gemini/prompts.ts`, `lib/tripPlannerConfig.ts`), and automatic free-tier fallback (`GEMINI_FREE_TIER_MODELS`) on rate limits or transient upstream errors.
- **Ground Telemetry & Geo**: `lib/cpcb.ts` queries the nearest CPCB station within `35 km` and falls back cleanly to Open-Meteo (`lib/airQuality.ts`, `lib/autoUpdatePlan.ts`); Nominatim + Leaflet handle locality search and map pinning.
- **Language Consistency**: Prompts and schemas support `en`, `hi`, `ta`, `te`, `ml`, and `kn` (`SUPPORTED_LANGUAGES` in `lib/validation.ts`), generating user-facing guidance in the selected language while keeping JSON schema keys in English.

---

## Project Structure

```text
urban-air-quality/
├── .github/workflows/ci.yml                 # CI workflow on master/main (Node 22)
├── config/icon-names.json                   # Sorted manifest of 54 used Material Symbols icons
├── scripts/
│   ├── build-icon-font.mjs                  # fontTools GSUB-pruned pyftsubset font builder
│   ├── collect-icons.mjs                    # Static + dynamic Material Symbols AST/regex extractor
│   └── icon-font-utils.mjs                  # Pure-Node WOFF2 GSUB ligature parser
├── app/
│   ├── api/
│   │   ├── air-quality/route.ts             # Unified CPCB + Open-Meteo telemetry endpoint
│   │   ├── ai/
│   │   │   ├── chat/route.ts                # Conversational AI, image check & live trip Q&A
│   │   │   ├── plan/auto-update/route.ts    # Cron & cooldown-protected forced/stale plan update
│   │   │   ├── plan/progress/route.ts       # Persist validated roadmap & indoor checklist progress
│   │   │   ├── plan/route.ts                # Daily household AI air plan generation
│   │   │   ├── trip-plan/progress/route.ts  # Persist validated trip roadmap & packing IDs
│   │   │   └── trip-plan/route.ts           # Multi-destination trip planner CRUD + pagination
│   │   ├── auth/[...nextauth]/route.ts      # NextAuth Google OAuth handler
│   │   └── user/
│   │       ├── onboarding/route.ts          # Schema-validated, 200 KB-capped onboarding save
│   │       └── status/route.ts              # Session, onboarding status & latest plan lookup
│   ├── auth-check/page.tsx                  # Post-login routing check
│   ├── fonts/material-symbols-subset.woff2  # Self-hosted 54-icon variable font (~41 KB)
│   ├── onboarding/
│   │   ├── components/                      # LeafletMap, LifestyleStep, LocationStep, OnboardingHeader, OnboardingProfileActive, OnboardingSubmitting
│   │   └── page.tsx                         # Onboarding flow composition page
│   ├── error.tsx / global-error.tsx / loading.tsx / not-found.tsx
│   ├── globals.css / layout.tsx / page.tsx
├── components/
│   ├── chat/                                # ChatInput, ChatMessageList, ChatWidget
│   ├── dashboard/                           # DailyPlanTab, DashboardHeader, DashboardSidebar, HeroStatusBanner, HourlyForecastChart, IndoorAirLabTab, OnboardingLockScreen, PlanningAssistTab, RoadmapTab, SwapsImpactTab
│   ├── trip/                                # TripDaysPanel, TripDestinationStep, TripHeroAlertsOverview, TripRoadmapPacking, TripScheduleStep, tripPlanUtils
│   ├── AuthProvider.tsx / GoogleAuthGate.tsx / GoogleIcon.tsx / MaterialLoader.tsx / PlanningAssistWizard.tsx / ThemeToggle.tsx / TripPlanSection.tsx
├── hooks/                                   # useAirQuality, useChat, useDashboardUi, useOnboardingForm, usePlan, useTheme, chatReducer, onboardingReducer
├── lib/
│   ├── gemini/                              # client.ts, generate.ts, prompts.ts, schemas.ts (+ lib/gemini.ts re-export)
│   ├── airQuality.ts / api.ts / apiAuth.ts / apiHandler.ts / auth.ts / autoUpdatePlan.ts
│   ├── chatService.ts / constants.ts / cpcb.ts / env.ts / logger.ts / mongodb.ts
│   └── onboardingValidation.ts / rateLimit.ts / sound.ts / tripPlannerConfig.ts / tripPlanService.ts / validation.ts
├── models/                                  # AiEvaluation.ts, TripPlan.ts, User.ts
└── tests/                                   # 12 node:test suites (*.test.ts) + 6 Vitest specs (*.spec.{ts,tsx})
```

---

## Accessibility

- **Keyboard Navigation**: Full keyboard operability across dashboard tabs, roadmaps, modals/drawers (focus trapping inside Planning Assist, `Escape` dismissal restoring trigger focus), skip-to-content link, and keyboard city/GPS search alternatives for Leaflet maps.
- **Screen Reader Labels & Live Regions**: Semantic landmarks (`header`, `main`, `aside`, `footer`), `aria-labelledby` dialogs, `aria-current="page"`, labeled form inputs/comboboxes/selects, `role="log"` (`aria-live="polite"`) AI chat stream, `role="status"` loading announcements, and descriptive `alt` text on uploaded images.
- **Focus Styles & Scaling**: High-contrast `:focus-visible` outlines (`scroll-padding-top: 72px`), `prefers-contrast: more` overrides, and rem-based Tailwind text scaling (`>= 12px`).
- **Reduced Motion & Dark Mode Contrast**: Respects `prefers-reduced-motion`, with light and `html.dark` Tailwind v4 semantic `@theme` tokens tuned for WCAG 2.2 AA contrast.
- **Automated Checks**: Strict `jsx-a11y` ESLint rules (`--max-warnings=0`) plus `vitest-axe` zero-violation checks across component test suites.

---

## Testing & CI

- **Required Node version**: `>=22` (pinned in [`.nvmrc`](.nvmrc) and `package.json` `engines.node`).
- **Unit & API tests (`npm test` / `npm run test:coverage`)**: `pretest` cleans `.test-dist`, `tsconfig.test.json` compiles `lib/`, reducers, models, `next.config.ts`, API routes, and `tests/*.test.ts`, and `node --test` runs all **53 tests** across **12 test files**.
- **Component, Hook, Icon & Accessibility tests (`npm run test:components` / `npm run test:components:coverage`)**: Runs Vitest + React Testing Library + `jsdom` + `vitest-axe` across **6 spec files** (**31 tests**), enforcing V8 coverage thresholds in `vitest.config.ts` (**lines `90%`**, **functions `80%`**, **branches `78%`**).
- **Icons (`npm run icons`)**: Material Symbols Outlined icons are bundled via `app/fonts/material-symbols-subset.woff2` (**54 icons**, `41,724` bytes). After adding a new icon, run `npm run icons` (requires Python `fonttools` + `brotli`) to regenerate `config/icon-names.json` and the subset font.
- **CI (`.github/workflows/ci.yml`)**: Runs on every push and PR to `master` / `main` on Node `22`:
  1. `npm run lint` (`eslint --max-warnings=0`)
  2. `npm run typecheck` (`tsc --noEmit`)
  3. `npx vitest run tests/icons.spec.ts` + size check failing if `app/fonts/material-symbols-subset.woff2` exceeds `150 KB`
  4. `npm run test:coverage` (`node:test`)
  5. `npm run test:components:coverage` (Vitest with `90 / 80 / 78` coverage thresholds + artifact upload)
  6. `npm run build` (`next build --webpack`)

```bash
npm test                         # Compile tsconfig.test.json and run all 53 Node unit/API tests
npm run test:coverage            # Run Node unit/API tests with coverage output
npm run test:components          # Run all 31 Vitest component, hook, icon, and axe specs
npm run test:components:coverage # Run Vitest specs enforcing lines 90 / functions 80 / branches 78
npm run icons                    # Rebuild config/icon-names.json and subset .woff2 font
npm run typecheck                # Strict TypeScript check (tsc --noEmit)
npm run lint                     # ESLint with strict jsx-a11y rules (--max-warnings=0)
npm run build                    # Next.js production build
```

---

## Getting Started

### 1. Prerequisites
- Node.js `>=22` (see `.nvmrc`)
- MongoDB connection URI
- Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Google Gemini API key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your credentials (never commit `.env.local`). Generate random secrets for `NEXTAUTH_SECRET` and `CRON_SECRET` using `openssl rand -base64 32`:

```bash
cp .env.example .env.local
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

```bash
npm run start         # Start production server after npm run build
```
