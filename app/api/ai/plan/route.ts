import { NextResponse } from "next/server";
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
import { requireAuthEmail, apiErrorResponse } from "@/lib/apiAuth";
import { isAllowedImageMime, normalizeLanguage } from "@/lib/validation";

function sanitizeCoordinate(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  return Number.isFinite(num) && num >= min && num <= max ? num : fallback;
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthEmail("Unauthorized. Please sign in to generate an AI air plan.");
    if (auth.response || !auth.email) return auth.response!;

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

    if (image && typeof image.data === "string" && image.data.length > 0) {
      if (image.data.length > 7_200_000) {
        return NextResponse.json(
          { success: false, error: "Uploaded image exceeds the 5 MB maximum file size limit." },
          { status: 400 }
        );
      }
      if (!isAllowedImageMime(image.mimeType)) {
        return NextResponse.json(
          { success: false, error: "Unsupported image format." },
          { status: 400 }
        );
      }
    }

    const safeLat = sanitizeCoordinate(coords?.lat, -90, 90, 28.6139);
    const safeLng = sanitizeCoordinate(coords?.lng, -180, 180, 77.209);

    let resolvedAqi = aqi;
    let resolvedPollutants = pollutants;
    let resolvedHourly = hourlyForecast;

    // Recheck live air quality details via Open-Meteo if requested or if missing
    if (refreshTelemetry || resolvedAqi == null || !resolvedPollutants?.pm25 || !resolvedHourly?.length) {
      const live = await fetchLiveTelemetry(safeLat, safeLng);
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
      language: normalizeLanguage(language),
      customPrompt: typeof customPrompt === "string" ? customPrompt.slice(0, 1500) : undefined,
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
    const userEmail = auth.email;

    // Delete any old evaluations and save new one for authenticated user
    if (userEmail && result.parsedJson) {
      try {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: userEmail });
        if (dbUser) {
          await AiEvaluation.deleteMany({
            $or: [
              { user: dbUser._id },
              { userEmail: dbUser.email.toLowerCase() },
            ],
          });

          const evalDoc = await AiEvaluation.create({
            user: dbUser._id,
            userEmail: dbUser.email,
            evaluationType: evaluationType || "recalibration",
            location: {
              name: location || dbUser.defaultLocation?.name || "Local Area",
              lat: safeLat ?? dbUser.defaultLocation?.lat ?? 28.6139,
              lng: safeLng ?? dbUser.defaultLocation?.lng ?? 77.209,
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
  } catch (error: unknown) {
    return apiErrorResponse("Gemini AI plan generation error", error, "Failed to generate AI plan with Gemini");
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
    const auth = await requireAuthEmail("Unauthorized. Please sign in to access your AI evaluation.");
    if (auth.response || !auth.email) return auth.response!;

    await connectToDatabase();
    let dbUser = await User.findOne({ email: auth.email }).populate("latestAiEvaluation");

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found in database." },
        { status: 404 }
      );
    }

    let existingEval: unknown = dbUser.latestAiEvaluation;
    if (!existingEval) {
      existingEval = await AiEvaluation.findOne({
        $or: [{ user: dbUser._id }, { userEmail: dbUser.email.toLowerCase() }],
      }).sort({ updatedAt: -1 });
    }

    const noEvalFound = !existingEval;
    const updateResult = await checkAndUpdateStalePlan(dbUser, noEvalFound);

    if (updateResult.updated) {
      dbUser = await User.findOne({ email: auth.email }).populate("latestAiEvaluation");
    }

    const activeEval = dbUser?.latestAiEvaluation || updateResult.evaluation;

    return NextResponse.json({
      success: true,
      data: dbUser?.aiPlan || (activeEval as { aiPlan?: unknown } | null)?.aiPlan,
      evaluation: activeEval,
      createdNew: noEvalFound,
      autoUpdated: updateResult.updated,
    });
  } catch (error: unknown) {
    return apiErrorResponse("Error in GET /api/ai/plan", error, "Failed to fetch or generate AiEvaluation");
  }
}
