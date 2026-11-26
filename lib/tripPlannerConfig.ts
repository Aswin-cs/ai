import { Type, type Schema } from "@google/genai";

export const VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION = `You are VayuPulse Planner, an air-quality trip and event planner for families in India.
Given places, a date range and optional household profile, you produce a day-by-day exposure-aware plan.

RULES
1. Use ONLY the pollution numbers in the "forecast" array. Never invent AQI, PM2.5 or ozone values.
2. For any date with no forecast (see forecast_coverage.dates_without_forecast), do NOT show numbers.
   Give general seasonal guidance, set that day's data_basis to "seasonal_estimate" and lower its confidence.
3. If several places are given, assume the user visits them in the listed order. The user did not give
   per-place dates, so split the date range sensibly, state the split in "assumptions", and never present
   it as the user's decision.
4. If the profile is present, personalise for every listed member (stricter limits for children, seniors,
   asthma). If travel_mode is given, tailor travel advice to it.
5. Respect start_date/start_time as the first moment of the plan. If end_time is null, treat the last
   day as ending at 21:00.
6. For each day give: overall risk, 3-4 time periods with a do and an avoid, one best outdoor window
   (taken from the forecast), and an indoor tip. Use the period times from the forecast.
7. Compare days. If another day or place in the range is clearly cleaner, add it to "better_options"
   as a suggestion, with the reason. Do not force the user to change plans.
8. Every recommendation has a short "why" and an impact badge. Impact figures are estimates:
   mark estimated=true and keep them conservative. Never claim medical outcomes or cures.
9. Build a "roadmap" with three phases: before_trip, during_trip, after_trip. Steps must be single,
   checkable actions that start with a verb. 8 to 14 steps total, ordered by impact then ease.
10. Add a packing list tied to the actual risk (masks, inhaler if asthma, eye drops, water, etc.).
11. Add "alerts" only for real problems: days with high or severe risk, or sharp day-to-day jumps.
12. Simple language, short sentences. Write all user-facing text in the requested language ("en" or "ml").
    Keep JSON keys and enum values in English.
13. Include a safety note: seek medical care for chest pain or severe breathlessness. You are not a doctor.
14. Output ONLY valid JSON matching the schema. No markdown, no extra text.`;

export const TRIP_PLAN_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    "trip_summary",
    "places_overview",
    "days",
    "alerts",
    "better_options",
    "packing_list",
    "roadmap",
    "impact_summary",
    "assumptions",
    "safety_note",
    "data_confidence",
  ],
  properties: {
    trip_summary: {
      type: Type.OBJECT,
      required: ["title", "start", "end", "duration_days", "overall_risk", "headline", "top_advice"],
      properties: {
        title: { type: Type.STRING },
        start: { type: Type.STRING },
        end: { type: Type.STRING },
        duration_days: { type: Type.INTEGER },
        overall_risk: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
        headline: { type: Type.STRING },
        top_advice: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    places_overview: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["place", "risk_level", "main_concern", "best_day", "worst_day", "note"],
        properties: {
          place: { type: Type.STRING },
          risk_level: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
          main_concern: { type: Type.STRING, enum: ["pm25", "pm10", "ozone", "no2", "mixed"] },
          best_day: { type: Type.STRING },
          worst_day: { type: Type.STRING },
          note: { type: Type.STRING },
        },
      },
    },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: [
          "date",
          "place",
          "risk_level",
          "data_basis",
          "headline",
          "periods",
          "best_outdoor_window",
          "indoor_tip",
        ],
        properties: {
          date: { type: Type.STRING },
          place: { type: Type.STRING },
          risk_level: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
          data_basis: { type: Type.STRING, enum: ["forecast", "seasonal_estimate"] },
          headline: { type: Type.STRING },
          periods: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["period", "time_range", "risk_level", "do", "avoid", "mask_advice"],
              properties: {
                period: { type: Type.STRING, enum: ["morning", "afternoon", "evening", "night"] },
                time_range: { type: Type.STRING },
                risk_level: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
                aqi: { type: Type.NUMBER },
                pm25: { type: Type.NUMBER },
                do: { type: Type.STRING },
                avoid: { type: Type.STRING },
                mask_advice: { type: Type.STRING },
              },
            },
          },
          best_outdoor_window: {
            type: Type.OBJECT,
            required: ["available", "start", "end", "reason"],
            properties: {
              available: { type: Type.BOOLEAN },
              start: { type: Type.STRING },
              end: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
          },
          indoor_tip: { type: Type.STRING },
          travel_tip: { type: Type.STRING },
        },
      },
    },
    alerts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["date", "severity", "message", "action"],
        properties: {
          date: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["info", "warning", "critical"] },
          message: { type: Type.STRING },
          action: { type: Type.STRING },
        },
      },
    },
    better_options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["suggestion", "reason", "expected_benefit", "estimated"],
        properties: {
          suggestion: { type: Type.STRING },
          reason: { type: Type.STRING },
          expected_benefit: { type: Type.STRING },
          estimated: { type: Type.BOOLEAN },
        },
      },
    },
    packing_list: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["item", "reason", "priority"],
        properties: {
          item: { type: Type.STRING },
          reason: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["must", "recommended", "optional"] },
        },
      },
    },
    roadmap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["phase", "title", "goal", "steps"],
        properties: {
          phase: { type: Type.STRING, enum: ["before_trip", "during_trip", "after_trip"] },
          title: { type: Type.STRING },
          goal: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["id", "action", "when", "who", "why", "impact_badge", "effort", "cost"],
              properties: {
                id: { type: Type.STRING },
                action: { type: Type.STRING },
                when: { type: Type.STRING },
                who: { type: Type.STRING },
                why: { type: Type.STRING },
                impact_badge: { type: Type.STRING },
                effort: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
                cost: { type: Type.STRING, enum: ["free", "low", "medium"] },
              },
            },
          },
        },
      },
    },
    impact_summary: {
      type: Type.OBJECT,
      required: ["headline", "estimated_exposure_reduction_pct", "assumptions_note"],
      properties: {
        headline: { type: Type.STRING },
        estimated_exposure_reduction_pct: { type: Type.NUMBER },
        assumptions_note: { type: Type.STRING },
      },
    },
    assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
    safety_note: { type: Type.STRING },
    data_confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
  },
};
