import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import {
  generateWithGeminiFallback,
  AIR_PLAN_RESPONSE_SCHEMA,
  DEFAULT_SYSTEM_INSTRUCTION,
  buildVayuPulsePrompt,
} from "@/lib/gemini";
import { checkAndUpdateStalePlan, fetchLiveTelemetry } from "@/lib/autoUpdatePlan";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to generate an AI air plan." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      location,
      coords,
      aqi,
      pollutants,
      hourlyForecast,
      householdProfile,
      image,
      customPrompt,
      evaluationType,
      refreshTelemetry,
      language,
    } = body;

    let resolvedAqi = aqi;
    let resolvedPollutants = pollutants;
    let resolvedHourly = hourlyForecast;

    // Recheck live air quality details via Open-Meteo if requested or if missing
    if (refreshTelemetry || resolvedAqi == null || !resolvedPollutants?.pm25 || !resolvedHourly?.length) {
      const lat = coords?.lat ?? 28.6139;
      const lng = coords?.lng ?? 77.209;
      const live = await fetchLiveTelemetry(lat, lng);
      if (refreshTelemetry || resolvedAqi == null) resolvedAqi = live.aqi;
      if (refreshTelemetry || !resolvedPollutants?.pm25) {
        resolvedPollutants = {
          pm25: live.pm25,
          pm10: live.pm10,
          no2: live.no2,
          ozone: live.ozone,
          co: live.co,
          so2: live.so2,
        };
      }
      if (!resolvedHourly?.length) {
        resolvedHourly = live.hourlyForecast;
      }
    }

    const promptText = buildVayuPulsePrompt({
      location,
      aqi: resolvedAqi,
      pollutants: resolvedPollutants,
      hourlyForecast: resolvedHourly,
      householdProfile,
      language,
      customPrompt,
    });

    const result = await generateWithGeminiFallback({
      prompt: promptText,
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      responseSchema: AIR_PLAN_RESPONSE_SCHEMA,
      image: image
        ? {
            data: image.data,
            mimeType: image.mimeType || "image/jpeg",
          }
        : undefined,
    });

    let savedEvaluationId: string | null = null;
    const userEmail = session.user.email;

    // Delete any old evaluations and save new one for authenticated user
    if (userEmail && result.parsedJson) {
      try {
        await connectToDatabase();
        const dbUser: any = await User.findOne({ email: userEmail });
        if (dbUser) {
          // Delete old/existing AiEvaluation documents for this user before creating a new one
          await AiEvaluation.deleteMany({
            $or: [
              { user: dbUser._id },
              { userEmail: dbUser.email.toLowerCase() },
            ],
          });

          const evalDoc: any = await AiEvaluation.create({
            user: dbUser._id,
            userEmail: dbUser.email,
            evaluationType: evaluationType || "recalibration",
            location: {
              name: location || dbUser.defaultLocation?.name || "Local Area",
              lat: coords?.lat ?? dbUser.defaultLocation?.lat ?? 28.6139,
              lng: coords?.lng ?? dbUser.defaultLocation?.lng ?? 77.209,
            },
            telemetry: {
              aqi: resolvedAqi,
              pm25: resolvedPollutants?.pm25,
              pm10: resolvedPollutants?.pm10,
              no2: resolvedPollutants?.no2,
              ozone: resolvedPollutants?.ozone,
              co: resolvedPollutants?.co,
              so2: resolvedPollutants?.so2,
            },
            householdProfileSnapshot: householdProfile || dbUser.householdProfile,
            aiPlan: result.parsedJson,
            modelUsed: result.modelUsed,
            rawResponse: result.parsedJson || { text: result.text },
            response: result.parsedJson || { text: result.text },
            promptText,
            attempts: result.attempts,
            status: "active",
          });

          savedEvaluationId = evalDoc._id.toString();
          dbUser.latestAiEvaluation = evalDoc._id;
          dbUser.aiEvaluations = [evalDoc._id];
          dbUser.aiPlan = result.parsedJson;
          await dbUser.save();

          console.log(`[API /ai/plan] AI evaluation complete for ${dbUser.email} using model: "${result.modelUsed}" (ID: ${savedEvaluationId})`);
        }
      } catch (dbErr) {
        console.warn("Could not attach evaluation to user session in /api/ai/plan:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: result.parsedJson,
      telemetry: {
        aqi: resolvedAqi,
        pollutants: resolvedPollutants,
      },
      rawText: result.text,
      modelUsed: result.modelUsed,
      attempts: result.attempts,
      evaluationId: savedEvaluationId,
    });
  } catch (error: any) {
    console.error("Gemini AI plan generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate AI plan with Gemini",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/plan
 * Fetches the user's current AiEvaluation.
 * If no collection/document is found or if it is stale (> 6 hours),
 * it automatically creates a new one using the API and returns it.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to access your AI evaluation." },
        { status: 401 }
      );
    }

    const email = session.user.email;

    await connectToDatabase();
    let dbUser: any = await User.findOne({ email }).populate("latestAiEvaluation");

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found in database." },
        { status: 404 }
      );
    }

    // Check if no AiEvaluation is found for this user
    let existingEval = dbUser.latestAiEvaluation;
    if (!existingEval) {
      existingEval = await AiEvaluation.findOne({
        $or: [{ user: dbUser._id }, { userEmail: dbUser.email.toLowerCase() }],
      }).sort({ updatedAt: -1 });
    }

    const noEvalFound = !existingEval;

    // If no collection found or older than 6 hours, create/update using the API
    const updateResult = await checkAndUpdateStalePlan(dbUser, noEvalFound);

    if (updateResult.updated) {
      dbUser = await User.findOne({ email }).populate("latestAiEvaluation");
    }

    const activeEval = dbUser.latestAiEvaluation || updateResult.evaluation;

    return NextResponse.json({
      success: true,
      data: dbUser.aiPlan || activeEval?.aiPlan,
      evaluation: activeEval,
      createdNew: noEvalFound,
      autoUpdated: updateResult.updated,
    });
  } catch (error: any) {
    console.error("Error in GET /api/ai/plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch or generate AiEvaluation",
      },
      { status: 500 }
    );
  }
}
