import { sanitizeHouseholdProfile, sanitizeTextField, type SanitizedHouseholdProfile } from "./validation";

export const MAX_ONBOARDING_BODY_BYTES = 200 * 1024;

const RISK_LEVELS = new Set(["low", "moderate", "high", "severe"]);
const MAIN_CONCERNS = new Set(["pm25", "pm10", "ozone", "no2", "mixed"]);
const MEMBERS = new Set([
  "young_children",
  "senior_citizens",
  "asthma_respiratory",
  "working_adult",
]);
const VERDICTS = new Set(["keep", "shift", "cancel"]);
const PERIODS = new Set(["morning", "afternoon", "evening", "night"]);
const INDOOR_SETUPS = new Set(["hepa_purifier", "natural_ventilation"]);
const COSTS = new Set(["free", "low", "medium"]);
const EFFORTS = new Set(["easy", "medium", "hard"]);
const PHASES = new Set(["now", "today", "this_week", "this_month"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return Boolean(val && typeof val === "object" && !Array.isArray(val));
}

function cleanStr(val: unknown, maxLen: number): string | null {
  if (typeof val !== "string") return null;
  const cleaned = val.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (cleaned.length > maxLen) return null;
  return cleaned;
}

function readNum(val: unknown, min: number, max: number): number | null {
  if (typeof val !== "number" || !Number.isFinite(val)) return null;
  if (val < min || val > max) return null;
  return val;
}

function readStrArray(val: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(val) || val.length > maxItems) return null;
  const out: string[] = [];
  for (const item of val) {
    const s = cleanStr(item, maxLen);
    if (s === null) return null;
    out.push(s);
  }
  return out;
}

export interface ValidatedAirQualityData {
  usAqi: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  ozone?: number;
  co?: number;
  so2?: number;
  category: string;
}

export function validateAirQualityData(
  input: unknown
): { ok: true; data: ValidatedAirQualityData | undefined } | { ok: false; error: string } {
  if (input === undefined || input === null) {
    return { ok: true, data: undefined };
  }
  if (!isPlainObject(input)) {
    return { ok: false, error: "airQualityData must be an object." };
  }

  const usAqi = input.usAqi !== undefined ? readNum(input.usAqi, 0, 1000) : 100;
  if (usAqi === null) {
    return { ok: false, error: "airQualityData.usAqi must be a number between 0 and 1000." };
  }

  const optionalRanges: Array<[keyof Omit<ValidatedAirQualityData, "usAqi" | "category">, number]> = [
    ["pm25", 2000],
    ["pm10", 5000],
    ["no2", 2000],
    ["ozone", 2000],
    ["co", 100_000],
    ["so2", 2000],
  ];

  const data: ValidatedAirQualityData = { usAqi, category: "" };
  for (const [key, maxVal] of optionalRanges) {
    if (input[key] !== undefined && input[key] !== null) {
      const num = readNum(input[key], 0, maxVal);
      if (num === null) {
        return { ok: false, error: `airQualityData.${key} must be between 0 and ${maxVal}.` };
      }
      data[key] = num;
    }
  }

  if (typeof input.category === "string") {
    const c = cleanStr(input.category, 120);
    if (c === null) return { ok: false, error: "airQualityData.category is too long." };
    data.category = c;
  } else if (isPlainObject(input.category) && input.category.label !== undefined) {
    const label = cleanStr(input.category.label, 120);
    if (label === null) return { ok: false, error: "airQualityData.category.label must be a string." };
    data.category = label;
  } else if (input.category !== undefined && input.category !== null) {
    return { ok: false, error: "airQualityData.category has an invalid format." };
  }

  return { ok: true, data };
}

export function validateAiPlanPayload(
  input: unknown
): { ok: true; plan: Record<string, unknown> } | { ok: false; error: string } {
  if (!isPlainObject(input)) {
    return { ok: false, error: "aiPlan must be an object." };
  }

  if (!isPlainObject(input.status)) return { ok: false, error: "aiPlan.status is required." };
  const risk = cleanStr(input.status.risk_level, 20);
  const headline = cleanStr(input.status.headline, 300);
  const explanation = cleanStr(input.status.plain_explanation, 800);
  const concern = cleanStr(input.status.main_concern, 20);
  if (
    !risk || !RISK_LEVELS.has(risk) ||
    !headline || !explanation ||
    !concern || !MAIN_CONCERNS.has(concern)
  ) {
    return { ok: false, error: "aiPlan.status contains invalid or missing fields." };
  }

  if (!isPlainObject(input.do_this_now)) return { ok: false, error: "aiPlan.do_this_now is required." };
  const nowAction = cleanStr(input.do_this_now.action, 400);
  const nowReason = cleanStr(input.do_this_now.reason, 600);
  if (!nowAction || !nowReason) {
    return { ok: false, error: "aiPlan.do_this_now requires action and reason." };
  }

  if (!isPlainObject(input.safe_outdoor_window)) {
    return { ok: false, error: "aiPlan.safe_outdoor_window is required." };
  }
  const win = input.safe_outdoor_window;
  const winStart = cleanStr(win.start, 40);
  const winEnd = cleanStr(win.end, 40);
  const winReason = cleanStr(win.reason, 600);
  const expectedPm25 = readNum(win.expected_pm25, 0, 2000);
  const bestFor = readStrArray(win.best_for, 10, 120);
  if (
    typeof win.available !== "boolean" ||
    winStart === null || winEnd === null || !winReason ||
    expectedPm25 === null || !bestFor
  ) {
    return { ok: false, error: "aiPlan.safe_outdoor_window contains invalid fields." };
  }

  if (!Array.isArray(input.member_guidance) || input.member_guidance.length > 10) {
    return { ok: false, error: "aiPlan.member_guidance must be an array of at most 10 entries." };
  }
  const memberGuidance: Record<string, unknown>[] = [];
  for (const m of input.member_guidance) {
    if (!isPlainObject(m)) return { ok: false, error: "Invalid member_guidance entry." };
    const member = cleanStr(m.member, 40);
    const limit = cleanStr(m.outdoor_limit, 240);
    const mask = cleanStr(m.mask_advice, 300);
    const tips = readStrArray(m.key_tips, 15, 300);
    const warnings = m.warning_signs === undefined ? undefined : readStrArray(m.warning_signs, 15, 300);
    if (
      !member || !MEMBERS.has(member) || !limit || !mask || !tips ||
      (m.warning_signs !== undefined && !warnings)
    ) {
      return { ok: false, error: "aiPlan.member_guidance entry has invalid fields." };
    }
    memberGuidance.push({
      member,
      outdoor_limit: limit,
      mask_advice: mask,
      key_tips: tips,
      ...(warnings ? { warning_signs: warnings } : {}),
    });
  }

  let outdoorReview: Record<string, unknown>[] | undefined;
  if (input.outdoor_window_review !== undefined) {
    if (!Array.isArray(input.outdoor_window_review) || input.outdoor_window_review.length > 15) {
      return { ok: false, error: "aiPlan.outdoor_window_review exceeds limits." };
    }
    outdoorReview = [];
    for (const r of input.outdoor_window_review) {
      if (!isPlainObject(r)) return { ok: false, error: "Invalid outdoor_window_review item." };
      const act = cleanStr(r.usual_activity, 200);
      const verdict = cleanStr(r.verdict, 20);
      const sugg = cleanStr(r.suggestion, 400);
      if (!act || !verdict || !VERDICTS.has(verdict) || !sugg) {
        return { ok: false, error: "Invalid outdoor_window_review fields." };
      }
      outdoorReview.push({ usual_activity: act, verdict, suggestion: sugg });
    }
  }

  if (!Array.isArray(input.daily_routine) || input.daily_routine.length > 8) {
    return { ok: false, error: "aiPlan.daily_routine must be an array of at most 8 items." };
  }
  const dailyRoutine: Record<string, unknown>[] = [];
  for (const d of input.daily_routine) {
    if (!isPlainObject(d) || !isPlainObject(d.impact)) {
      return { ok: false, error: "Invalid daily_routine item." };
    }
    const period = cleanStr(d.period, 20);
    const timeRange = cleanStr(d.time_range, 100);
    const dRisk = cleanStr(d.risk_level, 20);
    const insteadOf = cleanStr(d.instead_of, 300);
    const doThis = cleanStr(d.do_this, 400);
    const why = cleanStr(d.why_it_matters, 500);
    const badge = cleanStr(d.impact.badge, 120);
    if (
      !period || !PERIODS.has(period) || !timeRange ||
      !dRisk || !RISK_LEVELS.has(dRisk) ||
      insteadOf === null || !doThis || !why || !badge ||
      typeof d.impact.estimated !== "boolean"
    ) {
      return { ok: false, error: "Invalid daily_routine entry fields." };
    }
    dailyRoutine.push({
      period,
      time_range: timeRange,
      risk_level: dRisk,
      instead_of: insteadOf,
      do_this: doThis,
      why_it_matters: why,
      impact: { badge, estimated: d.impact.estimated },
    });
  }

  let indoorAirPlan: Record<string, unknown> | undefined;
  if (input.indoor_air_plan !== undefined) {
    if (!isPlainObject(input.indoor_air_plan) || !Array.isArray(input.indoor_air_plan.steps) || input.indoor_air_plan.steps.length > 20) {
      return { ok: false, error: "aiPlan.indoor_air_plan is invalid." };
    }
    const setup = cleanStr(input.indoor_air_plan.setup, 40);
    if (!setup || !INDOOR_SETUPS.has(setup)) {
      return { ok: false, error: "Invalid indoor_air_plan.setup." };
    }
    const steps: Record<string, unknown>[] = [];
    for (const s of input.indoor_air_plan.steps) {
      if (!isPlainObject(s)) return { ok: false, error: "Invalid indoor_air_plan step." };
      const action = cleanStr(s.action, 400);
      const when = cleanStr(s.when, 120);
      const cost = cleanStr(s.cost, 20);
      if (!action || !when || !cost || !COSTS.has(cost)) {
        return { ok: false, error: "Invalid indoor_air_plan step fields." };
      }
      steps.push({ action, when, cost });
    }
    indoorAirPlan = { setup, steps };
  }

  let commutePlan: Record<string, unknown> | undefined;
  if (input.commute_plan !== undefined) {
    if (!isPlainObject(input.commute_plan)) {
      return { ok: false, error: "aiPlan.commute_plan must be an object." };
    }
    const mode = cleanStr(input.commute_plan.mode, 100);
    const bestDep = cleanStr(input.commute_plan.best_departure, 120);
    const protection = cleanStr(input.commute_plan.protection, 300);
    const tips = readStrArray(input.commute_plan.tips, 15, 300);
    if (!mode || !bestDep || !protection || !tips) {
      return { ok: false, error: "Invalid commute_plan fields." };
    }
    commutePlan = { mode, best_departure: bestDep, protection, tips };
  }

  if (!Array.isArray(input.roadmap) || input.roadmap.length > 8) {
    return { ok: false, error: "aiPlan.roadmap must be an array of at most 8 phases." };
  }
  const roadmap: Record<string, unknown>[] = [];
  for (const p of input.roadmap) {
    if (!isPlainObject(p) || !Array.isArray(p.steps) || p.steps.length > 25) {
      return { ok: false, error: "Invalid roadmap phase." };
    }
    const phase = cleanStr(p.phase, 30);
    const title = cleanStr(p.title, 200);
    const goal = cleanStr(p.goal, 400);
    if (!phase || !PHASES.has(phase) || !title || !goal) {
      return { ok: false, error: "Invalid roadmap phase metadata." };
    }
    const steps: Record<string, unknown>[] = [];
    for (const s of p.steps) {
      if (!isPlainObject(s)) return { ok: false, error: "Invalid roadmap step." };
      const id = cleanStr(s.id, 80);
      const action = cleanStr(s.action, 300);
      const when = cleanStr(s.when, 120);
      const who = cleanStr(s.who, 120);
      const why = cleanStr(s.why, 400);
      const impactBadge = cleanStr(s.impact_badge, 120);
      const effort = cleanStr(s.effort, 20);
      const cost = cleanStr(s.cost, 20);
      if (
        !id || !action || !when || !who || !why || impactBadge === null ||
        !effort || !EFFORTS.has(effort) || !cost || !COSTS.has(cost)
      ) {
        return { ok: false, error: "Invalid roadmap step fields." };
      }
      steps.push({ id, action, when, who, why, impact_badge: impactBadge, effort, cost });
    }
    roadmap.push({ phase, title, goal, steps });
  }

  if (!Array.isArray(input.sustainable_swaps) || input.sustainable_swaps.length > 12) {
    return { ok: false, error: "aiPlan.sustainable_swaps must have at most 12 entries." };
  }
  const swaps: Record<string, unknown>[] = [];
  for (const sw of input.sustainable_swaps) {
    if (!isPlainObject(sw)) return { ok: false, error: "Invalid sustainable_swaps entry." };
    const fromHabit = cleanStr(sw.from_habit, 250);
    const toHabit = cleanStr(sw.to_habit, 250);
    const airBenefit = cleanStr(sw.benefit_to_air, 400);
    const familyBenefit = cleanStr(sw.benefit_to_family, 400);
    const effort = cleanStr(sw.effort, 20);
    if (!fromHabit || !toHabit || !airBenefit || !familyBenefit || !effort || !EFFORTS.has(effort)) {
      return { ok: false, error: "Invalid sustainable_swaps fields." };
    }
    swaps.push({
      from_habit: fromHabit,
      to_habit: toHabit,
      benefit_to_air: airBenefit,
      benefit_to_family: familyBenefit,
      effort,
    });
  }

  if (!isPlainObject(input.impact_summary)) {
    return { ok: false, error: "aiPlan.impact_summary is required." };
  }
  const impHeadline = cleanStr(input.impact_summary.headline, 400);
  const pct = readNum(input.impact_summary.estimated_exposure_reduction_pct, 0, 100);
  const assumptions = cleanStr(input.impact_summary.assumptions, 1000);
  const communityNote = cleanStr(input.impact_summary.community_note, 600);
  if (!impHeadline || pct === null || !assumptions || !communityNote) {
    return { ok: false, error: "Invalid aiPlan.impact_summary fields." };
  }

  const safetyNote = cleanStr(input.safety_note, 1000);
  const dataConfidence = cleanStr(input.data_confidence, 20);
  if (!safetyNote || !dataConfidence || !CONFIDENCES.has(dataConfidence)) {
    return { ok: false, error: "Invalid safety_note or data_confidence." };
  }

  return {
    ok: true,
    plan: {
      status: {
        risk_level: risk,
        headline,
        plain_explanation: explanation,
        main_concern: concern,
      },
      do_this_now: { action: nowAction, reason: nowReason },
      safe_outdoor_window: {
        available: win.available,
        start: winStart,
        end: winEnd,
        reason: winReason,
        expected_pm25: expectedPm25,
        best_for: bestFor,
      },
      member_guidance: memberGuidance,
      ...(outdoorReview ? { outdoor_window_review: outdoorReview } : {}),
      daily_routine: dailyRoutine,
      ...(indoorAirPlan ? { indoor_air_plan: indoorAirPlan } : {}),
      ...(commutePlan ? { commute_plan: commutePlan } : {}),
      roadmap,
      sustainable_swaps: swaps,
      impact_summary: {
        headline: impHeadline,
        estimated_exposure_reduction_pct: pct,
        assumptions,
        community_note: communityNote,
      },
      safety_note: safetyNote,
      data_confidence: dataConfidence,
    },
  };
}

export interface ValidatedOnboardingPayload {
  locationName: string;
  lat: number;
  lng: number;
  householdProfile?: SanitizedHouseholdProfile;
  airQualityData?: ValidatedAirQualityData;
  aiPlan?: Record<string, unknown>;
  modelUsed: string;
}

export type OnboardingValidationResult =
  | { ok: true; data: ValidatedOnboardingPayload }
  | { ok: false; status: 400 | 413; code: "BAD_REQUEST" | "PAYLOAD_TOO_LARGE"; error: string };

/**
 * Parses, size-caps (200 KB), strips unknown/server-controlled keys from,
 * and validates the `/api/user/onboarding` POST payload.
 */
export function validateOnboardingPayload(rawBody: string): OnboardingValidationResult {
  if (Buffer.byteLength(rawBody, "utf8") > MAX_ONBOARDING_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      error: "Request body exceeds the 200 KB maximum limit.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, code: "BAD_REQUEST", error: "Invalid JSON payload." };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, status: 400, code: "BAD_REQUEST", error: "Request body must be an object." };
  }

  if (parsed.locationQuery !== undefined && typeof parsed.locationQuery !== "string") {
    return { ok: false, status: 400, code: "BAD_REQUEST", error: "locationQuery must be a string." };
  }
  const locationName = sanitizeTextField(parsed.locationQuery, 160, "Custom Location");

  let lat = 28.6139;
  let lng = 77.209;
  if (parsed.coords !== undefined) {
    if (!isPlainObject(parsed.coords)) {
      return { ok: false, status: 400, code: "BAD_REQUEST", error: "coords must be an object." };
    }
    const parsedLat = readNum(parsed.coords.lat, -90, 90);
    const parsedLng = readNum(parsed.coords.lng, -180, 180);
    if (parsedLat === null || parsedLng === null) {
      return {
        ok: false,
        status: 400,
        code: "BAD_REQUEST",
        error: "coords.lat (-90..90) and coords.lng (-180..180) must be valid numbers.",
      };
    }
    lat = parsedLat;
    lng = parsedLng;
  }

  if (
    parsed.householdProfile !== undefined &&
    parsed.householdProfile !== null &&
    !isPlainObject(parsed.householdProfile)
  ) {
    return { ok: false, status: 400, code: "BAD_REQUEST", error: "householdProfile must be an object." };
  }
  const householdProfile = sanitizeHouseholdProfile(parsed.householdProfile);

  const aqCheck = validateAirQualityData(parsed.airQualityData);
  if (!aqCheck.ok) {
    return { ok: false, status: 400, code: "BAD_REQUEST", error: aqCheck.error };
  }

  let validatedPlan: Record<string, unknown> | undefined;
  if (parsed.aiPlan !== undefined && parsed.aiPlan !== null) {
    const planCheck = validateAiPlanPayload(parsed.aiPlan);
    if (!planCheck.ok) {
      return { ok: false, status: 400, code: "BAD_REQUEST", error: planCheck.error };
    }
    validatedPlan = planCheck.plan;
  }

  if (parsed.modelUsed !== undefined && parsed.modelUsed !== null && typeof parsed.modelUsed !== "string") {
    return { ok: false, status: 400, code: "BAD_REQUEST", error: "modelUsed must be a string." };
  }
  const modelUsed = sanitizeTextField(parsed.modelUsed, 80, "gemini");

  return {
    ok: true,
    data: {
      locationName,
      lat,
      lng,
      householdProfile,
      airQualityData: aqCheck.data,
      aiPlan: validatedPlan,
      modelUsed,
    },
  };
}
