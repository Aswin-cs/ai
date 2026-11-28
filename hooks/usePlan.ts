"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TripPlanPayload } from "@/components/PlanningAssistWizard";
import {
  deleteTripPlanApi,
  fetchAirQualityTelemetry,
  fetchTripPlansApi,
  fetchUserStatus,
  generateTripPlanApi,
  recalibrateAirPlanApi,
  savePlanProgressApi,
  type SavedTripPlanRecord,
} from "@/lib/api";
import { fetchCurrentOpenMeteoAq } from "@/lib/airQuality";
import { DEFAULT_COORDS, STORAGE_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { playAiResponseSound } from "@/lib/sound";
import type { SupportedLanguage } from "@/lib/validation";
import type { AirPlan, HourlyTimelinePoint, Pollutants, UserProfileState } from "@/types/airPlan";

export function usePlan(authStatus: "loading" | "authenticated" | "unauthenticated") {
  const router = useRouter();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [userProfile, setUserProfile] = useState<UserProfileState>({ location: "" });
  const [aiPlan, setAiPlan] = useState<AirPlan | null>(null);
  const [aiEvalMeta, setAiEvalMeta] = useState<{
    modelUsed?: string;
    updatedAt?: string;
    evaluationType?: string;
  } | null>(null);
  const [roadmapCompleted, setRoadmapCompleted] = useState<Record<string, boolean>>({});
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({});
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressSaved, setProgressSaved] = useState(false);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalibrating, setIsRecalibrating] = useState(false);

  const [activeTripPlan, setActiveTripPlan] = useState<TripPlanPayload | null>(null);
  const [savedTripPlans, setSavedTripPlans] = useState<SavedTripPlanRecord[]>([]);
  const [openTripPlanId, setOpenTripPlanId] = useState<string | null>(null);
  const [isGeneratingTripPlan, setIsGeneratingTripPlan] = useState(false);
  const [tripPlanError, setTripPlanError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadCachedAndStatus = async () => {
      if (typeof window !== "undefined") {
        const savedProfile = localStorage.getItem(STORAGE_KEYS.userProfile);
        const savedPlan = localStorage.getItem(STORAGE_KEYS.activePlan);
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile) as Partial<UserProfileState>;
            setUserProfile((prev) => ({
              ...prev,
              location: parsed.location || prev.location,
              coords: parsed.coords || prev.coords,
              aqi: parsed.aqi ?? prev.aqi,
              pollutants: parsed.pollutants || prev.pollutants,
              householdProfile: parsed.householdProfile || prev.householdProfile,
            }));
          } catch {
            // Ignore malformed localStorage profile
          }
        }
        if (savedPlan) {
          try {
            const parsed = JSON.parse(savedPlan) as { data?: AirPlan } & AirPlan;
            const planObj =
              parsed?.data && (parsed.data.safeOutdoorWindow || parsed.data.priorityAdvisory)
                ? parsed.data
                : parsed;
            setAiPlan(planObj);
          } catch {
            // Ignore malformed localStorage plan
          }
        }
      }

      if (authStatus !== "authenticated") {
        if (authStatus === "unauthenticated") setIsLoading(false);
        return;
      }

      try {
        const data = await fetchUserStatus(controller.signal);
        if (!active) return;

        if (!data.hasAiEvaluation || !data.user?.latestAiEvaluation) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS.activePlan);
            localStorage.removeItem(STORAGE_KEYS.userProfile);
            localStorage.removeItem(STORAGE_KEYS.progress);
          }
          setAiPlan(null);
          setUserProfile({ location: "" });
          setNeedsOnboarding(true);
          setIsLoading(false);
          router.replace("/onboarding");
          return;
        }

        setNeedsOnboarding(false);
        if (data.user) {
          const evalTel = data.user.latestAiEvaluation?.telemetry;
          const locObj = data.user.defaultLocation;
          const resolvedProfile: UserProfileState = {
            location: locObj?.name || "",
            coords:
              locObj?.lat && locObj?.lng ? { lat: locObj.lat, lng: locObj.lng } : undefined,
            aqi: evalTel?.aqi,
            pollutants:
              evalTel?.pm25 != null
                ? {
                    pm25: evalTel.pm25,
                    pm10: evalTel.pm10 ?? 0,
                    no2: evalTel.no2 ?? 0,
                    ozone: evalTel.ozone,
                    co: evalTel.co,
                    so2: evalTel.so2,
                  }
                : undefined,
            householdProfile: data.user.householdProfile,
          };

          setUserProfile((prev) => ({
            ...prev,
            location: resolvedProfile.location || prev.location,
            coords: resolvedProfile.coords || prev.coords,
            aqi: prev.aqi ?? resolvedProfile.aqi,
            pollutants: prev.pollutants || resolvedProfile.pollutants,
            householdProfile: resolvedProfile.householdProfile || prev.householdProfile,
          }));

          if (data.user.latestAiEvaluation) {
            setAiEvalMeta({
              modelUsed: data.user.latestAiEvaluation.modelUsed,
              updatedAt: data.user.latestAiEvaluation.updatedAt,
              evaluationType: data.user.latestAiEvaluation.evaluationType,
            });
            const dbProgress = data.user.latestAiEvaluation.progress;
            if (dbProgress?.roadmap) setRoadmapCompleted(dbProgress.roadmap);
            if (dbProgress?.indoorChecklist) setCompletedChecklist(dbProgress.indoorChecklist);
          }

          let raw = data.user.latestAiEvaluation?.aiPlan || data.user.aiPlan;
          if (typeof raw === "string") {
            try {
              raw = JSON.parse(raw) as AirPlan;
            } catch {
              // Keep string if unparseable
            }
          }
          if (raw && typeof raw === "object") {
            const wrapped = raw as { data?: AirPlan } & AirPlan;
            const plan =
              wrapped.data && (wrapped.data.safeOutdoorWindow || wrapped.data.priorityAdvisory)
                ? wrapped.data
                : wrapped;
            setAiPlan(plan);
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEYS.activePlan, JSON.stringify(plan));
              localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(resolvedProfile));
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        logger.warn("Failed to load user status:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void loadCachedAndStatus();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const controller = new AbortController();
    let active = true;

    (async () => {
      try {
        const data = await fetchTripPlansApi({ signal: controller.signal });
        if (!active || !data?.success) return;
        const list = Array.isArray(data.tripPlans)
          ? data.tripPlans
          : data.tripPlan
            ? [data.tripPlan]
            : [];
        setSavedTripPlans(list);
        if (list.length > 0) {
          setOpenTripPlanId(list[0]._id);
          setActiveTripPlan({
            destinations: list[0].destinations || [],
            startDate: list[0].startDate,
            startTime: list[0].startTime,
            endDate: list[0].endDate,
          });
        }
      } catch {
        // Ignore silent fetch / abort errors
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [authStatus]);

  const handleSaveProgress = useCallback(async () => {
    setIsSavingProgress(true);
    setProgressSaved(false);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEYS.progress,
          JSON.stringify({ roadmap: roadmapCompleted, indoorChecklist: completedChecklist })
        );
      }
      await savePlanProgressApi({
        roadmap: roadmapCompleted,
        indoorChecklist: completedChecklist,
      });
      setHasUnsavedProgress(false);
      setProgressSaved(true);
      setTimeout(() => setProgressSaved(false), 3000);
    } catch (err: unknown) {
      logger.warn("Failed to save progress:", err);
    } finally {
      setIsSavingProgress(false);
    }
  }, [roadmapCompleted, completedChecklist]);

  const handleRecalibratePlan = useCallback(
    async (
      hourlyTimeline: HourlyTimelinePoint[],
      refreshTimeline: (lat: number, lng: number) => Promise<void>,
      langOverride?: SupportedLanguage
    ) => {
      const activeLang = langOverride || language;
      setIsRecalibrating(true);
      try {
        const lat = userProfile.coords?.lat ?? DEFAULT_COORDS.lat;
        const lng = userProfile.coords?.lng ?? DEFAULT_COORDS.lng;

        let freshAqi = userProfile.aqi;
        let freshPollutants = userProfile.pollutants;

        try {
          const aqJson = await fetchAirQualityTelemetry(lat, lng).catch(() => null);
          const aq = aqJson?.current || (await fetchCurrentOpenMeteoAq(lat, lng));
          if (aq && aq.usAqi != null) {
            freshAqi = aq.usAqi;
            freshPollutants = {
              pm25: aq.pm25 ?? 0,
              pm10: aq.pm10 ?? 0,
              no2: aq.no2 ?? 0,
              ozone: aq.ozone,
              co: aq.co,
              so2: aq.so2,
            } satisfies Pollutants;
          }
        } catch (aqErr: unknown) {
          logger.warn("Live telemetry recheck failed, falling back to server telemetry:", aqErr);
        }

        const updatedProfile = {
          ...userProfile,
          aqi: freshAqi,
          pollutants: freshPollutants,
        };
        setUserProfile(updatedProfile);
        void refreshTimeline(lat, lng);

        const result = await recalibrateAirPlanApi({
          location: updatedProfile.location,
          coords: updatedProfile.coords || { lat, lng },
          aqi: freshAqi,
          pollutants: freshPollutants,
          hourlyForecast: hourlyTimeline.map((pt) => ({
            time: pt.time,
            us_aqi: pt.aqi,
            pm25: pt.pm25,
          })),
          householdProfile: updatedProfile.householdProfile,
          language: activeLang,
          evaluationType: "recalibration",
          refreshTelemetry: freshAqi == null,
        });

        if (result.success && result.data) {
          playAiResponseSound();
          const plan = result.data;
          setAiPlan(plan);

          if (result.telemetry?.aqi != null) {
            updatedProfile.aqi = result.telemetry.aqi;
            updatedProfile.pollutants = result.telemetry.pollutants || updatedProfile.pollutants;
            setUserProfile({ ...updatedProfile });
          }

          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.activePlan, JSON.stringify(plan));
            localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(updatedProfile));
          }
        }
      } catch (e: unknown) {
        logger.warn("Recalibrate error:", e);
      } finally {
        setIsRecalibrating(false);
      }
    },
    [language, userProfile]
  );

  const submitTripPlan = useCallback(
    async (plan: TripPlanPayload) => {
      setActiveTripPlan(plan);
      setIsGeneratingTripPlan(true);
      setTripPlanError(null);
      try {
        const data = await generateTripPlanApi({
          destinations: plan.destinations,
          startDate: plan.startDate,
          startTime: plan.startTime,
          endDate: plan.endDate,
          householdProfile: userProfile.householdProfile,
          language,
        });
        playAiResponseSound();
        const newRecord: SavedTripPlanRecord = data.tripPlan || {
          _id: data.tripPlanId || `local-${Date.now()}`,
          destinations: plan.destinations,
          startDate: plan.startDate,
          startTime: plan.startTime,
          endDate: plan.endDate,
          plan: data.plan,
        };
        setSavedTripPlans((prev) => [newRecord, ...prev]);
        setOpenTripPlanId(newRecord._id);
        return { ok: true as const };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed to generate trip plan";
        setTripPlanError(errMsg);
        return { ok: false as const, error: errMsg };
      } finally {
        setIsGeneratingTripPlan(false);
      }
    },
    [language, userProfile.householdProfile]
  );

  const deleteTripPlan = useCallback(
    async (idToDelete: string) => {
      setSavedTripPlans((prev) => prev.filter((p) => p._id !== idToDelete));
      if (openTripPlanId === idToDelete) {
        setOpenTripPlanId(null);
        setTripPlanError(null);
      }
      await deleteTripPlanApi(idToDelete).catch(() => {
        // Ignore background delete network failures
      });
    },
    [openTripPlanId]
  );

  return {
    needsOnboarding,
    language,
    setLanguage,
    userProfile,
    setUserProfile,
    aiPlan,
    aiEvalMeta,
    roadmapCompleted,
    setRoadmapCompleted,
    completedChecklist,
    setCompletedChecklist,
    isSavingProgress,
    progressSaved,
    hasUnsavedProgress,
    setHasUnsavedProgress,
    setProgressSaved,
    isLoading,
    isRecalibrating,
    handleSaveProgress,
    handleRecalibratePlan,
    activeTripPlan,
    setActiveTripPlan,
    savedTripPlans,
    setSavedTripPlans,
    openTripPlanId,
    setOpenTripPlanId,
    isGeneratingTripPlan,
    tripPlanError,
    setTripPlanError,
    submitTripPlan,
    deleteTripPlan,
  };
}
