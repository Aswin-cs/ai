import { GoogleGenAI, Type, type Schema } from "@google/genai";

/**
 * ============================================================================
 * VAYUMITRA GEMINI AI CONFIGURATION & MULTI-MODEL FALLBACK ENGINE
 * ============================================================================
 * 
 * Supports:
 * 1. Complete Free-Tier Model Hierarchy (from latest 2.5 to previous 1.5 generations)
 * 2. Automated Fallback Chain (auto-switches model on rate limit 429, quota, or 503)
 * 3. System Instructions parameter (calibrated for atmospheric physics & air safety)
 * 4. Output Response Schema parameter (Structured JSON output with Type schemas)
 * 5. Multimodal Content parameter (Text + Image: Base64 / Data URL / Buffer)
 * 6. Tunable Generation Config (Temperature, TopP, TopK, MaxOutputTokens)
 */

/**
 * All free-tier eligible Gemini models ordered from latest generation to previous generation.
 * This chain serves as the default fallback sequence when higher-tier models face rate limits.
 */
export const GEMINI_FREE_TIER_MODELS = [
  // --- Gemini 4 Generation (Free Tier) ---
  "gemini-4-hydrogen",        // Latest Gemini 4 Free Tier multimodal model

  // --- Gemini 3 Generation (Free of Charge) ---
  "gemini-3.8-flash",         // Primary: Flagship Gemini 3 fast multimodal model
  "gemini-3.6-flash",         // Gemini 3 fast multimodal generation
  "gemini-3.5-flash-lite",    // High-throughput, lowest-latency model
  "gemini-3.1-flash-lite",    // Ultra-fast lightweight execution
  "gemini-3-flash-preview",   // Gemini 3 Flash Preview

  // --- Gemini 2.5 Generation (Free of Charge) ---
  "gemini-2.5-flash",         // Gemini 2.5 fast multimodal workhorse
  "gemini-2.5-pro",           // Gemini 2.5 state-of-the-art complex reasoning
  "gemini-2.5-flash-lite",    // Gemini 2.5 low-latency fallback

  // --- Gemma 4 Open-Weights Models (Free of Charge) ---
  "gemma-4-31b-it",           // Gemma 4 dense 31B instruction-tuned model
  "gemma-4-26b-a4b-it",       // Gemma 4 mixture-of-experts (MoE) 26B/4B model
] as const;

export type GeminiModel = (typeof GEMINI_FREE_TIER_MODELS)[number] | string;

/**
 * Detailed metadata for each model in the fallback chain
 */
export const GEMINI_MODEL_METADATA: Record<
  string,
  {
    displayName: string;
    generation: "4" | "3" | "2.5" | "Gemma 4";
    description: string;
    recommendedRole: string;
  }
> = {
  "gemini-4-hydrogen": {
    displayName: "Gemini 4 Hydrogen",
    generation: "4",
    description: "Latest Gemini 4 generation multimodal model available on the Free Tier.",
    recommendedRole: "Next-Gen Free Tier (Frontier reasoning capabilities)",
  },
  "gemini-3.8-flash": {
    displayName: "Gemini 3.8 Flash",
    generation: "3",
    description: "Flagship Gemini 3 model delivering balanced performance and agentic tasks.",
    recommendedRole: "Primary Model (Default for daily plans & atmospheric synthesis)",
  },
  "gemini-3.6-flash": {
    displayName: "Gemini 3.6 Flash",
    generation: "3",
    description: "Fast multimodal model for general reasoning and content processing.",
    recommendedRole: "Secondary Flash Fallback",
  },
  "gemini-3.5-flash-lite": {
    displayName: "Gemini 3.5 Flash-Lite",
    generation: "3",
    description: "High-speed, lowest-latency model optimized for high throughput.",
    recommendedRole: "Rapid Execution Fallback",
  },
  "gemini-3.1-flash-lite": {
    displayName: "Gemini 3.1 Flash-Lite",
    generation: "3",
    description: "Lightweight, highly cost-efficient execution model.",
    recommendedRole: "Lightweight Flash Fallback",
  },
  "gemini-3-flash-preview": {
    displayName: "Gemini 3 Flash Preview",
    generation: "3",
    description: "Early preview edition of Gemini 3 Flash.",
    recommendedRole: "Preview Fallback",
  },
  "gemini-2.5-flash": {
    displayName: "Gemini 2.5 Flash",
    generation: "2.5",
    description: "Proven fast multimodal model with generous free quotas and low latency.",
    recommendedRole: "Proven Multimodal Workhorse Fallback",
  },
  "gemini-2.5-pro": {
    displayName: "Gemini 2.5 Pro",
    generation: "2.5",
    description: "Complex reasoning and deep analytical understanding on the Free Tier.",
    recommendedRole: "Deep Analytical Reasoning Fallback",
  },
  "gemini-2.5-flash-lite": {
    displayName: "Gemini 2.5 Flash-Lite",
    generation: "2.5",
    description: "Compact, low-latency 2.5 generation execution model.",
    recommendedRole: "Compact 2.5 Fallback",
  },
  "gemma-4-31b-it": {
    displayName: "Gemma 4 31B IT",
    generation: "Gemma 4",
    description: "Dense 31B parameter open-weights instruction-tuned model.",
    recommendedRole: "Open-Weights Dense Fallback",
  },
  "gemma-4-26b-a4b-it": {
    displayName: "Gemma 4 26B/A4B IT",
    generation: "Gemma 4",
    description: "Mixture-of-experts 26B total / 4B active parameters model.",
    recommendedRole: "Open-Weights MoE Fallback",
  },
};

/**
 * Baseline Generation Configuration
 */
export const DEFAULT_GEMINI_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

/**
 * Default System Instruction tailored for VayuPulse Air Quality Health Coach
 */
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
9. Write all user-facing text in the requested language ("en" or "ml"). Keep JSON keys and enum values in English.
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

/**
 * Predefined Response Schema for Structured VayuPulse AI Air Quality Plan
 */
export const airPlanResponseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    "status",
    "do_this_now",
    "safe_outdoor_window",
    "member_guidance",
    "daily_routine",
    "roadmap",
    "sustainable_swaps",
    "impact_summary",
    "safety_note",
    "data_confidence",
  ],
  properties: {
    status: {
      type: Type.OBJECT,
      required: ["risk_level", "headline", "plain_explanation", "main_concern"],
      properties: {
        risk_level: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
        headline: { type: Type.STRING, description: "Max 12 words, e.g. 'Ozone is high this afternoon'" },
        plain_explanation: { type: Type.STRING, description: "2 short sentences explaining the AQI for a non-expert" },
        main_concern: { type: Type.STRING, enum: ["pm25", "pm10", "ozone", "no2", "mixed"] },
      },
    },
    do_this_now: {
      type: Type.OBJECT,
      required: ["action", "reason"],
      properties: {
        action: { type: Type.STRING, description: "One single action for the current time" },
        reason: { type: Type.STRING },
      },
    },
    safe_outdoor_window: {
      type: Type.OBJECT,
      required: ["available", "start", "end", "reason", "expected_pm25", "best_for"],
      properties: {
        available: { type: Type.BOOLEAN },
        start: { type: Type.STRING, description: "HH:MM 24h, empty if none" },
        end: { type: Type.STRING, description: "HH:MM 24h, empty if none" },
        reason: { type: Type.STRING },
        expected_pm25: { type: Type.NUMBER, description: "Taken from input forecast; 0 if unknown" },
        best_for: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "e.g. children play, senior walk",
        },
      },
    },
    member_guidance: {
      type: Type.ARRAY,
      description: "One entry per selected household member",
      items: {
        type: Type.OBJECT,
        required: ["member", "outdoor_limit", "mask_advice", "key_tips"],
        properties: {
          member: {
            type: Type.STRING,
            enum: ["young_children", "senior_citizens", "asthma_respiratory", "working_adult"],
          },
          outdoor_limit: { type: Type.STRING, description: "e.g. 'Max 30 min, only 4:30-6:00 PM'" },
          mask_advice: { type: Type.STRING },
          key_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
          warning_signs: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    outdoor_window_review: {
      type: Type.ARRAY,
      description: "One entry per typical_outdoor_window the user gave. Empty if none.",
      items: {
        type: Type.OBJECT,
        required: ["usual_activity", "verdict", "suggestion"],
        properties: {
          usual_activity: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: ["keep", "shift", "cancel"] },
          suggestion: { type: Type.STRING },
        },
      },
    },
    daily_routine: {
      type: Type.ARRAY,
      description: "Morning, afternoon, evening, night",
      items: {
        type: Type.OBJECT,
        required: ["period", "time_range", "risk_level", "instead_of", "do_this", "why_it_matters", "impact"],
        properties: {
          period: { type: Type.STRING, enum: ["morning", "afternoon", "evening", "night"] },
          time_range: { type: Type.STRING, description: "e.g. '6:30 AM - 9:00 AM'" },
          risk_level: { type: Type.STRING, enum: ["low", "moderate", "high", "severe"] },
          instead_of: { type: Type.STRING, description: "The usual habit to avoid" },
          do_this: { type: Type.STRING, description: "The better action" },
          why_it_matters: { type: Type.STRING },
          impact: {
            type: Type.OBJECT,
            required: ["badge", "estimated"],
            properties: {
              badge: { type: Type.STRING, description: "Short label for UI, e.g. '-40% exposure'" },
              estimated: { type: Type.BOOLEAN },
            },
          },
        },
      },
    },
    indoor_air_plan: {
      type: Type.OBJECT,
      required: ["setup", "steps"],
      properties: {
        setup: { type: Type.STRING, enum: ["hepa_purifier", "natural_ventilation"] },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["action", "when", "cost"],
            properties: {
              action: { type: Type.STRING },
              when: { type: Type.STRING },
              cost: { type: Type.STRING, enum: ["free", "low", "medium"] },
            },
          },
        },
      },
    },
    commute_plan: {
      type: Type.OBJECT,
      required: ["mode", "best_departure", "protection", "tips"],
      properties: {
        mode: { type: Type.STRING },
        best_departure: { type: Type.STRING },
        protection: { type: Type.STRING },
        tips: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    roadmap: {
      type: Type.ARRAY,
      description: "Ordered checklist the user can follow. Four phases: now, today, this_week, this_month.",
      items: {
        type: Type.OBJECT,
        required: ["phase", "title", "goal", "steps"],
        properties: {
          phase: { type: Type.STRING, enum: ["now", "today", "this_week", "this_month"] },
          title: { type: Type.STRING },
          goal: { type: Type.STRING, description: "One sentence: what this phase achieves" },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["id", "action", "when", "who", "why", "impact_badge", "effort", "cost"],
              properties: {
                id: { type: Type.STRING, description: "e.g. 'now-1', 'today-2'" },
                action: { type: Type.STRING, description: "Starts with a verb, max 20 words" },
                when: { type: Type.STRING, description: "Time or frequency" },
                who: { type: Type.STRING, description: "Whole family, or a specific member" },
                why: { type: Type.STRING, description: "One sentence" },
                impact_badge: { type: Type.STRING, description: "e.g. '-30% indoor PM2.5'" },
                effort: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
                cost: { type: Type.STRING, enum: ["free", "low", "medium"] },
              },
            },
          },
        },
      },
    },
    sustainable_swaps: {
      type: Type.ARRAY,
      description: "3 to 5 lower-emission alternatives that fit the user's lifestyle",
      items: {
        type: Type.OBJECT,
        required: ["from_habit", "to_habit", "benefit_to_air", "benefit_to_family", "effort"],
        properties: {
          from_habit: { type: Type.STRING },
          to_habit: { type: Type.STRING },
          benefit_to_air: { type: Type.STRING, description: "Community-level effect, in plain words" },
          benefit_to_family: { type: Type.STRING },
          effort: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
        },
      },
    },
    impact_summary: {
      type: Type.OBJECT,
      required: ["headline", "estimated_exposure_reduction_pct", "assumptions", "community_note"],
      properties: {
        headline: {
          type: Type.STRING,
          description: "e.g. 'Following this plan could cut your family's pollution exposure by about 35% today'",
        },
        estimated_exposure_reduction_pct: { type: Type.NUMBER },
        assumptions: { type: Type.STRING, description: "What the estimate assumes; note it is approximate" },
        community_note: { type: Type.STRING, description: "What happens if neighbours follow too" },
      },
    },
    safety_note: { type: Type.STRING },
    data_confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
  },
};

export const AIR_PLAN_RESPONSE_SCHEMA = airPlanResponseSchema;

/**
 * Prompt builder interface for VayuPulse Air Quality Strategy Plans
 */
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
  language?: "en" | "ml";
  customPrompt?: string;
}

/**
 * Builds the structured JSON input prompt for VayuPulse generating the air quality plan.
 */
export function buildVayuPulsePrompt(input: VayuPulsePromptInput): string {
  // Normalize member enum values for the new schema
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

/**
 * Image input definition supporting Base64 strings, data URLs, and Node Buffers
 */
export interface GeminiImageInput {
  /**
   * Base64 encoded image string (or data:image/...;base64,...), Buffer, or Uint8Array
   */
  data: string | Buffer | Uint8Array;
  /**
   * MIME type, e.g. "image/jpeg", "image/png", "image/webp", "image/heic"
   * Defaults to "image/jpeg" if not parsed from data URL.
   */
  mimeType?: string;
}

/**
 * Parameters for executing a Gemini generation call with custom configurations
 */
export interface GeminiGenerateParams {
  /**
   * Main text prompt or instruction
   */
  prompt: string;

  /**
   * Optional custom System Instruction. If omitted, uses DEFAULT_SYSTEM_INSTRUCTION.
   */
  systemInstruction?: string;

  /**
   * Optional image input (e.g., photo of local smog, filter condition, or telemetry chart)
   */
  image?: GeminiImageInput;

  /**
   * Optional output response schema for strict JSON outputs
   */
  responseSchema?: any;

  /**
   * Output MIME type ("application/json" when responseSchema is specified, otherwise "text/plain")
   */
  responseMimeType?: string;

  /**
   * Model temperature (0.0 to 2.0). Default: 0.7
   */
  temperature?: number;

  /**
   * Nucleus sampling topP (0.0 to 1.0). Default: 0.95
   */
  topP?: number;

  /**
   * TopK filtering. Default: 40
   */
  topK?: number;

  /**
   * Maximum output tokens. Default: 8192
   */
  maxOutputTokens?: number;

  /**
   * Preferred primary model or custom fallback list.
   * If not provided, starts with GEMINI_FREE_TIER_MODELS.
   */
  models?: GeminiModel[] | string;

  /**
   * Explicit API Key override (falls back to process.env.GEMINI_API_KEY / GOOGLE_API_KEY)
   */
  apiKey?: string;
}

/**
 * Structured result returned by the Gemini multi-model fallback engine
 */
export interface GeminiGenerateResult<T = any> {
  /**
   * Raw text response from the model
   */
  text: string;

  /**
   * Parsed JSON object if responseSchema was provided or output was valid JSON
   */
  parsedJson: T | null;

  /**
   * The actual Gemini model that successfully fulfilled the request
   */
  modelUsed: string;

  /**
   * Number of model attempts made before succeeding
   */
  attempts: number;

  /**
   * History of any failed model attempts along with their error messages
   */
  fallbackErrors?: Array<{ model: string; error: string }>;
}

/**
 * Normalizes image input to the Gemini SDK Part inlineData structure
 */
export function formatImagePart(image: GeminiImageInput): {
  inlineData: { data: string; mimeType: string };
} {
  let base64String = "";
  let mimeType = image.mimeType || "image/jpeg";

  if (typeof image.data === "string") {
    if (image.data.startsWith("data:")) {
      const match = image.data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64String = match[2];
      } else {
        base64String = image.data;
      }
    } else {
      base64String = image.data;
    }
  } else if (Buffer.isBuffer(image.data)) {
    base64String = image.data.toString("base64");
  } else if (image.data instanceof Uint8Array) {
    base64String = Buffer.from(image.data).toString("base64");
  }

  return {
    inlineData: {
      data: base64String,
      mimeType,
    },
  };
}

/**
 * Instantiates the official GoogleGenAI client
 */
export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey =
    customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn(
      "[GeminiConfig] No GEMINI_API_KEY or GOOGLE_API_KEY found in environment variables. Gemini calls will fail unless an API key is provided."
    );
  }

  return new GoogleGenAI({
    apiKey: apiKey || "",
  });
}

/**
 * Primary Generation Function with Automated Model Fallback Engine.
 * 
 * Automatically iterates through the free-tier model sequence if a model
 * encounters a rate limit (429), quota exhaustion, service overload (503), or deprecation.
 *
 * @example
 * ```ts
 * const result = await generateWithGeminiFallback({
 *   prompt: "Analyze PM2.5 of 185 ug/m3 in Delhi with temperature inversion at 160m.",
 *   responseSchema: AIR_PLAN_RESPONSE_SCHEMA,
 * });
 * console.log("Model used:", result.modelUsed);
 * console.log("Parsed plan:", result.parsedJson);
 * ```
 */
export async function generateWithGeminiFallback<T = any>(
  params: GeminiGenerateParams
): Promise<GeminiGenerateResult<T>> {
  const {
    prompt,
    systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
    image,
    responseSchema,
    temperature = DEFAULT_GEMINI_CONFIG.temperature,
    topP = DEFAULT_GEMINI_CONFIG.topP,
    topK = DEFAULT_GEMINI_CONFIG.topK,
    maxOutputTokens = DEFAULT_GEMINI_CONFIG.maxOutputTokens,
    apiKey,
  } = params;

  // Build the candidate model list
  let candidateModels: string[] = [];
  if (params.models) {
    candidateModels = Array.isArray(params.models)
      ? params.models
      : [params.models];
  } else {
    candidateModels = [...GEMINI_FREE_TIER_MODELS];
  }

  // Ensure unique model names
  candidateModels = Array.from(new Set(candidateModels));

  const client = getGeminiClient(apiKey);

  // Prepare multimodal content parts
  const contents: any[] = [prompt];
  if (image) {
    contents.push(formatImagePart(image));
  }

  // Build generation configuration
  const responseMimeType =
    params.responseMimeType ||
    (responseSchema ? "application/json" : "text/plain");

  const config: any = {
    systemInstruction,
    temperature,
    topP,
    topK,
    maxOutputTokens,
  };

  if (responseSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = responseSchema;
  } else if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  const fallbackErrors: Array<{ model: string; error: string }> = [];

  // Try each model in sequence
  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config,
      });

      const text = response.text || "";

      let parsedJson: T | null = null;
      if (responseMimeType === "application/json" || responseSchema) {
        try {
          parsedJson = JSON.parse(text) as T;
        } catch {
          // If markdown-wrapped JSON (e.g. ```json ... ```)
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            try {
              parsedJson = JSON.parse(jsonMatch[1]) as T;
            } catch (err) {
              // Leave parsedJson as null
            }
          }
        }
      }

      console.log(
        `[GeminiFallback] AI evaluation complete using model: "${model}" (Attempt ${i + 1}/${candidateModels.length})`
      );

      return {
        text,
        parsedJson,
        modelUsed: model,
        attempts: i + 1,
        fallbackErrors: fallbackErrors.length > 0 ? fallbackErrors : undefined,
      };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.warn(
        `[GeminiFallback] Model "${model}" failed (Attempt ${i + 1}/${candidateModels.length}): ${errorMsg}`
      );
      fallbackErrors.push({ model, error: errorMsg });

      // If this was the last model in the chain, throw comprehensive error
      if (i === candidateModels.length - 1) {
        throw new Error(
          `All Gemini fallback models exhausted (${candidateModels.join(" -> ")}). Last error: ${errorMsg}`
        );
      }
      // Otherwise, loop proceeds to next fallback model
    }
  }

  throw new Error("No Gemini models were available to process the request.");
}

export default generateWithGeminiFallback;
