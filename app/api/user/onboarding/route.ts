import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation, { type IAiEvaluation } from "@/models/AiEvaluation";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { sanitizeHouseholdProfile } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const POST = withAuthApiHandler(
  {
    context: "Error saving onboarding data in /api/user/onboarding",
    fallbackError: "Failed to save profile",
    unauthorizedMessage: "Unauthorized. Please sign in to save your air profile.",
  },
  async (req, auth) => {
    const { email, session } = auth;
    const body = await req.json();
    const {
      locationQuery,
      coords,
      householdProfile: rawHouseholdProfile,
      airQualityData,
      aiPlan,
      modelUsed,
      rawResponse,
      promptText,
    } = body;
    const householdProfile = sanitizeHouseholdProfile(rawHouseholdProfile);

    await connectToDatabase();

    const latNum = Number(coords?.lat);
    const lngNum = Number(coords?.lng);
    const locationData = {
      name:
        typeof locationQuery === "string" && locationQuery.trim()
          ? locationQuery.trim().slice(0, 160)
          : "Custom Location",
      lat: Number.isFinite(latNum) && latNum >= -90 && latNum <= 90 ? latNum : 28.6139,
      lng: Number.isFinite(lngNum) && lngNum >= -180 && lngNum <= 180 ? lngNum : 77.209,
    };

    const savedLocationEntry = {
      name: locationData.name,
      lat: locationData.lat,
      lng: locationData.lng,
      lastAqi: airQualityData?.usAqi ?? 100,
      savedAt: new Date(),
    };

    let dbUser = await User.findOne({ email });

    if (!dbUser) {
      dbUser = await User.create({
        name: session.user?.name || "VayuPulse User",
        email,
        image: session.user?.image || "",
        onboardingCompleted: true,
        defaultLocation: locationData,
        savedLocations: [savedLocationEntry],
        householdProfile: householdProfile || {
          vulnerabilities: ["children", "seniors"],
          commute: "two_wheeler",
          indoorSetup: "purifier",
          windows: { morning: true, commute: true, evening: true },
        },
      });
    } else {
      dbUser.onboardingCompleted = true;
      dbUser.defaultLocation = locationData;
      dbUser.savedLocations = !dbUser.savedLocations
        ? [savedLocationEntry]
        : [...dbUser.savedLocations.slice(-9), savedLocationEntry];
      if (householdProfile) {
        dbUser.householdProfile = householdProfile;
      }
      if (session.user?.image && !dbUser.image) {
        dbUser.image = session.user.image;
      }
    }

    let savedAiEvaluation: IAiEvaluation | null = null;

    if (aiPlan) {
      dbUser.aiPlan = aiPlan;

      await AiEvaluation.deleteMany({
        $or: [{ user: dbUser._id }, { userEmail: dbUser.email.toLowerCase() }],
      });

      let responseObj: Record<string, unknown> = {};
      if (typeof rawResponse === "string") {
        try {
          responseObj = JSON.parse(rawResponse) as Record<string, unknown>;
        } catch {
          responseObj = { rawText: rawResponse };
        }
      } else if (rawResponse && typeof rawResponse === "object") {
        responseObj = rawResponse as Record<string, unknown>;
      } else if (aiPlan && typeof aiPlan === "object") {
        responseObj = aiPlan as Record<string, unknown>;
      }

      savedAiEvaluation = await AiEvaluation.create({
        user: dbUser._id,
        userEmail: dbUser.email,
        evaluationType: "onboarding_air_plan",
        location: locationData,
        telemetry: {
          aqi: airQualityData?.usAqi,
          pm25: airQualityData?.pm25,
          pm10: airQualityData?.pm10,
          no2: airQualityData?.no2,
          ozone: airQualityData?.ozone,
          co: airQualityData?.co,
          so2: airQualityData?.so2,
          category:
            typeof airQualityData?.category === "string"
              ? airQualityData.category
              : airQualityData?.category?.label || "",
        },
        householdProfileSnapshot: householdProfile || dbUser.householdProfile,
        aiPlan,
        modelUsed: modelUsed || "gemini",
        rawResponse: responseObj,
        response: responseObj,
        promptText: promptText || "",
        status: "active",
      });

      dbUser.latestAiEvaluation = savedAiEvaluation._id;
      dbUser.aiEvaluations = [savedAiEvaluation._id];
      logger.info(
        `[API /user/onboarding] AI evaluation complete for ${dbUser.email} using model: "${modelUsed || "gemini"}" (ID: ${savedAiEvaluation._id})`
      );
    }

    await dbUser.save();

    return NextResponse.json({
      success: true,
      message: "Onboarding profile and AI evaluation saved successfully",
      evaluationId: savedAiEvaluation?._id?.toString() || null,
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        onboardingCompleted: dbUser.onboardingCompleted,
        defaultLocation: dbUser.defaultLocation,
        latestAiEvaluation: dbUser.latestAiEvaluation,
      },
    });
  }
);
