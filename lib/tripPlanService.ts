import type { ITripPlanOutput } from "@/models/TripPlan";
import { getPeriodName, type TripDestinationInput } from "./validation";

const PERIOD_RANGES: Record<"morning" | "afternoon" | "evening" | "night", string> = {
  morning: "06:00 - 11:59",
  afternoon: "12:00 - 16:59",
  evening: "17:00 - 20:59",
  night: "21:00 - 05:59",
};

export async function fetchPlaceForecast(place: TripDestinationInput, dates: string[]) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lng}&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto&forecast_days=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const times: string[] = data?.hourly?.time || [];
    const aqis: number[] = data?.hourly?.us_aqi || [];
    const pm25s: number[] = data?.hourly?.pm2_5 || [];
    const ozones: number[] = data?.hourly?.ozone || [];

    const byDate: Record<string, Array<{ hour: number; aqi: number; pm25: number; ozone: number }>> = {};
    for (let i = 0; i < times.length; i++) {
      const [dStr, tStr] = times[i].split("T");
      if (!dStr || !tStr) continue;
      const hour = parseInt(tStr.slice(0, 2), 10);
      if (!byDate[dStr]) byDate[dStr] = [];
      byDate[dStr].push({
        hour,
        aqi: Math.round(aqis[i] ?? place.usAqi ?? 100),
        pm25: Number((pm25s[i] ?? place.pm25 ?? 35).toFixed(1)),
        ozone: Number((ozones[i] ?? place.ozone ?? 30).toFixed(1)),
      });
    }

    return dates
      .filter((d) => Boolean(byDate[d]?.length))
      .map((date) => {
        const hours = byDate[date];
        const periodBuckets: Record<
          "morning" | "afternoon" | "evening" | "night",
          Array<{ aqi: number; pm25: number; ozone: number }>
        > = {
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
        };

        for (const h of hours) {
          periodBuckets[getPeriodName(h.hour)].push(h);
        }

        const periods = (["morning", "afternoon", "evening", "night"] as const)
          .filter((p) => periodBuckets[p].length > 0)
          .map((p) => {
            const arr = periodBuckets[p];
            const avgAqi = Math.round(arr.reduce((s, x) => s + x.aqi, 0) / arr.length);
            const avgPm25 = Number((arr.reduce((s, x) => s + x.pm25, 0) / arr.length).toFixed(1));
            const avgOzone = Number((arr.reduce((s, x) => s + x.ozone, 0) / arr.length).toFixed(1));
            return {
              period: p,
              time_range: PERIOD_RANGES[p],
              aqi: avgAqi,
              pm25: avgPm25,
              ozone: avgOzone,
            };
          });

        const daytime = hours.filter((h) => h.hour >= 6 && h.hour <= 20);
        let bestWindow = { start: "", end: "", avgAqi: 999, avgPm25: 999 };
        for (let i = 0; i < daytime.length - 1; i++) {
          const avgA = (daytime[i].aqi + daytime[i + 1].aqi) / 2;
          const avgP = (daytime[i].pm25 + daytime[i + 1].pm25) / 2;
          if (avgA < bestWindow.avgAqi) {
            const startH = String(daytime[i].hour).padStart(2, "0");
            const endH = String(Math.min(23, daytime[i + 1].hour + 1)).padStart(2, "0");
            bestWindow = {
              start: `${startH}:00`,
              end: `${endH}:00`,
              avgAqi: Math.round(avgA),
              avgPm25: Number(avgP.toFixed(1)),
            };
          }
        }

        return {
          place: place.name,
          date,
          periods,
          cleanest_window: bestWindow.avgAqi < 999 ? bestWindow : null,
        };
      });
  } catch {
    return [];
  }
}

export function sanitizeTripJsonText(rawText: string): ITripPlanOutput {
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid trip plan JSON structure returned by AI.");
  }
  return parsed as ITripPlanOutput;
}
