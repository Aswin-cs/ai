import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, clearRateLimitStoreForTests, getClientIp } from "../lib/rateLimit";
import { sanitizeHouseholdProfile, sanitizeTextField } from "../lib/validation";

test("checkRateLimit enforces window limit and resets after window expires", () => {
  clearRateLimitStoreForTests();
  const base = 1_700_000_000_000;

  const r1 = checkRateLimit("user:test@example.com", 2, 60_000, base);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 1);

  const r2 = checkRateLimit("user:test@example.com", 2, 60_000, base + 5_000);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 0);

  const r3 = checkRateLimit("user:test@example.com", 2, 60_000, base + 10_000);
  assert.equal(r3.allowed, false);
  assert.ok(r3.retryAfterSeconds >= 1);

  const r4 = checkRateLimit("user:test@example.com", 2, 60_000, base + 61_000);
  assert.equal(r4.allowed, true);
});

test("sanitizeTextField strips control chars and truncates to maxLength", () => {
  assert.equal(sanitizeTextField(null, 50, "Default"), "Default");
  assert.equal(
    sanitizeTextField("Delhi\n\r\tNCR\u0000", 100, "Default"),
    "Delhi NCR"
  );
  assert.equal(sanitizeTextField("ABCDEFGHIJ", 5, "Default"), "ABCDE");
});

test("sanitizeHouseholdProfile filters invalid types and bounds vulnerabilities", () => {
  assert.equal(sanitizeHouseholdProfile("not-an-object"), undefined);
  assert.equal(sanitizeHouseholdProfile(["array"]), undefined);

  const sanitized = sanitizeHouseholdProfile({
    vulnerabilities: ["children", 123, "asthma\n", "   "],
    commute: "metro\t",
    indoorSetup: "purifier",
    windows: { morning: false, commute: true, evening: "yes" },
  });

  assert.deepEqual(sanitized, {
    vulnerabilities: ["children", "asthma"],
    commute: "metro",
    indoorSetup: "purifier",
    windows: { morning: false, commute: true, evening: true },
  });
});

test("getClientIp extracts first x-forwarded-for IP, falls back to x-real-ip or unknown", () => {
  const reqForwarded = new Request("https://example.com", {
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
  });
  assert.equal(getClientIp(reqForwarded), "203.0.113.10");

  const reqRealIp = new Request("https://example.com", {
    headers: { "x-real-ip": "198.51.100.42" },
  });
  assert.equal(getClientIp(reqRealIp), "198.51.100.42");

  const reqEmpty = new Request("https://example.com");
  assert.equal(getClientIp(reqEmpty), "unknown");
});

test("getClientIp prioritizes platform-provided headers over spoofed x-forwarded-for", () => {
  const spoofedWithVercel = new Request("https://example.com", {
    headers: {
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      "x-real-ip": "198.51.100.2",
      "x-vercel-forwarded-for": "203.0.113.99",
    },
  });
  assert.equal(getClientIp(spoofedWithVercel), "203.0.113.99");

  const spoofedWithCf = new Request("https://example.com", {
    headers: {
      "x-forwarded-for": "1.2.3.4",
      "cf-connecting-ip": "198.51.100.77",
    },
  });
  assert.equal(getClientIp(spoofedWithCf), "198.51.100.77");

  const spoofedWithRealIp = new Request("https://example.com", {
    headers: {
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "198.51.100.55",
    },
  });
  assert.equal(getClientIp(spoofedWithRealIp), "198.51.100.55");
});

test("checkRateLimit isolates distinct user keys", () => {
  clearRateLimitStoreForTests();
  const now = 1_700_000_000_000;
  assert.equal(checkRateLimit("user:a", 1, 60_000, now).allowed, true);
  assert.equal(checkRateLimit("user:a", 1, 60_000, now).allowed, false);
  assert.equal(checkRateLimit("user:b", 1, 60_000, now).allowed, true);
});
