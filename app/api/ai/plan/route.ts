import { NextResponse } from "next/server";
import {
  generateWithGeminiFallback,
  AIR_PLAN_RESPONSE_SCHEMA,
  DEFAULT_SYSTEM_INSTRUCTION,
} from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      location,
      aqi,
      pollutants,
      householdProfile,
      image,
      customPrompt,
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

    return NextResponse.json({
      success: true,
      data: result.parsedJson,
      rawText: result.text,
      modelUsed: result.modelUsed,
      attempts: result.attempts,
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
