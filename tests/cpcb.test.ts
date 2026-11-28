import test from "node:test";
import assert from "node:assert/strict";
import { clearCpcbCacheForTests, fetchNearestCpcbAq } from "../lib/cpcb";

test("fetchNearestCpcbAq returns null when DATA_GOV_API_KEY is missing", async () => {
  clearCpcbCacheForTests();
  const prevKey = process.env.DATA_GOV_API_KEY;
  delete process.env.DATA_GOV_API_KEY;
  try {
    const res = await fetchNearestCpcbAq(28.6139, 77.209);
    assert.equal(res, null);
  } finally {
    if (prevKey !== undefined) process.env.DATA_GOV_API_KEY = prevKey;
  }
});

test("fetchNearestCpcbAq aggregates nearest station within 35 km and computes max NAQI", async () => {
  clearCpcbCacheForTests();
  const prevKey = process.env.DATA_GOV_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.DATA_GOV_API_KEY = "test-cpcb-key";

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        records: [
          {
            station: "Far Station",
            city: "FarCity",
            state: "FarState",
            latitude: 19.076,
            longitude: 72.8777,
            pollutant_id: "PM2.5",
            avg_value: 300,
          },
          {
            station: "ITO, Delhi - CPCB",
            city: "Delhi",
            state: "Delhi",
            last_update: "28-11-2026 08:00:00",
            latitude: 28.6286,
            longitude: 77.241,
            pollutant_id: "PM2.5",
            avg_value: 215,
          },
          {
            station: "ITO, Delhi - CPCB",
            city: "Delhi",
            state: "Delhi",
            last_update: "28-11-2026 08:00:00",
            latitude: 28.6286,
            longitude: 77.241,
            pollutant_id: "PM10",
            avg_value: 184,
          },
          {
            station: "ITO, Delhi - CPCB",
            city: "Delhi",
            state: "Delhi",
            last_update: "28-11-2026 08:00:00",
            latitude: 28.6286,
            longitude: 77.241,
            pollutant_id: "NO2",
            avg_value: 52,
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )) as typeof fetch;

  try {
    const reading = await fetchNearestCpcbAq(28.6139, 77.209);
    assert.ok(reading);
    assert.equal(reading.source, "CPCB");
    assert.equal(reading.station, "ITO, Delhi - CPCB");
    assert.equal(reading.aqi, 215);
    assert.equal(reading.pm25, 215);
    assert.equal(reading.pm10, 184);
    assert.equal(reading.no2, 52);
    assert.ok(reading.distanceKm < 10);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey !== undefined) {
      process.env.DATA_GOV_API_KEY = prevKey;
    } else {
      delete process.env.DATA_GOV_API_KEY;
    }
    clearCpcbCacheForTests();
  }
});

test("fetchNearestCpcbAq returns null on non-OK HTTP response", async () => {
  clearCpcbCacheForTests();
  const prevKey = process.env.DATA_GOV_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.DATA_GOV_API_KEY = "test-cpcb-key";

  globalThis.fetch = (async () =>
    new Response("Service Unavailable", { status: 503 })) as typeof fetch;

  try {
    const reading = await fetchNearestCpcbAq(28.6139, 77.209);
    assert.equal(reading, null);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey !== undefined) {
      process.env.DATA_GOV_API_KEY = prevKey;
    } else {
      delete process.env.DATA_GOV_API_KEY;
    }
    clearCpcbCacheForTests();
  }
});
