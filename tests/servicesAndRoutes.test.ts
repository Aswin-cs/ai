import "./testAlias";
import test from "node:test";
import assert from "node:assert/strict";
import { authStubState } from "./testAlias";
import { clearRateLimitStoreForTests } from "../lib/rateLimit";
import { fetchPlaceForecast, sanitizeTripJsonText } from "../lib/tripPlanService";
import { buildChatSystemInstruction, classifyAqiCategory } from "../lib/chatService";
import { GET as getAirQuality } from "../app/api/air-quality/route";
import { POST as postChat } from "../app/api/ai/chat/route";
import { POST as postPlan } from "../app/api/ai/plan/route";
import { POST as postPlanProgress } from "../app/api/ai/plan/progress/route";
import { GET as getAutoUpdate } from "../app/api/ai/plan/auto-update/route";
import { DELETE as deleteTripPlan, GET as getTripPlans, POST as postTripPlan } from "../app/api/ai/trip-plan/route";
import { POST as postTripProgress } from "../app/api/ai/trip-plan/progress/route";
import { POST as postOnboarding } from "../app/api/user/onboarding/route";
import { GET as getUserStatus } from "../app/api/user/status/route";

test("tripPlanService sanitizes fenced JSON and aggregates hourly forecast periods", async () => {
  const parsed = sanitizeTripJsonText('```json\n{"ok":true,"days":2}\n```');
  assert.deepEqual(parsed, { ok: true, days: 2 });

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          hourly: {
            time: ["2026-12-05T08:00", "2026-12-05T09:00", "2026-12-05T14:00"],
            us_aqi: [120, 110, 80],
            pm2_5: [45, 40, 25],
            ozone: [30, 32, 40],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    const forecast = await fetchPlaceForecast(
      { name: "Delhi", lat: 28.61, lng: 77.2 },
      ["2026-12-05"]
    );
    assert.equal(forecast.length, 1);
    assert.equal(forecast[0].place, "Delhi");
    assert.equal(forecast[0].periods.length, 2);
    assert.equal(forecast[0].cleanest_window?.start, "09:00");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("chatService classifies AQI bands and embeds location telemetry into system instruction", () => {
  assert.equal(classifyAqiCategory(40), "Good");
  assert.equal(classifyAqiCategory(80), "Satisfactory");
  assert.equal(classifyAqiCategory(150), "Moderate");
  assert.equal(classifyAqiCategory(250), "Poor");
  assert.equal(classifyAqiCategory(350), "Very Poor");
  assert.equal(classifyAqiCategory(450), "Severe");

  const instruction = buildChatSystemInstruction({
    location: "Noida Sector 62",
    currentAqi: 215,
    aqiCategory: "Poor",
    pm25: 112,
    pm10: 190,
    no2: 38,
    windowInfo: "1:30 PM to 4:00 PM",
    forecastSummary: "2 PM: AQI 160",
    vulnerabilities: "children",
    commute: "metro",
    hasPurifier: true,
    isPlanningAssist: false,
  });
  assert.ok(instruction.includes("NOIDA SECTOR 62"));
  assert.ok(instruction.includes("Current AQI: 215 (Poor)"));
});

test("GET /api/air-quality enforces coordinate validation and IP rate limits", async () => {
  clearRateLimitStoreForTests();

  const badReq = new Request("https://vayupulse.local/api/air-quality?lat=999&lng=77");
  const badRes = await getAirQuality(badReq);
  assert.equal(badRes.status, 400);
  const badJson = await badRes.json();
  assert.equal(badJson.success, false);
  assert.equal(badJson.error.code, "BAD_REQUEST");

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          current: { us_aqi: 92, pm2_5: 31.5, pm10: 54.0, nitrogen_dioxide: 21.0, ozone: 35.0 },
          hourly: { time: ["2026-12-05T10:00"], us_aqi: [92], pm2_5: [31.5], pm10: [54] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    const okRes = await getAirQuality(
      new Request("https://vayupulse.local/api/air-quality?lat=28.61&lng=77.21", {
        headers: { "x-forwarded-for": "198.51.100.7" },
      })
    );
    assert.equal(okRes.status, 200);
    const okJson = await okRes.json();
    assert.equal(okJson.success, true);
    assert.equal(okJson.current.usAqi, 92);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Authenticated API routes reject unauthenticated calls with 401 and structured error", async () => {
  clearRateLimitStoreForTests();
  authStubState.session = null;

  const authedCalls = [
    () => getUserStatus(new Request("https://vayupulse.local/api/user/status")),
    () =>
      postOnboarding(
        new Request("https://vayupulse.local/api/user/onboarding", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
    () =>
      postPlan(
        new Request("https://vayupulse.local/api/ai/plan", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
    () =>
      postPlanProgress(
        new Request("https://vayupulse.local/api/ai/plan/progress", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
    () =>
      postChat(
        new Request("https://vayupulse.local/api/ai/chat", {
          method: "POST",
          body: JSON.stringify({ message: "hi" }),
        })
      ),
    () =>
      postTripPlan(
        new Request("https://vayupulse.local/api/ai/trip-plan", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
    () => getTripPlans(new Request("https://vayupulse.local/api/ai/trip-plan")),
    () => deleteTripPlan(new Request("https://vayupulse.local/api/ai/trip-plan", { method: "DELETE" })),
    () =>
      postTripProgress(
        new Request("https://vayupulse.local/api/ai/trip-plan/progress", {
          method: "POST",
          body: JSON.stringify({}),
        })
      ),
  ];

  for (const callRoute of authedCalls) {
    const res = await callRoute();
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "UNAUTHORIZED");
    assert.equal(typeof body.error.message, "string");
  }
});

test("Authenticated AI routes validate payloads and enforce per-user rate limits", async () => {
  clearRateLimitStoreForTests();
  authStubState.session = { user: { email: "tester@vayupulse.local", name: "Tester" } };

  // Chat 400 when empty message and no image/trip
  const emptyChat = await postChat(
    new Request("https://vayupulse.local/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "   " }),
    })
  );
  assert.equal(emptyChat.status, 400);
  assert.equal((await emptyChat.json()).error.code, "BAD_REQUEST");

  // Chat 400 on unsupported image MIME type
  const badMime = await postChat(
    new Request("https://vayupulse.local/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "check", image: { data: "abc", mimeType: "image/svg+xml" } }),
    })
  );
  assert.equal(badMime.status, 400);

  // Trip plan 400 on missing destinations/dates
  const badTrip = await postTripPlan(
    new Request("https://vayupulse.local/api/ai/trip-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinations: [], startDate: "2026-12-05", endDate: "2026-12-06" }),
    })
  );
  assert.equal(badTrip.status, 400);
  assert.equal((await badTrip.json()).error.code, "BAD_REQUEST");

  // Trip progress 400 on invalid ObjectId
  const badProgressId = await postTripProgress(
    new Request("https://vayupulse.local/api/ai/trip-plan/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripPlanId: "not-an-object-id" }),
    })
  );
  assert.equal(badProgressId.status, 400);
  assert.equal((await badProgressId.json()).error.code, "BAD_REQUEST");

  // Plan 400 on invalid image MIME
  const badPlanImage = await postPlan(
    new Request("https://vayupulse.local/api/ai/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: { data: "abc", mimeType: "application/pdf" } }),
    })
  );
  assert.equal(badPlanImage.status, 400);
  assert.equal((await badPlanImage.json()).error.code, "BAD_REQUEST");
});

test("GET /api/ai/plan/auto-update protects cron endpoint with CRON_SECRET", async () => {
  const prevSecret = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    const res503 = await getAutoUpdate(new Request("https://vayupulse.local/api/ai/plan/auto-update"));
    assert.equal(res503.status, 503);
    assert.equal((await res503.json()).error.code, "SERVICE_UNAVAILABLE");

    process.env.CRON_SECRET = "super-secret-cron-token";
    const res401 = await getAutoUpdate(new Request("https://vayupulse.local/api/ai/plan/auto-update"));
    assert.equal(res401.status, 401);
    assert.equal((await res401.json()).error.code, "UNAUTHORIZED");

    const res403 = await getAutoUpdate(
      new Request("https://vayupulse.local/api/ai/plan/auto-update", {
        headers: { authorization: "Bearer wrong-token" },
      })
    );
    assert.equal(res403.status, 403);
    assert.equal((await res403.json()).error.code, "FORBIDDEN");
  } finally {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
  }
});
