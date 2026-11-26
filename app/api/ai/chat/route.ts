import { NextResponse } from "next/server";
import { generateWithGeminiFallback, DEFAULT_SYSTEM_INSTRUCTION } from "@/lib/gemini";
import connectToDatabase from "@/lib/mongodb";
import TripPlan from "@/models/TripPlan";
import { requireAuthEmail } from "@/lib/apiAuth";
import { fetchCurrentOpenMeteoAq } from "@/lib/airQuality";

export async function POST(req: Request) {
  try {
    const auth = await requireAuthEmail("Unauthorized. Please sign in to use VayuPulse AI chat.");
    if (auth.response || !auth.email) return auth.response!;

    const body = await req.json();
    const {
      message,
      image,
      mode = "standard",
      hourlyForecast = [],
      tripPlan = null,
      selectedTripPlanId = null,
      history = [],
      location = "Delhi NCR, India",
      aqi,
      pollutants,
      householdProfile,
      safeOutdoorWindow,
    } = body;

    const hasImage = Boolean(image && typeof image.data === "string" && image.data.length > 0);
    const hasTripPlan = Boolean(
      tripPlan && Array.isArray(tripPlan.destinations) && tripPlan.destinations.length > 0
    );

    if ((!message || typeof message !== "string" || !message.trim()) && !hasImage && !hasTripPlan) {
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

    const isPlanningAssist = mode === "planning_assist";
    const forecastSummary =
      Array.isArray(hourlyForecast) && hourlyForecast.length > 0
        ? hourlyForecast
            .slice(0, 12)
            .map((h: any) => `${h.label || h.time}: AQI ${h.aqi ?? h.us_aqi ?? "--"} (PM2.5 ${h.pm25 ?? "--"})`)
            .join(", ")
        : "Not provided";

    const queryText =
      (message || "").trim() ||
      (hasTripPlan
        ? "Create an outdoor & trip air-quality protection plan for my selected destinations, start time, and end date."
        : isPlanningAssist
        ? "Help me plan my day's outdoor activities, commute, and indoor ventilation around today's air quality."
        : "Analyze this image for air quality, smoke, dust, ventilation, or indoor pollution risks based on my location's air quality.");

    const tripDestinationsSummary = hasTripPlan
      ? tripPlan.destinations
          .map(
            (d: any, idx: number) =>
              `${idx + 1}. ${d.name}: US AQI ${d.usAqi ?? "--"} (${d.categoryLabel || "Live"}), PM2.5 ${d.pm25 ?? "--"} µg/m³, PM10 ${d.pm10 ?? "--"} µg/m³, NO2 ${d.no2 ?? "--"} µg/m³, Ozone ${d.ozone ?? "--"} µg/m³`
          )
          .join("\n  ")
      : "";

    const planningInstruction = isPlanningAssist
      ? hasTripPlan
        ? `\nTRIP & OUTDOOR PLANNING ASSIST MODE ACTIVE:
- Trip Schedule: Starts on ${tripPlan.startDate || "today"} at ${tripPlan.startTime || "now"}, End Date: ${tripPlan.endDate || "today"}
- Selected Destinations (Live Open-Meteo Air Quality):
  ${tripDestinationsSummary}
- Home Baseline 12-Hour Forecast: ${forecastSummary}
- Create a practical, structured Trip & Outdoor Air Protection Plan:
  1) Destination Air Quality Comparison (highlight cleanest vs highest-risk stop using exact AQI & PM2.5)
  2) Recommended Timing & Route Order (from ${tripPlan.startDate || "today"} ${tripPlan.startTime || "now"} through ${tripPlan.endDate || "today"})
  3) Protective Gear & Travel Checklist (N95 masks, vehicle AC recirculation, hydration, sensitive-group precautions)`
        : `\nPLANNING ASSIST MODE ACTIVE:
- 12-Hour Hourly Forecast: ${forecastSummary}
- Create a clear, time-blocked action plan tailored to the user's schedule and the hourly forecast above:
  1) Best Time Slots (exact hours with lowest AQI/PM2.5)
  2) Activities to Shift or Avoid (peak pollution hours)
  3) Quick Preparation Checklist (masks, ventilation/purifier timings)
- Keep it concise, structured with clean bullet points, and grounded strictly in the provided forecast numbers.`
      : "";

    // If user selected a saved TripPlan from DB, load it and fetch LIVE current air quality for every place in it
    let savedTripContextText = "";
    let savedTripTag = "";
    if (selectedTripPlanId && process.env.MONGODB_URI) {
      try {
        await connectToDatabase();
        const dbTrip = await TripPlan.findOne({
          _id: selectedTripPlanId,
          userEmail: auth.email,
        }).lean();

        if (dbTrip) {
          const livePlaces = await Promise.all(
            (dbTrip.destinations || []).map(async (dest: any) => {
              const live = await fetchCurrentOpenMeteoAq(dest.lat, dest.lng);
              return {
                name: dest.name,
                liveAqi: live?.usAqi ?? dest.usAqi ?? "--",
                livePm25: live?.pm25 ?? dest.pm25 ?? "--",
                livePm10: live?.pm10 ?? dest.pm10 ?? "--",
                liveNo2: live?.no2 ?? dest.no2 ?? "--",
                liveOzone: live?.ozone ?? dest.ozone ?? "--",
                checkedLive: Boolean(live),
              };
            })
          );

          const liveSummary = livePlaces
            .map(
              (p, i) =>
                `  ${i + 1}. ${p.name} [${p.checkedLive ? "LIVE NOW" : "CACHED"}]: US AQI ${p.liveAqi}, PM2.5 ${p.livePm25} µg/m³, PM10 ${p.livePm10} µg/m³, NO2 ${p.liveNo2}, Ozone ${p.liveOzone}`
            )
            .join("\n");

          savedTripTag = `Trip: ${dbTrip.plan?.trip_summary?.title || dbTrip.destinations?.[0]?.name || "Saved Plan"} • Live AQI`;
          savedTripContextText = `\nSAVED TRIP PLAN FROM DATABASE (User is asking specifically about this trip):
- Trip Title: ${dbTrip.plan?.trip_summary?.title || "Trip Plan"}
- Schedule: ${dbTrip.startDate} ${dbTrip.startTime} to ${dbTrip.endDate}
- Overall Plan Risk: ${dbTrip.plan?.trip_summary?.overall_risk || "moderate"}
- Plan Headline: ${dbTrip.plan?.trip_summary?.headline || ""}
- CURRENT LIVE AIR QUALITY FOR PLACES IN THIS PLAN (just fetched):
${liveSummary}
- Saved Plan Days Summary: ${(dbTrip.plan?.days || [])
            .map((d: any) => `${d.date} (${d.place}): ${d.risk_level} risk - ${d.headline}`)
            .join(" | ")}
- Answer the user's question in clear plain text grounded in BOTH the saved trip plan details above and the freshly fetched CURRENT LIVE AIR QUALITY values for each destination.`;
        }
      } catch (tripErr) {
        console.error("Failed to load selectedTripPlanId:", tripErr);
      }
    }

    const prompt = `${conversationContext}RESIDENT QUERY: "${queryText}"${hasImage ? "\n[An image has been attached by the resident. First verify whether it is AI-generated or a real photograph; if AI-generated, clearly report that it is AI-generated before anything else. Otherwise, perform visual air-quality/environment inspection.]" : ""}${planningInstruction}${savedTripContextText}

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
      tag:
        savedTripTag ||
        `${isPlanningAssist ? "Planning Assist • " : ""}${location.split(",")[0]} • AQI ${currentAqi} (${aqiCategory})`,
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
