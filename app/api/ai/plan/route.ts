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

    const promptText = `
You are analyzing the current atmospheric air quality telemetry for:
Location: ${location || "Delhi NCR, India"}
Current AQI: ${aqi ?? 145}
Dominant Pollutants: PM2.5 (${pollutants?.pm25 ?? 85} µg/m³), PM10 (${pollutants?.pm10 ?? 140} µg/m³), NO2 (${pollutants?.no2 ?? 40} µg/m³)

Household Profile:
- Vulnerabilities: ${(householdProfile?.vulnerabilities || ["children", "seniors"]).join(", ")}
- Commute Mode: ${householdProfile?.commute || "two_wheeler"}
- Indoor Air Purification: ${householdProfile?.indoorSetup || "purifier"}
- Typical Outdoor Windows: Morning (${householdProfile?.windows?.morning ? "Yes" : "No"}), Commute (${householdProfile?.windows?.commute ? "Yes" : "No"}), Evening (${householdProfile?.windows?.evening ? "Yes" : "No"})${householdProfile?.windows?.custom ? `, Custom Routine: "${householdProfile.windows.custom}"` : ""}

${customPrompt ? `User Inquiry: ${customPrompt}` : "Generate a customized, hourly, science-calibrated air protection plan."}
`.trim();

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

    // If an authenticated user is requesting directly, save evaluation document with ref to user
    if (session?.user?.email && result.parsedJson) {
      try {
        await connectToDatabase();
        const dbUser: any = await User.findOne({ email: session.user.email });
        if (dbUser) {
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
          if (!dbUser.aiEvaluations) dbUser.aiEvaluations = [];
          dbUser.aiEvaluations.push(evalDoc._id);
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
