const CPCB_RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
const CPCB_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_STATION_DISTANCE_KM = 35;

interface CpcbRawRecord {
  country?: string;
  state?: string;
  city?: string;
  station?: string;
  last_update?: string;
  latitude?: string | number;
  longitude?: string | number;
  pollutant_id?: string;
  min_value?: string | number;
  max_value?: string | number;
  avg_value?: string | number;
}

export interface CpcbStationReading {
  aqi: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  ozone?: number;
  co?: number;
  so2?: number;
  station: string;
  city: string;
  state: string;
  lastUpdate: string;
  distanceKm: number;
  source: "CPCB";
}

let cachedRecords: CpcbRawRecord[] | null = null;
let cachedAt = 0;
let inFlightCpcbFetch: Promise<CpcbRawRecord[]> | null = null;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getCpcbRecords(): Promise<CpcbRawRecord[]> {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) return [];

  if (cachedRecords && Date.now() - cachedAt < CPCB_CACHE_TTL_MS) {
    return cachedRecords;
  }

  if (inFlightCpcbFetch) {
    return inFlightCpcbFetch;
  }

  inFlightCpcbFetch = (async () => {
    try {
      const url = `https://api.data.gov.in/resource/${CPCB_RESOURCE_ID}?api-key=${encodeURIComponent(
        apiKey
      )}&format=json&limit=10000`;
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return cachedRecords || [];
      const data = await res.json();
      const records = Array.isArray(data?.records) ? (data.records as CpcbRawRecord[]) : [];
      if (records.length > 0) {
        cachedRecords = records;
        cachedAt = Date.now();
      }
      return records;
    } catch {
      return cachedRecords || [];
    } finally {
      inFlightCpcbFetch = null;
    }
  })();

  return inFlightCpcbFetch;
}

/**
 * Finds the nearest CPCB CAAQMS station within 35 km of (lat, lng)
 * using data.gov.in resource 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.
 */
export async function fetchNearestCpcbAq(
  lat: number,
  lng: number
): Promise<CpcbStationReading | null> {
  const records = await getCpcbRecords();
  if (records.length === 0) return null;

  // Group pollutant rows by station
  const byStation = new Map<
    string,
    {
      station: string;
      city: string;
      state: string;
      lastUpdate: string;
      lat: number;
      lng: number;
      distanceKm: number;
      subIndices: Record<string, number>;
    }
  >();

  for (const rec of records) {
    const sLat = Number(rec.latitude);
    const sLng = Number(rec.longitude);
    const avg = Number(rec.avg_value);
    const pid = (rec.pollutant_id || "").trim().toUpperCase();
    const stationName = (rec.station || "").trim();
    if (!stationName || !Number.isFinite(sLat) || !Number.isFinite(sLng) || !Number.isFinite(avg) || avg <= 0) {
      continue;
    }

    const dist = haversineKm(lat, lng, sLat, sLng);
    if (dist > MAX_STATION_DISTANCE_KM) continue;

    let entry = byStation.get(stationName);
    if (!entry) {
      entry = {
        station: stationName,
        city: (rec.city || "").trim(),
        state: (rec.state || "").trim(),
        lastUpdate: (rec.last_update || "").trim(),
        lat: sLat,
        lng: sLng,
        distanceKm: Number(dist.toFixed(1)),
        subIndices: {},
      };
      byStation.set(stationName, entry);
    }
    if (pid) {
      entry.subIndices[pid] = avg;
    }
  }

  if (byStation.size === 0) return null;

  // Pick nearest station that has at least PM2.5 or PM10 or >=2 pollutants
  const candidates = Array.from(byStation.values()).sort((a, b) => a.distanceKm - b.distanceKm);
  const best =
    candidates.find((s) => s.subIndices["PM2.5"] != null || s.subIndices["PM10"] != null) ||
    candidates[0];

  const values = Object.values(best.subIndices).filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) return null;

  // Official CPCB NAQI is the maximum of pollutant sub-indices at the station
  const aqi = Math.round(Math.max(...values));

  return {
    aqi,
    pm25: best.subIndices["PM2.5"],
    pm10: best.subIndices["PM10"],
    no2: best.subIndices["NO2"],
    ozone: best.subIndices["OZONE"],
    co: best.subIndices["CO"],
    so2: best.subIndices["SO2"],
    station: best.station,
    city: best.city,
    state: best.state,
    lastUpdate: best.lastUpdate,
    distanceKm: best.distanceKm,
    source: "CPCB",
  };
}

export function clearCpcbCacheForTests(): void {
  cachedRecords = null;
  cachedAt = 0;
  inFlightCpcbFetch = null;
}
