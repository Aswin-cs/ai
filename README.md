# VayuPulse — GenAI Urban Air Quality & Smog Protection Coach

**VayuPulse** is a GenAI-powered web application built with **Next.js 16**, **Google Gemini (`@google/genai`)**, **Indian CPCB Air Quality API (`data.gov.in`)**, **Open-Meteo Air Quality API**, **OpenStreetMap + Leaflet**, **NextAuth (Google OAuth)**, and **MongoDB** to help families and communities navigate severe winter smog and urban air pollution.

---

## Problem Statement Alignment Check

> *"Create a GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. The application should suggest low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to their location and lifestyle, while clearly explaining the direct impact of their choices."*

| Requirement | How VayuPulse Meets It | Implementation |
| --- | --- | --- |
| **GenAI-powered assistant** | Structured JSON daily & trip planning plus conversational Q&A powered by `@google/genai` with automatic multi-model free-tier fallback across Gemini 4 / 3 / 2.5 and Gemma 4 models. | `lib/gemini.ts`, `app/api/ai/plan/route.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/trip-plan/route.ts` |
| **Navigate severe winter smog & urban air pollution** | Hyperlocal Open-Meteo telemetry (`us_aqi`, `pm2_5`, `pm10`, `no2`, `ozone`, `co`, `so2`), 12-hour hourly AQI/PM2.5 timeline, inversion/smog risk alerts, safe outdoor windows, and automatic 6-hour background plan refresh. | `lib/airQuality.ts`, `lib/autoUpdatePlan.ts`, `app/page.tsx` |
| **Tailored to location & lifestyle (families & communities)** | Interactive `/onboarding` wizard using Leaflet + OpenStreetMap Nominatim search to pin exact locality coordinates, household vulnerability profiling (`children`, `seniors`, `respiratory`, `working_adult`), commute mode (`two_wheeler`, `car`, `metro`, `walk`, `wfh`), indoor setup (`purifier` vs `natural`), and bilingual output (`en` / `ml`). | `app/onboarding/page.tsx`, `app/onboarding/components/LeafletMap.tsx`, `models/User.ts` |
| **Low-emission daily routines** | Time-blocked `daily_routine` (`morning`, `afternoon`, `evening`, `night`) with `instead_of` vs `do_this` guidance, `outdoor_window_review` (`keep` / `shift` / `cancel`), commute protection plans, and checkable `now / today / this_week / this_month` roadmaps saved in MongoDB. | `app/page.tsx`, `app/api/ai/plan/progress/route.ts` |
| **Indoor air quality hacks** | Dedicated `Family & Home` tab with `indoor_air_plan` tailored to HEPA purifier vs. natural ventilation homes, checkable indoor air actions, and ventilation window timing. | `app/page.tsx`, `models/AiEvaluation.ts` |
| **Sustainable alternatives & direct impact of choices** | Dedicated `Swaps & Impact` tab with interactive sustainable swap toggles, conservative estimated exposure reduction badges (`estimated: true`), and clear `"why_it_matters"` explanations for every action. | `app/page.tsx`, `components/TripPlanSection.tsx` |

---

## Key Features

### 1. Google OAuth Gate & Location Onboarding (`/onboarding`)
- Protected routes (`/` and `/onboarding`) via NextAuth Google OAuth (`components/GoogleAuthGate.tsx`).
- Interactive **Leaflet + OpenStreetMap** map with Nominatim place search, GPS geolocation, and draggable pin.
- Live **Open-Meteo Air Quality API** fetch (`US AQI`, `European AQI`, `PM2.5`, `PM10`, `NO₂`, `O₃`, `CO`, `SO₂`) for the selected coordinates.
- Household profile calibration: vulnerable groups, commute mode, indoor air setup, and routine outdoor windows.

### 2. Schema-Driven Dashboard (`/`)
- **Daily Plan**: Current risk banner, *Do This Right Now* action card, *Safe Outdoor Window*, interactive **12-Hour Air Quality Timeline** (US AQI / PM2.5 toggle with screen-reader summary), and period-by-period routine cards.
- **Unified Risk & Live AQI Sync**: Consistent 4-tier risk badges (`Low Risk`, `Moderate Risk`, `High Risk`, `Severe Risk`) and live Open-Meteo telemetry synchronized across the Hero Banner, Navbar, 12-Hour Timeline, and Chatbot (`getHeroRiskMeta`).
- **Day / Night Mode**: Material Design 3 Light & Dark theme toggle in the top navbar (`components/ThemeToggle.tsx`) using `useSyncExternalStore` and `localStorage` persistence.
- **Action Roadmap**: Filterable (`Now`, `Today`, `This Week`, `This Month`), keyboard-accessible checkable actions with **Save Progress** persistence to MongoDB.
- **Family & Home**: Member-specific exposure limits, mask advice, warning signs, and indoor air quality hacks checklist.
- **Swaps & Impact**: Sustainable low-emission lifestyle alternatives with interactive toggles and calculated exposure-reduction impact.
- **Multilingual Support**: Instant switching across English (`EN`), Hindi, Tamil, Telugu, Malayalam, and Kannada.
- **Responsive & Accessible**: Mobile/tablet slide-over navigation drawer, keyboard-accessible controls, and Web Audio API alert chimes (`lib/sound.ts`) when AI routes respond.

### 3. Dedicated Trip & Outdoor Planning Assist (`Planning Assist` Tab)
- Multi-destination planner supporting **up to 3 destinations** searched via OpenStreetMap Nominatim or pinned on Leaflet, with live Open-Meteo air quality fetched per stop and a Material 3 loading overlay during generation.
- Accepts **Start Date**, **Start Time**, and **End Date**, plus the user's saved household profile.
- Generates a structured JSON trip plan (`/api/ai/trip-plan`) persisted in MongoDB (`models/TripPlan.ts`) with Material Design 3 cards & emphasized hover animations:
  - **Trip Summary & Impact** (`estimated_exposure_reduction_pct`, top 3 advice items, confidence level)
  - **Alerts** & **Destinations Overview**
  - **Day-by-Day Plan** (4 periods/day, best outdoor window, indoor & travel tips, forecast vs. seasonal estimate indicator)
  - **Cleaner Alternatives (`better_options`)**, **3-Phase Roadmap** (`before_trip`, `during_trip`, `after_trip`), **Packing List** with **Save Progress** persistence (`/api/ai/trip-plan/progress`), **Assumptions**, and **Safety Note**
- Supports **multiple saved trip plans** with **Add Trip Plan**, **Open / Close Window**, and **Delete Plan** actions.

### 4. VayuPulse AI Chatbot Widget
- Expandable Material 3 chat drawer (`Compact` and `Expanded` view) with an auto-expanding `<textarea>` (`Enter` to send, `Shift+Enter` for newline) and drag-to-slide Assist Chips bar.
- **Smart Plan Routing & Cover Screen**: Short-plan queries output directly in plain text, while long/tour/multi-day trip requests prompt a one-click **Open Planning Assist Mode** button that opens the trip wizard as a full cover screen inside the chat drawer.
- **Image Upload (< 5 MB, 1 image at a time)** with automatic **AI-generated image detection** before real-world air-quality/indoor hazard analysis.
- **Saved Trips** paginated picker (`3` plans per page from MongoDB): selecting a saved trip triggers a fresh live Open-Meteo air quality check for every destination in that plan before answering in plain text.

---

## Tech Stack

- **Framework**: Next.js `16.4.6` (App Router, React `19.3`, TypeScript `5`)
- **Styling**: Tailwind CSS `4`, Google Material 3 design tokens, `lucide-react`, Material Symbols
- **GenAI**: `@google/genai` (`lib/gemini.ts`)
- **Authentication**: `next-auth` (`GoogleProvider`)
- **Database**: MongoDB with `mongoose` (`User`, `AiEvaluation`, `TripPlan`)
- **Maps & Telemetry**: `leaflet` + OpenStreetMap Nominatim + **Indian CPCB Air Quality API (`data.gov.in`)** + **Open-Meteo Air Quality API**

---

## Tool Usage Enforcement

### 1. Which Tools Were Used
- **GenAI SDK & Models (`@google/genai`)**: `lib/gemini.ts` uses `GoogleGenAI` with `systemInstruction`, typed `responseSchema` (`Type` schemas), multimodal text + image inputs, and an automated free-tier fallback chain (`gemini-4-hydrogen` → `gemini-3.8-flash` / `3.6` / `3.5` / `3.1` → `gemini-2.5-flash` / `pro` → `gemma-4-31b-it` / `26b-a4b-it`).
- **Air Quality & Geospatial APIs**: **Indian CPCB Real-Time Air Quality API** (`api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`, `lib/cpcb.ts`) for nearest-station Indian NAQI within 35 km, **Open-Meteo Air Quality API** (`lib/airQuality.ts`, `lib/autoUpdatePlan.ts`) for global/rural fallback & 12-hour hourly forecasts, and `leaflet` + OpenStreetMap Nominatim (`app/onboarding/components/LeafletMap.tsx`, `components/PlanningAssistWizard.tsx`) for coordinate pinning and place search.
- **App, Auth & Persistence**: Next.js `16.4.6` (App Router, React `19.3`, TypeScript `5`), Tailwind CSS `4`, `next-auth` (Google OAuth), and MongoDB/Mongoose (`models/User.ts`, `models/AiEvaluation.ts`, `models/TripPlan.ts`).

### 2. Why They Were Selected
- **`@google/genai` + `responseSchema`**: Enforces strict, strongly typed JSON outputs (`airPlanResponseSchema`, `TRIP_PLAN_RESPONSE_SCHEMA`) so dashboard cards, timelines, and roadmaps render reliably without brittle markdown parsing, while multimodal support powers image inspection in `/api/ai/chat`.
- **Multi-Model Fallback Chain**: Automatically switches models on `429` rate limits or `503` service errors so users never hit dead ends during live demos or peak traffic.
- **Open-Meteo + OpenStreetMap/Leaflet**: Provides zero-key, hyperlocal AQI/PM2.5/NO₂/O₃ forecasts and exact locality coordinates without vendor lock-in.
- **MongoDB + NextAuth**: Persists household profiles, roadmap/checklist progress, and multi-destination trip plans securely per authenticated user.

### 3. How Prompts Evolved
- **Free-form text → Grounded JSON schemas**: Early text prompts evolved into `buildVayuPulsePrompt` (`lib/gemini.ts`) and `VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION` (`lib/tripPlannerConfig.ts`), injecting exact Open-Meteo telemetry and forbidding invented AQI/PM2.5/ozone values (requiring `seasonal_estimate` and lower `data_confidence` when forecast dates are unavailable).
- **Generic advice → Household-calibrated rules**: Added explicit rules for vulnerable groups (`young_children`, `senior_citizens`, `asthma_respiratory`), commute modes (`two_wheeler`, `metro_bus`, `work_from_home`), indoor setups (`hepa_purifier` vs `natural_ventilation`), and bilingual (`en` / `ml`) user-facing text with English JSON keys.
- **Safety & multimodal guardrails**: Added Class 8 reading-level constraints, conservative `estimated: true` exposure-reduction badges (no medical cure claims), medical safety disclaimers, and an AI-generated image check in `/api/ai/chat` before performing visual air-quality/environment inspection.

### 4. What GenAI Handled vs. What Humans Designed
| Responsibility | What Humans Designed | What GenAI Handled |
| --- | --- | --- |
| **System Architecture & Auth** | Next.js App Router APIs, Google OAuth gate (`lib/apiAuth.ts`, `GoogleAuthGate.tsx`), MongoDB schemas (`User`, `AiEvaluation`, `TripPlan`), and 6-hour stale-plan auto-refresh (`lib/autoUpdatePlan.ts`). | — |
| **Data Grounding & Guardrails** | Open-Meteo & Nominatim fetchers (`lib/airQuality.ts`), multi-model fallback & error handling (`lib/gemini.ts`), strict JSON `Schema` definitions, and server-side image MIME/size validation (`app/api/ai/chat/route.ts`). | Adhering to injected telemetry, flagging missing forecast dates as `seasonal_estimate`, and verifying whether uploaded images are AI-generated before hazard analysis. |
| **Planning & Personalization** | Household profile taxonomy, swap/roadmap progress persistence (`/api/ai/plan/progress`), and trip-plan CRUD/pagination (`/api/ai/trip-plan`). | Synthesizing live/hourly AQI data and household constraints into `instead_of` → `do_this` routines, safe outdoor windows, member limits, indoor hacks, trip `better_options`, packing lists, and bilingual (`en`/`ml`) copy. |
| **User Experience** | Material 3 dashboard tabs, interactive 12-hour AQI/PM2.5 timeline, Leaflet map onboarding, `PlanningAssistWizard`, and expandable chat drawer (`app/page.tsx`). | Conversational Q&A grounded in live AQI, 12-hour forecasts, saved trip plans, and uploaded environment photos. |

---

## Project Structure

```text
urban-air-quality/
├── app/
│   ├── api/
│   │   ├── air-quality/route.ts           # Unified CPCB (data.gov.in) + Open-Meteo telemetry API
│   │   ├── ai/
│   │   │   ├── chat/route.ts              # Conversational AI, image check & live trip Q&A
│   │   │   ├── plan/route.ts              # Daily household AI air plan generation
│   │   │   ├── plan/auto-update/route.ts  # Stale (>6h) telemetry & plan auto-refresh
│   │   │   ├── plan/progress/route.ts     # Persist roadmap & indoor checklist progress
│   │   │   ├── trip-plan/route.ts         # Multi-destination trip planner CRUD + pagination
│   │   │   └── trip-plan/progress/route.ts # Persist trip roadmap & packing checklist progress
│   │   ├── auth/[...nextauth]/route.ts    # NextAuth Google OAuth handler
│   │   └── user/
│   │       ├── onboarding/route.ts        # Save user profile + initial AI evaluation
│   │       └── status/route.ts            # Session, onboarding status & latest plan lookup
│   ├── auth-check/page.tsx                # Post-login routing check
│   ├── onboarding/
│   │   ├── components/                    # LocationStep, LifestyleStep, LeafletMap, OnboardingHeader, etc.
│   │   └── page.tsx                       # Thin onboarding wizard composition page
│   └── page.tsx                           # Thin dashboard composition layer
├── components/
│   ├── AuthProvider.tsx
│   ├── GoogleAuthGate.tsx                 # Material 3 Google Sign-In gate
│   ├── GoogleIcon.tsx
│   ├── MaterialLoader.tsx
│   ├── PlanningAssistWizard.tsx           # Wizard wrapper using TripDestinationStep & TripScheduleStep
│   ├── ThemeToggle.tsx                    # Material 3 Day / Night mode navbar toggle
│   ├── TripPlanSection.tsx                # Structured Trip Planner composition section
│   ├── chat/                              # ChatWidget, ChatMessageList, ChatInput
│   ├── dashboard/                         # Sidebar, Header, HeroStatusBanner, HourlyForecastChart & tab panels
│   └── trip/                              # Trip sub-panels, roadmap, packing & wizard step views
├── hooks/                                 # useChat, useAirQuality, usePlan, useDashboardUi, useOnboardingForm, useTheme & reducers
├── lib/
│   ├── gemini/                            # Modular Gemini client, schemas, prompts & fallback runner
│   ├── airQuality.ts                      # Shared Open-Meteo, Nominatim & AQI/Hero risk helpers
│   ├── api.ts                             # Typed client-side fetch layer with structured error handling
│   ├── apiAuth.ts                         # Shared NextAuth session guard & { error: { code, message } } responses
│   ├── apiHandler.ts                      # Shared withAuthApiHandler & withPublicApiHandler wrappers
│   ├── auth.ts                            # NextAuth configuration & MongoDB user sync
│   ├── autoUpdatePlan.ts                  # Live telemetry & 6-hour auto-recalibration
│   ├── chatService.ts                     # Chat prompt & saved trip live-telemetry context builder
│   ├── cpcb.ts                            # data.gov.in CPCB nearest-station & Indian NAQI helper
│   ├── gemini.ts                          # Re-export facade for lib/gemini/
│   ├── logger.ts                          # Structured level-aware logger
│   ├── mongodb.ts                         # Cached Mongoose connection helper
│   ├── sound.ts                           # Web Audio API chime for AI route responses
│   ├── tripPlanService.ts                 # Multi-day forecast aggregation & JSON parsing
│   ├── tripPlannerConfig.ts               # VayuPulse Planner system prompt & JSON schema
│   └── validation.ts                      # Input, date, language & MIME sanitization helpers
├── models/
│   ├── AiEvaluation.ts                    # Daily AI evaluation & progress schema
│   ├── TripPlan.ts                        # Trip & outdoor planning assist schema
│   └── User.ts                            # User profile & onboarding state schema
└── tests/
    ├── airQuality.test.ts                 # AQI, Hero risk, caching & OSM helper tests
    ├── apiClient.test.ts                  # Typed client API & error handling tests
    ├── apiHandler.test.ts                 # Shared auth/public API wrapper & rate-limit tests
    ├── cpcb.test.ts                       # CPCB nearest-station & Indian NAQI tests
    ├── geminiPrompt.test.ts               # Gemini prompt & fallback helper tests
    ├── reducers.test.ts                   # chatReducer & onboardingReducer transition tests
    ├── securityValidation.test.ts         # Rate limiter & sanitization security tests
    ├── servicesAndRoutes.test.ts          # Service helpers & App Router API route integration tests
    ├── tripPlannerConfig.test.ts          # Planner prompt, schema & date helper tests
    └── validation.test.ts                 # Payload, sanitization & MIME validation tests
```

---

## Accessibility

- **Keyboard Navigation**: Full keyboard operability across dashboard tabs, roadmaps, modals/drawers (focus trapping inside Planning Assist, `Escape` dismissal restoring trigger focus), skip-to-content link, and keyboard city/GPS search alternatives for interactive Leaflet maps.
- **Screen Reader Labels & Live Regions**: Semantic landmarks (`header`, `main`, `aside`, `footer`), `aria-labelledby` dialogs, `aria-current="page"`, labeled form inputs/comboboxes/selects, `role="log"` (`aria-live="polite"`) AI chat stream, `role="status"` loading announcements, and descriptive `alt` text on uploaded images (`alt=""` for decorative avatars).
- **Focus Styles & Scaling**: Visible `:focus-visible` rings (`scroll-padding-top: 72px` below the fixed header) and rem-based Tailwind scale (`>= 12px` minimum text).
- **Reduced Motion & Dark Mode Contrast**: Respects `prefers-reduced-motion` (`scroll-behavior` and indeterminate loader animations), with light and `html.dark` Tailwind v4 semantic `@theme` tokens (`>= 4.5:1` text contrast, `>= 3:1` UI contrast).
- **Automated Checks in CI**: Strict `jsx-a11y` ESLint rules (`--max-warnings=0`) plus `vitest-axe` zero-violation checks on every component test suite.

---

## Testing

- **Required Node version**: `>=22` (pinned in [`.nvmrc`](.nvmrc) and `package.json` `engines.node`).
- **Unit & API tests (`npm test` / `npm run test:coverage`)**: `pretest` clears stale build output, `tsconfig.test.json` compiles server services, reducers, API handlers, and `tests/*.test.ts` into `.test-dist/` (gitignored), and `node --test ".test-dist/tests/**/*.test.js"` runs all unit/integration tests (new `tests/<name>.test.ts` files are picked up automatically).
- **Component, Hook & Accessibility tests (`npm run test:components` / `npm run test:components:coverage`)**: Runs Vitest + React Testing Library + `jsdom` + `vitest-axe` across `tests/**/*.spec.{ts,tsx}` with mocked network/auth clients and enforced V8 coverage thresholds (`>= 70%` lines, functions, and branches).

```bash
npm test                       # Clean .test-dist, compile tsconfig.test.json, and run Node unit/API tests
npm run test:coverage          # Run Node unit/API tests with experimental coverage output
npm run test:components        # Run Vitest component, hook, and vitest-axe a11y specs
npm run test:components:coverage # Run Vitest specs with V8 coverage thresholds (>= 70%)
npm run typecheck              # Strict TypeScript check (tsc --noEmit)
npm run lint                   # ESLint with strict jsx-a11y rules (--max-warnings=0)
npm run build                  # Next.js production build
```

---

## Getting Started

### 1. Prerequisites
- Node.js >=22 (see `.nvmrc`)
- MongoDB connection URI
- Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Google Gemini API key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)

### 2. Environment Variables
Create a `.env.local` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NEXTAUTH_SECRET=your_random_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key
DATA_GOV_API_KEY=your_data_gov_in_cpcb_api_key
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
