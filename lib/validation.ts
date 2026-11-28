export type SupportedLanguage = "en" | "hi" | "ta" | "te" | "ml" | "kn";

export const SUPPORTED_LANGUAGES: Array<{
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी (Hindi)" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ் (Tamil)" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు (Telugu)" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം (Malayalam)" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ (Kannada)" },
];

export function normalizeLanguage(lang: unknown): SupportedLanguage {
  if (
    lang === "en" ||
    lang === "hi" ||
    lang === "ta" ||
    lang === "te" ||
    lang === "ml" ||
    lang === "kn"
  ) {
    return lang;
  }
  return "en";
}

export interface TripDestinationInput {
  name: string;
  fullName?: string;
  lat: number;
  lng: number;
  usAqi?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  ozone?: number;
  categoryLabel?: string;
}

export interface ChatHistoryEntry {
  sender?: string;
  text: string;
}

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_CHAT_MESSAGE_LENGTH = 2000;

export function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [startDate];
  }
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 14) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return dates.length > 0 ? dates : [startDate];
}

export function getPeriodName(
  hour: number
): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function validateTripPlanRequest(
  destinations: unknown,
  startDate: unknown,
  endDate: unknown
):
  | { ok: true; destinations: TripDestinationInput[]; startDate: string; endDate: string }
  | { ok: false; error: string } {
  if (
    !Array.isArray(destinations) ||
    destinations.length === 0 ||
    typeof startDate !== "string" ||
    typeof endDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    endDate < startDate
  ) {
    return {
      ok: false,
      error: "Valid destinations, startDate, and endDate (YYYY-MM-DD) are required.",
    };
  }

  const sanitizedDestinations = destinations
    .slice(0, 3)
    .filter((d: unknown): d is TripDestinationInput => {
      if (!d || typeof d !== "object") return false;
      const obj = d as Record<string, unknown>;
      const lat = Number(obj.lat);
      const lng = Number(obj.lng);
      return (
        typeof obj.name === "string" &&
        obj.name.trim().length > 0 &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });

  if (sanitizedDestinations.length === 0) {
    return {
      ok: false,
      error: "At least one destination with valid coordinates is required.",
    };
  }

  return { ok: true, destinations: sanitizedDestinations, startDate, endDate };
}

export function sanitizeBooleanMap(input: unknown): Record<string, boolean> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Record<string, boolean> = Object.create(null) as Record<string, boolean>;
  let count = 0;
  for (const [k, v] of Object.entries(input)) {
    if (count >= 100) break;
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    if (typeof k === "string" && k.length <= 120) {
      out[k] = Boolean(v);
      count++;
    }
  }
  return out;
}

export function isAllowedImageMime(mimeType: unknown): boolean {
  if (typeof mimeType !== "string" || !mimeType) return false;
  return ALLOWED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function sanitizeChatHistory(history: unknown): string {
  if (!Array.isArray(history) || history.length === 0) return "";
  const lines = history
    .slice(-4)
    .filter((h: unknown): h is ChatHistoryEntry =>
      Boolean(h && typeof (h as ChatHistoryEntry).text === "string")
    )
    .map(
      (h) =>
        `${h.sender === "user" ? "Resident" : "VayuPulse"}: ${h.text.slice(0, 1000)}`
    );
  return lines.length > 0 ? `RECENT CONVERSATION HISTORY:\n${lines.join("\n")}\n\n` : "";
}

export function sanitizeTextField(
  input: unknown,
  maxLength: number,
  fallback: string
): string {
  if (typeof input !== "string") return fallback;
  const cleaned = input.replace(/[\r\n\t\u0000-\u001F\u007F]+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

export interface SanitizedHouseholdProfile {
  vulnerabilities: string[];
  commute: string;
  indoorSetup: string;
  windows: {
    morning: boolean;
    commute: boolean;
    evening: boolean;
  };
}

export function sanitizeHouseholdProfile(
  input: unknown
): SanitizedHouseholdProfile | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }
  const obj = input as Record<string, unknown>;
  const vulnerabilities = Array.isArray(obj.vulnerabilities)
    ? obj.vulnerabilities
        .filter((v): v is string => typeof v === "string")
        .map((v) => sanitizeTextField(v, 48, ""))
        .filter(Boolean)
        .slice(0, 10)
    : [];
  const commute = sanitizeTextField(obj.commute, 48, "two_wheeler");
  const indoorSetup = sanitizeTextField(obj.indoorSetup, 48, "purifier");
  const rawWindows =
    obj.windows && typeof obj.windows === "object" && !Array.isArray(obj.windows)
      ? (obj.windows as Record<string, unknown>)
      : {};

  return {
    vulnerabilities,
    commute,
    indoorSetup,
    windows: {
      morning: rawWindows.morning !== false,
      commute: rawWindows.commute !== false,
      evening: rawWindows.evening !== false,
    },
  };
}
