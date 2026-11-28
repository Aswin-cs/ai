import { NextResponse } from "next/server";
import { generateWithGeminiFallback } from "@/lib/gemini";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { MAX_UPLOAD_BASE64_LENGTH, RATE_LIMITS } from "@/lib/constants";
import {
  buildChatSystemInstruction,
  classifyAqiCategory,
  loadSavedTripContext,
  type HourlyForecastEntry,
  type TripDestinationSummary,
} from "@/lib/chatService";
import {
  MAX_CHAT_MESSAGE_LENGTH,
  isAllowedImageMime,
  sanitizeChatHistory,
  sanitizeTextField,
  validateChatHistoryInput,
} from "@/lib/validation";

export const POST = withAuthApiHandler(
  {
    context: "VayuPulse Chat Error",
    fallbackError: "Failed to process air quality query",
    unauthorizedMessage: "Unauthorized. Please sign in to use VayuPulse AI chat.",
    rateLimit: {
      prefix: "chat",
      limit: RATE_LIMITS.chat.limit,
      windowMs: RATE_LIMITS.chat.windowMs,
    },
  },
  async (req, auth) => {
    const body = await req.json();
    const {
      message,
      image,
      mode = "standard",
      hourlyForecast = [],
      tripPlan = null,
      selectedTripPlanId = null,
      history = [],
      location: rawLocation = "Delhi NCR, India",
      aqi,
      pollutants,
      householdProfile,
      safeOutdoorWindow,
    } = body;
    const location = sanitizeTextField(rawLocation, 160, "Delhi NCR, India");

    const hasImage = Boolean(image && typeof image.data === "string" && image.data.length > 0);
    const hasTripPlan = Boolean(
      tripPlan && Array.isArray(tripPlan.destinations) && tripPlan.destinations.length > 0
    );

    if ((!message || typeof message !== "string" || !message.trim()) && !hasImage && !hasTripPlan) {
      return errorResponse("BAD_REQUEST", "A message or an image is required.", 400);
    }

    if (typeof message === "string" && message.length > MAX_CHAT_MESSAGE_LENGTH) {
      return errorResponse(
        "BAD_REQUEST",
        `Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.`,
        400
      );
    }

    const historyCheck = validateChatHistoryInput(history);
    if (!historyCheck.ok) {
      return errorResponse("BAD_REQUEST", historyCheck.error, 400);
    }

    if (hasImage) {
      if (image.data.length > MAX_UPLOAD_BASE64_LENGTH) {
        return errorResponse(
          "BAD_REQUEST",
          "Uploaded image exceeds the 5 MB maximum file size limit.",
          400
        );
      }
      if (!isAllowedImageMime(image.mimeType)) {
        return errorResponse(
          "BAD_REQUEST",
          "Unsupported image format. Please upload JPG, PNG, WebP, or GIF.",
          400
        );
      }
    }

    const currentAqi = Number(aqi) || 280;
    const pm25 = pollutants?.pm25 ?? 145;
    const pm10 = pollutants?.pm10 ?? 240;
    const no2 = pollutants?.no2 ?? 42;
    const aqiCategory = classifyAqiCategory(currentAqi);

    const vulnerabilities = householdProfile?.vulnerabilities?.length
      ? householdProfile.vulnerabilities.join(", ")
      : "General demographic (no reported respiratory vulnerabilities)";

    const commute = householdProfile?.commute || "standard transit";
    const hasPurifier = householdProfile?.indoorSetup === "purifier";

    const windowInfo = safeOutdoorWindow
      ? `${safeOutdoorWindow.startTime} to ${safeOutdoorWindow.endTime} (Estimated lowest PM2.5: ${safeOutdoorWindow.lowestEstimatedPm25 ?? "moderately lower"} µg/m³; Reason: ${safeOutdoorWindow.reasoning || "Solar heating boundary layer mixing"})`
      : "Afternoon window (approx. 1:30 PM to 4:00 PM when solar heating disperses nocturnal inversion)";

    const conversationContext = sanitizeChatHistory(history);
    const isPlanningAssist = mode === "planning_assist";
    const forecastSummary =
      Array.isArray(hourlyForecast) && hourlyForecast.length > 0
        ? hourlyForecast
            .slice(0, 12)
            .map(
              (h: HourlyForecastEntry) =>
                `${h.label || h.time}: AQI ${h.aqi ?? h.us_aqi ?? "--"} (PM2.5 ${h.pm25 ?? "--"})`
            )
            .join(", ")
        : "Not provided";

    const systemInstruction = buildChatSystemInstruction({
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
    });

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
            (d: TripDestinationSummary, idx: number) =>
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

    const { savedTripContextText, savedTripTag } = await loadSavedTripContext(
      selectedTripPlanId,
      auth.email
    );

    const prompt = `${conversationContext}RESIDENT QUERY: "${queryText}"${
      hasImage
        ? "\n[An image has been attached by the resident. First verify whether it is AI-generated or a real photograph; if AI-generated, clearly report that it is AI-generated before anything else. Otherwise, perform visual air-quality/environment inspection.]"
        : ""
    }${planningInstruction}${savedTripContextText}

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
    const isLongPlanIntent =
      !isPlanningAssist &&
      !hasTripPlan &&
      !selectedTripPlanId &&
      (/\b(tour|trip|vacation|holiday|itinerary|multi[- ]?day|road ?trip|travel plan|long plan|outstation|weekend getaway|next week)\b/i.test(
        queryText
      ) ||
        /\b\d+\s*[- ]?days?\s+(plan|trip|tour|visit|travel)\b/i.test(queryText) ||
        /planning assist/i.test(reply));

    return NextResponse.json({
      success: true,
      reply,
      suggestPlanningMode: isLongPlanIntent,
      tag:
        savedTripTag ||
        `${isPlanningAssist ? "Planning Assist • " : ""}${location.split(",")[0]} • AQI ${currentAqi} (${aqiCategory})`,
      modelUsed: result.modelUsed,
      attempts: result.attempts,
    });
  }
);
