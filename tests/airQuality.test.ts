import test from "node:test";
import assert from "node:assert/strict";
import {
  getAqiMeta,
  getHeroRiskMeta,
  formatOsmPlaceShortName,
  fetchCurrentOpenMeteoAq,
  searchOsmPlaces,
  reverseGeocodeOsm,
} from "../lib/airQuality";

test("getAqiMeta returns Loading state for undefined or NaN", () => {
  assert.equal(getAqiMeta(undefined).shortLabel, "Loading...");
  assert.equal(getAqiMeta(Number.NaN).shortLabel, "Loading...");
});

test("getAqiMeta maps US AQI thresholds accurately", () => {
  assert.equal(getAqiMeta(0).shortLabel, "Good");
  assert.equal(getAqiMeta(50).shortLabel, "Good");
  assert.equal(getAqiMeta(51).shortLabel, "Moderate");
  assert.equal(getAqiMeta(100).shortLabel, "Moderate");
  assert.equal(getAqiMeta(101).shortLabel, "Sensitive");
  assert.equal(getAqiMeta(150).shortLabel, "Sensitive");
  assert.equal(getAqiMeta(151).shortLabel, "Unhealthy");
  assert.equal(getAqiMeta(200).shortLabel, "Unhealthy");
  assert.equal(getAqiMeta(201).shortLabel, "Very Poor");
  assert.equal(getAqiMeta(300).shortLabel, "Very Poor");
  assert.equal(getAqiMeta(301).shortLabel, "Hazardous");
  assert.equal(getAqiMeta(450).shortLabel, "Hazardous");
});

test("formatOsmPlaceShortName formats concise names without duplicate city", () => {
  assert.equal(
    formatOsmPlaceShortName({
      display_name: "Connaught Place, New Delhi, Delhi, India",
      address: { suburb: "Connaught Place", city: "New Delhi" },
    }),
    "Connaught Place, New Delhi"
  );

  assert.equal(
    formatOsmPlaceShortName({
      display_name: "New Delhi, Delhi, India",
      address: { city: "New Delhi" },
    }),
    "New Delhi"
  );

  assert.equal(
    formatOsmPlaceShortName({
      display_name: "Palakkad, Kerala, India",
    }),
    "Palakkad"
  );
});

test("fetchCurrentOpenMeteoAq parses telemetry and caches repeated coordinates", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return {
      ok: true,
      json: async () => ({
        current: {
          us_aqi: 184.6,
          european_aqi: 91.2,
          pm2_5: 96.44,
          pm10: 142.39,
          nitrogen_dioxide: 33.12,
          ozone: 41.88,
          carbon_monoxide: 612.34,
          sulphur_dioxide: 12.67,
        },
      }),
    } as unknown as Response;
  }) as typeof fetch;

  try {
    const first = await fetchCurrentOpenMeteoAq(28.6139, 77.209);
    assert.ok(first);
    assert.equal(first.usAqi, 185);
    assert.equal(first.europeanAqi, 91);
    assert.equal(first.pm25, 96.4);
    assert.equal(first.pm10, 142.4);
    assert.equal(fetchCalls, 1);

    // Same coordinates within TTL should hit cache without calling fetch again
    const second = await fetchCurrentOpenMeteoAq(28.6139, 77.209);
    assert.deepEqual(second, first);
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchCurrentOpenMeteoAq returns null on non-OK HTTP response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({ ok: false, status: 503 }) as unknown as Response) as typeof fetch;

  try {
    const result = await fetchCurrentOpenMeteoAq(10.7867, 76.6548);
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchCurrentOpenMeteoAq deduplicates concurrent in-flight requests", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = (async () => {
    fetchCalls += 1;
    await new Promise((r) => setTimeout(r, 15));
    return {
      ok: true,
      json: async () => ({ current: { us_aqi: 72, pm2_5: 21.4 } }),
    } as unknown as Response;
  }) as typeof fetch;

  try {
    const [a, b] = await Promise.all([
      fetchCurrentOpenMeteoAq(12.9716, 77.5946),
      fetchCurrentOpenMeteoAq(12.9716, 77.5946),
    ]);
    assert.equal(fetchCalls, 1);
    assert.deepEqual(a, b);
    assert.equal(a?.usAqi, 72);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("searchOsmPlaces and reverseGeocodeOsm handle success and errors gracefully", async () => {
  const originalFetch = globalThis.fetch;
  let lastUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    lastUrl = String(input);
    if (lastUrl.includes("/search")) {
      return {
        ok: true,
        json: async () => [{ place_id: 1, display_name: "Manali, HP", lat: "32.2", lon: "77.1" }],
      } as unknown as Response;
    }
    return {
      ok: true,
      json: async () => ({ display_name: "Indiranagar, Bengaluru", address: { suburb: "Indiranagar", city: "Bengaluru" } }),
    } as unknown as Response;
  }) as typeof fetch;

  try {
    const places = await searchOsmPlaces("Manali", "in");
    assert.equal(places.length, 1);
    assert.match(lastUrl, /countrycodes=in/);

    const rev = await reverseGeocodeOsm(12.97, 77.64);
    assert.equal(rev?.address?.suburb, "Indiranagar");

    globalThis.fetch = (async () => {
      throw new Error("Network down");
    }) as typeof fetch;
    assert.deepEqual(await searchOsmPlaces("Manali"), []);
    assert.equal(await reverseGeocodeOsm(12.97, 77.64), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getHeroRiskMeta honors explicit Hero Risk Banner levels over raw AQI", () => {
  const low = getHeroRiskMeta("low", 180);
  assert.equal(low.level, "low");
  assert.equal(low.label, "Low Risk");

  const moderate = getHeroRiskMeta("moderate", 54);
  assert.equal(moderate.level, "moderate");
  assert.equal(moderate.label, "Moderate Risk");

  const high = getHeroRiskMeta("high", 90);
  assert.equal(high.level, "high");
  assert.equal(high.label, "High Risk");

  const severe = getHeroRiskMeta("severe", 120);
  assert.equal(severe.level, "severe");
  assert.equal(severe.label, "Severe Risk");
});

test("getHeroRiskMeta falls back to AQI thresholds when riskLevel is missing", () => {
  assert.equal(getHeroRiskMeta(undefined, 35).level, "low");
  assert.equal(getHeroRiskMeta(undefined, 80).level, "moderate");
  assert.equal(getHeroRiskMeta(undefined, 160).level, "high");
  assert.equal(getHeroRiskMeta(undefined, 250).level, "severe");
  assert.equal(getHeroRiskMeta(undefined, Number.NaN).level, "moderate");
  assert.equal(getHeroRiskMeta(undefined, undefined).level, "moderate");
});
