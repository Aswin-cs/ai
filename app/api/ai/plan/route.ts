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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const {
      location,
      coords,
      aqi,
      pollutants,
      householdProfile,
      image,
      customPrompt,
      evaluationType,
    } = body;

    const promptText = buildVayuPulsePrompt({
      location,
      aqi,
      pollutants,
      householdProfile,
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
    const userEmail = session?.user?.email || body.userEmail || body.email;

    // If an authenticated user is requesting directly, delete any old evaluations and save new one
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
              aqi: aqi,
              pm25: pollutants?.pm25,
              pm10: pollutants?.pm10,
              no2: pollutants?.no2,
              ozone: pollutants?.ozone,
              co: pollutants?.co,
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
        }
      } catch (dbErr) {
        console.warn("Could not attach evaluation to user session in /api/ai/plan:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: result.parsedJson,
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
