import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Type, type Schema } from "@google/genai";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import TripPlan from "@/models/TripPlan";
import { generateWithGeminiFallback } from "@/lib/gemini";

const VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION = `You are VayuPulse Planner, an air-quality trip and event planner for families in India.
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

const TRIP_PLAN_RESPONSE_SCHEMA: Schema = {
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

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [startDate];
  }
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 14) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return dates.length > 0 ? dates : [startDate];
}

function getPeriodName(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const PERIOD_RANGES: Record<"morning" | "afternoon" | "evening" | "night", string> = {
  morning: "06:00 - 11:59",
  afternoon: "12:00 - 16:59",
  evening: "17:00 - 20:59",
  night: "21:00 - 05:59",
};

async function fetchPlaceForecast(place: any, dates: string[]) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lng}&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const times: string[] = data?.hourly?.time || [];
    const aqis: number[] = data?.hourly?.us_aqi || [];
    const pm25s: number[] = data?.hourly?.pm2_5 || [];
    const ozones: number[] = data?.hourly?.ozone || [];

    const byDate: Record<string, Array<{ hour: number; aqi: number; pm25: number; ozone: number }>> = {};
    for (let i = 0; i < times.length; i++) {
      const [dStr, tStr] = times[i].split("T");
      if (!dStr || !tStr) continue;
      const hour = parseInt(tStr.slice(0, 2), 10);
      if (!byDate[dStr]) byDate[dStr] = [];
      byDate[dStr].push({
        hour,
        aqi: Math.round(aqis[i] ?? place.usAqi ?? 100),
        pm25: Number((pm25s[i] ?? place.pm25 ?? 35).toFixed(1)),
        ozone: Number((ozones[i] ?? place.ozone ?? 30).toFixed(1)),
      });
    }

    return dates
      .filter((d) => Boolean(byDate[d]?.length))
      .map((date) => {
        const hours = byDate[date];
        const periodBuckets: Record<
          "morning" | "afternoon" | "evening" | "night",
          Array<{ aqi: number; pm25: number; ozone: number }>
        > = {
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        };

        for (const h of hours) {
          periodBuckets[getPeriodName(h.hour)].push(h);
        }

        const periods = (["morning", "afternoon", "evening", "night"] as const)
          .filter((p) => periodBuckets[p].length > 0)
          .map((p) => {
            const arr = periodBuckets[p];
            const avgAqi = Math.round(arr.reduce((s, x) => s + x.aqi, 0) / arr.length);
            const avgPm25 = Number((arr.reduce((s, x) => s + x.pm25, 0) / arr.length).toFixed(1));
            const avgOzone = Number((arr.reduce((s, x) => s + x.ozone, 0) / arr.length).toFixed(1));
            return {
              period: p,
              time_range: PERIOD_RANGES[p],
              aqi: avgAqi,
              pm25: avgPm25,
              ozone: avgOzone,
            };
          });

        // Find cleanest 2-hour daytime outdoor window (06:00-20:00)
        const daytime = hours.filter((h) => h.hour >= 6 && h.hour <= 20);
        let bestWindow = { start: "", end: "", avgAqi: 999, avgPm25: 999 };
        for (let i = 0; i < daytime.length - 1; i++) {
          const avgA = (daytime[i].aqi + daytime[i + 1].aqi) / 2;
          const avgP = (daytime[i].pm25 + daytime[i + 1].pm25) / 2;
          if (avgA < bestWindow.avgAqi) {
            const startH = String(daytime[i].hour).padStart(2, "0");
            const endH = String(Math.min(23, daytime[i + 1].hour + 1)).padStart(2, "0");
            bestWindow = {
              start: `${startH}:00`,
              end: `${endH}:00`,
              avgAqi: Math.round(avgA),
              avgPm25: Number(avgP.toFixed(1)),
            };
          }
        }

        return {
          place: place.name,
          date,
          periods,
          cleanest_window: bestWindow.avgAqi < 999 ? bestWindow : null,
        };
      });
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to generate a trip plan." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      destinations = [],
      startDate,
      startTime = "09:00",
      endDate,
      householdProfile: bodyProfile,
      language = "en",
    } = body;

    if (!Array.isArray(destinations) || destinations.length === 0 || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Destinations, startDate, and endDate are required." },
        { status: 400 }
      );
    }

    // Load user profile from DB if not fully provided
    let resolvedProfile = bodyProfile;
    let dbUserId: any = undefined;
    try {
      await connectToDatabase();
      const dbUser = await User.findOne({ email: session.user.email }).lean();
      if (dbUser) {
        dbUserId = dbUser._id;
        if (dbUser.householdProfile && !resolvedProfile) {
          resolvedProfile = dbUser.householdProfile;
        }
      }
    } catch {
      // Continue with provided profile
    }

    const dates = enumerateDates(startDate, endDate);
    const perPlaceForecasts = await Promise.all(
      destinations.slice(0, 3).map((d: any) => fetchPlaceForecast(d, dates))
    );
    const forecast = perPlaceForecasts.flat();

    const datesWithForecast = Array.from(new Set(forecast.map((f) => f.date)));
    const datesWithoutForecast = dates.filter((d) => !datesWithForecast.includes(d));

    const inputPayload = {
      places: destinations.slice(0, 3).map((d: any) => d.name),
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: null,
      language: language === "ml" ? "ml" : "en",
      household_profile: resolvedProfile
        ? {
            vulnerabilities: resolvedProfile.vulnerabilities || [],
            travel_mode: resolvedProfile.commute || null,
            indoor_setup: resolvedProfile.indoorSetup || null,
            routine_windows: resolvedProfile.windows || null,
          }
        : null,
      forecast_coverage: {
        dates_with_forecast: datesWithForecast,
        dates_without_forecast: datesWithoutForecast,
      },
      forecast,
    };

    const prompt = `Generate the VayuPulse Planner JSON for this trip/outdoor plan input:\n${JSON.stringify(
      inputPayload,
      null,
      2
    )}`;

    const result = await generateWithGeminiFallback({
      prompt,
      systemInstruction: VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION,
      responseSchema: TRIP_PLAN_RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    });

    const rawText = (result.text || "").trim();
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsedPlan = JSON.parse(cleaned);

    let savedTripPlanId: string | null = null;
    if (process.env.MONGODB_URI) {
      try {
        await connectToDatabase();
        const email = session.user.email.toLowerCase();
        await TripPlan.updateMany(
          { userEmail: email, status: "active" },
          { $set: { status: "archived" } }
        );
        const created = await TripPlan.create({
          user: dbUserId,
          userEmail: email,
          destinations: destinations.slice(0, 3),
          startDate,
          startTime,
          endDate,
          language: language === "ml" ? "ml" : "en",
          householdProfileSnapshot: resolvedProfile || {},
          forecastCoverage: inputPayload.forecast_coverage,
          plan: parsedPlan,
          modelUsed: result.modelUsed,
          status: "active",
        });
        savedTripPlanId = String(created._id);
      } catch (dbErr) {
        console.error("Failed to persist TripPlan in MongoDB:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      tripPlanId: savedTripPlanId,
      plan: parsedPlan,
      forecastCoverage: inputPayload.forecast_coverage,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("VayuPulse Trip Plan Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate trip air-quality plan",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ success: true, tripPlan: null });
    }

    await connectToDatabase();
    const active = await TripPlan.findOne({
      userEmail: session.user.email.toLowerCase(),
      status: "active",
    })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      tripPlan: active || null,
    });
  } catch (error: any) {
    console.error("Error loading TripPlan:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load trip plan" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (process.env.MONGODB_URI) {
      await connectToDatabase();
      await TripPlan.updateMany(
        { userEmail: session.user.email.toLowerCase(), status: "active" },
        { $set: { status: "archived" } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error archiving TripPlan:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to archive trip plan" },
      { status: 500 }
    );
  }
}
