export const DEFAULT_COORDS = {
  lat: 28.6139,
  lng: 77.209,
  label: "New Delhi, India",
} as const;

export const RATE_LIMITS = {
  chat: { limit: 30, windowMs: 60_000 },
  plan: { limit: 12, windowMs: 60_000 },
  tripPlan: { limit: 10, windowMs: 60_000 },
  airQuality: { limit: 60, windowMs: 60_000 },
} as const;

export const PLAN_STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000;
export const MAX_UPLOAD_BASE64_LENGTH = 7_200_000;
export const CPCB_MAX_STATION_DISTANCE_KM = 35;

export const STORAGE_KEYS = {
  userProfile: "vayupulse_user_profile",
  activePlan: "vayupulse_active_plan",
  progress: "vayupulse_progress",
  theme: "vayupulse_theme",
} as const;
