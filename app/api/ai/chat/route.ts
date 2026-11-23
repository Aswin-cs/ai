import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWithGeminiFallback, DEFAULT_SYSTEM_INSTRUCTION } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const {
      message,
      history = [],
      location = "Delhi NCR, India",
      aqi,
      pollutants,
      householdProfile,
      safeOutdoorWindow,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "A message string is required." },
        { status: 400 }
      );
    }

    const currentAqi = Number(aqi) || 280;
    const pm25 = pollutants?.pm25 ?? 145;
    const pm10 = pollutants?.pm10 ?? 240;
    const no2 = pollutants?.no2 ?? 42;

    const aqiCategory =
      currentAqi > 400
        ? "Severe"
        : currentAqi > 300
        ? "Very Poor"
        : currentAqi > 200
        ? "Poor"
        : currentAqi > 100
        ? "Moderate"
        : currentAqi > 50
        ? "Satisfactory"
        : "Good";

    const vulnerabilities = householdProfile?.vulnerabilities?.length
      ? householdProfile.vulnerabilities.join(", ")
      : "General demographic (no reported respiratory vulnerabilities)";

    const commute = householdProfile?.commute || "standard transit";
    const hasPurifier = householdProfile?.indoorSetup === "purifier";

    const windowInfo = safeOutdoorWindow
      ? `${safeOutdoorWindow.startTime} to ${safeOutdoorWindow.endTime} (Estimated lowest PM2.5: ${safeOutdoorWindow.lowestEstimatedPm25 ?? "moderately lower"} µg/m³; Reason: ${safeOutdoorWindow.reasoning || "Solar heating boundary layer mixing"})`
      : "Afternoon window (approx. 1:30 PM to 4:00 PM when solar heating disperses nocturnal inversion)";

    // Format chat conversation history if provided
    let conversationContext = "";
    if (Array.isArray(history) && history.length > 0) {
      conversationContext = `RECENT CONVERSATION HISTORY:\n${history
        .slice(-4)
        .map((h: any) => `${h.sender === "user" ? "Resident" : "VayuPulse"}: ${h.text}`)
        .join("\n")}\n\n`;
    }

    const systemInstruction = `You are VayuPulse AI, an expert Indian Urban Air Quality and Environmental Health Assistant.
You are conversing directly with a resident of ${location}.

REAL-TIME AIR QUALITY TELEMETRY FOR ${location.toUpperCase()}:
- Current AQI: ${currentAqi} (${aqiCategory})
- PM2.5: ${pm25} µg/m³ (WHO 24h safe limit is 15 µg/m³, Indian NAAQS 24h limit is 60 µg/m³)
- PM10: ${pm10} µg/m³
- NO2: ${no2} ppb
- Lowest-Exposure Safe Window: ${windowInfo}

HOUSEHOLD SPECIFICS:
- Vulnerable members: ${vulnerabilities}
- Commute mode: ${commute}
- Air Purifier present: ${hasPurifier ? "Yes" : "No"}

CORE RESPONSE RULES:
1. Ground your advice STRICTLY in the provided real-time AQI (${currentAqi}) and PM2.5 (${pm25} µg/m³). NEVER invent numbers.
2. Directly answer the user's specific question (e.g. running, walking, kids playing outside, opening windows, mask usage, AC/purifier settings).
3. Provide a clear verdict (e.g., "Not Recommended right now", "Safe only during the 1:30 PM–4:00 PM window", "Mandatory N95 required").
4. Explain the atmospheric reason concisely (e.g., surface temperature inversion, boundary layer compression, vehicular soot trapping).
5. If children, seniors, or asthmatics are present, prioritize extreme caution for outdoor activities when PM2.5 > 120 µg/m³ or AQI > 250.
6. NO EMOJIS anywhere. Keep tone authoritative, calm, and practical. Keep the response between 2 and 4 concise paragraphs or bullet points (under 130 words).`;

    const prompt = `${conversationContext}RESIDENT QUERY: "${message}"

Provide a direct, scientifically grounded, actionable answer based on the ambient air quality in ${location}:`;

    const result = await generateWithGeminiFallback({
      prompt,
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseMimeType: "text/plain",
    });

    const reply = (result.text || "").trim();

    return NextResponse.json({
      success: true,
      reply,
      tag: `${location.split(",")[0]} • AQI ${currentAqi} (${aqiCategory})`,
      modelUsed: result.modelUsed,
      attempts: result.attempts,
    });
  } catch (error: any) {
    console.error("VayuPulse Chat Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process air quality query",
      },
      { status: 500 }
    );
  }
}
