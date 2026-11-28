import "./testAlias";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { authStubState } from "./testAlias";
import { clearRateLimitStoreForTests } from "../lib/rateLimit";
import {
  MAX_ONBOARDING_BODY_BYTES,
  validateOnboardingPayload,
} from "../lib/onboardingValidation";
import {
  validateChatHistoryInput,
  validateKnownProgressIds,
  validateProgressBooleanMap,
} from "../lib/validation";
import { POST as postChat } from "../app/api/ai/chat/route";

function buildValidAiPlan() {
  return {
    status: {
      risk_level: "high",
      headline: "High morning PM2.5",
      plain_explanation: "Limit outdoor rush hour.",
      main_concern: "pm25",
    },
    do_this_now: { action: "Close windows", reason: "Traps cooler morning particulates outside." },
    safe_outdoor_window: {
      available: true,
      start: "14:00",
      end: "16:00",
      reason: "Afternoon mixing",
      expected_pm25: 55,
      best_for: ["Brisk walk"],
    },
    member_guidance: [
      {
        member: "young_children",
        outdoor_limit: "Max 20 min",
        mask_advice: "KF94 mask",
        key_tips: ["Stay indoors before noon"],
      },
    ],
    daily_routine: [
      {
        period: "morning",
        time_range: "07:00 - 10:00",
        risk_level: "high",
        instead_of: "Outdoor run",
        do_this: "Indoor stretch",
        why_it_matters: "Lower peak inhalation",
        impact: { badge: "-30% dose", estimated: true },
      },
    ],
    indoor_air_plan: {
      setup: "hepa_purifier",
      steps: [{ action: "Run HEPA medium", when: "Morning", cost: "low" }],
    },
    roadmap: [
      {
        phase: "now",
        title: "Immediate",
        goal: "Lower PM2.5",
        steps: [
          {
            id: "now-1",
            action: "Seal door gaps",
            when: "Now",
            who: "Household",
            why: "Cut infiltration",
            impact_badge: "-20% PM2.5",
            effort: "easy",
            cost: "free",
          },
        ],
      },
    ],
    sustainable_swaps: [
      {
        from_habit: "Solo car trip",
        to_habit: "Metro feeder",
        benefit_to_air: "Lower NOx",
        benefit_to_family: "Lower roadside dose",
        effort: "easy",
      },
    ],
    impact_summary: {
      headline: "Estimated 35% lower exposure",
      estimated_exposure_reduction_pct: 35,
      assumptions: "Approximate estimate assuming indoor filtration.",
      community_note: "Encourage carpooling.",
    },
    safety_note: "Seek medical care for wheezing.",
    data_confidence: "high",
  };
}

test("validateOnboardingPayload validates valid, invalid, oversized, and extra-key payloads", () => {
  const validPayload = {
    locationQuery: "Indiranagar, Bengaluru",
    coords: { lat: 12.97, lng: 77.64 },
    householdProfile: { vulnerabilities: ["children"], commute: "metro", indoorSetup: "purifier" },
    airQualityData: { usAqi: 132, pm25: 54.2, category: { label: "Sensitive" }, unexpectedField: "strip" },
    aiPlan: { ...buildValidAiPlan(), injectedKey: "evil" },
    modelUsed: "gemini-3.8-flash",
    rawResponse: "ignored blob",
    promptText: "ignored prompt",
    role: "admin",
    _id: "000000000000000000000000",
    googleId: "hijack",
    onboardingCompleted: false,
    createdAt: "1999-01-01",
  };

  const ok = validateOnboardingPayload(JSON.stringify(validPayload));
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.locationName, "Indiranagar, Bengaluru");
    assert.equal(ok.data.lat, 12.97);
    assert.equal(ok.data.airQualityData?.category, "Sensitive");
    assert.equal("unexpectedField" in (ok.data.airQualityData || {}), false);
    assert.equal("injectedKey" in (ok.data.aiPlan || {}), false);
    assert.equal("role" in ok.data, false);
    assert.equal("rawResponse" in ok.data, false);
  }

  // Oversized payload > 200 KB -> 413
  const big = validateOnboardingPayload("x".repeat(MAX_ONBOARDING_BODY_BYTES + 10));
  assert.equal(big.ok, false);
  if (!big.ok) {
    assert.equal(big.status, 413);
    assert.equal(big.code, "PAYLOAD_TOO_LARGE");
  }

  // Invalid coordinates -> 400
  const badCoords = validateOnboardingPayload(JSON.stringify({ coords: { lat: 150, lng: 77 } }));
  assert.equal(badCoords.ok, false);
  if (!badCoords.ok) assert.equal(badCoords.status, 400);

  // Invalid aiPlan enum -> 400
  const badPlan = buildValidAiPlan();
  badPlan.status.risk_level = "extreme";
  const badAi = validateOnboardingPayload(JSON.stringify({ aiPlan: badPlan }));
  assert.equal(badAi.ok, false);
  if (!badAi.ok) assert.equal(badAi.status, 400);

  // Out-of-range airQualityData -> 400
  const badAq = validateOnboardingPayload(JSON.stringify({ airQualityData: { usAqi: 9999 } }));
  assert.equal(badAq.ok, false);
  if (!badAq.ok) assert.equal(badAq.status, 400);
});

test("progress validators and chat history reject invalid types and filter unknown step IDs", () => {
  const allowedRoadmap = new Set(["now-1", "today-0"]);
  const validProg = validateProgressBooleanMap({ "now-1": true, "unknown-step": true }, allowedRoadmap);
  assert.equal(validProg.ok, true);
  if (validProg.ok) assert.deepEqual(validProg.value, { "now-1": true });

  const nonBool = validateProgressBooleanMap({ "now-1": "yes" }, allowedRoadmap);
  assert.equal(nonBool.ok, false);

  const allowedPacking = new Set(["N95 Masks"]);
  const tripIds = validateKnownProgressIds(["N95 Masks", "Forged Item", "N95 Masks"], allowedPacking);
  assert.equal(tripIds.ok, true);
  if (tripIds.ok) assert.deepEqual(tripIds.ids, ["N95 Masks"]);

  assert.equal(validateKnownProgressIds([123], allowedPacking).ok, false);
  assert.equal(validateChatHistoryInput("not-array").ok, false);
  assert.equal(validateChatHistoryInput(new Array(51).fill({ text: "hi" })).ok, false);
  assert.equal(validateChatHistoryInput([{ text: "a".repeat(4001) }]).ok, false);
});

test("POST /api/user/onboarding and /api/ai/chat enforce payload validation and caps", async () => {
  clearRateLimitStoreForTests();
  authStubState.session = { user: { email: "onboard@vayupulse.local", name: "Onboarder" } };

  const distRoot = path.resolve(__dirname, "..");
  const routeId = require.resolve(path.join(distRoot, "app/api/user/onboarding/route"));
  const mongodbId = require.resolve(path.join(distRoot, "lib/mongodb"));
  const userId = require.resolve(path.join(distRoot, "models/User"));
  const evalId = require.resolve(path.join(distRoot, "models/AiEvaluation"));

  const prev = new Map<string, NodeModule | undefined>();
  for (const id of [routeId, mongodbId, userId, evalId]) {
    prev.set(id, require.cache[id]);
    delete require.cache[id];
  }

  let createdEvalDoc: Record<string, unknown> | null = null;
  let savedUserDoc: Record<string, unknown> | null = null;

  const setStub = (id: string, exportsObj: unknown) => {
    require.cache[id] = { id, filename: id, loaded: true, exports: exportsObj } as unknown as NodeModule;
  };
  setStub(mongodbId, { __esModule: true, default: async () => ({}) });
  setStub(userId, {
    __esModule: true,
    default: {
      findOne: async () => null,
      create: async (doc: Record<string, unknown>) => {
        savedUserDoc = {
          _id: "u-onboard-1",
          ...doc,
          save: async () => savedUserDoc,
        };
        return savedUserDoc;
      },
    },
  });
  setStub(evalId, {
    __esModule: true,
    default: {
      deleteMany: async () => ({ deletedCount: 0 }),
      create: async (doc: Record<string, unknown>) => {
        createdEvalDoc = { _id: "eval-onboard-1", ...doc };
        return createdEvalDoc;
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { POST: postOnboarding } = require(routeId) as { POST: (r: Request) => Promise<Response> };

  try {
    const res413 = await postOnboarding(
      new Request("https://vayupulse.local/api/user/onboarding", {
        method: "POST",
        body: "x".repeat(MAX_ONBOARDING_BODY_BYTES + 100),
      })
    );
    assert.equal(res413.status, 413);
    assert.equal((await res413.json()).error.code, "PAYLOAD_TOO_LARGE");

    const res400 = await postOnboarding(
      new Request("https://vayupulse.local/api/user/onboarding", {
        method: "POST",
        body: JSON.stringify({ coords: { lat: "NaN", lng: 77 } }),
      })
    );
    assert.equal(res400.status, 400);
    assert.equal((await res400.json()).error.code, "BAD_REQUEST");

    const res200 = await postOnboarding(
      new Request("https://vayupulse.local/api/user/onboarding", {
        method: "POST",
        body: JSON.stringify({
          locationQuery: "Delhi",
          coords: { lat: 28.61, lng: 77.2 },
          aiPlan: buildValidAiPlan(),
          rawResponse: { huge: "ignored" },
          promptText: "ignored",
          role: "admin",
        }),
      })
    );
    assert.equal(res200.status, 200);
    assert.ok(createdEvalDoc);
    assert.equal((createdEvalDoc as Record<string, unknown>).promptText, "");
    assert.deepEqual((createdEvalDoc as Record<string, unknown>).rawResponse, {});
    assert.equal("role" in (savedUserDoc || {}), false);

    // Chat rejects invalid history shape and overlong message
    const badHistoryRes = await postChat(
      new Request("https://vayupulse.local/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "hi", history: "bad" }),
      })
    );
    assert.equal(badHistoryRes.status, 400);
    assert.equal((await badHistoryRes.json()).error.code, "BAD_REQUEST");

    const longMsgRes = await postChat(
      new Request("https://vayupulse.local/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "a".repeat(2001) }),
      })
    );
    assert.equal(longMsgRes.status, 400);
  } finally {
    for (const [id, entry] of prev.entries()) {
      if (entry) require.cache[id] = entry;
      else delete require.cache[id];
    }
  }
});
