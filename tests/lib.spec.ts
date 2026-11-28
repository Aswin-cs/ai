import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatOsmPlaceShortName,
  formatTimeTo12Hour,
  getAqiMeta,
  getHeroRiskMeta,
  reverseGeocodeOsm,
  searchOsmPlaces,
  fetchCurrentOpenMeteoAq,
} from "@/lib/airQuality";
import {
  deleteTripPlanApi,
  fetchAirQualityTelemetry,
  fetchTripPlansApi,
  fetchUserStatus,
  generateOnboardingPlanApi,
  generateTripPlanApi,
  recalibrateAirPlanApi,
  saveOnboardingProfileApi,
  savePlanProgressApi,
  saveTripProgressApi,
  sendChatMessageApi,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  enumerateDates,
  getPeriodName,
  isAllowedImageMime,
  normalizeLanguage,
  sanitizeBooleanMap,
  sanitizeChatHistory,
  sanitizeHouseholdProfile,
  sanitizeTextField,
  validateTripPlanRequest,
} from "@/lib/validation";

describe("Core Client Lib Utilities", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("airQuality helpers classify AQI/risk bands, format times & OSM names, and handle Open-Meteo/Nominatim fetch", async () => {
    expect(getAqiMeta(undefined).shortLabel).toBe("Loading...");
    expect(getAqiMeta(35).shortLabel).toBe("Good");
    expect(getAqiMeta(85).shortLabel).toBe("Moderate");
    expect(getAqiMeta(135).shortLabel).toBe("Sensitive");
    expect(getAqiMeta(185).shortLabel).toBe("Unhealthy");
    expect(getAqiMeta(255).shortLabel).toBe("Very Poor");
    expect(getAqiMeta(355).shortLabel).toBe("Hazardous");

    expect(getHeroRiskMeta("low").label).toBe("Low Risk");
    expect(getHeroRiskMeta("moderate").label).toBe("Moderate Risk");
    expect(getHeroRiskMeta("high").label).toBe("High Risk");
    expect(getHeroRiskMeta("severe").label).toBe("Severe Risk");
    expect(getHeroRiskMeta(undefined, 40).label).toBe("Low Risk");
    expect(getHeroRiskMeta(undefined, 90).label).toBe("Moderate Risk");
    expect(getHeroRiskMeta(undefined, 180).label).toBe("High Risk");
    expect(getHeroRiskMeta(undefined, 280).label).toBe("Severe Risk");

    expect(formatTimeTo12Hour("00:15")).toBe("12:15 AM");
    expect(formatTimeTo12Hour("12:00")).toBe("12:00 PM");
    expect(formatTimeTo12Hour("06:30")).toBe("6:30 AM");
    expect(formatTimeTo12Hour("14:00 - 16:30")).toContain("PM");
    expect(formatTimeTo12Hour("invalid")).toBe("invalid");
    expect(formatTimeTo12Hour(undefined)).toBe("");

    expect(
      formatOsmPlaceShortName({
        display_name: "BKC, Mumbai, Maharashtra",
        address: { suburb: "BKC", city: "Mumbai", state: "Maharashtra" },
      })
    ).toBe("BKC, Mumbai");

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("open-meteo")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              current: {
                us_aqi: 95,
                european_aqi: 48,
                pm2_5: 32.5,
                pm10: 55.2,
                nitrogen_dioxide: 21.1,
                ozone: 33.4,
                carbon_monoxide: 410,
                sulphur_dioxide: 9.2,
              },
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify([{ place_id: 1, display_name: "Jaipur, India", lat: "26.9", lon: "75.7" }]),
          { status: 200 }
        )
      );
    }) as unknown as typeof fetch;

    const aq = await fetchCurrentOpenMeteoAq(26.912, 75.787);
    expect(aq?.usAqi).toBe(95);
    const search = await searchOsmPlaces("Jaipur");
    expect(search.length).toBe(1);
    const rev = await reverseGeocodeOsm(26.9, 75.7);
    expect(rev).toBeTruthy();

    globalThis.fetch = vi.fn().mockResolvedValue(new Response("err", { status: 500 })) as unknown as typeof fetch;
    expect(await searchOsmPlaces("x")).toEqual([]);
    expect(await reverseGeocodeOsm(0, 0)).toBeNull();
    expect(await fetchCurrentOpenMeteoAq(12.34, 56.78)).toBeNull();
  });

  it("lib/api functions build expected requests and surface structured or legacy error messages", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    ) as unknown as typeof fetch;

    await fetchAirQualityTelemetry(28.6, 77.2);
    await fetchUserStatus();
    await savePlanProgressApi({ roadmap: {}, indoorChecklist: {} });
    await recalibrateAirPlanApi({
      location: "Delhi",
      hourlyForecast: [],
      evaluationType: "recalibration",
      refreshTelemetry: false,
      language: "en",
    });
    await deleteTripPlanApi("id1");
    await fetchTripPlansApi();
    await fetchTripPlansApi({ page: 1, limit: 3 });
    await generateTripPlanApi({
      destinations: [],
      startDate: "2026-12-05",
      startTime: "09:00",
      endDate: "2026-12-06",
      language: "en",
    });
    await sendChatMessageApi({
      message: "Hi",
      mode: "standard",
      hourlyForecast: [],
      tripPlan: null,
      selectedTripPlanId: null,
      history: [],
      location: "Delhi",
    });
    await generateOnboardingPlanApi({});
    await saveOnboardingProfileApi({});
    await saveTripProgressApi({ tripPlanId: "t1", roadmapSteps: [], packingItems: [] });
    expect(globalThis.fetch).toHaveBeenCalledTimes(12);

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: { code: "BAD_REQUEST", message: "Bad coords" } }),
        { status: 400 }
      )
    ) as unknown as typeof fetch;
    await expect(fetchUserStatus()).rejects.toThrow("Bad coords");

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Legacy fail" }), { status: 500 })
    ) as unknown as typeof fetch;
    await expect(fetchUserStatus()).rejects.toThrow("Legacy fail");
  });

  it("validation and logger utilities sanitize inputs cleanly", () => {
    expect(enumerateDates("2026-12-01", "2026-12-03")).toEqual([
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
    ]);
    expect(getPeriodName(8)).toBe("morning");
    expect(getPeriodName(14)).toBe("afternoon");
    expect(getPeriodName(19)).toBe("evening");
    expect(getPeriodName(23)).toBe("night");

    expect(
      validateTripPlanRequest(
        [{ name: "Jaipur", lat: 26.9, lng: 75.7 }],
        "2026-12-01",
        "2026-12-02"
      ).ok
    ).toBe(true);
    expect(validateTripPlanRequest([], "2026-12-01", "2026-12-02").ok).toBe(false);
    expect(
      validateTripPlanRequest(
        [{ name: "Bad", lat: 120, lng: 75 }],
        "2026-12-01",
        "2026-12-02"
      ).ok
    ).toBe(false);
    expect(
      validateTripPlanRequest(
        [{ name: "Rev", lat: 26.9, lng: 75.7 }],
        "2026-12-10",
        "2026-12-02"
      ).ok
    ).toBe(false);
    expect(
      validateTripPlanRequest(
        [{ name: "Fmt", lat: 26.9, lng: 75.7 }],
        "invalid",
        "2026-12-02"
      ).ok
    ).toBe(false);

    expect(sanitizeBooleanMap({ ok: true, off: 0 })).toEqual({ ok: true, off: false });
    expect(sanitizeBooleanMap(null)).toBeNull();
    expect(sanitizeBooleanMap(["bad"])).toBeNull();
    expect(isAllowedImageMime("image/png")).toBe(true);
    expect(isAllowedImageMime("text/html")).toBe(false);
    expect(isAllowedImageMime(undefined)).toBe(false);
    expect(normalizeLanguage("hi")).toBe("hi");
    expect(normalizeLanguage("unknown")).toBe("en");
    expect(sanitizeTextField(undefined, 20, "fallback")).toBe("fallback");
    expect(sanitizeTextField("  hello\nworld  ", 20, "fallback")).toBe("hello world");
    expect(sanitizeChatHistory([{ sender: "user", text: "hi" }, { sender: "ai", text: "ok" }])).toContain("Resident: hi");
    expect(sanitizeChatHistory("not-array")).toBe("");
    expect(sanitizeHouseholdProfile("bad")).toBeUndefined();
    expect(sanitizeHouseholdProfile({ vulnerabilities: ["children"], commute: "metro", indoorSetup: "purifier", windows: { morning: false, commute: true, evening: false } })).toBeTruthy();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.warn("warn msg");
    logger.error("err msg");
    logger.info("info msg");
    expect(warnSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });
});
