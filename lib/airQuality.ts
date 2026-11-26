export interface AqiMeta {
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColor: string;
  riskReductionEstimate: string;
}

export function getAqiMeta(usAqi?: number): AqiMeta {
  if (usAqi === undefined || Number.isNaN(usAqi)) {
    return {
      label: "Loading...",
      shortLabel: "Loading...",
      description: "Fetching live air quality telemetry.",
      badgeBg: "bg-[#F0F4F9]",
      badgeText: "text-[#444746]",
      badgeBorder: "border-[#E0E3E1]",
      barColor: "bg-[#747775]",
      riskReductionEstimate: "Calculating exposure baseline",
    };
  }
  if (usAqi <= 50) {
    return {
      label: "Good (Satisfactory)",
      shortLabel: "Good",
      description: "Air quality is satisfactory and poses little or no risk to health.",
      badgeBg: "bg-[#E6F4EA]",
      badgeText: "text-[#137333]",
      badgeBorder: "border-[#CEEAD6]",
      barColor: "bg-[#137333]",
      riskReductionEstimate: "Low baseline vulnerability",
    };
  }
  if (usAqi <= 100) {
    return {
      label: "Moderate",
      shortLabel: "Moderate",
      description: "Air quality is acceptable; unusually sensitive individuals may notice mild respiratory irritation.",
      badgeBg: "bg-[#FEF7E0]",
      badgeText: "text-[#B06000]",
      badgeBorder: "border-[#FCE8B2]",
      barColor: "bg-[#FBBC04]",
      riskReductionEstimate: "Moderate exposure risk",
    };
  }
  if (usAqi <= 150) {
    return {
      label: "Unhealthy for Sensitive Groups",
      shortLabel: "Sensitive",
      description: "Members of sensitive groups (children, seniors, asthma sufferers) may experience health effects.",
      badgeBg: "bg-[#FFF0E6]",
      badgeText: "text-[#D9381E]",
      badgeBorder: "border-[#FFCCB2]",
      barColor: "bg-[#FA7B17]",
      riskReductionEstimate: "Elevated pediatric & senior risk",
    };
  }
  if (usAqi <= 200) {
    return {
      label: "Unhealthy (Poor)",
      shortLabel: "Unhealthy",
      description: "Everyone may begin to experience adverse effects; prolonged outdoor exposure should be limited.",
      badgeBg: "bg-[#FCE8E6]",
      badgeText: "text-[#C5221F]",
      badgeBorder: "border-[#FAD2CF]",
      barColor: "bg-[#EA4335]",
      riskReductionEstimate: "High exposure — N95 and air purifier recommended",
    };
  }
  if (usAqi <= 300) {
    return {
      label: "Very Unhealthy (Severe)",
      shortLabel: "Very Poor",
      description: "Health alert: risk of health effects is increased for everyone. Strenuous outdoor play should be avoided.",
      badgeBg: "bg-[#F3E8FD]",
      badgeText: "text-[#8430CE]",
      badgeBorder: "border-[#E9D2FD]",
      barColor: "bg-[#9333EA]",
      riskReductionEstimate: "Severe smog inversion — restrict outdoor morning windows",
    };
  }
  return {
    label: "Hazardous (Emergency)",
    shortLabel: "Hazardous",
    description: "Health warning of emergency conditions. Everyone is more likely to be affected; remain indoors with air filtration.",
    badgeBg: "bg-[#FDE8E8]",
    badgeText: "text-[#9B1C1C]",
    badgeBorder: "border-[#F8B4B4]",
    barColor: "bg-[#9B1C1C]",
    riskReductionEstimate: "Critical exposure — strict indoor sealing required",
  };
}

export interface CurrentOpenMeteoAq {
  usAqi: number;
  europeanAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  ozone: number;
  co: number;
  so2: number;
}

const AQ_CACHE_TTL_MS = 5 * 60 * 1000;
const AQ_CACHE_MAX_ENTRIES = 100;
const aqCache = new Map<string, { data: CurrentOpenMeteoAq; expiresAt: number }>();
const aqInFlight = new Map<string, Promise<CurrentOpenMeteoAq | null>>();

export async function fetchCurrentOpenMeteoAq(
  lat: number,
  lng: number
): Promise<CurrentOpenMeteoAq | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const now = Date.now();
  const cached = aqCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const pending = aqInFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const data = await res.json();
      const c = data?.current || {};
      const parsed: CurrentOpenMeteoAq = {
        usAqi: Math.round(c.us_aqi ?? 110),
        europeanAqi: Math.round(c.european_aqi ?? 55),
        pm25: Number((c.pm2_5 ?? 40).toFixed(1)),
        pm10: Number((c.pm10 ?? 70).toFixed(1)),
        no2: Number((c.nitrogen_dioxide ?? 25).toFixed(1)),
        ozone: Number((c.ozone ?? 35).toFixed(1)),
        co: Number((c.carbon_monoxide ?? 450).toFixed(1)),
        so2: Number((c.sulphur_dioxide ?? 10).toFixed(1)),
      };

      if (aqCache.size >= AQ_CACHE_MAX_ENTRIES) {
        const oldestKey = aqCache.keys().next().value;
        if (oldestKey) aqCache.delete(oldestKey);
      }
      aqCache.set(key, { data: parsed, expiresAt: Date.now() + AQ_CACHE_TTL_MS });
      return parsed;
    } catch {
      return null;
    } finally {
      aqInFlight.delete(key);
    }
  })();

  aqInFlight.set(key, request);
  return request;
}

export interface OsmSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    locality?: string;
    residential?: string;
    subdistrict?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export function formatOsmPlaceShortName(item: Pick<OsmSearchResult, "display_name" | "address">) {
  const addr = item.address;
  const primary =
    addr?.suburb ||
    addr?.neighbourhood ||
    addr?.locality ||
    addr?.residential ||
    addr?.city ||
    addr?.town ||
    addr?.village ||
    item.display_name.split(",")[0].trim();
  const secondary = addr?.city || addr?.state || addr?.country || "";
  if (secondary && secondary.toLowerCase() !== primary.toLowerCase()) {
    return `${primary}, ${secondary}`;
  }
  return primary;
}

export async function searchOsmPlaces(
  query: string,
  countryCode?: string
): Promise<OsmSearchResult[]> {
  try {
    const cc = countryCode ? `&countrycodes=${countryCode}` : "";
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}${cc}&limit=6&addressdetails=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    return (await res.json()) || [];
  } catch {
    return [];
  }
}

export async function reverseGeocodeOsm(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
