# VayuPulse — GenAI Urban Air Quality & Smog Protection Coach

**VayuPulse** is a GenAI-powered web application built with **Next.js 16**, **Google Gemini (`@google/genai`)**, **Open-Meteo Air Quality API**, **OpenStreetMap + Leaflet**, **NextAuth (Google OAuth)**, and **MongoDB** to help families and communities navigate severe winter smog and urban air pollution.

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
- **Daily Plan**: Current risk banner, *Do This Right Now* action card, *Safe Outdoor Window*, interactive **12-Hour Air Quality Timeline** (US AQI / PM2.5 toggle), and period-by-period routine cards.
- **Action Roadmap**: Filterable (`Now`, `Today`, `This Week`, `This Month`) checkable actions with **Save Progress** persistence to MongoDB.
- **Family & Home**: Member-specific exposure limits, mask advice, warning signs, and indoor air quality hacks checklist.
- **Swaps & Impact**: Sustainable low-emission lifestyle alternatives with interactive toggles and calculated exposure-reduction impact.
- **Bilingual Support**: Instant switching between English (`EN`) and Malayalam (`മലയാളം`).

### 3. Dedicated Trip & Outdoor Planning Assist (`Planning Assist` Tab)
- Multi-destination planner supporting **up to 3 destinations** searched via OpenStreetMap Nominatim or pinned on Leaflet, with live Open-Meteo air quality fetched per stop.
- Accepts **Start Date**, **Start Time**, and **End Date**, plus the user's saved household profile.
- Generates a structured JSON trip plan (`/api/ai/trip-plan`) persisted in MongoDB (`models/TripPlan.ts`):
  - **Trip Summary & Impact** (`estimated_exposure_reduction_pct`, top 3 advice items, confidence level)
  - **Alerts** & **Destinations Overview**
  - **Day-by-Day Plan** (4 periods/day, best outdoor window, indoor & travel tips, forecast vs. seasonal estimate indicator)
  - **Cleaner Alternatives (`better_options`)**, **3-Phase Roadmap** (`before_trip`, `during_trip`, `after_trip`), **Packing List**, **Assumptions**, and **Safety Note**
- Supports **multiple saved trip plans** with **Add Trip Plan**, **Open / Close Window**, and **Delete Plan** actions.

### 4. VayuPulse AI Chatbot Widget
- Expandable Material 3 chat drawer (`Compact` and `Expanded` view).
- **Image Upload (< 5 MB, 1 image at a time)** with automatic **AI-generated image detection** before real-world air-quality/indoor hazard analysis.
- **Planning Assist** mode & **Saved Trips** paginated picker (`3` plans per page from MongoDB): selecting a saved trip triggers a fresh live Open-Meteo air quality check for every destination in that plan before answering in plain text.

---

## Tech Stack

- **Framework**: Next.js `16.4.6` (App Router, React `19.3`, TypeScript `5`)
- **Styling**: Tailwind CSS `4`, Google Material 3 design tokens, `lucide-react`, Material Symbols
- **GenAI**: `@google/genai` (`lib/gemini.ts`)
- **Authentication**: `next-auth` (`GoogleProvider`)
- **Database**: MongoDB with `mongoose` (`User`, `AiEvaluation`, `TripPlan`)
- **Maps & Telemetry**: `leaflet` + OpenStreetMap Nominatim + Open-Meteo Air Quality API

---

## Project Structure

```text
urban-air-quality/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── chat/route.ts              # Conversational AI, image check & live trip Q&A
│   │   │   ├── plan/route.ts              # Daily household AI air plan generation
│   │   │   ├── plan/auto-update/route.ts  # Stale (>6h) telemetry & plan auto-refresh
│   │   │   ├── plan/progress/route.ts     # Persist roadmap & indoor checklist progress
│   │   │   └── trip-plan/route.ts         # Multi-destination trip planner CRUD + pagination
│   │   ├── auth/[...nextauth]/route.ts    # NextAuth Google OAuth handler
│   │   └── user/
│   │       ├── onboarding/route.ts        # Save user profile + initial AI evaluation
│   │       └── status/route.ts            # Session, onboarding status & latest plan lookup
│   ├── auth-check/page.tsx                # Post-login routing check
│   ├── onboarding/
│   │   ├── components/LeafletMap.tsx      # Interactive OpenStreetMap + Leaflet pin map
│   │   └── page.tsx                       # 2-step household & locality onboarding
│   └── page.tsx                           # Main dashboard, tabs, Planning Assist & AI chatbot
├── components/
│   ├── AuthProvider.tsx
│   ├── GoogleAuthGate.tsx                 # Material 3 Google Sign-In gate
│   ├── GoogleIcon.tsx
│   ├── MaterialLoader.tsx
│   ├── PlanningAssistWizard.tsx           # Map + up to 3 places + start date/time + end date
│   └── TripPlanSection.tsx                # Structured Trip Planner dashboard section
├── lib/
│   ├── airQuality.ts                      # Shared Open-Meteo, Nominatim & AQI metadata helpers
│   ├── apiAuth.ts                         # Shared NextAuth session guard helper
│   ├── auth.ts                            # NextAuth configuration & MongoDB user sync
│   ├── autoUpdatePlan.ts                  # Live telemetry & 6-hour auto-recalibration
│   ├── gemini.ts                          # Gemini multi-model fallback engine & daily schemas
│   ├── mongodb.ts                         # Cached Mongoose connection helper
│   └── tripPlannerConfig.ts               # VayuPulse Planner system prompt & JSON schema
└── models/
    ├── AiEvaluation.ts                    # Daily AI evaluation & progress schema
    ├── TripPlan.ts                        # Trip & outdoor planning assist schema
    └── User.ts                            # User profile & onboarding state schema
```

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
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
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Production Build

```bash
npm run build
npm run start
```
