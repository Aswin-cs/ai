import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation, { type IAiEvaluation } from "@/models/AiEvaluation";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { RATE_LIMITS } from "@/lib/constants";
import { validateOnboardingPayload } from "@/lib/onboardingValidation";
import { logger } from "@/lib/logger";

export const POST = withAuthApiHandler(
  {
    context: "Error saving onboarding data in /api/user/onboarding",
    fallbackError: "Failed to save profile",
    unauthorizedMessage: "Unauthorized. Please sign in to save your air profile.",
    rateLimit: {
      prefix: "onboarding",
      limit: RATE_LIMITS.onboarding.limit,
      windowMs: RATE_LIMITS.onboarding.windowMs,
    },
  },
  async (req, auth) => {
    const { email, session } = auth;
    const rawBody = await req.text();
    const validation = validateOnboardingPayload(rawBody);
    if (!validation.ok) {
      return errorResponse(validation.code, validation.error, validation.status);
    }

    const {
      locationName,
      lat,
      lng,
      householdProfile,
      airQualityData,
      aiPlan,
      modelUsed,
    } = validation.data;

    await connectToDatabase();

    const locationData = { name: locationName, lat, lng };

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

      // Do not persist untrusted rawResponse/promptText blobs from client onboarding requests
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
          category: airQualityData?.category || "",
        },
        householdProfileSnapshot: householdProfile || dbUser.householdProfile,
        aiPlan,
        modelUsed,
        rawResponse: {},
        response: {},
        promptText: "",
        status: "active",
      });

      dbUser.latestAiEvaluation = savedAiEvaluation._id;
      dbUser.aiEvaluations = [savedAiEvaluation._id];
      logger.info(
        `[API /user/onboarding] AI evaluation complete for ${dbUser.email} using model: "${modelUsed}" (ID: ${savedAiEvaluation._id})`
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
