import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import TripPlan from "@/models/TripPlan";
import { fetchCurrentOpenMeteoAq } from "./airQuality";
import { logger } from "./logger";

export interface HourlyForecastEntry {
  label?: string;
  time?: string;
  aqi?: number;
  us_aqi?: number;
  pm25?: number;
}

export interface TripDestinationSummary {
  name: string;
  lat: number;
  lng: number;
  usAqi?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  ozone?: number;
  categoryLabel?: string;
}

export function classifyAqiCategory(aqi: number): string {
  if (aqi > 400) return "Severe";
  if (aqi > 300) return "Very Poor";
  if (aqi > 200) return "Poor";
  if (aqi > 100) return "Moderate";
  if (aqi > 50) return "Satisfactory";
  return "Good";
}

export async function loadSavedTripContext(selectedTripPlanId: string | null, email: string) {
  let savedTripContextText = "";
  let savedTripTag = "";

  if (
    !selectedTripPlanId ||
    typeof selectedTripPlanId !== "string" ||
    !mongoose.Types.ObjectId.isValid(selectedTripPlanId) ||
    !process.env.MONGODB_URI
  ) {
    return { savedTripContextText, savedTripTag };
  }

  try {
    await connectToDatabase();
    const dbTrip = await TripPlan.findOne({
      _id: selectedTripPlanId,
      userEmail: email,
    }).lean();

    if (dbTrip) {
      const livePlaces = await Promise.all(
        ((dbTrip.destinations || []) as TripDestinationSummary[]).map(async (dest) => {
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
- Saved Plan Days Summary: ${((dbTrip.plan?.days || []) as Array<{ date?: string; place?: string; risk_level?: string; headline?: string }>)
        .map((d) => `${d.date} (${d.place}): ${d.risk_level} risk - ${d.headline}`)
        .join(" | ")}
- Answer the user's question in clear plain text grounded in BOTH the saved trip plan details above and the freshly fetched CURRENT LIVE AIR QUALITY values for each destination.`;
    }
  } catch (tripErr) {
    logger.error("Failed to load selectedTripPlanId:", tripErr);
  }

  return { savedTripContextText, savedTripTag };
}

export function buildChatSystemInstruction(params: {
  location: string;
  currentAqi: number;
  aqiCategory: string;
  pm25: number;
  pm10: number;
  no2: number;
  windowInfo: string;
  forecastSummary: string;
  vulnerabilities: string;
  commute: string;
  hasPurifier: boolean;
  isPlanningAssist: boolean;
}): string {
  const {
    location,
    currentAqi,
    aqiCategory,
    pm25,
    pm10,
    no2,
    windowInfo,
    forecastSummary,
    vulnerabilities,
    commute,
    hasPurifier,
    isPlanningAssist,
  } = params;

  return `You are VayuPulse AI, an expert Indian Urban Air Quality and Environmental Health Assistant.
You are conversing directly with a resident of ${location}.

REAL-TIME AIR QUALITY TELEMETRY FOR ${location.toUpperCase()}:
- Current AQI: ${currentAqi} (${aqiCategory})
- PM2.5: ${pm25} µg/m³ (WHO 24h safe limit is 15 µg/m³, Indian NAAQS 24h limit is 60 µg/m³)
- PM10: ${pm10} µg/m³
- NO2: ${no2} ppb
- Lowest-Exposure Safe Window: ${windowInfo}
- Next 12-Hour Forecast: ${forecastSummary}

HOUSEHOLD SPECIFICS:
- Vulnerable members: ${vulnerabilities}
- Commute mode: ${commute}
- Air Purifier present: ${hasPurifier ? "Yes" : "No"}

CORE RESPONSE RULES:
1. Ground your advice STRICTLY in the provided real-time AQI (${currentAqi}), PM2.5 (${pm25} µg/m³), and forecast data. NEVER invent numbers.
2. Directly answer the user's specific question (e.g. running, walking, kids playing outside, opening windows, mask usage, AC/purifier settings).
3. Provide a clear verdict (e.g., "Not Recommended right now", "Safe only during the 1:30 PM–4:00 PM window", "Mandatory N95 required").
4. Explain the atmospheric reason concisely (e.g., surface temperature inversion, boundary layer compression, vehicular soot trapping).
5. If children, seniors, or asthmatics are present, prioritize extreme caution for outdoor activities when PM2.5 > 120 µg/m³ or AQI > 250.
6. PLAN ROUTING (LONG/TOUR PLANS VS SHORT PLANS):
   - If Planning Assist mode is NOT active (${isPlanningAssist ? "currently ACTIVE" : "currently OFF"}) and the resident asks for a long plan, tour, vacation, multi-day trip, multi-destination itinerary, or outstation travel plan: DO NOT try to generate a full multi-day itinerary in chat. Instead, clearly tell them to click the "Planning Assist" button at the top of the chat (Planning Mode) so they can pick up to 3 destinations on the map, set start/end dates, and generate a full multi-day air-quality trip plan.
   - If the resident asks for a short plan (such as a quick local schedule for today, a single outing/errand window, morning/evening routine, or short-duration outdoor plan): Output the practical details directly in clean, concise plain text format (no markdown tables or code blocks) grounded in today's live AQI and 12-hour forecast.
7. AUTHENTICITY & AI-GENERATED IMAGE CHECK: If the resident attaches an image, FIRST inspect whether it is AI-generated, synthetically rendered, or digitally fabricated (check for unnatural lighting/smoothing, distorted text/details, impossible reflections/geometry, or AI watermarks).
   - If the image appears to be AI-generated: State clearly at the start that "This image appears to be AI-generated, not a real photograph." Briefly note the visual signs of AI generation, explain that synthetic images cannot be used to assess real-world air quality or indoor hazards, and ask the resident to upload a real photograph if they need a visual inspection. You may still briefly remind them of their current live AQI (${currentAqi}) guidance.
   - If the image is a real photograph: Inspect it for outdoor smog/haze, room/kitchen ventilation, air purifier filters, smoke sources, or mask fit, and combine your visual findings with the live air quality data.
8. NO EMOJIS anywhere. Keep tone authoritative, calm, and practical. Keep the response in plain text format (2 to 4 concise paragraphs or plain text bullet lines, under 180 words).`;
}
