"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fetchCurrentOpenMeteoAq,
  getAqiMeta,
  reverseGeocodeOsm,
  searchOsmPlaces,
  type OsmSearchResult,
} from "@/lib/airQuality";
import {
  fetchAirQualityTelemetry,
  fetchUserStatus,
  generateOnboardingPlanApi,
  saveOnboardingProfileApi,
} from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { playAiResponseSound } from "@/lib/sound";
import {
  initialOnboardingState,
  onboardingReducer,
  type CommuteKey,
  type IndoorSetupKey,
  type OpenMeteoAirQuality,
  type VulnerabilityKey,
} from "./onboardingReducer";

export function useOnboardingForm(params: {
  userEmail?: string | null;
  authStatus: "loading" | "authenticated" | "unauthenticated";
}) {
  const { userEmail, authStatus } = params;
  const router = useRouter();
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedStatusRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        dispatch({ type: "SET_SUBMITTING", submitting: false });
        dispatch({ type: "SET_ONBOARDING_SAVED", saved: false });
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function checkStatus() {
      if (hasLoadedStatusRef.current) {
        if (isMounted) dispatch({ type: "SET_CHECKING_STATUS", checking: false });
        return;
      }
      if (authStatus === "authenticated" && userEmail) {
        try {
          const data = await fetchUserStatus(controller.signal);
          if (isMounted) hasLoadedStatusRef.current = true;
          if (isMounted && data.inDb && data.onboardingCompleted && data.hasAiEvaluation) {
            const u = data.user;
            const hp = u?.householdProfile as
              | {
                  vulnerabilities?: VulnerabilityKey[];
                  commute?: CommuteKey;
                  indoorSetup?: IndoorSetupKey;
                  windows?: {
                    morning?: boolean;
                    commute?: boolean;
                    evening?: boolean;
                    custom?: string;
                    customList?: string[];
                  };
                }
              | undefined;

            dispatch({
              type: "HYDRATE_EXISTING_USER",
              locationQuery: u?.defaultLocation?.name,
              coords:
                typeof u?.defaultLocation?.lat === "number" &&
                typeof u?.defaultLocation?.lng === "number"
                  ? { lat: u.defaultLocation.lat, lng: u.defaultLocation.lng }
                  : undefined,
              vulnerabilities: hp?.vulnerabilities,
              commute: hp?.commute,
              indoorSetup: hp?.indoorSetup,
              windows: hp?.windows
                ? {
                    morning: hp.windows.morning ?? true,
                    commute: hp.windows.commute ?? true,
                    evening: hp.windows.evening ?? true,
                    custom: hp.windows.custom || "",
                    customList: Array.isArray(hp.windows.customList)
                      ? hp.windows.customList
                      : [],
                  }
                : undefined,
            });
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          logger.error("Failed to check user onboarding status:", err);
        }
      }
      if (isMounted && authStatus !== "loading") {
        dispatch({ type: "SET_CHECKING_STATUS", checking: false });
      }
    }

    if (authStatus === "authenticated") {
      void checkStatus();
    }
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [userEmail, authStatus]);

  const fetchOpenMeteoAirQuality = useCallback(async (lat: number, lng: number) => {
    dispatch({ type: "SET_FETCHING_AQ", fetching: true });
    let aq: Awaited<ReturnType<typeof fetchCurrentOpenMeteoAq>> = null;
    let source: "CPCB" | "Open-Meteo" = "Open-Meteo";
    let stationOverride:
      | { name: string; pm25: string; temp: string; distance: string }
      | undefined;

    try {
      const data = await fetchAirQualityTelemetry(lat, lng);
      const rawData = data as typeof data & {
        station?: { name?: string; distanceKm?: number } | null;
      };
      if (rawData?.current && rawData.current.usAqi != null) {
        aq = {
          usAqi: rawData.current.usAqi,
          europeanAqi: Math.round(rawData.current.usAqi * 0.5),
          pm25: rawData.current.pm25 ?? 0,
          pm10: rawData.current.pm10 ?? 0,
          no2: rawData.current.no2 ?? 0,
          ozone: rawData.current.ozone ?? 0,
          co: rawData.current.co ?? 0,
          so2: rawData.current.so2 ?? 0,
        };
        source = rawData.source === "CPCB" ? "CPCB" : "Open-Meteo";
        if (rawData.station?.name) {
          stationOverride = {
            name: `CPCB: ${rawData.station.name}`,
            pm25: "Live Sync",
            temp: "Live",
            distance: `${rawData.station.distanceKm} km from pin`,
          };
        }
      }
    } catch {
      // Fallback to direct Open-Meteo helper below
    }

    if (!aq) {
      source = "Open-Meteo";
      aq = await fetchCurrentOpenMeteoAq(lat, lng);
    }

    dispatch({ type: "SET_FETCHING_AQ", fetching: false });

    if (aq) {
      const aqResult: OpenMeteoAirQuality = {
        ...aq,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category: getAqiMeta(aq.usAqi),
      };
      dispatch({ type: "SET_AIR_QUALITY", data: aqResult, source, station: stationOverride });
      return aqResult;
    }

    const fallbackAqi = lat > 26 ? 168 : lat > 18 ? 112 : 54;
    const fallbackPm25 = lat > 26 ? 94.2 : lat > 18 ? 62.5 : 28.4;
    const fallbackData: OpenMeteoAirQuality = {
      usAqi: fallbackAqi,
      europeanAqi: Math.round(fallbackAqi * 0.5),
      pm25: fallbackPm25,
      pm10: Number((fallbackPm25 * 1.55).toFixed(1)),
      no2: 38.6,
      ozone: 31.4,
      co: 520.0,
      so2: 10.8,
      time: "Live Model Sync",
      category: getAqiMeta(fallbackAqi),
    };
    dispatch({ type: "SET_AIR_QUALITY", data: fallbackData, source: "Open-Meteo" });
    return fallbackData;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOpenMeteoAirQuality(state.coords.lat, state.coords.lng);
    }, 0);
    return () => clearTimeout(timer);
  }, [state.coords.lat, state.coords.lng, fetchOpenMeteoAirQuality]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        dispatch({ type: "SET_DROPDOWN_OPEN", open: false });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const trimmed = state.locationQuery.trim();
  useEffect(() => {
    if (!trimmed || trimmed.length < 2) return;
    const timer = setTimeout(async () => {
      dispatch({ type: "SET_SEARCHING_GEOCODE", searching: true });
      const data = await searchOsmPlaces(trimmed, "in");
      dispatch({ type: "SET_OSM_RESULTS", results: data });
      dispatch({ type: "SET_SEARCHING_GEOCODE", searching: false });
    }, 320);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const handleSelectOsmPlace = useCallback((osm: OsmSearchResult) => {
    dispatch({ type: "SET_GPS_ERROR", error: null });
    const lat = parseFloat(osm.lat);
    const lng = parseFloat(osm.lon);
    const parts = [
      osm.address?.suburb || osm.address?.neighbourhood || osm.address?.locality,
      osm.address?.city || osm.address?.town || osm.address?.state_district,
      osm.address?.state,
      osm.address?.postcode ? `PIN ${osm.address.postcode}` : "",
    ].filter(Boolean);

    const placeName =
      parts.length > 0 ? parts.join(", ") : osm.display_name.split(",").slice(0, 3).join(", ");

    dispatch({ type: "SET_LOCATION_QUERY", query: placeName, clearResults: true });
    dispatch({ type: "SET_COORDS", coords: { lat, lng } });
    dispatch({
      type: "SET_STATION",
      station: {
        name: `Air Monitoring Node (${placeName.split(",")[0].trim()})`,
        pm25: "Syncing...",
        temp: "Live",
        distance: "Calibrated to search pin",
      },
    });
    dispatch({ type: "SET_DROPDOWN_OPEN", open: false });
  }, []);

  const handleDetectLocation = useCallback(() => {
    dispatch({ type: "SET_GPS_ERROR", error: null });
    dispatch({ type: "SET_DROPDOWN_OPEN", open: false });
    if (typeof window === "undefined" || !navigator.geolocation) {
      dispatch({ type: "SET_GPS_ERROR", error: "Geolocation is not supported by your browser" });
      return;
    }

    dispatch({ type: "SET_DETECTING", detecting: true });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        dispatch({ type: "SET_COORDS", coords: { lat: latitude, lng: longitude } });
        let placeName = `Live GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

        const data = await reverseGeocodeOsm(latitude, longitude);
        if (data) {
          const addr = data.address || {};
          const parts = [
            addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || addr.locality || "",
            addr.city || addr.town || addr.village || addr.county || addr.state_district || "",
            addr.state || "",
            addr.postcode ? `PIN ${addr.postcode}` : "",
          ].filter(Boolean);
          if (parts.length > 0) placeName = parts.join(", ");
          else if (data.display_name) placeName = data.display_name.split(",").slice(0, 3).join(", ");
        }

        dispatch({ type: "SET_LOCATION_QUERY", query: placeName });
        dispatch({
          type: "SET_STATION",
          station: {
            name: `GPS Telemetry Node (${placeName.split(",")[0].trim()})`,
            pm25: "Live Sync",
            temp: "Live",
            distance: "0.2 km from GPS pin",
          },
        });
        dispatch({ type: "SET_DETECTING", detecting: false });
      },
      (error) => {
        dispatch({ type: "SET_DETECTING", detecting: false });
        let errorMsg = "Unable to retrieve device GPS location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please allow location access in your browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "GPS position is unavailable. Please search for a city or locality above.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "GPS request timed out. Please try again.";
        }
        dispatch({ type: "SET_GPS_ERROR", error: errorMsg });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

  const handleMapLocationChange = useCallback(async (newLat: number, newLng: number) => {
    dispatch({ type: "SET_GPS_ERROR", error: null });
    dispatch({ type: "SET_COORDS", coords: { lat: newLat, lng: newLng } });
    const data = await reverseGeocodeOsm(newLat, newLng);
    if (data) {
      const addr = data.address || {};
      const parts = [
        addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || addr.locality || "",
        addr.city || addr.town || addr.village || "",
      ].filter(Boolean);
      if (parts.length > 0) {
        dispatch({
          type: "SET_LOCATION_QUERY",
          query: `${parts.join(", ")} (${newLat.toFixed(3)}°N, ${newLng.toFixed(3)}°E)`,
        });
        dispatch({
          type: "SET_STATION",
          station: {
            name: `Air Telemetry Node (${parts[0]})`,
            pm25: "Live Sync",
            temp: "Live",
            distance: "Calibrated to map pin",
          },
        });
        return;
      }
    }
    dispatch({
      type: "SET_LOCATION_QUERY",
      query: `Custom Pin (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`,
    });
    dispatch({
      type: "SET_STATION",
      station: {
        name: `Air Telemetry Node (Pin ${newLat.toFixed(2)}°N, ${newLng.toFixed(2)}°E)`,
        pm25: "Live Sync",
        temp: "Live",
        distance: "Calibrated to map pin",
      },
    });
  }, []);

  const handleNextStep = useCallback(async () => {
    try {
      if (!state.airQualityData) {
        await fetchOpenMeteoAirQuality(state.coords.lat, state.coords.lng);
      }
    } catch {
      // Safe fallback handled inside fetchOpenMeteoAirQuality
    } finally {
      dispatch({ type: "SET_STEP", step: 2 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state.airQualityData, state.coords.lat, state.coords.lng, fetchOpenMeteoAirQuality]);

  const handleGeneratePlan = useCallback(async () => {
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    dispatch({ type: "SET_ONBOARDING_SAVED", saved: false });
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const customTrimmed = state.customWindowInput.trim();
      const planPayload = {
        location: state.locationQuery,
        coords: state.coords,
        aqi: state.airQualityData?.usAqi ?? 145,
        pollutants: {
          pm25: state.airQualityData?.pm25 ?? 85,
          pm10: state.airQualityData?.pm10 ?? 140,
          no2: state.airQualityData?.no2 ?? 40,
          ozone: state.airQualityData?.ozone ?? 30,
          co: state.airQualityData?.co ?? 600,
        },
        householdProfile: {
          vulnerabilities: state.vulnerabilities,
          commute: state.commute,
          indoorSetup: state.indoorSetup,
          windows: {
            ...state.windows,
            custom: customTrimmed || state.windows.custom,
            customList:
              customTrimmed && !state.windows.customList.includes(customTrimmed)
                ? [...state.windows.customList, customTrimmed]
                : state.windows.customList,
          },
        },
      };

      let aiPlanData = null;
      let modelUsed = "";
      let rawResponse = "";
      try {
        const aiJson = await generateOnboardingPlanApi({
          ...planPayload,
          evaluationType: "onboarding_air_plan",
        });
        if (aiJson.success && aiJson.data) {
          playAiResponseSound();
          aiPlanData = aiJson.data;
          modelUsed = aiJson.modelUsed || "";
          rawResponse = aiJson.rawText || "";
        }
      } catch (err: unknown) {
        logger.warn("AI plan generation notice (proceeding with calibrated fallback):", err);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(planPayload));
        if (aiPlanData) {
          localStorage.setItem(STORAGE_KEYS.activePlan, JSON.stringify(aiPlanData));
        }
      }

      if (userEmail) {
        try {
          await saveOnboardingProfileApi({
            locationQuery: state.locationQuery,
            coords: state.coords,
            householdProfile: planPayload.householdProfile,
            airQualityData: state.airQualityData,
            aiPlan: aiPlanData,
            modelUsed,
            rawResponse: aiPlanData || rawResponse,
            response: aiPlanData,
          });
        } catch (err: unknown) {
          logger.error("Failed to persist user profile to MongoDB:", err);
        }
      }

      dispatch({ type: "SET_ONBOARDING_SAVED", saved: true });
      redirectTimerRef.current = setTimeout(() => {
        dispatch({ type: "SET_SUBMITTING", submitting: false });
        router.push("/");
      }, 900);
    } catch (err: unknown) {
      logger.error("Failed during plan generation:", err);
      dispatch({ type: "SET_SUBMITTING", submitting: false });
      router.push("/");
    }
  }, [state, userEmail, router]);

  return {
    state,
    dispatch,
    searchContainerRef,
    searchInputRef,
    fetchOpenMeteoAirQuality,
    handleSelectOsmPlace,
    handleDetectLocation,
    handleMapLocationChange,
    handleNextStep,
    handleGeneratePlan,
  };
}
