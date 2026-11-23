import { GoogleGenAI, Type } from "@google/genai";

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
 * Default System Instruction tailored for VayuMitra Urban Air Quality Assistant
 */
export const DEFAULT_SYSTEM_INSTRUCTION = `You are VayuMitra AI, an authoritative urban air quality advisor and environmental health intelligence system.
Your mission is to analyze real-time air telemetry (PM2.5, PM10, NO2, Ozone, AQI) alongside planetary boundary layer physics, atmospheric inversion heights, and household vulnerabilities.

Follow these strict principles:
1. Provide actionable, science-backed guidance (micrograms per cubic meter, HEPA air changes per hour (ACH), N95 respirator fitment).
2. Tailor warnings specifically to vulnerable groups (infants/children, seniors, asthma/COPD patients).
3. Specify exact time windows for opening or sealing windows based on solar heating and temperature inversion curves.
4. Keep all responses clear, empathetic, scientifically rigorous, and structured.`;

/**
 * Predefined Response Schema for Structured AI Air Quality Guidance
 */
export const AIR_PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Concise 1-2 sentence executive summary of today's atmospheric risk profile.",
    },
    aqiAssessment: {
      type: Type.OBJECT,
      properties: {
        currentAqi: { type: Type.INTEGER, description: "Evaluated US AQI number" },
        category: { type: Type.STRING, description: "Category name, e.g. Moderate, Poor, Severe" },
        dominantPollutant: { type: Type.STRING, description: "e.g. PM2.5, PM10, NO2" },
        inversionRisk: { type: Type.STRING, description: "Inversion trapping risk level (Low, Moderate, Severe)" },
      },
      required: ["currentAqi", "category", "dominantPollutant"],
    },
    vulnerabilityGuidance: {
      type: Type.ARRAY,
      description: "Specific protocols for each household demographic",
      items: {
        type: Type.OBJECT,
        properties: {
          group: { type: Type.STRING, description: "e.g. Children, Seniors, Respiratory, Active Adults" },
          riskLevel: { type: Type.STRING, description: "Low, Moderate, High, Critical" },
          recommendedAction: { type: Type.STRING, description: "Direct mitigation advice" },
          outdoorShift: { type: Type.STRING, description: "Specific routine shift or rescheduling window" },
        },
        required: ["group", "riskLevel", "recommendedAction"],
      },
    },
    windowSchedule: {
      type: Type.ARRAY,
      description: "Hourly or window-based ventilation guidance",
      items: {
        type: Type.OBJECT,
        properties: {
          timeWindow: { type: Type.STRING, description: "e.g. Morning (6:30 AM - 9:00 AM)" },
          status: { type: Type.STRING, description: "Sealed, Filtered Only, Safe to Ventilate" },
          explanation: { type: Type.STRING, description: "Meteorological reasoning (e.g. nocturnal inversion)" },
        },
        required: ["timeWindow", "status"],
      },
    },
    purifierTactics: {
      type: Type.OBJECT,
      properties: {
        fanSpeed: { type: Type.STRING, description: "Sleep, Auto, Medium, Max Turbo" },
        targetRoom: { type: Type.STRING, description: "Primary room to protect" },
        estimatedAqiReductionPct: { type: Type.INTEGER, description: "Expected % drop in indoor particulate count" },
      },
      required: ["fanSpeed", "estimatedAqiReductionPct"],
    },
    actionChecklist: {
      type: Type.ARRAY,
      description: "Immediate 3 to 5 bullet steps for today",
      items: { type: Type.STRING },
    },
  },
  required: ["summary", "aqiAssessment", "vulnerabilityGuidance", "windowSchedule", "actionChecklist"],
};

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
