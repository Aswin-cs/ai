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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }),
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
    apiMocks.fetchUserStatus.mockResolvedValue({
      authenticated: true,
      inDb: false,
      onboardingCompleted: false,
      hasAiEvaluation: false,
      user: null,
    });
    apiMocks.fetchTripPlansApi.mockResolvedValue({ success: true, tripPlans: [] });

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
});
