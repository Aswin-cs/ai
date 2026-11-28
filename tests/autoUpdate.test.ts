import "./testAlias";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { authStubState } from "./testAlias";
import { clearRateLimitStoreForTests } from "../lib/rateLimit";
import { PLAN_FORCE_COOLDOWN_MS, RATE_LIMITS } from "../lib/constants";

function loadAutoUpdateWithStubs() {
  const distRoot = path.resolve(__dirname, "..");
  const routeId = require.resolve(path.join(distRoot, "app/api/ai/plan/auto-update/route"));
  const autoUpdateId = require.resolve(path.join(distRoot, "lib/autoUpdatePlan"));
  const mongodbId = require.resolve(path.join(distRoot, "lib/mongodb"));
  const geminiId = require.resolve(path.join(distRoot, "lib/gemini"));
  const userId = require.resolve(path.join(distRoot, "models/User"));
  const evalId = require.resolve(path.join(distRoot, "models/AiEvaluation"));

  const prevCache = new Map<string, NodeModule | undefined>();
  for (const id of [routeId, autoUpdateId, mongodbId, geminiId, userId, evalId]) {
    prevCache.set(id, require.cache[id]);
    delete require.cache[id];
  }

  let geminiCalls = 0;
  let mockDbUser: Record<string, unknown> | null = null;
  let mockLatestEval: Record<string, unknown> | null = null;

  const setStub = (id: string, exportsObj: unknown) => {
    require.cache[id] = {
      id,
      filename: id,
      loaded: true,
      exports: exportsObj,
    } as unknown as NodeModule;
  };

  setStub(mongodbId, { __esModule: true, default: async () => ({}) });
  setStub(geminiId, {
    __esModule: true,
    AIR_PLAN_RESPONSE_SCHEMA: {},
    DEFAULT_SYSTEM_INSTRUCTION: "test",
    buildVayuPulsePrompt: () => "test prompt",
    generateWithGeminiFallback: async () => {
      geminiCalls += 1;
      return {
        parsedJson: {
          status: {
            risk_level: "moderate",
            headline: "Updated plan",
            plain_explanation: "Fresh guidance",
            main_concern: "pm25",
          },
        },
        modelUsed: "gemini-test",
        attempts: [],
      };
    },
  });
  setStub(userId, {
    __esModule: true,
    default: {
      findOne: async () => mockDbUser,
      findById: async () =>
        mockDbUser
          ? {
              ...mockDbUser,
              save: async () => mockDbUser,
            }
          : null,
    },
  });
  setStub(evalId, {
    __esModule: true,
    default: {
      findById: async () => mockLatestEval,
      findOne: () => ({
        sort: async () => mockLatestEval,
      }),
      deleteMany: async () => ({ deletedCount: 1 }),
      create: async (doc: Record<string, unknown>) => ({
        _id: "eval-new-1",
        ...doc,
        updatedAt: new Date().toISOString(),
      }),
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const routeMod = require(routeId) as { POST: (req: Request) => Promise<Response> };

  const restore = () => {
    for (const [id, entry] of prevCache.entries()) {
      if (entry) require.cache[id] = entry;
      else delete require.cache[id];
    }
  };

  return {
    POST: routeMod.POST,
    getGeminiCalls: () => geminiCalls,
    resetGeminiCalls: () => {
      geminiCalls = 0;
    },
    setUser: (u: Record<string, unknown> | null) => {
      mockDbUser = u;
    },
    setLatestEval: (e: Record<string, unknown> | null) => {
      mockLatestEval = e;
    },
    restore,
  };
}

test("POST /api/ai/plan/auto-update enforces auth, body validation, cooldown, Gemini execution, and rate limits", async () => {
  clearRateLimitStoreForTests();
  const harness = loadAutoUpdateWithStubs();
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        current: { us_aqi: 140, pm2_5: 55, pm10: 90, nitrogen_dioxide: 25, ozone: 32, carbon_monoxide: 500, sulphur_dioxide: 10 },
        hourly: { time: ["2026-12-05T10:00"], us_aqi: [140], pm2_5: [55], ozone: [32] },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )) as typeof fetch;

  try {
    // 1. Unauthenticated returns 401
    authStubState.session = null;
    const res401 = await harness.POST(
      new Request("https://vayupulse.local/api/ai/plan/auto-update", {
        method: "POST",
        body: JSON.stringify({ force: true }),
      })
    );
    assert.equal(res401.status, 401);
    assert.equal((await res401.json()).error.code, "UNAUTHORIZED");

    authStubState.session = { user: { email: "autoupdate@vayupulse.local", name: "Test" } };

    // 2. Non-boolean force is rejected with 400 BAD_REQUEST and never triggers Gemini
    const badForceRes = await harness.POST(
      new Request("https://vayupulse.local/api/ai/plan/auto-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: "yes" }),
      })
    );
    assert.equal(badForceRes.status, 400);
    assert.equal((await badForceRes.json()).error.code, "BAD_REQUEST");
    assert.equal(harness.getGeminiCalls(), 0);

    // 3. Forced update inside 15-minute cooldown returns existing evaluation with updated=false & Retry-After without calling Gemini
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    harness.setLatestEval({ _id: "eval-1", updatedAt: fiveMinAgo, location: { name: "Delhi", lat: 28.61, lng: 77.2 } });
    harness.setUser({
      _id: "user-1",
      email: "autoupdate@vayupulse.local",
      defaultLocation: { name: "Delhi", lat: 28.61, lng: 77.2 },
      latestAiEvaluation: { _id: "eval-1", updatedAt: fiveMinAgo, location: { name: "Delhi", lat: 28.61, lng: 77.2 } },
    });

    const cooldownRes = await harness.POST(
      new Request("https://vayupulse.local/api/ai/plan/auto-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      })
    );
    assert.equal(cooldownRes.status, 200);
    const retryAfterCooldown = Number(cooldownRes.headers.get("Retry-After"));
    assert.ok(retryAfterCooldown >= 1 && retryAfterCooldown <= PLAN_FORCE_COOLDOWN_MS / 1000);
    const cooldownJson = await cooldownRes.json();
    assert.equal(cooldownJson.success, true);
    assert.equal(cooldownJson.updated, false);
    assert.match(cooldownJson.reason, /Cooldown active/i);
    assert.equal(cooldownJson.evaluation._id, "eval-1");
    assert.equal(harness.getGeminiCalls(), 0);

    // 4. Forced update after cooldown expires calls Gemini and creates new evaluation
    const twentyMinAgo = new Date(Date.now() - (PLAN_FORCE_COOLDOWN_MS + 5 * 60 * 1000)).toISOString();
    harness.setLatestEval({ _id: "eval-1", updatedAt: twentyMinAgo, location: { name: "Delhi", lat: 28.61, lng: 77.2 } });
    harness.setUser({
      _id: "user-1",
      email: "autoupdate@vayupulse.local",
      defaultLocation: { name: "Delhi", lat: 28.61, lng: 77.2 },
      latestAiEvaluation: { _id: "eval-1", updatedAt: twentyMinAgo, location: { name: "Delhi", lat: 28.61, lng: 77.2 } },
    });

    const refreshedRes = await harness.POST(
      new Request("https://vayupulse.local/api/ai/plan/auto-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      })
    );
    assert.equal(refreshedRes.status, 200);
    const refreshedJson = await refreshedRes.json();
    assert.equal(refreshedJson.success, true);
    assert.equal(refreshedJson.updated, true);
    assert.equal(harness.getGeminiCalls(), 1);

    // 5. Rate limit triggers 429 with Retry-After after exceeding RATE_LIMITS.planAutoUpdate.limit
    // Already made 3 authenticated requests above (badForce, cooldown, refreshed); consume remaining up to limit
    for (let i = 3; i < RATE_LIMITS.planAutoUpdate.limit; i++) {
      const ok = await harness.POST(
        new Request("https://vayupulse.local/api/ai/plan/auto-update", {
          method: "POST",
          body: JSON.stringify({}),
        })
      );
      assert.notEqual(ok.status, 429);
    }

    const limitedRes = await harness.POST(
      new Request("https://vayupulse.local/api/ai/plan/auto-update", {
        method: "POST",
        body: JSON.stringify({ force: true }),
      })
    );
    assert.equal(limitedRes.status, 429);
    assert.ok(Number(limitedRes.headers.get("Retry-After")) >= 1);
    const limitedJson = await limitedRes.json();
    assert.equal(limitedJson.error.code, "RATE_LIMITED");
  } finally {
    globalThis.fetch = origFetch;
    harness.restore();
  }
});
