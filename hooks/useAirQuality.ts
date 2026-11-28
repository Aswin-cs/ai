"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAirQualityTelemetry } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { HourlyTimelinePoint, Pollutants, UserProfileState } from "@/types/airPlan";

export function useAirQuality(
  coords: { lat: number; lng: number } | undefined,
  onSyncProfileTelemetry: (updater: (prev: UserProfileState) => UserProfileState) => void
) {
  const [hourlyTimeline, setHourlyTimeline] = useState<HourlyTimelinePoint[]>([]);
  const [timelineMetric, setTimelineMetric] = useState<"aqi" | "pm25">("aqi");
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const liveTelemetrySyncedRef = useRef(false);
  const onSyncRef = useRef(onSyncProfileTelemetry);

  useEffect(() => {
    onSyncRef.current = onSyncProfileTelemetry;
  }, [onSyncProfileTelemetry]);

  const fetch12HrTimeline = useCallback(async (lat: number, lng: number) => {
    const reqId = ++reqIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoadingTimeline(true);

    try {
      const data = await fetchAirQualityTelemetry(lat, lng, controller.signal);
      if (reqId !== reqIdRef.current) return;

      const current = data.current || {};
      const times = data.hourly?.time || [];
      const aqis = data.hourly?.us_aqi || [];
      const pm25s = data.hourly?.pm2_5 || [];
      const pm10s = data.hourly?.pm10 || [];

      const currentIsoPrefix =
        typeof current.pm25 === "number" && typeof (current as { time?: string }).time === "string"
          ? ((current as { time?: string }).time as string).slice(0, 13)
          : "";
      let startIdx = currentIsoPrefix
        ? times.findIndex((t) => t.startsWith(currentIsoPrefix))
        : -1;
      if (startIdx < 0) {
        const nowMs = Date.now() - 30 * 60 * 1000;
        startIdx = times.findIndex((t) => new Date(t).getTime() >= nowMs);
        if (startIdx < 0) startIdx = 0;
      }

      const sliceEnd = Math.min(times.length, startIdx + 12);
      const points: HourlyTimelinePoint[] = [];
      for (let idx = startIdx; idx < sliceEnd; idx++) {
        const t = times[idx];
        const isNow = idx === startIdx;
        const d = new Date(t);
        const label = isNow
          ? "Now"
          : d.toLocaleTimeString([], { hour: "numeric", hour12: true });

        points.push({
          time: t,
          label,
          aqi:
            isNow && current.usAqi != null
              ? Math.round(current.usAqi)
              : Math.round(aqis[idx] ?? 0),
          pm25:
            isNow && current.pm25 != null
              ? Number(Number(current.pm25).toFixed(1))
              : Number((pm25s[idx] ?? 0).toFixed(1)),
          pm10:
            isNow && current.pm10 != null
              ? Number(Number(current.pm10).toFixed(1))
              : Number((pm10s[idx] ?? 0).toFixed(1)),
          isNow,
        });
      }

      const nowPoint = points[0];
      const syncedAqi =
        current.usAqi != null ? Math.round(current.usAqi) : nowPoint?.aqi;
      if (syncedAqi != null) {
        liveTelemetrySyncedRef.current = true;
        onSyncRef.current((prev) => {
          const pollutants: Pollutants = {
            ...prev.pollutants,
            pm25: Number(
              (current.pm25 ?? nowPoint?.pm25 ?? prev.pollutants?.pm25 ?? 0).toFixed(1)
            ),
            pm10: Number(
              (current.pm10 ?? nowPoint?.pm10 ?? prev.pollutants?.pm10 ?? 0).toFixed(1)
            ),
            no2: Number((current.no2 ?? prev.pollutants?.no2 ?? 0).toFixed(1)),
          };
          const nextProfile = { ...prev, aqi: syncedAqi, pollutants };
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(nextProfile));
            } catch {
              // Storage quota full or disabled
            }
          }
          return nextProfile;
        });
      }

      if (points.length > 0) {
        setHourlyTimeline(points);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      logger.warn("Failed to fetch 12h timeline:", err);
    } finally {
      if (reqId === reqIdRef.current) {
        setIsLoadingTimeline(false);
      }
    }
  }, []);

  useEffect(() => {
    if (coords?.lat == null || coords?.lng == null) return;
    const timer = setTimeout(() => {
      void fetch12HrTimeline(coords.lat, coords.lng);
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [coords?.lat, coords?.lng, fetch12HrTimeline]);

  return {
    hourlyTimeline,
    timelineMetric,
    setTimelineMetric,
    hoveredHourIdx,
    setHoveredHourIdx,
    isLoadingTimeline,
    fetch12HrTimeline,
    liveTelemetrySyncedRef,
  };
}
