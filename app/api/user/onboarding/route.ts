import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please sign in to save your air profile." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      locationQuery,
      coords,
      householdProfile,
      airQualityData,
      aiPlan,
      modelUsed,
      rawResponse,
      promptText,
    } = body;

    await connectToDatabase();

    const locationData = {
      name: locationQuery || "Custom Location",
      lat: coords?.lat ?? 28.6139,
      lng: coords?.lng ?? 77.209,
    };

    const savedLocationEntry = {
      name: locationData.name,
      lat: locationData.lat,
      lng: locationData.lng,
      lastAqi: airQualityData?.usAqi ?? 100,
      savedAt: new Date(),
    };

    let dbUser: any = await User.findOne({ email: session.user.email });

    if (!dbUser) {
      dbUser = await User.create({
        name: session.user.name || "VayuMitra User",
        email: session.user.email,
        image: session.user.image || "",
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
      if (!dbUser.savedLocations) {
        dbUser.savedLocations = [savedLocationEntry];
      } else {
        dbUser.savedLocations.push(savedLocationEntry);
      }
      if (householdProfile) {
        dbUser.householdProfile = householdProfile;
      }
      if (session.user.image && !dbUser.image) {
        dbUser.image = session.user.image;
      }
    }

    let savedAiEvaluation: any = null;

    if (aiPlan) {
      dbUser.aiPlan = aiPlan;

      // Delete prior evaluations for this user before creating the new one
      await AiEvaluation.deleteMany({
        $or: [
          { user: dbUser._id },
          { userEmail: dbUser.email.toLowerCase() },
        ],
      });

      // Convert raw response or aiPlan into a structured object
      let responseObj: Record<string, any> = {};
      if (typeof rawResponse === "string") {
        try {
          responseObj = JSON.parse(rawResponse);
        } catch {
          responseObj = { rawText: rawResponse };
        }
      } else if (rawResponse && typeof rawResponse === "object") {
        responseObj = rawResponse;
      } else if (aiPlan && typeof aiPlan === "object") {
        responseObj = aiPlan;
      }

      // Create new AI evaluation linked by ref to this user
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
          category: airQualityData?.category,
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
      console.log(`[API /user/onboarding] AI evaluation complete for ${dbUser.email} using model: "${modelUsed || "gemini"}" (ID: ${savedAiEvaluation._id})`);
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
  } catch (error: any) {
    console.error("Error saving onboarding data in /api/user/onboarding:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save profile" },
      { status: 500 }
    );
  }
}
