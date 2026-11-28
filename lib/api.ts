import type { TripPlanPayload } from "@/components/PlanningAssistWizard";
import type { TripPlanResponse } from "@/components/TripPlanSection";
import type {
  AirPlan,
  ChatMessageItem,
  Pollutants,
  UserProfileState,
} from "@/types/airPlan";
import type { SupportedLanguage } from "./validation";

export interface SavedTripPlanRecord {
  _id: string;
  destinations: TripPlanPayload["destinations"];
  startDate: string;
  startTime: string;
  endDate: string;
  plan: TripPlanResponse;
  progress?: {
    roadmapSteps?: string[];
    packingItems?: string[];
  };
}

async function requestJson<T>(
  url: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T & {
    error?: string | { code?: string; message?: string };
    success?: boolean;
  };
  if (!res.ok) {
    const errorMessage =
      typeof data?.error === "string"
        ? data.error
        : data?.error?.message;
    throw new Error(errorMessage || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchAirQualityTelemetry(
  lat: number,
  lng: number,
  signal?: AbortSignal
) {
  return requestJson<{
    success: boolean;
    source?: string;
    current?: {
      usAqi?: number;
      pm25?: number;
      pm10?: number;
      no2?: number;
      ozone?: number;
      co?: number;
      so2?: number;
    };
    hourly?: {
      time?: string[];
      us_aqi?: number[];
      pm2_5?: number[];
      pm10?: number[];
    };
  }>(`/api/air-quality?lat=${lat}&lng=${lng}`, { cache: "no-store", signal });
}

export async function fetchUserStatus(signal?: AbortSignal) {
  return requestJson<{
    authenticated: boolean;
    inDb: boolean;
    onboardingCompleted: boolean;
    hasAiEvaluation?: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
      image?: string;
      defaultLocation?: { name: string; lat: number; lng: number };
      householdProfile?: UserProfileState["householdProfile"];
      aiPlan?: AirPlan | string | null;
      latestAiEvaluation?: {
        modelUsed?: string;
        updatedAt?: string;
        evaluationType?: string;
        aiPlan?: AirPlan | string | null;
        telemetry?: { aqi?: number } & Partial<Pollutants>;
        progress?: {
          roadmap?: Record<string, boolean>;
          indoorChecklist?: Record<string, boolean>;
        };
      } | null;
    } | null;
  }>("/api/user/status", { cache: "no-store", signal });
}

export async function savePlanProgressApi(payload: {
  roadmap: Record<string, boolean>;
  indoorChecklist: Record<string, boolean>;
}) {
  return requestJson<{ success: boolean }>("/api/ai/plan/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function recalibrateAirPlanApi(payload: {
  location: string;
  coords?: { lat: number; lng: number };
  aqi?: number;
  pollutants?: Pollutants;
  hourlyForecast: Array<{ time: string; us_aqi: number; pm25: number }>;
  householdProfile?: UserProfileState["householdProfile"];
  evaluationType: string;
  refreshTelemetry: boolean;
  language: SupportedLanguage;
}) {
  return requestJson<{
    success: boolean;
    data?: AirPlan;
    telemetry?: { aqi?: number; pollutants?: Pollutants };
    evaluationId?: string;
    modelUsed?: string;
  }>("/api/ai/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteTripPlanApi(id: string) {
  return requestJson<{ success: boolean }>(
    `/api/ai/trip-plan?id=${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export async function fetchTripPlansApi(
  options?: { page?: number; limit?: number; signal?: AbortSignal }
) {
  const qs =
    options?.page != null
      ? `?page=${options.page}&limit=${options.limit ?? 3}`
      : "";
  return requestJson<{
    success: boolean;
    tripPlans?: SavedTripPlanRecord[];
    tripPlan?: SavedTripPlanRecord | null;
    page?: number;
    totalPages?: number;
    total?: number;
  }>(`/api/ai/trip-plan${qs}`, { signal: options?.signal });
}

export async function generateTripPlanApi(payload: {
  destinations: TripPlanPayload["destinations"];
  startDate: string;
  startTime: string;
  endDate: string;
  householdProfile?: UserProfileState["householdProfile"];
  language: SupportedLanguage;
}) {
  return requestJson<{
    success: boolean;
    tripPlan?: SavedTripPlanRecord;
    tripPlanId?: string;
    plan: TripPlanResponse;
    error?: string;
  }>("/api/ai/trip-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function sendChatMessageApi(payload: {
  message: string;
  image?: { data: string; mimeType: string };
  mode: "planning_assist" | "standard";
  hourlyForecast: Array<{ time: string; label: string; aqi: number; pm25: number; pm10: number }>;
  tripPlan: TripPlanPayload | null;
  selectedTripPlanId: string | null;
  history: ChatMessageItem[];
  location: string;
  aqi?: number;
  pollutants?: Pollutants;
  householdProfile?: UserProfileState["householdProfile"];
  safeOutdoorWindow?: AirPlan["safeOutdoorWindow"];
}) {
  return requestJson<{
    success: boolean;
    reply?: string;
    tag?: string;
    suggestPlanningMode?: boolean;
  }>("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function generateOnboardingPlanApi(payload: Record<string, unknown>) {
  return requestJson<{
    success: boolean;
    data?: AirPlan;
    modelUsed?: string;
    rawText?: string;
  }>("/api/ai/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function saveOnboardingProfileApi(payload: Record<string, unknown>) {
  return requestJson<{ success: boolean; evaluationId?: string | null }>(
    "/api/user/onboarding",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function saveTripProgressApi(payload: {
  tripPlanId: string;
  roadmapSteps: string[];
  packingItems: string[];
}) {
  return requestJson<{
    success: boolean;
    progress?: { roadmapSteps?: string[]; packingItems?: string[] };
  }>("/api/ai/trip-plan/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
