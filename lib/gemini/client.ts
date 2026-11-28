import { GoogleGenAI } from "@google/genai";
import { logger } from "../logger";

export const GEMINI_FREE_TIER_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
] as const;

export type GeminiModel = (typeof GEMINI_FREE_TIER_MODELS)[number] | string;

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
  "gemini-3.5-flash": {
    displayName: "Gemini 3.5 Flash",
    generation: "3",
    description: "Gemini 3.5 flash model.",
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

export const DEFAULT_GEMINI_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

export interface GeminiImageInput {
  data: string | Buffer | Uint8Array;
  mimeType?: string;
}

/**
 * Normalizes image input to the Gemini SDK Part inlineData structure.
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
 * Instantiates the official GoogleGenAI client.
 */
export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey =
    customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    logger.warn(
      "[GeminiConfig] No GEMINI_API_KEY or GOOGLE_API_KEY found in environment variables. Gemini calls will fail unless an API key is provided."
    );
  }

  return new GoogleGenAI({
    apiKey: apiKey || "",
  });
}
