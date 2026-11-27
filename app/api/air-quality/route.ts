import { NextResponse } from "next/server";
import { fetchNearestCpcbAq } from "@/lib/cpcb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return NextResponse.json(
      { success: false, error: "Valid lat and lng query parameters are required." },
      { status: 400 }
    );
  }

  const openMeteoUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5,pm10,us_aqi&forecast_days=2&timezone=auto`;

  const [cpcb, omRes] = await Promise.all([
    fetchNearestCpcbAq(lat, lng).catch(() => null),
    fetch(openMeteoUrl, { cache: "no-store", signal: AbortSignal.timeout(8000) }).catch(() => null),
  ]);

  let omData: Record<string, unknown> | null = null;
  if (omRes && omRes.ok) {
    try {
      omData = await omRes.json();
    } catch {
      omData = null;
    }
  }

  const omCurrent = (omData?.current || {}) as Record<string, number | string | undefined>;
  const omHourly = (omData?.hourly || {}) as {
    time?: string[];
    us_aqi?: number[];
    pm2_5?: number[];
    pm10?: number[];
  };

  if (!cpcb && !omData) {
    return NextResponse.json(
      { success: false, error: "Unable to fetch air quality telemetry." },
      { status: 502 }
    );
  }

  const resolvedAqi = cpcb?.aqi ?? Math.round(Number(omCurrent.us_aqi ?? 100));
  const resolvedPm25 = Number((cpcb?.pm25 ?? Number(omCurrent.pm2_5 ?? 0)).toFixed(1));
  const resolvedPm10 = Number((cpcb?.pm10 ?? Number(omCurrent.pm10 ?? 0)).toFixed(1));
  const resolvedNo2 = Number((cpcb?.no2 ?? Number(omCurrent.nitrogen_dioxide ?? 0)).toFixed(1));
  const resolvedOzone = Number((cpcb?.ozone ?? Number(omCurrent.ozone ?? 0)).toFixed(1));
  const resolvedCo = Number((cpcb?.co ?? Number(omCurrent.carbon_monoxide ?? 0)).toFixed(1));
  const resolvedSo2 = Number((cpcb?.so2 ?? Number(omCurrent.sulphur_dioxide ?? 0)).toFixed(1));

  return NextResponse.json(
    {
      success: true,
      source: cpcb ? "CPCB" : "Open-Meteo",
      station: cpcb
        ? {
            name: cpcb.station,
            city: cpcb.city,
            state: cpcb.state,
            distanceKm: cpcb.distanceKm,
            lastUpdate: cpcb.lastUpdate,
          }
        : null,
      current: {
        usAqi: resolvedAqi,
        europeanAqi: Math.round(Number(omCurrent.european_aqi ?? resolvedAqi * 0.5)),
        pm25: resolvedPm25,
        pm10: resolvedPm10,
        no2: resolvedNo2,
        ozone: resolvedOzone,
        co: resolvedCo,
        so2: resolvedSo2,
        time: typeof omCurrent.time === "string" ? omCurrent.time : "",
      },
      hourly: omHourly,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
