import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWithGeminiFallback, DEFAULT_SYSTEM_INSTRUCTION } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to use VayuPulse AI chat." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      message,
      image,
      history = [],
      location = "Delhi NCR, India",
      aqi,
      pollutants,
      householdProfile,
      safeOutdoorWindow,
    } = body;

    const hasImage = Boolean(image && typeof image.data === "string" && image.data.length > 0);

    if ((!message || typeof message !== "string" || !message.trim()) && !hasImage) {
      return NextResponse.json(
        { success: false, error: "A message or an image is required." },
        { status: 400 }
      );
    }

    // Server-side 5 MB size guard (base64 overhead ~4/3 => ~7.1 MB max string length)
    if (hasImage && image.data.length > 7_200_000) {
      return NextResponse.json(
        { success: false, error: "Uploaded image exceeds the 5 MB maximum file size limit." },
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
6. AUTHENTICITY & AI-GENERATED IMAGE CHECK: If the resident attaches an image, FIRST inspect whether it is AI-generated, synthetically rendered, or digitally fabricated (check for unnatural lighting/smoothing, distorted text/details, impossible reflections/geometry, or AI watermarks).
   - If the image appears to be AI-generated: State clearly at the start that "This image appears to be AI-generated, not a real photograph." Briefly note the visual signs of AI generation, explain that synthetic images cannot be used to assess real-world air quality or indoor hazards, and ask the resident to upload a real photograph if they need a visual inspection. You may still briefly remind them of their current live AQI (${currentAqi}) guidance.
   - If the image is a real photograph: Inspect it for outdoor smog/haze, room/kitchen ventilation, air purifier filters, smoke sources, or mask fit, and combine your visual findings with the live air quality data.
7. NO EMOJIS anywhere. Keep tone authoritative, calm, and practical. Keep the response between 2 and 4 concise paragraphs or bullet points (under 150 words).`;

    const queryText = (message || "").trim() || "Analyze this image for air quality, smoke, dust, ventilation, or indoor pollution risks based on my location's air quality.";

    const prompt = `${conversationContext}RESIDENT QUERY: "${queryText}"${hasImage ? "\n[An image has been attached by the resident. First verify whether it is AI-generated or a real photograph; if AI-generated, clearly report that it is AI-generated before anything else. Otherwise, perform visual air-quality/environment inspection.]" : ""}

Provide a direct, scientifically grounded, actionable answer based on the ambient air quality in ${location}:`;

    const result = await generateWithGeminiFallback({
      prompt,
      systemInstruction,
      image: hasImage
        ? {
            data: image.data,
            mimeType: image.mimeType || "image/jpeg",
          }
        : undefined,
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
