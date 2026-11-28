import "./testAlias";
import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteTripPlanApi,
  fetchAirQualityTelemetry,
  fetchTripPlansApi,
  fetchUserStatus,
  savePlanProgressApi,
  saveTripProgressApi,
  sendChatMessageApi,
} from "../lib/api";

test("lib/api client sends expected requests and parses structured or legacy errors", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });

      if (url.includes("structured-error")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "BAD_REQUEST", message: "Structured error msg" },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("legacy-error")) {
        return new Response(JSON.stringify({ error: "Legacy error msg" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, authenticated: true, inDb: true, onboardingCompleted: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const aqRes = await fetchAirQualityTelemetry(28.61, 77.21);
    assert.equal(aqRes.success, true);
    assert.equal(calls[0].url, "/api/air-quality?lat=28.61&lng=77.21");

    const statusRes = await fetchUserStatus();
    assert.equal(statusRes.authenticated, true);
    assert.equal(calls[1].url, "/api/user/status");

    await savePlanProgressApi({ roadmap: { step1: true }, indoorChecklist: {} });
    assert.equal(calls[2].url, "/api/ai/plan/progress");
    assert.equal(calls[2].init?.method, "POST");

    await fetchTripPlansApi({ page: 2, limit: 3 });
    assert.equal(calls[3].url, "/api/ai/trip-plan?page=2&limit=3");

    await deleteTripPlanApi("abc 123");
    assert.equal(calls[4].url, "/api/ai/trip-plan?id=abc%20123");
    assert.equal(calls[4].init?.method, "DELETE");

    await saveTripProgressApi({ tripPlanId: "t1", roadmapSteps: ["s1"], packingItems: ["n95"] });
    assert.equal(calls[5].url, "/api/ai/trip-plan/progress");

    await sendChatMessageApi({
      message: "Safe to jog?",
      mode: "standard",
      hourlyForecast: [],
      tripPlan: null,
      selectedTripPlanId: null,
      history: [],
      location: "Delhi",
    });
    assert.equal(calls[6].url, "/api/ai/chat");

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "RATE_LIMITED", message: "Slow down please" },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    await assert.rejects(() => fetchUserStatus(), { message: "Slow down please" });

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "Legacy text error" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    await assert.rejects(() => fetchUserStatus(), { message: "Legacy text error" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
