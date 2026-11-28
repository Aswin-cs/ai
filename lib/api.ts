import type { AirPlan, Pollutants, UserProfileState } from "@/types/airPlan";
import type { SupportedLanguage } from "./validation";

async function requestJson<T>(
  url: string,
  init?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T & { error?: string; success?: boolean };
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
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
