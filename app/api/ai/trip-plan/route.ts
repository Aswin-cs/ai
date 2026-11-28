import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import TripPlan from "@/models/TripPlan";
import { generateWithGeminiFallback } from "@/lib/gemini";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { RATE_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { fetchPlaceForecast, sanitizeTripJsonText } from "@/lib/tripPlanService";
import {
  TRIP_PLAN_RESPONSE_SCHEMA,
  VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION,
} from "@/lib/tripPlannerConfig";
import { enumerateDates, normalizeLanguage, validateTripPlanRequest } from "@/lib/validation";

export const POST = withAuthApiHandler(
  {
    context: "VayuPulse Trip Plan Error",
    fallbackError: "Failed to generate trip air-quality plan",
    unauthorizedMessage: "Unauthorized. Please sign in to generate a trip plan.",
    rateLimit: {
      prefix: "trip-plan",
      limit: RATE_LIMITS.tripPlan.limit,
      windowMs: RATE_LIMITS.tripPlan.windowMs,
    },
  },
  async (req, auth) => {
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
      return errorResponse("BAD_REQUEST", validated.error || "Invalid trip plan input.", 400);
    }
    const sanitizedDestinations = validated.destinations;

    let resolvedProfile = bodyProfile;
    let dbUserId: mongoose.Types.ObjectId | undefined;
    try {
      await connectToDatabase();
      const dbUser = await User.findOne({ email: auth.email })
        .select("_id householdProfile")
        .lean();
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

    const result = await generateWithGeminiFallback({
      prompt: `Generate the VayuPulse Planner JSON for this trip/outdoor plan input:\n${JSON.stringify(inputPayload, null, 2)}`,
      systemInstruction: VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION,
      responseSchema: TRIP_PLAN_RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    });

    const parsedPlan = sanitizeTripJsonText(result.text || "");

    let savedTripPlanId: string | null = null;
    let savedDoc: Record<string, unknown> | null = null;
    if (process.env.MONGODB_URI) {
      try {
        await connectToDatabase();
        const created = await TripPlan.create({
          user: dbUserId,
          userEmail: auth.email,
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
        logger.error("Failed to persist TripPlan in MongoDB:", dbErr);
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
  }
);

export const GET = withAuthApiHandler(
  {
    context: "Error loading TripPlan",
    fallbackError: "Failed to load trip plan",
    rateLimit: {
      prefix: "trip-plan-read",
      limit: RATE_LIMITS.tripPlanRead.limit,
      windowMs: RATE_LIMITS.tripPlanRead.windowMs,
    },
  },
  async (req, auth) => {
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
    const query = { userEmail: auth.email, status: "active" as const };

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
  }
);

export const DELETE = withAuthApiHandler(
  {
    context: "Error deleting TripPlan",
    fallbackError: "Failed to delete trip plan",
    rateLimit: {
      prefix: "trip-plan-read",
      limit: RATE_LIMITS.tripPlanRead.limit,
      windowMs: RATE_LIMITS.tripPlanRead.windowMs,
    },
  },
  async (req, auth) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (process.env.MONGODB_URI) {
      await connectToDatabase();
      if (id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return errorResponse("BAD_REQUEST", "Invalid trip plan ID.", 400);
        }
        await TripPlan.deleteOne({ _id: id, userEmail: auth.email });
      } else {
        await TripPlan.deleteMany({ userEmail: auth.email, status: "active" });
      }
    }

    return NextResponse.json({ success: true });
  }
);
