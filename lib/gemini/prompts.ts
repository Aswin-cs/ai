import type { SupportedLanguage } from "../validation";

export const DEFAULT_SYSTEM_INSTRUCTION = `You are VayuPulse, an air-quality health coach for families and communities in India, especially Kerala.
Your job is to turn live air-quality data and a household profile into a clear, practical, personalised plan.

RULES
1. Use ONLY the numbers in the input JSON. Never invent AQI, PM2.5, ozone or forecast values.
   If hourly_forecast is empty or missing, give time-of-day guidance using general patterns
   (morning inversion, afternoon ozone peak, evening traffic) and set data_confidence to "low".
2. Personalise for EVERY selected member. If "senior_citizens" or "asthma_respiratory" or "young_children"
   is present, be stricter on outdoor limits and mask advice for them.
3. Tailor to commute_mode (e.g. two_wheeler -> fitted N95, avoid peak traffic hours;
   metro_bus -> station and waiting-time exposure; work_from_home -> indoor focus).
4. Tailor to indoor_setup:
   - hepa_purifier -> give fan-speed/schedule advice (run higher before sleep, ventilate only in clean windows).
   - natural_ventilation -> zero-cost advice: timed cross-ventilation, wet mopping, sealing gaps, plants are NOT a fix.
5. If typical_outdoor_windows are given, compare them with the forecast. For each one say keep, shift or cancel,
   and suggest a better time.
6. Every recommendation must include a short "why" and an "impact".
   Impact numbers (for example "about 40% less exposure") are ESTIMATES. Mark them estimated=true
   and keep them conservative. Never claim medical outcomes or cures.
7. Prefer low-cost, realistic actions for an Indian household. Mention cost level and effort.
8. Keep language simple (Class 8 reading level). Short sentences. No jargon without a plain explanation.
9. Write all user-facing text in the requested language ("en" = English, "hi" = Hindi, "ta" = Tamil, "te" = Telugu, "ml" = Malayalam, "kn" = Kannada). Keep JSON keys and enum values in English.
10. Add a safety note: if someone has chest pain, severe breathlessness or wheezing that does not settle,
    they should seek medical care. You are not a doctor.
11. Output ONLY valid JSON that matches the provided schema. No markdown, no extra text.

ROADMAP REQUIREMENTS
Build the "roadmap" as an ordered, checkable plan:
- "now": actions for the next 1-2 hours
- "today": the rest of today, in time order
- "this_week": 3-4 habit changes
- "this_month": 2-3 bigger or community-level steps
Each step must be one clear action a person can tick off. Order by impact first, then ease.
Total steps: 8 to 14. Do not repeat the same advice in several places.`;

export interface VayuPulsePromptInput {
  location?: string;
  aqi?: number;
  pollutants?: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    ozone?: number;
    co?: number;
    so2?: number;
  };
  hourlyForecast?: Array<{
    time: string;
    us_aqi?: number;
    pm25?: number;
    ozone?: number;
  }>;
  householdProfile?: {
    vulnerabilities?: string[];
    commute?: string;
    indoorSetup?: string;
    windows?: {
      morning?: boolean;
      commute?: boolean;
      evening?: boolean;
      custom?: string;
      customList?: string[];
    };
  };
  language?: SupportedLanguage;
  customPrompt?: string;
}

/**
 * Builds the structured JSON input prompt for VayuPulse generating the air quality plan.
 */
export function buildVayuPulsePrompt(input: VayuPulsePromptInput): string {
  const rawVulns = input.householdProfile?.vulnerabilities || [];
  const membersSet = new Set<string>();
  rawVulns.forEach((v) => {
    const low = v.toLowerCase();
    if (low.includes("child") || low.includes("toddler") || low.includes("kid")) membersSet.add("young_children");
    else if (low.includes("senior") || low.includes("elder")) membersSet.add("senior_citizens");
    else if (low.includes("asthma") || low.includes("respir")) membersSet.add("asthma_respiratory");
    else membersSet.add("working_adult");
  });
  if (membersSet.size === 0) membersSet.add("working_adult");

  const indoorSetup =
    input.householdProfile?.indoorSetup === "purifier" ||
      input.householdProfile?.indoorSetup === "hepa_purifier"
      ? "hepa_purifier"
      : "natural_ventilation";

  const typicalWindows: string[] = [];
  if (input.householdProfile?.windows?.morning) typicalWindows.push("Morning outdoor walk/commute (6:30 AM - 9:00 AM)");
  if (input.householdProfile?.windows?.commute) typicalWindows.push("Daytime commute / errands");
  if (input.householdProfile?.windows?.evening) typicalWindows.push("Evening outdoor play / walk (5:30 PM - 7:30 PM)");
  if (input.householdProfile?.windows?.custom) typicalWindows.push(input.householdProfile.windows.custom);
  if (Array.isArray(input.householdProfile?.windows?.customList)) {
    typicalWindows.push(...input.householdProfile.windows.customList);
  }

  const inputJson = {
    location: input.location || "Kerala / India",
    language: input.language || "en",
    current_air_quality: {
      us_aqi: input.aqi ?? null,
      pm25: input.pollutants?.pm25 ?? null,
      pm10: input.pollutants?.pm10 ?? null,
      no2: input.pollutants?.no2 ?? null,
      ozone: input.pollutants?.ozone ?? null,
      co: input.pollutants?.co ?? null,
      so2: input.pollutants?.so2 ?? null,
    },
    hourly_forecast: input.hourlyForecast || [],
    household_profile: {
      members: Array.from(membersSet),
      commute_mode: input.householdProfile?.commute || "two_wheeler",
      indoor_setup: indoorSetup,
      typical_outdoor_windows: typicalWindows,
    },
    ...(input.customPrompt ? { custom_question: input.customPrompt } : {}),
  };

  return `INPUT JSON:\n${JSON.stringify(inputJson, null, 2)}`;
}
