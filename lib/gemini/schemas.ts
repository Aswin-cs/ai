import { Type, type Schema } from "@google/genai";

export const airPlanResponseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    "status",
    "do_this_now",
    "safe_outdoor_window",
    "member_guidance",
    "daily_routine",
    "roadmap",
    "sustainable_swaps",
    "impact_summary",
    "safety_note",
    "data_confidence",
  ],
  properties: {
    status: {
      type: Type.OBJECT,
      required: ["risk_level", "headline", "plain_explanation", "main_concern"],
      properties: {
        risk_level: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
        headline: { type: Type.STRING, description: "Max 12 words, e.g. 'Ozone is high this afternoon'" },
        plain_explanation: { type: Type.STRING, description: "2 short sentences explaining the AQI for a non-expert" },
        main_concern: { type: Type.STRING, enum: ["pm25", "pm10", "ozone", "no2", "mixed"] },
      },
    },
    do_this_now: {
      type: Type.OBJECT,
      required: ["action", "reason"],
      properties: {
        action: { type: Type.STRING, description: "One single action for the current time" },
        reason: { type: Type.STRING },
      },
    },
    safe_outdoor_window: {
      type: Type.OBJECT,
      required: ["available", "start", "end", "reason", "expected_pm25", "best_for"],
      properties: {
        available: { type: Type.BOOLEAN },
        start: { type: Type.STRING, description: "HH:MM 24h, empty if none" },
        end: { type: Type.STRING, description: "HH:MM 24h, empty if none" },
        reason: { type: Type.STRING },
        expected_pm25: { type: Type.NUMBER, description: "Taken from input forecast; 0 if unknown" },
        best_for: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "e.g. children play, senior walk",
        },
      },
    },
    member_guidance: {
      type: Type.ARRAY,
      description: "One entry per selected household member",
      items: {
        type: Type.OBJECT,
        required: ["member", "outdoor_limit", "mask_advice", "key_tips"],
        properties: {
          member: {
            type: Type.STRING,
            enum: ["young_children", "senior_citizens", "asthma_respiratory", "working_adult"],
          },
          outdoor_limit: { type: Type.STRING, description: "e.g. 'Max 30 min, only 4:30-6:00 PM'" },
          mask_advice: { type: Type.STRING },
          key_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
          warning_signs: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    outdoor_window_review: {
      type: Type.ARRAY,
      description: "One entry per typical_outdoor_window the user gave. Empty if none.",
      items: {
        type: Type.OBJECT,
        required: ["usual_activity", "verdict", "suggestion"],
        properties: {
          usual_activity: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: ["keep", "shift", "cancel"] },
          suggestion: { type: Type.STRING },
        },
      },
    },
    daily_routine: {
      type: Type.ARRAY,
      description: "Morning, afternoon, evening, night",
      items: {
        type: Type.OBJECT,
        required: ["period", "time_range", "risk_level", "instead_of", "do_this", "why_it_matters", "impact"],
        properties: {
          period: { type: Type.STRING, enum: ["morning", "afternoon", "evening", "night"] },
          time_range: { type: Type.STRING, description: "e.g. '6:30 AM - 9:00 AM'" },
          risk_level: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
          instead_of: { type: Type.STRING, description: "The usual habit to avoid" },
          do_this: { type: Type.STRING, description: "The better action" },
          why_it_matters: { type: Type.STRING },
          impact: {
            type: Type.OBJECT,
            required: ["badge", "estimated"],
            properties: {
              badge: { type: Type.STRING, description: "Short label for UI, e.g. '-40% exposure'" },
              estimated: { type: Type.BOOLEAN },
            },
          },
        },
      },
    },
    indoor_air_plan: {
      type: Type.OBJECT,
      required: ["setup", "steps"],
      properties: {
        setup: { type: Type.STRING, enum: ["hepa_purifier", "natural_ventilation"] },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["action", "when", "cost"],
            properties: {
              action: { type: Type.STRING },
              when: { type: Type.STRING },
              cost: { type: Type.STRING, enum: ["free", "low", "medium"] },
            },
          },
        },
      },
    },
    commute_plan: {
      type: Type.OBJECT,
      required: ["mode", "best_departure", "protection", "tips"],
      properties: {
        mode: { type: Type.STRING },
        best_departure: { type: Type.STRING },
        protection: { type: Type.STRING },
        tips: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    roadmap: {
      type: Type.ARRAY,
      description: "Ordered checklist the user can follow. Four phases: now, today, this_week, this_month.",
      items: {
        type: Type.OBJECT,
        required: ["phase", "title", "goal", "steps"],
        properties: {
          phase: { type: Type.STRING, enum: ["now", "today", "this_week", "this_month"] },
          title: { type: Type.STRING },
          goal: { type: Type.STRING, description: "One sentence: what this phase achieves" },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["id", "action", "when", "who", "why", "impact_badge", "effort", "cost"],
              properties: {
                id: { type: Type.STRING, description: "e.g. 'now-1', 'today-2'" },
                action: { type: Type.STRING, description: "Starts with a verb, max 20 words" },
                when: { type: Type.STRING, description: "Time or frequency" },
                who: { type: Type.STRING, description: "Whole family, or a specific member" },
                why: { type: Type.STRING, description: "One sentence" },
                impact_badge: { type: Type.STRING, description: "e.g. '-30% indoor PM2.5'" },
                effort: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
                cost: { type: Type.STRING, enum: ["free", "low", "medium"] },
              },
            },
          },
        },
      },
    },
    sustainable_swaps: {
      type: Type.ARRAY,
      description: "3 to 5 lower-emission alternatives that fit the user's lifestyle",
      items: {
        type: Type.OBJECT,
        required: ["from_habit", "to_habit", "benefit_to_air", "benefit_to_family", "effort"],
        properties: {
          from_habit: { type: Type.STRING },
          to_habit: { type: Type.STRING },
          benefit_to_air: { type: Type.STRING, description: "Community-level effect, in plain words" },
          benefit_to_family: { type: Type.STRING },
          effort: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
        },
      },
    },
    impact_summary: {
      type: Type.OBJECT,
      required: ["headline", "estimated_exposure_reduction_pct", "assumptions", "community_note"],
      properties: {
        headline: {
          type: Type.STRING,
          description: "e.g. 'Following this plan could cut your family's pollution exposure by about 35% today'",
        },
        estimated_exposure_reduction_pct: { type: Type.NUMBER },
        assumptions: { type: Type.STRING, description: "What the estimate assumes; note it is approximate" },
        community_note: { type: Type.STRING, description: "What happens if neighbours follow too" },
      },
    },
    safety_note: { type: Type.STRING },
    data_confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
  },
};

export const AIR_PLAN_RESPONSE_SCHEMA = airPlanResponseSchema;
