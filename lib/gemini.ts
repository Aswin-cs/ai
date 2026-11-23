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
 * Default System Instruction tailored for VayuPulse Urban Air Quality Assistant
 */
export const DEFAULT_SYSTEM_INSTRUCTION = `You are VayuPulse, an expert Indian Environmental Health and Urban Air Quality Strategist. Your role is to analyze real-time outdoor air quality telemetry alongside a specific Indian household's profile and generate an actionable, scientifically accurate daily protection and low-emission plan.

CORE RULES & CONSTRAINTS:
1. NEVER invent, alter, or recalculate current AQI or pollutant numbers. Rely strictly on the provided live telemetry and hourly forecast data.
2. STRICT PERSONA DIFFERENTIATION: Tailor every recommendation to the household's specific members, commute mode, and indoor equipment:
   - If children, seniors (60+), or asthma/respiratory sensitivities are present, enforce stricter exposure thresholds (advise indoor-only activities when PM2.5 exceeds 120 µg/m³ or AQI > 250).
   - If the user has NO air purifier, provide practical, zero-cost Indian household interventions (timed afternoon cross-ventilation, wet-mopping instead of dry sweeping, damp cloth door-gap sealing, kitchen exhaust protocols, avoiding incense/agarbatti/mosquito coils). Do NOT suggest buying expensive purifiers as a primary daily action.
   - If the user HAS an air purifier, optimize run-times (e.g., Turbo mode 45 minutes before sleep, sealing rooms during peak evening inversion).
3. THREE MANDATORY ACTION PILLARS:
   - Low-Emission Daily Routines: Reschedule outdoor habits into the lowest-PM2.5 hourly window and optimize commute/errand batching.
   - Indoor Air Quality (IAQ) Guidance: Provide an exact window-opening schedule based on the hourly outdoor curve and actionable indoor source controls.
   - Sustainable Alternatives: Suggest realistic Indian lifestyle swaps (carpooling, Metro + e-rickshaw last-mile, zero vehicle idling, electric mosquito repellents over coils) with conservative, realistic impact estimates.
4. EXPLAIN "WHY" & QUANTIFY DIRECT IMPACT: Every recommendation must explain the underlying atmospheric or physiological reason (e.g., winter temperature inversion, cold-start tailpipe emissions) and state a concrete, realistic impact metric (percentage inhalation reduction, kg CO2 avoided, or INR saved).
5. NO PSEUDOSCIENCE OR EMOJIS: Never claim houseplants alone purify a room during severe smog. Do not include emojis anywhere in your JSON strings. Keep tone calm, practical, and authoritative.`;

/**
 * Predefined Response Schema for Structured VayuPulse AI Air Quality Plan
 */
export const airPlanResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    priorityAdvisory: {
      type: Type.OBJECT,
      description: "Top-level household brief shown in the dashboard tonal summary card.",
      properties: {
        headline: { type: Type.STRING, description: "Concise 6-10 word status summary." },
        bullets: {
          type: Type.ARRAY,
          description: "Exactly 3 persona-specific priority actions covering outdoors, commute, and indoors.",
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: "e.g., Children's Play, Commute Protection, Home Ventilation" },
              guidance: { type: Type.STRING, description: "Specific actionable instruction with exact timings." },
            },
            required: ["category", "guidance"],
          },
        },
      },
      required: ["headline", "bullets"],
    },

    safeOutdoorWindow: {
      type: Type.OBJECT,
      description: "Derived from the 24-hour hourly forecast array.",
      properties: {
        startTime: { type: Type.STRING, description: "e.g., 1:30 PM" },
        endTime: { type: Type.STRING, description: "e.g., 4:00 PM" },
        lowestEstimatedPm25: { type: Type.NUMBER, description: "Lowest PM2.5 µg/m³ during this window." },
        reasoning: { type: Type.STRING, description: "Brief explanation of why smog dips during these hours (e.g., afternoon solar heating lifts inversion layer)." },
      },
      required: ["startTime", "endTime", "lowestEstimatedPm25", "reasoning"],
    },

    dailyRoutinePlan: {
      type: Type.ARRAY,
      description: "3 time-blocked cards: Morning, Afternoon, and Evening.",
      items: {
        type: Type.OBJECT,
        properties: {
          timeBlock: { type: Type.STRING, enum: ["Morning", "Afternoon", "Evening"] },
          timeRange: { type: Type.STRING, description: "e.g., 7:30 AM – 10:00 AM" },
          title: { type: Type.STRING, description: "Short title for the block's focus." },
          originalHabit: { type: Type.STRING, description: "Typical high-exposure or high-emission habit based on user profile." },
          recommendedShift: { type: Type.STRING, description: "Concrete low-emission & low-exposure alternative." },
          whyItMatters: { type: Type.STRING, description: "Scientific/atmospheric justification." },
          directImpactMetric: { type: Type.STRING, description: "Quantified benefit, e.g., Cuts morning PM2.5 inhalation by ~44% and saves 1.9 kg CO2." },
        },
        required: ["timeBlock", "timeRange", "title", "originalHabit", "recommendedShift", "whyItMatters", "directImpactMetric"],
      },
    },

    indoorAirGuidance: {
      type: Type.OBJECT,
      properties: {
        ventilationDirective: {
          type: Type.STRING,
          description: "Exact instruction on when to keep windows sealed vs. when to open for cross-ventilation.",
        },
        actionChecklist: {
          type: Type.ARRAY,
          description: "4-5 tailored indoor steps matching purifier availability and home type.",
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              scientificReason: { type: Type.STRING },
              costTier: { type: Type.STRING, enum: ["Zero-Cost", "Low-Cost", "Equipment Optimization"] },
            },
            required: ["action", "scientificReason", "costTier"],
          },
        },
      },
      required: ["ventilationDirective", "actionChecklist"],
    },

    sustainableSwaps: {
      type: Type.ARRAY,
      description: "4 toggleable lifestyle alternatives for the Impact Simulator tab.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          swapTitle: { type: Type.STRING, description: "e.g., Carpool 3 days/week for office commute" },
          description: { type: Type.STRING },
          monthlyCo2SavedKg: { type: Type.NUMBER },
          personalPm25ReductionPercent: { type: Type.NUMBER },
          monthlyMoneySavedInr: { type: Type.NUMBER },
          localImpactExplanation: { type: Type.STRING, description: "Why this swap directly improves neighbourhood air quality." },
        },
        required: ["id", "swapTitle", "description", "monthlyCo2SavedKg", "personalPm25ReductionPercent", "monthlyMoneySavedInr", "localImpactExplanation"],
      },
    },

    communityActionSnippet: {
      type: Type.OBJECT,
      description: "Pre-generated neighbourhood/RWA advisory tailored to the user's locality and current AQI.",
      properties: {
        targetAudience: { type: Type.STRING, description: "e.g., Apartment RWA & Residents" },
        circularTitle: { type: Type.STRING },
        shareableMessage: { type: Type.STRING, description: "Ready-to-copy notice board / WhatsApp advisory without emojis." },
      },
      required: ["targetAudience", "circularTitle", "shareableMessage"],
    },
  },
  required: [
    "priorityAdvisory",
    "safeOutdoorWindow",
    "dailyRoutinePlan",
    "indoorAirGuidance",
    "sustainableSwaps",
    "communityActionSnippet",
  ],
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
  customPrompt?: string;
}

/**
 * Builds the comprehensive prompt for VayuPulse generating the structured air plan.
 * Perfectly calibrated to the VayuPulse system instruction and airPlanResponseSchema.
 */
export function buildVayuPulsePrompt(input: VayuPulsePromptInput): string {
  const vulnerabilities = input.householdProfile?.vulnerabilities?.length
    ? input.householdProfile.vulnerabilities.join(", ")
    : "None reported (General demographic)";

  const hasPurifier = input.householdProfile?.indoorSetup === "purifier";
  const commute = input.householdProfile?.commute || "two_wheeler";

  return `
ATMOSPHERIC TELEMETRY:
- Target Location: ${input.location || "Delhi NCR, India"}
- Real-Time Ambient AQI: ${input.aqi ?? 145}
- Particulate & Gas Telemetry:
  * PM2.5: ${input.pollutants?.pm25 ?? 85} µg/m³
  * PM10: ${input.pollutants?.pm10 ?? 140} µg/m³
  * NO2: ${input.pollutants?.no2 ?? 40} µg/m³
  * Ozone: ${input.pollutants?.ozone ?? 30} µg/m³
  * CO: ${input.pollutants?.co ?? 500} µg/m³
  * SO2: ${input.pollutants?.so2 ?? 12} µg/m³

HOUSEHOLD SPECIFICATIONS & CONSTRAINTS:
- Vulnerable Household Members: ${vulnerabilities}
- Daily Commute Mode: ${commute}
- Indoor Air Purification: ${hasPurifier ? "Air Purifier Present (optimize runtime and CADR)" : "No Air Purifier (strictly require zero-cost interventions: wet-mopping, damp door sealing, kitchen exhaust)"}
- Outdoor Activity Windows: Morning (${input.householdProfile?.windows?.morning ? "Yes" : "No"}), Commute (${input.householdProfile?.windows?.commute ? "Yes" : "No"}), Evening (${input.householdProfile?.windows?.evening ? "Yes" : "No"})${input.householdProfile?.windows?.custom ? `, Custom User Routine: "${input.householdProfile.windows.custom}"` : ""}

${input.customPrompt ? `SPECIFIC USER INQUIRY: ${input.customPrompt}\n` : ""}
TASK:
Analyze the provided telemetry against winter planetary boundary layer dynamics and temperature inversion patterns for this household. Generate a complete, scientifically rigorous daily protection and emission reduction plan adhering strictly to the response schema:

1. priorityAdvisory:
   - headline: A 6-10 word status summary.
   - bullets: Exactly 3 persona-specific actions covering outdoor exposure, commute protection, and indoor air management.

2. safeOutdoorWindow:
   - Identify the lowest-smog hourly window (e.g. afternoon convective mixing), lowest estimated PM2.5 (number), and meteorological reasoning.

3. dailyRoutinePlan:
   - Exactly 3 time-blocked cards: Morning, Afternoon, and Evening.
   - For each: specify timeBlock, timeRange, title, originalHabit, recommendedShift, scientific whyItMatters, and quantified directImpactMetric.

4. indoorAirGuidance:
   - ventilationDirective: Clear instruction on window sealing vs timed cross-ventilation.
   - actionChecklist: 4-5 tailored steps with action, scientificReason, and costTier ("Zero-Cost", "Low-Cost", or "Equipment Optimization").

5. sustainableSwaps:
   - Exactly 4 realistic Indian household swaps with id, swapTitle, description, monthlyCo2SavedKg, personalPm25ReductionPercent, monthlyMoneySavedInr, and localImpactExplanation.

6. communityActionSnippet:
   - targetAudience, circularTitle, and a ready-to-copy shareableMessage notice for local RWAs or schools without emojis.
`.trim();
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
