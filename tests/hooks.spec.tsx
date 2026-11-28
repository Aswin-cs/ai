import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { chatReducer, initialChatState } from "@/hooks/chatReducer";
import { initialOnboardingState, onboardingReducer } from "@/hooks/onboardingReducer";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useChat } from "@/hooks/useChat";
import { useDashboardUi } from "@/hooks/useDashboardUi";
import { useOnboardingForm } from "@/hooks/useOnboardingForm";
import { usePlan } from "@/hooks/usePlan";

const routerReplaceMock = vi.fn();
const routerPushMock = vi.fn();
const routerMock = { replace: routerReplaceMock, push: routerPushMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const apiMocks = vi.hoisted(() => ({
  fetchAirQualityTelemetry: vi.fn(),
  fetchTripPlansApi: vi.fn(),
  fetchUserStatus: vi.fn(),
  generateOnboardingPlanApi: vi.fn(),
  generateTripPlanApi: vi.fn(),
  recalibrateAirPlanApi: vi.fn(),
  saveOnboardingProfileApi: vi.fn(),
  savePlanProgressApi: vi.fn(),
  sendChatMessageApi: vi.fn(),
  deleteTripPlanApi: vi.fn(),
}));

const aqLibMocks = vi.hoisted(() => ({
  fetchCurrentOpenMeteoAq: vi.fn(),
  searchOsmPlaces: vi.fn(),
  reverseGeocodeOsm: vi.fn(),
}));

vi.mock("@/lib/api", () => apiMocks);

vi.mock("@/lib/airQuality", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/airQuality")>();
  return {
    ...actual,
    fetchCurrentOpenMeteoAq: aqLibMocks.fetchCurrentOpenMeteoAq,
    searchOsmPlaces: aqLibMocks.searchOsmPlaces,
    reverseGeocodeOsm: aqLibMocks.reverseGeocodeOsm,
  };
});

vi.mock("@/lib/sound", () => ({
  playAiResponseSound: vi.fn(),
}));

describe("Custom React Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("useAirQuality loads telemetry timeline, syncs profile, handles errors, and aborts on unmount", async () => {
    const abortSignals: AbortSignal[] = [];
    apiMocks.fetchAirQualityTelemetry.mockImplementation(
      (_lat: number, _lng: number, signal?: AbortSignal) => {
        if (signal) abortSignals.push(signal);
        return Promise.resolve({
          success: true,
          current: { usAqi: 165, pm25: 78.4, pm10: 120.2, no2: 33.1 },
          hourly: {
            time: ["2026-12-05T10:00", "2026-12-05T11:00"],
            us_aqi: [165, 140],
            pm2_5: [78.4, 62.0],
            pm10: [120.2, 95.0],
          },
        });
      }
    );

    const onSync = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAirQuality({ lat: 28.61, lng: 77.2 }, onSync)
    );

    await waitFor(() => {
      expect(result.current.hourlyTimeline.length).toBe(2);
    });
    expect(result.current.hourlyTimeline[0].aqi).toBe(165);
    expect(onSync).toHaveBeenCalled();

    // Error branch does not throw
    apiMocks.fetchAirQualityTelemetry.mockRejectedValueOnce(new Error("Network error"));
    await act(async () => {
      await result.current.fetch12HrTimeline(28.61, 77.2);
    });
    expect(result.current.isLoadingTimeline).toBe(false);

    unmount();
    expect(abortSignals.some((s) => s.aborted)).toBe(true);
  });

  it("usePlan redirects un-onboarded users, hydrates active evaluation, and aborts on unmount", async () => {
    const capturedSignals: AbortSignal[] = [];
    apiMocks.fetchUserStatus.mockImplementation((signal?: AbortSignal) => {
      if (signal) capturedSignals.push(signal);
      return Promise.resolve({
        authenticated: true,
        inDb: true,
        onboardingCompleted: true,
        hasAiEvaluation: true,
        user: {
          id: "u1",
          name: "Riya",
          email: "riya@example.com",
          defaultLocation: { name: "Delhi, India", lat: 28.61, lng: 77.2 },
          householdProfile: { vulnerabilities: ["children"], commute: "metro", indoorSetup: "purifier" },
          latestAiEvaluation: {
            modelUsed: "gemini-3.8-flash",
            telemetry: { aqi: 205, pm25: 110, pm10: 170, no2: 38 },
            aiPlan: {
              status: { risk_level: "high", headline: "Poor morning air", plain_explanation: "Limit rush hour", main_concern: "pm25" },
            },
            progress: { roadmap: { s1: true }, indoorChecklist: {} },
          },
        },
      });
    });
    apiMocks.fetchTripPlansApi.mockResolvedValue({ success: true, tripPlans: [] });
    apiMocks.savePlanProgressApi.mockResolvedValue({ success: true });

    const { result, unmount } = renderHook(() => usePlan("authenticated"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.needsOnboarding).toBe(false);
    expect(result.current.userProfile.location).toBe("Delhi, India");
    expect(result.current.aiPlan?.status?.risk_level).toBe("high");

    await act(async () => {
      await result.current.handleSaveProgress();
    });
    expect(apiMocks.savePlanProgressApi).toHaveBeenCalledTimes(1);

    apiMocks.fetchAirQualityTelemetry.mockResolvedValueOnce({
      success: true,
      current: { usAqi: 180, pm25: 90, pm10: 140, no2: 32 },
    });
    apiMocks.recalibrateAirPlanApi.mockResolvedValueOnce({
      success: true,
      data: { status: { risk_level: "high", headline: "Recalibrated", plain_explanation: "Updated", main_concern: "pm25" } },
      telemetry: { aqi: 180, pollutants: { pm25: 90, pm10: 140, no2: 32 } },
    });
    await act(async () => {
      await result.current.handleRecalibratePlan([], async () => {}, "hi");
    });
    expect(apiMocks.recalibrateAirPlanApi).toHaveBeenCalled();

    apiMocks.generateTripPlanApi.mockResolvedValueOnce({
      success: true,
      tripPlanId: "trip-new",
      plan: { trip_summary: { title: "Manali", start: "2026-12-05", end: "2026-12-06", duration_days: 2, overall_risk: "low", headline: "Ok", top_advice: [] }, places_overview: [], days: [], alerts: [], better_options: [], packing_list: [], roadmap: [], impact_summary: { headline: "Ok", estimated_exposure_reduction_pct: 30, assumptions_note: "Test" }, assumptions: [], safety_note: "Note", data_confidence: "medium" },
    });
    apiMocks.deleteTripPlanApi.mockResolvedValueOnce({ success: true });
    await act(async () => {
      const tripRes = await result.current.submitTripPlan({
        destinations: [{ name: "Manali", fullName: "Manali, HP", lat: 32.2, lng: 77.1, usAqi: 45, pm25: 12, pm10: 20, no2: 10, ozone: 25, categoryLabel: "Good" }],
        startDate: "2026-12-05",
        startTime: "09:00",
        endDate: "2026-12-06",
      });
      expect(tripRes.ok).toBe(true);
    });
    await act(async () => {
      await result.current.deleteTripPlan("trip-new");
    });
    expect(apiMocks.deleteTripPlanApi).toHaveBeenCalledWith("trip-new");

    // Error paths for trip plan & unauthenticated status
    apiMocks.generateTripPlanApi.mockRejectedValueOnce(new Error("AI quota exceeded"));
    await act(async () => {
      const failRes = await result.current.submitTripPlan({
        destinations: [{ name: "Jaipur", fullName: "Jaipur, RJ", lat: 26.9, lng: 75.7, usAqi: 120, pm25: 40, pm10: 70, no2: 20, ozone: 28, categoryLabel: "Moderate" }],
        startDate: "2026-12-05",
        startTime: "09:00",
        endDate: "2026-12-06",
      });
      expect(failRes.ok).toBe(false);
    });

    unmount();
    expect(capturedSignals.some((s) => s.aborted)).toBe(true);

    const { result: unauthResult } = renderHook(() => usePlan("unauthenticated"));
    await waitFor(() => {
      expect(unauthResult.current.isLoading).toBe(false);
    });
  });

  it("usePlan redirects un-onboarded users to /onboarding", async () => {
    apiMocks.fetchUserStatus.mockResolvedValueOnce({
      authenticated: true,
      inDb: false,
      onboardingCompleted: false,
      hasAiEvaluation: false,
      user: null,
    });
    apiMocks.fetchTripPlansApi.mockResolvedValueOnce({ success: true, tripPlans: [] });

    const { result } = renderHook(() => usePlan("authenticated"));
    await waitFor(() => {
      expect(result.current.needsOnboarding).toBe(true);
    });
    expect(routerReplaceMock).toHaveBeenCalledWith("/onboarding");
  });

  it("useChat initializes greeting, sends chat message, falls back cleanly on API failure, and validates image uploads", async () => {
    apiMocks.sendChatMessageApi.mockResolvedValueOnce({
      success: true,
      reply: "Air is hazardous now; wear an N95.",
      tag: "Delhi Live",
      suggestPlanningMode: true,
    });

    const { result } = renderHook(() =>
      useChat({
        userProfile: { location: "Delhi, India", aqi: 280, pollutants: { pm25: 140, pm10: 210, no2: 40 } },
        aiPlan: null,
        hourlyTimeline: [],
        activeTripPlan: {
          destinations: [{ name: "Jaipur", fullName: "Jaipur, India", lat: 26.9, lng: 75.7, usAqi: 130, pm25: 45, pm10: 80, no2: 20, ozone: 30, categoryLabel: "Sensitive" }],
          startDate: "2026-12-05",
          startTime: "09:00",
          endDate: "2026-12-06",
        },
      })
    );

    await waitFor(() => {
      expect(result.current.state.messages.length).toBe(1);
    });

    act(() => {
      result.current.dispatch({ type: "SET_PLANNING_MODE", enabled: true });
      result.current.dispatch({
        type: "SET_IMAGE",
        image: { data: "data:image/png;base64,AA==", mimeType: "image/png", name: "smog.png", size: 120 },
      });
    });
    await act(async () => {
      await result.current.handleSendChat(undefined, "Need an N95?");
    });
    expect(result.current.state.messages.length).toBe(3);
    expect(result.current.state.messages[2].text).toContain("wear an N95");
    expect(result.current.state.messages[2].suggestPlanningMode).toBe(true);

    apiMocks.fetchTripPlansApi.mockResolvedValueOnce({ success: true, tripPlans: [], page: 1, totalPages: 1, total: 0 });
    await act(async () => {
      await result.current.fetchPaginatedTrips(1);
    });
    expect(apiMocks.fetchTripPlansApi).toHaveBeenCalledWith({ page: 1, limit: 3 });

    // Oversized image triggers error
    const bigFile = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });
    act(() => {
      result.current.handleChatImageSelect({
        target: { files: [bigFile], value: "C:\\huge.png" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.state.imageError).toContain("5 MB");

    // Non-image upload triggers error
    const badFile = new File(["txt"], "notes.txt", { type: "text/plain" });
    act(() => {
      result.current.handleChatImageSelect({
        target: { files: [badFile], value: "C:\\notes.txt" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.state.imageError).toContain("image file");

    // API error falls back cleanly to local grounded telemetry guidance
    apiMocks.sendChatMessageApi.mockRejectedValueOnce(new Error("Rate limit exceeded"));
    await act(async () => {
      await result.current.handleSendChat(undefined, "Any alternative?");
    });
    const fallbackReply = result.current.state.messages[result.current.state.messages.length - 1];
    expect(fallbackReply.text).toContain("Current AQI in Delhi is 280");
    expect(fallbackReply.tag).toBe("Delhi Grounded Telemetry");

    // Empty message in standard mode without image does nothing
    act(() => {
      result.current.dispatch({ type: "SET_PLANNING_MODE", enabled: false });
      result.current.dispatch({ type: "SET_IMAGE", image: null });
    });
    const msgCountBeforeEmpty = result.current.state.messages.length;
    await act(async () => {
      await result.current.handleSendChat(undefined, "   ", null);
    });
    expect(result.current.state.messages.length).toBe(msgCountBeforeEmpty);

    // Escape closes wizard first, then dialog
    act(() => {
      result.current.dispatch({ type: "SET_OPEN", open: true });
      result.current.dispatch({ type: "SET_PLANNING_MODE", enabled: true, showWizard: true });
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.state.showPlanningWizard).toBe(false);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.state.chatOpen).toBe(false);
  });

  it("useOnboardingForm hydrates existing profile, fetches Open-Meteo AQ, and saves new evaluation", async () => {
    apiMocks.fetchUserStatus.mockResolvedValue({
      authenticated: true,
      inDb: true,
      onboardingCompleted: true,
      hasAiEvaluation: true,
      user: {
        id: "u1",
        name: "Dev",
        email: "dev@example.com",
        defaultLocation: { name: "Pune, India", lat: 18.52, lng: 73.85 },
        householdProfile: { vulnerabilities: ["adult"], commute: "wfh", indoorSetup: "natural" },
      },
    });
    apiMocks.fetchAirQualityTelemetry.mockResolvedValue({
      success: true,
      source: "Open-Meteo",
      current: { usAqi: 74, pm25: 22.1, pm10: 41.0, no2: 18.0, ozone: 30, co: 300, so2: 6 },
    });
    apiMocks.generateOnboardingPlanApi.mockResolvedValue({
      success: true,
      data: { status: { risk_level: "moderate", headline: "Moderate air", plain_explanation: "Fine", main_concern: "pm25" } },
      modelUsed: "gemini-3.8-flash",
    });
    apiMocks.saveOnboardingProfileApi.mockResolvedValue({ success: true });

    const { result, unmount } = renderHook(() =>
      useOnboardingForm({ userEmail: "dev@example.com", authStatus: "authenticated" })
    );

    await waitFor(() => {
      expect(result.current.state.isCheckingUserStatus).toBe(false);
    });
    expect(result.current.state.locationQuery).toBe("Pune, India");

    await act(async () => {
      await result.current.handleNextStep();
    });
    expect(result.current.state.currentStep).toBe(2);

    await act(async () => {
      await result.current.handleGeneratePlan();
    });
    expect(apiMocks.saveOnboardingProfileApi).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.handleMapLocationChange(28.5, 77.1);
    });
    act(() => {
      result.current.handleSelectOsmPlace({
        place_id: 22,
        display_name: "Koramangala, Bengaluru, Karnataka, India",
        lat: "12.935",
        lon: "77.624",
        address: { suburb: "Koramangala", city: "Bengaluru" },
      });
    });
    expect(result.current.state.locationQuery).toContain("Koramangala");

    // GPS detect success & permission denied paths
    aqLibMocks.reverseGeocodeOsm.mockResolvedValueOnce({
      display_name: "Indiranagar, Bengaluru",
      address: { suburb: "Indiranagar", city: "Bengaluru" },
    });
    Object.assign(navigator, {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 12.97, longitude: 77.64 } } as GeolocationPosition),
      },
    });
    await act(async () => {
      result.current.handleDetectLocation();
    });
    Object.assign(navigator, {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    });
    act(() => {
      result.current.handleDetectLocation();
    });
    expect(result.current.state.gpsError).toContain("permission denied");

    Object.assign(navigator, {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 2, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    });
    act(() => {
      result.current.handleDetectLocation();
    });
    expect(result.current.state.gpsError).toContain("unavailable");

    Object.assign(navigator, {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    });
    act(() => {
      result.current.handleDetectLocation();
    });
    expect(result.current.state.gpsError).toContain("timed out");

    // CPCB telemetry branch
    apiMocks.fetchAirQualityTelemetry.mockResolvedValueOnce({
      success: true,
      source: "CPCB",
      station: { name: "Anand Vihar", distanceKm: 2.4 },
      current: { usAqi: 295, pm25: 148, pm10: 220, no2: 44, ozone: 30, co: 600, so2: 12 },
    });
    const cpcbAq = await result.current.fetchOpenMeteoAirQuality(28.65, 77.31);
    expect(cpcbAq?.usAqi).toBe(295);

    // Fallback telemetry when API throws and Open-Meteo returns null
    apiMocks.fetchAirQualityTelemetry.mockRejectedValue(new Error("Offline"));
    aqLibMocks.fetchCurrentOpenMeteoAq.mockResolvedValue(null);
    let fallbackAq: Awaited<ReturnType<typeof result.current.fetchOpenMeteoAirQuality>> | undefined;
    await act(async () => {
      fallbackAq = await result.current.fetchOpenMeteoAirQuality(28.61, 77.2);
    });
    expect(fallbackAq?.usAqi).toBe(168);

    // Non-CPCB Open-Meteo fallback branch & rural coordinates branch
    aqLibMocks.fetchCurrentOpenMeteoAq.mockResolvedValueOnce({
      usAqi: 42,
      europeanAqi: 21,
      pm25: 11,
      pm10: 22,
      no2: 12,
      ozone: 28,
      co: 200,
      so2: 4,
    });
    let ruralAq: Awaited<ReturnType<typeof result.current.fetchOpenMeteoAirQuality>> | undefined;
    await act(async () => {
      ruralAq = await result.current.fetchOpenMeteoAirQuality(10.5, 76.2);
    });
    expect(ruralAq?.usAqi).toBe(42);

    // handleGeneratePlan falls back cleanly when AI call notices an error
    apiMocks.generateOnboardingPlanApi.mockRejectedValueOnce(new Error("Plan gen error"));
    await act(async () => {
      await result.current.handleGeneratePlan();
    });
    expect(result.current.state.isOnboardingSaved).toBe(true);

    unmount();
  });

  it("useDashboardUi and reducer edge cases manage UI tabs, copy notice, and state transitions", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    const { result } = renderHook(() => useDashboardUi());
    act(() => {
      result.current.setActiveTab("roadmap");
      result.current.setRoadmapPhaseFilter("now");
      result.current.copyCommunityNote("Car-free Zone");
      result.current.copyCommunityNote(undefined);
    });
    expect(result.current.activeTab).toBe("roadmap");
    expect(result.current.roadmapPhaseFilter).toBe("now");
    expect(writeTextMock).toHaveBeenCalledWith("Car-free Zone");

    // chatReducer transitions
    let cs = chatReducer(initialChatState, { type: "TOGGLE_OPEN" });
    cs = chatReducer(cs, { type: "TOGGLE_EXPANDED" });
    cs = chatReducer(cs, { type: "SET_IMAGE", image: { data: "x", mimeType: "image/png", name: "a.png", size: 10 } });
    cs = chatReducer(cs, { type: "SET_IMAGE_ERROR", error: "Too big" });
    cs = chatReducer(cs, { type: "APPEND_MESSAGE", message: { sender: "user", text: "Hi", time: "Now" } });
    cs = chatReducer(cs, { type: "INIT_GREETING", message: { sender: "ai", text: "Ignored", time: "Now" } });
    cs = chatReducer(cs, { type: "START_REPLY", clearDraft: false });
    cs = chatReducer(cs, { type: "FINISH_REPLY" });
    cs = chatReducer(cs, { type: "SET_SHOW_WIZARD", show: true });
    cs = chatReducer(cs, { type: "SET_ADDING_TRIP", adding: false });
    cs = chatReducer(cs, { type: "START_LOADING_TRIP_PICKER" });
    cs = chatReducer(cs, { type: "SET_TRIP_PICKER_DATA", trips: [], page: 1, totalPages: 1, total: 0 });
    cs = chatReducer(cs, { type: "FINISH_LOADING_TRIP_PICKER" });
    cs = chatReducer(cs, { type: "SELECT_CHAT_TRIP", trip: { _id: "1", title: "T", places: "P", dates: "D" } });
    expect(cs.chatOpen).toBe(true);
    expect(cs.chatExpanded).toBe(true);
    expect(cs.selectedChatTrip?._id).toBe("1");

    // onboardingReducer transitions
    let os = onboardingReducer(initialOnboardingState, { type: "SET_STEP", step: 2 });
    os = onboardingReducer(os, { type: "SET_STATION", station: { name: "CPCB", pm25: "50", temp: "22", distance: "1km" } });
    os = onboardingReducer(os, { type: "SET_SEARCHING_GEOCODE", searching: true });
    os = onboardingReducer(os, { type: "SET_OSM_RESULTS", results: [] });
    os = onboardingReducer(os, { type: "SET_GPS_ERROR", error: "Err" });
    os = onboardingReducer(os, { type: "SET_FETCHING_AQ", fetching: false });
    os = onboardingReducer(os, { type: "TOGGLE_VULNERABILITY", key: "seniors" });
    os = onboardingReducer(os, { type: "TOGGLE_VULNERABILITY", key: "seniors" });
    os = onboardingReducer(os, { type: "SET_COMMUTE", commute: "metro" });
    os = onboardingReducer(os, { type: "SET_INDOOR_SETUP", setup: "purifier" });
    os = onboardingReducer(os, { type: "SET_CUSTOM_WINDOW_INPUT", value: "Evening walk" });
    os = onboardingReducer(os, { type: "ADD_CUSTOM_WINDOW" });
    os = onboardingReducer(os, { type: "REMOVE_CUSTOM_WINDOW", index: 0 });
    os = onboardingReducer(os, { type: "SET_DROPDOWN_OPEN", open: true });
    os = onboardingReducer(os, { type: "SET_SELECTED_INDEX", index: 1 });
    os = onboardingReducer(os, { type: "SET_EDITING_PROFILE", editing: true, step: 1 });
    os = onboardingReducer(os, { type: "SET_SUBMITTING", submitting: true });
    os = onboardingReducer(os, { type: "SET_ONBOARDING_SAVED", saved: true });
    expect(os.isEditingProfile).toBe(true);
    expect(os.commute).toBe("metro");
  });

  it("useAirQuality skips missing coords, falls back across time/AQI/storage branches, and ignores stale responses", async () => {
    const onSync = vi.fn();
    const { result: missingResult } = renderHook(() => useAirQuality(undefined, onSync));
    expect(missingResult.current.hourlyTimeline).toEqual([]);
    expect(apiMocks.fetchAirQualityTelemetry).not.toHaveBeenCalled();

    // Exact current time prefix match, missing current.usAqi, localStorage error resilience, and empty-time fallback
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    apiMocks.fetchAirQualityTelemetry.mockResolvedValueOnce({
      success: true,
      current: { time: "2020-01-01T09:00", pm25: 44.2 },
      hourly: {
        time: ["2020-01-01T08:00", "2020-01-01T09:00", "2020-01-01T10:00"],
        us_aqi: [120, 138, 110],
        pm2_5: [40, 44.2, 35],
        pm10: [80, 92, 70],
      },
    });

    const { result } = renderHook(() => useAirQuality({ lat: 28.61, lng: 77.2 }, onSync));
    await waitFor(() => {
      expect(result.current.hourlyTimeline.length).toBe(2);
    });
    expect(result.current.hourlyTimeline[0].label).toBe("Now");
    expect(result.current.hourlyTimeline[0].aqi).toBe(138);
    setItemSpy.mockRestore();

    // Past timestamps where findIndex falls back to index 0
    apiMocks.fetchAirQualityTelemetry.mockResolvedValueOnce({
      success: true,
      current: {},
      hourly: {
        time: ["2020-01-01T01:00"],
        us_aqi: [76],
        pm2_5: [21],
        pm10: [42],
      },
    });
    await act(async () => {
      await result.current.fetch12HrTimeline(19.07, 72.87);
    });
    expect(result.current.hourlyTimeline[0].aqi).toBe(76);

    // Stale concurrent request gets superseded without overwriting timeline
    let resolveFirst: ((v: unknown) => void) | undefined;
    apiMocks.fetchAirQualityTelemetry.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFirst = res;
        })
    );
    apiMocks.fetchAirQualityTelemetry.mockResolvedValueOnce({
      success: true,
      current: { usAqi: 55, pm25: 15, pm10: 25, no2: 12 },
      hourly: { time: [] },
    });

    let p1!: Promise<void>;
    let p2!: Promise<void>;
    act(() => {
      p1 = result.current.fetch12HrTimeline(12.97, 77.59);
      p2 = result.current.fetch12HrTimeline(13.08, 80.27);
    });
    resolveFirst?.({
      success: true,
      current: { usAqi: 499 },
      hourly: { time: ["2026-12-05T10:00"], us_aqi: [499], pm2_5: [250], pm10: [300] },
    });
    await act(async () => {
      await Promise.all([p1, p2]);
    });
    expect(result.current.hourlyTimeline[0].aqi).toBe(76);

    // AbortError branch is swallowed silently
    apiMocks.fetchAirQualityTelemetry.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    await act(async () => {
      await result.current.fetch12HrTimeline(22.57, 88.36);
    });
    expect(result.current.isLoadingTimeline).toBe(false);
  });

  it("usePlan hydrates localStorage cache, handles recalibration fallbacks, trip mutations, and error paths", async () => {
    localStorage.setItem("vayupulse_user_profile", "{bad json");
    localStorage.setItem("vayupulse_active_plan", JSON.stringify({ data: { safeOutdoorWindow: { startTime: "13:00", endTime: "15:00" }, status: { risk_level: "moderate", headline: "Cached", plain_explanation: "Ok", main_concern: "pm25" } } }));

    apiMocks.fetchUserStatus.mockResolvedValueOnce({
      authenticated: true,
      inDb: true,
      onboardingCompleted: true,
      hasAiEvaluation: true,
      user: {
        id: "u2",
        name: "Kabir",
        email: "kabir@example.com",
        defaultLocation: { name: "Mumbai, India" },
        householdProfile: { vulnerabilities: ["seniors"], commute: "car", indoorSetup: "natural" },
        latestAiEvaluation: {
          modelUsed: "gemini-3.8-flash",
          telemetry: { aqi: 92 },
          aiPlan: JSON.stringify({
            data: {
              priorityAdvisory: { headline: "Check haze" },
              status: { risk_level: "moderate", headline: "String plan", plain_explanation: "Ok", main_concern: "pm10" },
            },
          }),
          progress: { roadmap: { r1: true }, indoorChecklist: { "check-0": true } },
        },
      },
    });
    apiMocks.fetchTripPlansApi.mockResolvedValueOnce({
      success: true,
      tripPlan: {
        _id: "legacy-trip",
        destinations: [{ name: "Lonavala", fullName: "Lonavala, MH", lat: 18.75, lng: 73.4, usAqi: 60, pm25: 18, pm10: 30, no2: 12, ozone: 24, categoryLabel: "Moderate" }],
        startDate: "2026-12-10",
        startTime: "08:00",
        endDate: "2026-12-11",
      },
    });

    const { result } = renderHook(() => usePlan("authenticated"));
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.aiPlan?.status?.headline).toBe("String plan");
    expect(result.current.openTripPlanId).toBe("legacy-trip");
    expect(result.current.activeTripPlan?.destinations[0].name).toBe("Lonavala");

    // Save progress failure branch
    apiMocks.savePlanProgressApi.mockRejectedValueOnce(new Error("DB timeout"));
    await act(async () => {
      await result.current.handleSaveProgress();
    });
    expect(result.current.isSavingProgress).toBe(false);
    expect(result.current.progressSaved).toBe(false);

    // Recalibrate falling back to fetchCurrentOpenMeteoAq, then failing telemetry entirely
    apiMocks.fetchAirQualityTelemetry.mockRejectedValueOnce(new Error("Telemetry down"));
    aqLibMocks.fetchCurrentOpenMeteoAq.mockResolvedValueOnce({
      usAqi: 122,
      europeanAqi: 60,
      pm25: 44,
      pm10: 80,
      no2: 20,
      ozone: 32,
      co: 400,
      so2: 8,
    });
    apiMocks.recalibrateAirPlanApi.mockResolvedValueOnce({
      success: true,
      data: { status: { risk_level: "high", headline: "OpenMeteo fallback", plain_explanation: "Ok", main_concern: "pm25" } },
    });
    await act(async () => {
      await result.current.handleRecalibratePlan(
        [{ time: "2026-12-05T10:00", label: "Now", aqi: 122, pm25: 44, pm10: 80, isNow: true }],
        async () => {}
      );
    });
    expect(result.current.aiPlan?.status?.headline).toBe("OpenMeteo fallback");

    // Recalibrate rejection catch
    apiMocks.fetchAirQualityTelemetry.mockRejectedValueOnce(new Error("Down"));
    aqLibMocks.fetchCurrentOpenMeteoAq.mockRejectedValueOnce(new Error("Also down"));
    apiMocks.recalibrateAirPlanApi.mockRejectedValueOnce(new Error("Gemini error"));
    await act(async () => {
      await result.current.handleRecalibratePlan([], async () => {});
    });
    expect(result.current.isRecalibrating).toBe(false);

    // Submit trip with non-Error rejection fallback + delete non-active ID with failing delete API
    apiMocks.generateTripPlanApi.mockRejectedValueOnce("string error");
    await act(async () => {
      const res = await result.current.submitTripPlan({
        destinations: [{ name: "Goa", fullName: "Goa", lat: 15.29, lng: 74.12, usAqi: 45, pm25: 12, pm10: 22, no2: 10, ozone: 20, categoryLabel: "Good" }],
        startDate: "2026-12-20",
        startTime: "10:00",
        endDate: "2026-12-22",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBe("Failed to generate trip plan");
    });

    apiMocks.deleteTripPlanApi.mockRejectedValueOnce(new Error("Network error"));
    await act(async () => {
      await result.current.deleteTripPlan("legacy-trip");
    });
    expect(result.current.openTripPlanId).toBeNull();

    // Error handling in fetchUserStatus during loading -> non-abort error branch
    apiMocks.fetchUserStatus.mockRejectedValueOnce(new Error("500 Server Error"));
    apiMocks.fetchTripPlansApi.mockRejectedValueOnce(new Error("Trip fetch err"));
    const { result: errResult } = renderHook(() => usePlan("authenticated"));
    await waitFor(() => {
      expect(errResult.current.isLoading).toBe(false);
    });
  });

  it("useChat covers empty location defaults, moderate fallback, FileReader load/error, and trip fetch errors", async () => {
    const { result } = renderHook(() =>
      useChat({
        userProfile: { location: "" },
        aiPlan: null,
        hourlyTimeline: [],
        activeTripPlan: null,
      })
    );
    expect(result.current.state.messages.length).toBe(0);

    // Missing file early return
    act(() => {
      result.current.handleChatImageSelect({
        target: { files: [], value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.state.image).toBeNull();

    // Valid small image onload + FileReader onerror branches via mocked FileReader
    const OriginalFileReader = globalThis.FileReader;
    let lastReader: { onload?: () => void; onerror?: () => void; result?: string } | null = null;
    class MockFileReader {
      result = "data:image/jpeg;base64,ZmFrZQ==";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        lastReader = this as unknown as { onload?: () => void; onerror?: () => void; result?: string };
      }
    }
    vi.stubGlobal("FileReader", MockFileReader);

    const okFile = new File(["ok"], "sky.jpg", { type: "image/jpeg" });
    act(() => {
      result.current.handleChatImageSelect({
        target: { files: [okFile], value: "sky.jpg" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => {
      lastReader?.onload?.();
    });
    expect(result.current.state.image?.name).toBe("sky.jpg");

    act(() => {
      result.current.handleChatImageSelect({
        target: { files: [okFile], value: "sky2.jpg" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    act(() => {
      lastReader?.onerror?.();
    });
    expect(result.current.state.imageError).toBe("Failed to read image file.");
    vi.stubGlobal("FileReader", OriginalFileReader);

    // Send attached image with empty text & missing reply/tag in API response -> uses defaults
    apiMocks.sendChatMessageApi.mockResolvedValueOnce({ success: true });
    await act(async () => {
      await result.current.handleSendChat(undefined, undefined, null);
    });
    expect(result.current.state.messages[0].text).toBe("Analyze this image");
    expect(result.current.state.messages[1].text).toContain("Analysis complete based on local air telemetry");

    // Moderate AQI fallback (< 250) on API error
    const { result: modResult } = renderHook(() =>
      useChat({
        userProfile: { location: "Pune, India", aqi: 90 },
        aiPlan: null,
        hourlyTimeline: [],
        activeTripPlan: null,
      })
    );
    await waitFor(() => {
      expect(modResult.current.state.messages.length).toBe(1);
    });
    apiMocks.sendChatMessageApi.mockRejectedValueOnce(new Error("Down"));
    await act(async () => {
      await modResult.current.handleSendChat({ preventDefault: vi.fn() } as unknown as React.FormEvent, "Jog?", null);
    });
    expect(modResult.current.state.messages[modResult.current.state.messages.length - 1].text).toContain("within moderate limits");

    // Non-array tripPlans and fetch error
    apiMocks.fetchTripPlansApi.mockRejectedValueOnce(new Error("Trip list error"));
    await act(async () => {
      await modResult.current.fetchPaginatedTrips();
    });
    expect(modResult.current.state.isLoadingTripPicker).toBe(false);

    // Escape closes opened chat when wizard is closed
    act(() => {
      modResult.current.dispatch({ type: "SET_OPEN", open: true });
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(modResult.current.state.chatOpen).toBe(false);
  });

  it("useOnboardingForm covers debounced search, pageshow, outside click, GPS fallbacks, and submit error paths", async () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    apiMocks.fetchUserStatus.mockResolvedValueOnce({
      authenticated: true,
      inDb: true,
      onboardingCompleted: true,
      hasAiEvaluation: true,
      user: {
        id: "u9",
        name: "Meera",
        email: "meera@example.com",
        defaultLocation: { name: "Jaipur, India", lat: 26.91, lng: 75.78 },
        householdProfile: {
          vulnerabilities: ["children"],
          commute: "bike",
          indoorSetup: "ac",
          windows: { morning: false, commute: true, evening: false, custom: "Park", customList: ["Park"] },
        },
      },
    });
    apiMocks.fetchAirQualityTelemetry.mockResolvedValue({
      success: true,
      source: "Open-Meteo",
      current: { usAqi: 85 },
    });
    aqLibMocks.searchOsmPlaces.mockResolvedValue([
      { place_id: 1, display_name: "C Scheme, Jaipur, Rajasthan", lat: "26.91", lon: "75.79" },
    ]);

    const { result } = renderHook(() =>
      useOnboardingForm({ userEmail: "meera@example.com", authStatus: "authenticated" })
    );
    await waitFor(() => {
      expect(result.current.state.isCheckingUserStatus).toBe(false);
    });

    // pageshow persisted resets submitting, mousedown outside closes dropdown
    act(() => {
      result.current.dispatch({ type: "SET_SUBMITTING", submitting: true });
      result.current.dispatch({ type: "SET_DROPDOWN_OPEN", open: true });
    });
    const ev = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(ev, "persisted", { value: true });
    act(() => {
      window.dispatchEvent(ev);
    });
    expect(result.current.state.isSubmitting).toBe(false);

    // Debounced OSM search triggers after 320ms
    act(() => {
      result.current.dispatch({ type: "SET_LOCATION_QUERY", query: "Indira", clearResults: false });
    });
    await waitFor(() => {
      expect(aqLibMocks.searchOsmPlaces).toHaveBeenCalledWith("Indira", "in");
    });

    // Place selection with empty address object uses display_name slices
    act(() => {
      result.current.handleSelectOsmPlace({
        place_id: 2,
        display_name: "Connaught Place, New Delhi, Delhi, India",
        lat: "28.63",
        lon: "77.21",
      });
    });
    expect(result.current.state.locationQuery).toContain("Connaught Place");

    // Map change & GPS reverse geocode null fallback
    aqLibMocks.reverseGeocodeOsm.mockResolvedValueOnce(null);
    await act(async () => {
      await result.current.handleMapLocationChange(20.5, 78.9);
    });
    expect(result.current.state.locationQuery).toContain("Custom Pin");

    // Missing geolocation error + unknown error code + GPS null reverse geocode
    const origGeo = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", { value: undefined, configurable: true });
    act(() => {
      result.current.handleDetectLocation();
    });
    expect(result.current.state.gpsError).toContain("not supported");

    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 99, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
      configurable: true,
    });
    act(() => {
      result.current.handleDetectLocation();
    });
    expect(result.current.state.gpsError).toContain("Unable to retrieve device GPS location");

    aqLibMocks.reverseGeocodeOsm.mockResolvedValueOnce({ display_name: "MG Road, Pune, MH, India" });
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 18.52, longitude: 73.85 } } as GeolocationPosition),
      },
      configurable: true,
    });
    await act(async () => {
      result.current.handleDetectLocation();
    });
    expect(result.current.state.locationQuery).toContain("MG Road");
    Object.defineProperty(navigator, "geolocation", { value: origGeo, configurable: true });

    // Latitude fallback tiers (18 < lat <= 26 and lat <= 18) when API & OpenMeteo fail
    apiMocks.fetchAirQualityTelemetry.mockRejectedValue(new Error("Down"));
    aqLibMocks.fetchCurrentOpenMeteoAq.mockResolvedValue(null);
    let midAq!: Awaited<ReturnType<typeof result.current.fetchOpenMeteoAirQuality>>;
    let lowAq!: Awaited<ReturnType<typeof result.current.fetchOpenMeteoAirQuality>>;
    await act(async () => {
      midAq = await result.current.fetchOpenMeteoAirQuality(20.0, 75.0);
      lowAq = await result.current.fetchOpenMeteoAirQuality(12.0, 77.0);
    });
    expect(midAq.usAqi).toBe(112);
    expect(lowAq.usAqi).toBe(54);

    // Custom window input + saveOnboardingProfileApi error caught cleanly
    act(() => {
      result.current.dispatch({ type: "SET_CUSTOM_WINDOW_INPUT", value: "Evening Cycling" });
    });
    apiMocks.generateOnboardingPlanApi.mockResolvedValueOnce({ success: false });
    apiMocks.saveOnboardingProfileApi.mockRejectedValueOnce(new Error("Mongo down"));
    await act(async () => {
      await result.current.handleGeneratePlan();
    });
    expect(result.current.state.isOnboardingSaved).toBe(true);
  });

  it("useDashboardUi handles Escape key and clearClientStorage", () => {
    localStorage.setItem("vayupulse_active_plan", "1");
    localStorage.setItem("vayupulse_user_profile", "2");
    localStorage.setItem("vayupulse_progress", "3");

    const { result } = renderHook(() => useDashboardUi());
    act(() => {
      result.current.setUserMenuOpen(true);
      result.current.setMobileNavOpen(true);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.userMenuOpen).toBe(false);
    expect(result.current.mobileNavOpen).toBe(false);

    act(() => {
      result.current.clearClientStorage();
    });
    expect(localStorage.getItem("vayupulse_active_plan")).toBeNull();
    expect(localStorage.getItem("vayupulse_user_profile")).toBeNull();
    expect(localStorage.getItem("vayupulse_progress")).toBeNull();
  });
});
