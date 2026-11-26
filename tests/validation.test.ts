import test from "node:test";
import assert from "node:assert/strict";
import {
  enumerateDates,
  getPeriodName,
  validateTripPlanRequest,
  sanitizeBooleanMap,
  isAllowedImageMime,
  sanitizeChatHistory,
} from "../lib/validation";

test("enumerateDates handles single day, multi-day, invalid input, and 14-day cap", () => {
  assert.deepEqual(enumerateDates("2026-12-05", "2026-12-05"), ["2026-12-05"]);
  assert.deepEqual(enumerateDates("2026-12-05", "2026-12-07"), [
    "2026-12-05",
    "2026-12-06",
    "2026-12-07",
  ]);
  assert.deepEqual(enumerateDates("not-a-date", "2026-12-07"), ["not-a-date"]);

  const capped = enumerateDates("2026-12-01", "2026-12-30");
  assert.equal(capped.length, 14);
  assert.equal(capped[0], "2026-12-01");
  assert.equal(capped[13], "2026-12-14");
});

test("getPeriodName maps 24-hour clock to morning, afternoon, evening, night", () => {
  assert.equal(getPeriodName(5), "night");
  assert.equal(getPeriodName(6), "morning");
  assert.equal(getPeriodName(11), "morning");
  assert.equal(getPeriodName(12), "afternoon");
  assert.equal(getPeriodName(16), "afternoon");
  assert.equal(getPeriodName(17), "evening");
  assert.equal(getPeriodName(20), "evening");
  assert.equal(getPeriodName(21), "night");
  assert.equal(getPeriodName(0), "night");
});

test("validateTripPlanRequest rejects invalid dates, reversed ranges, and bad coordinates", () => {
  assert.equal(validateTripPlanRequest([], "2026-12-05", "2026-12-06").ok, false);
  assert.equal(
    validateTripPlanRequest([{ name: "Delhi", lat: 28.6, lng: 77.2 }], "2026-12-10", "2026-12-05").ok,
    false
  );
  assert.equal(
    validateTripPlanRequest([{ name: "Delhi", lat: 28.6, lng: 77.2 }], "12/05/2026", "2026-12-06").ok,
    false
  );
  assert.equal(
    validateTripPlanRequest([{ name: "BadLat", lat: 95, lng: 77.2 }], "2026-12-05", "2026-12-06").ok,
    false
  );
  assert.equal(
    validateTripPlanRequest([{ name: "BadLng", lat: 28.6, lng: -200 }], "2026-12-05", "2026-12-06").ok,
    false
  );

  const valid = validateTripPlanRequest(
    [
      { name: "Delhi", lat: 28.61, lng: 77.2 },
      { name: "Agra", lat: 27.17, lng: 78.0 },
      { name: "Jaipur", lat: 26.91, lng: 75.78 },
      { name: "Extra4", lat: 25.0, lng: 74.0 },
    ],
    "2026-12-05",
    "2026-12-08"
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.destinations.length, 3);
    assert.equal(valid.destinations[2].name, "Jaipur");
  }
});

test("sanitizeBooleanMap blocks prototype pollution, non-objects, and caps at 100 keys", () => {
  assert.equal(sanitizeBooleanMap(null), null);
  assert.equal(sanitizeBooleanMap(["a"]), null);
  assert.equal(sanitizeBooleanMap("string"), null);

  const malicious = JSON.parse('{"__proto__": {"polluted": true}, "constructor": true, "step-1": 1, "step-2": 0}');
  const cleaned = sanitizeBooleanMap(malicious);
  assert.ok(cleaned);
  assert.equal(cleaned["step-1"], true);
  assert.equal(cleaned["step-2"], false);
  assert.equal(Object.prototype.hasOwnProperty.call(cleaned, "__proto__"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cleaned, "constructor"), false);

  const oversized: Record<string, boolean> = {};
  for (let i = 0; i < 150; i++) oversized[`k-${i}`] = true;
  const capped = sanitizeBooleanMap(oversized);
  assert.ok(capped);
  assert.equal(Object.keys(capped).length, 100);
});

test("isAllowedImageMime permits only safe image MIME types", () => {
  assert.equal(isAllowedImageMime("image/jpeg"), true);
  assert.equal(isAllowedImageMime("IMAGE/PNG"), true);
  assert.equal(isAllowedImageMime("image/webp"), true);
  assert.equal(isAllowedImageMime("image/gif"), true);
  assert.equal(isAllowedImageMime("image/svg+xml"), false);
  assert.equal(isAllowedImageMime("text/html"), false);
  assert.equal(isAllowedImageMime(undefined), false);
});

test("sanitizeChatHistory keeps last 4 valid entries and truncates long text", () => {
  assert.equal(sanitizeChatHistory([]), "");
  assert.equal(sanitizeChatHistory(null), "");

  const history = [
    { sender: "user", text: "msg1" },
    { sender: "ai", text: "msg2" },
    { sender: "user", text: "msg3" },
    { sender: "ai", text: "msg4" },
    { sender: "user", text: "x".repeat(1200) },
  ];
  const formatted = sanitizeChatHistory(history);
  assert.doesNotMatch(formatted, /msg1/);
  assert.match(formatted, /VayuPulse: msg2/);
  assert.match(formatted, /Resident: x{1000}/);
  assert.doesNotMatch(formatted, /x{1001}/);
});
