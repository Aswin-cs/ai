import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import TripPlan from "@/models/TripPlan";
import { generateWithGeminiFallback } from "@/lib/gemini";
import { requireAuthEmail, apiErrorResponse } from "@/lib/apiAuth";
import {
  VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION,
  TRIP_PLAN_RESPONSE_SCHEMA,
} from "@/lib/tripPlannerConfig";
import {
  enumerateDates,
  getPeriodName,
  normalizeLanguage,
  validateTripPlanRequest,
  type TripDestinationInput,
} from "@/lib/validation";

const PERIOD_RANGES: Record<"morning" | "afternoon" | "evening" | "night", string> = {
  morning: "06:00 - 11:59",
  afternoon: "12:00 - 16:59",
  evening: "17:00 - 20:59",
  night: "21:00 - 05:59",
};

async function fetchPlaceForecast(place: TripDestinationInput, dates: string[]) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lng}&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto&forecast_days=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
    const auth = await requireAuthEmail("Unauthorized. Please sign in to generate a trip plan.");
    if (auth.response || !auth.email) return auth.response!;

    const body = await req.json();
    const {
      destinations = [],
      startDate,
      startTime = "09:00",
      endDate,
      householdProfile: bodyProfile,
      language = "en",
    } = body;

    const validated = validateTripPlanRequest(destinations, startDate, endDate);
    if (!validated.ok) {
      return NextResponse.json(
        { success: false, error: validated.error },
        { status: 400 }
      );
    }
    const sanitizedDestinations = validated.destinations;

    // Load user profile from DB if not fully provided
    let resolvedProfile = bodyProfile;
    let dbUserId: mongoose.Types.ObjectId | undefined = undefined;
    try {
      await connectToDatabase();
      const dbUser = await User.findOne({ email: auth.email }).lean();
      if (dbUser) {
        dbUserId = dbUser._id as mongoose.Types.ObjectId;
        if (dbUser.householdProfile && !resolvedProfile) {
          resolvedProfile = dbUser.householdProfile;
        }
      }
    } catch {
      // Continue with provided profile
    }

    const dates = enumerateDates(startDate, endDate);
    const perPlaceForecasts = await Promise.all(
      sanitizedDestinations.map((d) => fetchPlaceForecast(d, dates))
    );
    const forecast = perPlaceForecasts.flat();

    const datesWithForecast = Array.from(new Set(forecast.map((f) => f.date)));
    const datesWithoutForecast = dates.filter((d) => !datesWithForecast.includes(d));

    const resolvedLang = normalizeLanguage(language);

    const inputPayload = {
      places: sanitizedDestinations.map((d) => d.name),
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: null,
      language: resolvedLang,
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
    let savedDoc: Record<string, unknown> | null = null;
    if (process.env.MONGODB_URI) {
      try {
        await connectToDatabase();
        const email = auth.email;
        const created = await TripPlan.create({
          user: dbUserId,
          userEmail: email,
          destinations: sanitizedDestinations,
          startDate,
          startTime,
          endDate,
          language: resolvedLang,
          householdProfileSnapshot: resolvedProfile || {},
          forecastCoverage: inputPayload.forecast_coverage,
          plan: parsedPlan,
          modelUsed: result.modelUsed,
          status: "active",
        });
        savedTripPlanId = String(created._id);
        savedDoc = created.toObject() as unknown as Record<string, unknown>;
      } catch (dbErr) {
        console.error("Failed to persist TripPlan in MongoDB:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      tripPlanId: savedTripPlanId,
      tripPlan: savedDoc,
      plan: parsedPlan,
      forecastCoverage: inputPayload.forecast_coverage,
      modelUsed: result.modelUsed,
    });
  } catch (error: unknown) {
    return apiErrorResponse("VayuPulse Trip Plan Error", error, "Failed to generate trip air-quality plan");
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuthEmail();
    if (auth.response || !auth.email) return auth.response!;

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        success: true,
        tripPlans: [],
        tripPlan: null,
        page: 1,
        limit: 3,
        total: 0,
        totalPages: 1,
      });
    }

    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    await connectToDatabase();
    const query = {
      userEmail: auth.email,
      status: "active" as const,
    };

    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
      const limit = Math.min(10, Math.max(1, parseInt(limitParam || "3", 10) || 3));
      const [total, initialPaginated] = await Promise.all([
        TripPlan.countDocuments(query),
        TripPlan.find(query)
          .select("_id destinations startDate startTime endDate plan.trip_summary.title")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const paginated =
        safePage !== page && total > 0
          ? await TripPlan.find(query)
              .select("_id destinations startDate startTime endDate plan.trip_summary.title")
              .sort({ createdAt: -1 })
              .skip((safePage - 1) * limit)
              .limit(limit)
              .lean()
          : initialPaginated;

      return NextResponse.json({
        success: true,
        tripPlans: paginated,
        tripPlan: paginated[0] || null,
        page: safePage,
        limit,
        total,
        totalPages,
      });
    }

    const activeList = await TripPlan.find(query)
      .select("-householdProfileSnapshot -forecastCoverage -modelUsed")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      tripPlans: activeList,
      tripPlan: activeList[0] || null,
      page: 1,
      limit: activeList.length || 1,
      total: activeList.length,
      totalPages: 1,
    });
  } catch (error: unknown) {
    return apiErrorResponse("Error loading TripPlan", error, "Failed to load trip plan");
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuthEmail();
    if (auth.response || !auth.email) return auth.response!;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (process.env.MONGODB_URI) {
      await connectToDatabase();
      const email = auth.email;
      if (id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: "Invalid trip plan ID." },
            { status: 400 }
          );
        }
        await TripPlan.deleteOne({ _id: id, userEmail: email });
      } else {
        await TripPlan.deleteMany({ userEmail: email, status: "active" });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse("Error deleting TripPlan", error, "Failed to delete trip plan");
  }
}
