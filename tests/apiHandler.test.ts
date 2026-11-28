import "./testAlias";
import test from "node:test";
import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { errorResponse, rateLimitResponse, requireAuthEmail } from "../lib/apiAuth";
import { withAuthApiHandler, withPublicApiHandler } from "../lib/apiHandler";
import { clearRateLimitStoreForTests } from "../lib/rateLimit";
import { authStubState } from "./testAlias";

test("errorResponse returns consistent { success: false, error: { code, message } } shape", async () => {
  const res = errorResponse("BAD_REQUEST", "Invalid latitude.", 400, {
    extra: { field: "lat" },
  });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.deepEqual(json, {
    success: false,
    field: "lat",
    error: { code: "BAD_REQUEST", message: "Invalid latitude." },
  });
});

test("rateLimitResponse sets 429 status, Retry-After, and RATE_LIMITED code", async () => {
  const res = rateLimitResponse(12);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "12");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const json = await res.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, "RATE_LIMITED");
});

test("requireAuthEmail returns 401 when unauthenticated and normalized email when signed in", async () => {
  authStubState.session = null;
  const unauth = await requireAuthEmail("Sign in needed");
  assert.equal(unauth.email, null);
  assert.ok(unauth.response);
  assert.equal(unauth.response.status, 401);
  const unauthBody = await unauth.response.json();
  assert.deepEqual(unauthBody, {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Sign in needed" },
  });

  authStubState.session = { user: { email: "User@Example.COM", name: "User" } };
  const authed = await requireAuthEmail();
  assert.equal(authed.email, "user@example.com");
  assert.equal(authed.response, null);
});

test("withAuthApiHandler enforces auth, per-user rate limit, and safe 5xx error masking", async () => {
  clearRateLimitStoreForTests();
  authStubState.session = null;

  const handler = withAuthApiHandler(
    {
      context: "TestAuthHandler",
      fallbackError: "Unexpected failure",
      unauthorizedMessage: "Auth required.",
      rateLimit: { prefix: "test-auth", limit: 1, windowMs: 60_000 },
    },
    async (req, auth) => {
      const url = new URL(req.url);
      if (url.searchParams.get("boom") === "1") {
        throw new Error("Sensitive internal DB string");
      }
      return NextResponse.json({ success: true, user: auth.email });
    }
  );

  // 401 when no session
  const r401 = await handler(new Request("https://vayupulse.local/api/test"));
  assert.equal(r401.status, 401);
  assert.equal((await r401.json()).error.code, "UNAUTHORIZED");

  // 200 on first allowed call
  authStubState.session = { user: { email: "a@example.com" } };
  const r200 = await handler(new Request("https://vayupulse.local/api/test"));
  assert.equal(r200.status, 200);
  assert.equal((await r200.json()).user, "a@example.com");

  // 429 on second call in window
  const r429 = await handler(new Request("https://vayupulse.local/api/test"));
  assert.equal(r429.status, 429);
  assert.equal((await r429.json()).error.code, "RATE_LIMITED");

  // 500 masks internal error details for another user
  authStubState.session = { user: { email: "b@example.com" } };
  const r500 = await handler(new Request("https://vayupulse.local/api/test?boom=1"));
  assert.equal(r500.status, 500);
  const body500 = await r500.json();
  assert.deepEqual(body500, {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Unexpected failure" },
  });
});

test("withPublicApiHandler enforces IP rate limit and returns INTERNAL_ERROR on throw", async () => {
  clearRateLimitStoreForTests();
  const handler = withPublicApiHandler(
    {
      context: "TestPublic",
      fallbackError: "Public handler failure",
      rateLimit: { prefix: "pub", limit: 1, windowMs: 60_000 },
    },
    async (req) => {
      if (new URL(req.url).searchParams.get("fail") === "1") {
        throw new Error("boom");
      }
      return NextResponse.json({ ok: true });
    }
  );

  const okRes = await handler(
    new Request("https://vayupulse.local/api/pub", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    })
  );
  assert.equal(okRes.status, 200);

  const rlRes = await handler(
    new Request("https://vayupulse.local/api/pub", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    })
  );
  assert.equal(rlRes.status, 429);

  const errRes = await handler(
    new Request("https://vayupulse.local/api/pub?fail=1", {
      headers: { "x-forwarded-for": "5.6.7.8" },
    })
  );
  assert.equal(errRes.status, 500);
  assert.deepEqual(await errRes.json(), {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Public handler failure" },
  });
});
