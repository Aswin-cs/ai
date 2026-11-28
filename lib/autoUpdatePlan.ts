import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import {
  generateWithGeminiFallback,
  AIR_PLAN_RESPONSE_SCHEMA,
  DEFAULT_SYSTEM_INSTRUCTION,
  buildVayuPulsePrompt,
} from "@/lib/gemini";
import { fetchNearestCpcbAq } from "@/lib/cpcb";

// 6 hours in milliseconds
export const PLAN_STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000;

export interface TelemetryData {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  ozone: number;
  co: number;
  so2: number;
  hourlyForecast?: Array<{
    time: string;
    us_aqi?: number;
    pm25?: number;
    ozone?: number;
  }>;
}

/**
 * Fetches fresh real-time telemetry (preferring official Indian CPCB ground stations
 * when within 35 km, paired with Open-Meteo 12h hourly forecast).
 */
export async function fetchLiveTelemetry(lat: number, lng: number): Promise<TelemetryData> {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5,us_aqi,ozone&forecast_days=2&timezone=auto`;
    const [cpcb, res] = await Promise.all([
      fetchNearestCpcbAq(lat, lng).catch(() => null),
      fetch(url, { cache: "no-store" }).catch(() => null),
    ]);
    if ((res && res.ok) || cpcb) {
      const data = res && res.ok ? await res.json() : {};
      const current = data.current || {};
      const times: string[] = data.hourly?.time || [];
      const aqis: number[] = data.hourly?.us_aqi || [];
      const pm25s: number[] = data.hourly?.pm2_5 || [];
      const ozones: number[] = data.hourly?.ozone || [];

      const currentIsoPrefix = typeof current.time === "string" ? current.time.slice(0, 13) : "";
      let startIdx = times.findIndex((t) => t.startsWith(currentIsoPrefix));
      if (startIdx < 0) startIdx = 0;

      const hourlyForecast = times.slice(startIdx, startIdx + 12).map((t, offset) => {
        const idx = startIdx + offset;
        return {
          time: t,
          us_aqi: aqis[idx] != null ? Math.round(aqis[idx]) : undefined,
          pm25: pm25s[idx] != null ? Number(pm25s[idx].toFixed(1)) : undefined,
          ozone: ozones[idx] != null ? Number(ozones[idx].toFixed(1)) : undefined,
        };
      });

      const telemetry: TelemetryData = {
        aqi: cpcb?.aqi ?? Math.round(current.us_aqi ?? 145),
        pm25: Number((cpcb?.pm25 ?? current.pm2_5 ?? 88).toFixed(1)),
        pm10: Number((cpcb?.pm10 ?? current.pm10 ?? 136).toFixed(1)),
        no2: Number((cpcb?.no2 ?? current.nitrogen_dioxide ?? 44).toFixed(1)),
        ozone: Number((cpcb?.ozone ?? current.ozone ?? 36).toFixed(1)),
        co: Number((cpcb?.co ?? current.carbon_monoxide ?? 640).toFixed(1)),
        so2: Number((cpcb?.so2 ?? current.sulphur_dioxide ?? 12).toFixed(1)),
        hourlyForecast,
      };
      console.log(
        `[autoUpdatePlan] Rechecked live telemetry (${lat}, ${lng}) [${cpcb ? `CPCB: ${cpcb.station}` : "Open-Meteo"}]: AQI=${telemetry.aqi}, PM2.5=${telemetry.pm25} µg/m³`
      );
      return telemetry;
    }
  } catch (err) {
    console.warn("[autoUpdatePlan] Telemetry fetch error, using regional defaults:", err);
  }

  // Fallback if network/sandbox unavailable
  const fallbackAqi = lat > 26 ? 168 : lat > 18 ? 112 : 54;
  const fallbackPm25 = lat > 26 ? 94.2 : lat > 18 ? 62.5 : 28.4;
  return {
    aqi: fallbackAqi,
    pm25: fallbackPm25,
    pm10: Number((fallbackPm25 * 1.55).toFixed(1)),
    no2: 38.6,
    ozone: 31.4,
    co: 520.0,
    so2: 10.8,
  };
}

interface StalePlanLocation {
  name?: string;
  lat?: number;
  lng?: number;
}

interface StalePlanEvaluation {
  _id?: unknown;
  updatedAt?: Date | string;
  createdAt?: Date | string;
  location?: StalePlanLocation;
  householdProfileSnapshot?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StalePlanUser {
  _id?: mongoose.Types.ObjectId;
  email?: string;
  latestAiEvaluation?: StalePlanEvaluation | mongoose.Types.ObjectId | string;
  defaultLocation?: StalePlanLocation;
  householdProfile?: Record<string, unknown>;
}

/**
 * Checks a user's latest AiEvaluation. If it is older than 6 hours,
 * automatically generates a new plan with fresh air telemetry,
 * deletes the old evaluation documents for that user, and creates the new one.
 *
 * @param user Mongoose User document or user object with email and _id
 * @param force If true, updates regardless of age
 */
export async function checkAndUpdateStalePlan(
  user: StalePlanUser,
  force = false
): Promise<{ updated: boolean; reason?: string; evaluation?: StalePlanEvaluation | null }> {
  if (!user || !user.email) {
    return { updated: false, reason: "No user provided" };
  }

  await connectToDatabase();

  // Find user's latest evaluation
  let latestEval: StalePlanEvaluation | null = null;
  if (
    user.latestAiEvaluation &&
    typeof user.latestAiEvaluation === "object" &&
    "updatedAt" in user.latestAiEvaluation
  ) {
    latestEval = user.latestAiEvaluation as StalePlanEvaluation;
  } else if (user.latestAiEvaluation) {
    latestEval = (await AiEvaluation.findById(user.latestAiEvaluation)) as StalePlanEvaluation | null;
  } else {
    latestEval = (await AiEvaluation.findOne({
      $or: [{ user: user._id as mongoose.Types.ObjectId }, { userEmail: user.email.toLowerCase() }],
    }).sort({ updatedAt: -1 })) as StalePlanEvaluation | null;
  }

  const now = Date.now();
  const lastUpdated = latestEval?.updatedAt
    ? new Date(latestEval.updatedAt).getTime()
    : latestEval?.createdAt
      ? new Date(latestEval.createdAt).getTime()
      : 0;

  const ageMs = now - lastUpdated;
  const isStale = !latestEval || ageMs >= PLAN_STALE_THRESHOLD_MS;

  if (!force && !isStale && latestEval) {
    const hoursLeft = ((PLAN_STALE_THRESHOLD_MS - ageMs) / (1000 * 60 * 60)).toFixed(1);
    return {
      updated: false,
      reason: `Plan is still fresh (${hoursLeft} hours remaining before 6h auto-update)`,
      evaluation: latestEval,
    };
  }

  // Telemetry coordinates
  const lat = user.defaultLocation?.lat ?? latestEval?.location?.lat ?? 28.6139;
  const lng = user.defaultLocation?.lng ?? latestEval?.location?.lng ?? 77.209;
  const locationName = user.defaultLocation?.name || latestEval?.location?.name || "Local Area";

  // Fetch real-time telemetry
  const telemetry = await fetchLiveTelemetry(lat, lng);

  const householdProfile = user.householdProfile || latestEval?.householdProfileSnapshot || {
    vulnerabilities: ["children", "seniors"],
    commute: "two_wheeler",
    indoorSetup: "purifier",
    windows: { morning: true, commute: true, evening: true },
  };

  const reasonLabel = !latestEval
    ? "No existing AiEvaluation found. Creating a new one using the API..."
    : force
      ? "Force update requested"
      : `AiEvaluation is stale (> 6 hours old: ${(ageMs / (1000 * 60 * 60)).toFixed(1)}h)`;

  console.log(`[autoUpdatePlan] ${reasonLabel} for ${user.email}...`);

  const promptText = buildVayuPulsePrompt({
    location: locationName,
    aqi: telemetry.aqi,
    pollutants: {
      pm25: telemetry.pm25,
      pm10: telemetry.pm10,
      no2: telemetry.no2,
      ozone: telemetry.ozone,
      co: telemetry.co,
      so2: telemetry.so2,
    },
    hourlyForecast: telemetry.hourlyForecast,
    householdProfile,
  });

  // Run Gemini generation with fallback
  const result = await generateWithGeminiFallback({
    prompt: promptText,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    responseSchema: AIR_PLAN_RESPONSE_SCHEMA,
  });

  if (!result.parsedJson) {
    return { updated: false, reason: "Gemini did not return structured plan" };
  }

  const userObjectId = user._id as mongoose.Types.ObjectId;

  // Delete all old or existing AiEvaluation documents for this user
  await AiEvaluation.deleteMany({
    $or: [
      { user: userObjectId },
      { userEmail: user.email.toLowerCase() },
    ],
  });

  // Create new AiEvaluation document
  const newEval = await AiEvaluation.create({
    user: userObjectId,
    userEmail: user.email.toLowerCase(),
    evaluationType: "recalibration",
    location: {
      name: locationName,
      lat,
      lng,
    },
    telemetry,
    householdProfileSnapshot: householdProfile,
    aiPlan: result.parsedJson,
    modelUsed: result.modelUsed,
    rawResponse: result.parsedJson,
    response: result.parsedJson,
    promptText,
    attempts: result.attempts,
    status: "active",
  });

  // Update user document references
  const dbUser = await User.findById(userObjectId);
  if (dbUser) {
    dbUser.latestAiEvaluation = newEval._id;
    dbUser.aiEvaluations = [newEval._id];
    dbUser.aiPlan = result.parsedJson;
    await dbUser.save();
  }

  console.log(`[autoUpdatePlan] AI evaluation complete for ${user.email} using model: "${result.modelUsed}" (ID: ${newEval._id})`);

  return {
    updated: true,
    evaluation: newEval as unknown as StalePlanEvaluation,
  };
}

/**
 * Scans all users in the system and auto-updates evaluations older than 6 hours.
 */
export async function updateAllStalePlans(): Promise<{
  scanned: number;
  updated: number;
  errors: Array<{ email: string; error: string }>;
}> {
  await connectToDatabase();
  const users = await User.find({ onboardingCompleted: true });
  let updatedCount = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const user of users) {
    try {
      const res = await checkAndUpdateStalePlan(user);
      if (res.updated) {
        updatedCount++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ email: user.email, error: msg });
    }
  }

  return {
    scanned: users.length,
    updated: updatedCount,
    errors,
  };
}
