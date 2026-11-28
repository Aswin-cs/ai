import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, clearRateLimitStoreForTests } from "../lib/rateLimit";
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
