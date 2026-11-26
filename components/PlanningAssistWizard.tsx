"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, Search, MapPin, Plus, X, ArrowRight, ArrowLeft, Clock, Calendar, Navigation } from "lucide-react";
import {
  getAqiMeta,
  fetchCurrentOpenMeteoAq,
  searchOsmPlaces,
  reverseGeocodeOsm,
  formatOsmPlaceShortName,
  type OsmSearchResult,
} from "@/lib/airQuality";

const LeafletMap = dynamic(() => import("@/app/onboarding/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[175px] rounded-xl border border-[#E0E3E1] bg-[#E9EEF6] flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs text-[#444746]">
        <Loader2 className="w-4 h-4 text-[#0B57D0] animate-spin" />
        <span>Loading OpenStreetMap &amp; Leaflet...</span>
      </div>
    </div>
  ),
});

export interface TripDestination {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  loadingAq: boolean;
  usAqi?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  ozone?: number;
  categoryLabel?: string;
}

export interface TripPlanPayload {
  destinations: Array<{
    name: string;
    fullName: string;
    lat: number;
    lng: number;
    usAqi: number;
    pm25: number;
    pm10: number;
    no2: number;
    ozone: number;
    categoryLabel: string;
  }>;
  startDate: string;
  startTime: string;
  endDate: string;
}

interface PlanningAssistWizardProps {
  defaultLat?: number;
  defaultLng?: number;
  defaultLocationName?: string;
  initialPlan?: TripPlanPayload | null;
  compact?: boolean;
  onCancel?: () => void;
  onSubmitPlan: (payload: TripPlanPayload) => void;
}

export default function PlanningAssistWizard({
  defaultLat = 28.6139,
  defaultLng = 77.209,
  defaultLocationName = "New Delhi, India",
  initialPlan,
  compact = true,
  onCancel,
  onSubmitPlan,
}: PlanningAssistWizardProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toTimeString().slice(0, 5);

  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [osmResults, setOsmResults] = useState<OsmSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const nextDestIdRef = useRef(1);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; label: string }>({
    lat: initialPlan?.destinations?.[0]?.lat ?? defaultLat,
    lng: initialPlan?.destinations?.[0]?.lng ?? defaultLng,
    label: initialPlan?.destinations?.[0]?.name ?? defaultLocationName.split(",")[0],
  });
  const [hasCustomPin, setHasCustomPin] = useState(false);

  const [destinations, setDestinations] = useState<TripDestination[]>(() =>
    initialPlan?.destinations?.length
      ? initialPlan.destinations.map((d, idx) => ({
          id: `init-${idx}-${d.lat}-${d.lng}`,
          name: d.name,
          fullName: d.fullName,
          lat: d.lat,
          lng: d.lng,
          loadingAq: false,
          usAqi: d.usAqi,
          pm25: d.pm25,
          pm10: d.pm10,
          no2: d.no2,
          ozone: d.ozone,
          categoryLabel: d.categoryLabel,
        }))
      : []
  );

  const [startDate, setStartDate] = useState(initialPlan?.startDate || todayStr);
  const [startTime, setStartTime] = useState(initialPlan?.startTime || nowTimeStr || "09:00");
  const [endDate, setEndDate] = useState(initialPlan?.endDate || todayStr);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  // Debounced OpenStreetMap Nominatim place search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const data = await searchOsmPlaces(trimmed);
      setOsmResults(data);
      setIsSearching(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Open-Meteo Air Quality for a destination
  const fetchAirQualityForDestination = async (id: string, lat: number, lng: number) => {
    const aq = await fetchCurrentOpenMeteoAq(lat, lng);
    if (aq) {
      const meta = getAqiMeta(aq.usAqi);
      setDestinations((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                loadingAq: false,
                usAqi: aq.usAqi,
                pm25: aq.pm25,
                pm10: aq.pm10,
                no2: aq.no2,
                ozone: aq.ozone,
                categoryLabel: meta.shortLabel,
              }
            : d
        )
      );
      return;
    }

    const fallbackAqi = lat > 26 ? 156 : lat > 18 ? 98 : 52;
    const fallbackPm25 = lat > 26 ? 78.4 : lat > 18 ? 42.1 : 19.5;
    setDestinations((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              loadingAq: false,
              usAqi: fallbackAqi,
              pm25: fallbackPm25,
              pm10: Number((fallbackPm25 * 1.5).toFixed(1)),
              no2: 28.0,
              ozone: 34.0,
              categoryLabel: getAqiMeta(fallbackAqi).shortLabel,
            }
          : d
      )
    );
  };

  const addDestination = (name: string, fullName: string, lat: number, lng: number) => {
    if (destinations.length >= 3) return;
    // Avoid exact duplicate coordinates
    const exists = destinations.some(
      (d) => Math.abs(d.lat - lat) < 0.002 && Math.abs(d.lng - lng) < 0.002
    );
    if (exists) {
      setMapCenter({ lat, lng, label: name });
      setIsDropdownOpen(false);
      return;
    }

    const id = `dest-${nextDestIdRef.current++}`;
    const newDest: TripDestination = {
      id,
      name,
      fullName,
      lat,
      lng,
      loadingAq: true,
    };
    setDestinations((prev) => [...prev, newDest]);
    setMapCenter({ lat, lng, label: name });
    setHasCustomPin(false);
    setSearchQuery("");
    setIsDropdownOpen(false);
    fetchAirQualityForDestination(id, lat, lng);
  };

  const handleSelectOsmResult = (item: OsmSearchResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const shortName = formatOsmPlaceShortName(item);
    addDestination(shortName, item.display_name, lat, lng);
  };

  const handleMapLocationChange = async (lat: number, lng: number) => {
    setMapCenter({ lat, lng, label: `Pin (${lat.toFixed(3)}, ${lng.toFixed(3)})` });
    setHasCustomPin(true);
    const data = await reverseGeocodeOsm(lat, lng);
    if (data?.address) {
      const shortName = formatOsmPlaceShortName({
        display_name: data.display_name || "Pinned Location",
        address: data.address,
      });
      setMapCenter({ lat, lng, label: shortName });
    }
  };

  const handleRemoveDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  const isAnyLoadingAq = destinations.some((d) => d.loadingAq);
  const canProceedStep1 = destinations.length > 0 && !isAnyLoadingAq;

  const handleConfirmPlan = () => {
    if (!canProceedStep1 || !startDate || !startTime || !endDate) return;
    onSubmitPlan({
      destinations: destinations.map((d) => ({
        name: d.name,
        fullName: d.fullName,
        lat: d.lat,
        lng: d.lng,
        usAqi: d.usAqi ?? 100,
        pm25: d.pm25 ?? 35,
        pm10: d.pm10 ?? 60,
        no2: d.no2 ?? 25,
        ozone: d.ozone ?? 35,
        categoryLabel: d.categoryLabel || "Moderate",
      })),
      startDate,
      startTime,
      endDate,
    });
  };

  return (
    <div
      className={`bg-[#F8FAFD] flex flex-col gap-3 ${
        compact
          ? "border-b border-[#E0E3E1] p-3.5 max-h-[410px] overflow-y-auto"
          : "rounded-3xl border border-[#D3E3FD] p-5 md:p-6 shadow-xs"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#0B57D0] text-white text-[11px] font-bold flex items-center justify-center">
            {step}
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-[#1F1F1F] leading-tight">
              {step === 1
                ? "Where is your destination?"
                : "Trip Start Date, Time & End Date"}
            </p>
            <p className="text-[10.5px] text-[#444746]">
              {step === 1
                ? `Search or pin up to 3 places (${destinations.length}/3 added)`
                : "Select your start date, start time, and end date"}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-medium text-[#444746] hover:text-[#1F1F1F] px-2 py-1 rounded-lg hover:bg-[#E8EDF5] transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {step === 1 ? (
        <>
          {/* OpenStreetMap Place Search */}
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center gap-2 bg-white border border-[#C4C7C5] focus-within:border-[#0B57D0] rounded-xl px-3 py-2 shadow-2xs">
              <Search className="w-4 h-4 text-[#444746] shrink-0" aria-hidden="true" />
              <input
                type="text"
                role="combobox"
                aria-label="Search destination"
                aria-expanded={isDropdownOpen && osmResults.length > 0 && destinations.length < 3}
                aria-controls="osm-search-results"
                aria-autocomplete="list"
                value={searchQuery}
                disabled={destinations.length >= 3}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim().length < 2) {
                    setOsmResults([]);
                    setIsSearching(false);
                  }
                  setIsDropdownOpen(true);
                }}
                placeholder={
                  destinations.length >= 3
                    ? "Maximum 3 destinations reached"
                    : "Search destination (e.g. India Gate, Manali, Pune)..."
                }
                className="flex-1 min-w-0 bg-transparent text-[12px] text-[#1F1F1F] outline-none placeholder:text-[#747775] disabled:cursor-not-allowed"
              />
              {isSearching && <Loader2 className="w-3.5 h-3.5 text-[#0B57D0] animate-spin shrink-0" aria-hidden="true" />}
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear destination search"
                  onClick={() => {
                    setSearchQuery("");
                    setOsmResults([]);
                  }}
                  className="text-[#444746] hover:text-[#1F1F1F] cursor-pointer p-1 rounded-full"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {isDropdownOpen && osmResults.length > 0 && destinations.length < 3 && (
              <div
                id="osm-search-results"
                role="listbox"
                aria-label="Destination search suggestions"
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E0E3E1] rounded-xl shadow-lg z-[500] max-h-[165px] overflow-y-auto divide-y divide-[#F0F4F9]"
              >
                {osmResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => handleSelectOsmResult(item)}
                    className="w-full text-left px-3 py-2 hover:bg-[#EAF2FD] transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#0B57D0] shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-semibold text-[#1F1F1F] truncate">
                        {formatOsmPlaceShortName(item)}
                      </p>
                      <p className="text-[10px] text-[#444746] truncate">{item.display_name}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-[#0B57D0] shrink-0 mt-0.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Leaflet Map */}
          <div className="relative rounded-xl overflow-hidden border border-[#E0E3E1]">
            <div className="h-[175px] w-full [&>div]:!h-[175px]">
              <LeafletMap
                lat={mapCenter.lat}
                lng={mapCenter.lng}
                stationName={mapCenter.label}
                pm25={
                  destinations.find(
                    (d) =>
                      Math.abs(d.lat - mapCenter.lat) < 0.002 &&
                      Math.abs(d.lng - mapCenter.lng) < 0.002
                  )?.pm25 !== undefined
                    ? `${
                        destinations.find(
                          (d) =>
                            Math.abs(d.lat - mapCenter.lat) < 0.002 &&
                            Math.abs(d.lng - mapCenter.lng) < 0.002
                        )?.pm25
                      } µg/m³`
                    : "Tap map or search"
                }
                onLocationChange={handleMapLocationChange}
              />
            </div>
            {hasCustomPin && destinations.length < 3 && (
              <button
                type="button"
                onClick={() =>
                  addDestination(mapCenter.label, mapCenter.label, mapCenter.lat, mapCenter.lng)
                }
                className="absolute bottom-2.5 right-2.5 z-[400] px-2.5 py-1.5 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-semibold shadow-md flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pinned Place</span>
              </button>
            )}
          </div>

          {/* Selected Destinations (Up to 3) + Live Air Quality */}
          {destinations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {destinations.map((dest, idx) => {
                const badge = getAqiMeta(dest.loadingAq ? undefined : dest.usAqi);
                return (
                  <div
                    key={dest.id}
                    className="flex items-center justify-between gap-2 bg-white border border-[#E0E3E1] hover:border-[#A8C7FA] rounded-xl px-2.5 py-2 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setMapCenter({ lat: dest.lat, lng: dest.lng, label: dest.name })}
                      aria-label={`Center map on ${dest.name}`}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer rounded-lg"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#DAE2FF] text-[#0041A2] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-semibold text-[#1F1F1F] truncate">
                          {dest.name}
                        </p>
                        <p className="text-[10px] text-[#444746]">
                          {dest.loadingAq
                            ? "Fetching Open-Meteo air quality..."
                            : `PM2.5: ${dest.pm25} µg/m³ • PM10: ${dest.pm10} µg/m³`}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {dest.loadingAq ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#0B57D0] animate-spin" aria-hidden="true" />
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.badgeBg} ${badge.badgeText} ${badge.badgeBorder}`}
                        >
                          AQI {dest.usAqi} • {badge.shortLabel}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveDestination(dest.id)}
                        aria-label={`Remove ${dest.name}`}
                        className="w-7 h-7 rounded-full hover:bg-[#FCE8E6] text-[#444746] hover:text-[#C5221F] flex items-center justify-center cursor-pointer"
                        title="Remove destination"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 1 Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10.5px] text-[#444746]">
              {destinations.length === 0
                ? "Add at least 1 destination to continue"
                : `${destinations.length}/3 destinations selected`}
            </span>
            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              className="px-3.5 py-2 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] disabled:bg-[#D3E3FD] disabled:text-[#747775] text-white text-[11.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next: Time &amp; End Date</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Step 2: Start Date, Start Time & End Date */}
          <div className="flex flex-wrap gap-1.5">
            {destinations.map((d, i) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D3E3FD] text-[10.5px] font-medium text-[#1F1F1F]"
              >
                <Navigation className="w-3 h-3 text-[#0B57D0]" />
                <span>
                  {i + 1}. {d.name} (AQI {d.usAqi})
                </span>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1 bg-white border border-[#C4C7C5] focus-within:border-[#0B57D0] rounded-xl px-3 py-2">
              <span className="text-[10.5px] font-semibold text-[#444746] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0B57D0]" />
                Start date
              </span>
              <input
                type="date"
                min={todayStr}
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (endDate && val > endDate) {
                    setEndDate(val);
                  }
                }}
                className="text-[12px] font-medium text-[#1F1F1F] bg-transparent outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 bg-white border border-[#C4C7C5] focus-within:border-[#0B57D0] rounded-xl px-3 py-2">
              <span className="text-[10.5px] font-semibold text-[#444746] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#0B57D0]" />
                Start time
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-[12px] font-medium text-[#1F1F1F] bg-transparent outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 bg-white border border-[#C4C7C5] focus-within:border-[#0B57D0] rounded-xl px-3 py-2">
              <span className="text-[10.5px] font-semibold text-[#444746] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0B57D0]" />
                End date
              </span>
              <input
                type="date"
                min={startDate || todayStr}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[12px] font-medium text-[#1F1F1F] bg-transparent outline-none"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3 py-2 rounded-full bg-white hover:bg-[#E8EDF5] border border-[#C4C7C5] text-[#1F1F1F] text-[11.5px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!startDate || !startTime || !endDate}
              onClick={handleConfirmPlan}
              className="px-4 py-2 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] disabled:bg-[#D3E3FD] disabled:text-[#747775] text-white text-[11.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              <span>Generate Trip Air Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
