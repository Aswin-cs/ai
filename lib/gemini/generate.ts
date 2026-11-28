import type { Schema } from "@google/genai";
import { logger } from "../logger";
import {
  DEFAULT_GEMINI_CONFIG,
  GEMINI_FREE_TIER_MODELS,
  formatImagePart,
  getGeminiClient,
  type GeminiImageInput,
  type GeminiModel,
} from "./client";
import { DEFAULT_SYSTEM_INSTRUCTION } from "./prompts";

export interface GeminiGenerateParams {
  prompt: string;
  systemInstruction?: string;
  image?: GeminiImageInput;
  responseSchema?: Schema;
  responseMimeType?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  models?: GeminiModel[] | string;
  apiKey?: string;
}

export interface GeminiGenerateResult<T = Record<string, unknown>> {
  text: string;
  parsedJson: T | null;
  modelUsed: string;
  attempts: number;
  fallbackErrors?: Array<{ model: string; error: string }>;
}

function parseJsonResponse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Primary Generation Function with Automated Model Fallback Engine.
 */
export async function generateWithGeminiFallback<T = Record<string, unknown>>(
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

  const rawModels = params.models
    ? Array.isArray(params.models)
      ? params.models
      : [params.models]
    : [...GEMINI_FREE_TIER_MODELS];
  const candidateModels = Array.from(new Set(rawModels));

  const client = getGeminiClient(apiKey);
  const contents: Array<string | ReturnType<typeof formatImagePart>> = [prompt];
  if (image) {
    contents.push(formatImagePart(image));
  }

  const responseMimeType =
    params.responseMimeType ||
    (responseSchema ? "application/json" : "text/plain");

  const config: Record<string, unknown> = {
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

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config,
      });

      const text = response.text || "";
      const parsedJson =
        responseMimeType === "application/json" || responseSchema
          ? parseJsonResponse<T>(text)
          : null;

      logger.info(
        `[GeminiFallback] AI evaluation complete using model: "${model}" (Attempt ${i + 1}/${candidateModels.length})`
      );

      return {
        text,
        parsedJson,
        modelUsed: model,
        attempts: i + 1,
        fallbackErrors: fallbackErrors.length > 0 ? fallbackErrors : undefined,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(
        `[GeminiFallback] Model "${model}" failed (Attempt ${i + 1}/${candidateModels.length}): ${errorMsg}`
      );
      fallbackErrors.push({ model, error: errorMsg });

      if (i === candidateModels.length - 1) {
        throw new Error(
          `All Gemini fallback models exhausted (${candidateModels.join(" -> ")}). Last error: ${errorMsg}`
        );
      }
    }
  }

  throw new Error("No Gemini models were available to process the request.");
}
