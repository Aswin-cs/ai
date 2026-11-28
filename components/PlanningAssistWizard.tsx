"use client";

import { useEffect, useRef, useState } from "react";
import TripDestinationStep from "@/components/trip/TripDestinationStep";
import TripScheduleStep from "@/components/trip/TripScheduleStep";
import {
  fetchCurrentOpenMeteoAq,
  formatOsmPlaceShortName,
  getAqiMeta,
  reverseGeocodeOsm,
  searchOsmPlaces,
  type OsmSearchResult,
} from "@/lib/airQuality";

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

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const data = await searchOsmPlaces(trimmed);
      setOsmResults(data);
      setIsSearching(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    const exists = destinations.some(
      (d) => Math.abs(d.lat - lat) < 0.002 && Math.abs(d.lng - lng) < 0.002
    );
    if (exists) {
      setMapCenter({ lat, lng, label: name });
      setIsDropdownOpen(false);
      return;
    }

    const id = `dest-${nextDestIdRef.current++}`;
    setDestinations((prev) => [...prev, { id, name, fullName, lat, lng, loadingAq: true }]);
    setMapCenter({ lat, lng, label: name });
    setHasCustomPin(false);
    setSearchQuery("");
    setIsDropdownOpen(false);
    void fetchAirQualityForDestination(id, lat, lng);
  };

  const handleSelectOsmResult = (item: OsmSearchResult) => {
    addDestination(
      formatOsmPlaceShortName(item),
      item.display_name,
      parseFloat(item.lat),
      parseFloat(item.lon)
    );
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
      className={`bg-surface-container-low flex flex-col gap-3 ${
        compact
          ? "p-4 flex-1 overflow-y-auto"
          : "rounded-3xl border border-outline-variant p-5 md:p-6 shadow-xs"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center">
            {step}
          </span>
          <div>
            <p className="text-xs font-semibold text-on-surface leading-tight">
              {step === 1
                ? "Where is your destination?"
                : "Trip Start Date, Time & End Date"}
            </p>
            <p className="text-xs text-on-surface-variant">
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
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface px-2 py-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {step === 1 ? (
        <TripDestinationStep
          searchContainerRef={searchContainerRef}
          searchQuery={searchQuery}
          osmResults={osmResults}
          isSearching={isSearching}
          isDropdownOpen={isDropdownOpen}
          mapCenter={mapCenter}
          hasCustomPin={hasCustomPin}
          destinations={destinations}
          canProceedStep1={canProceedStep1}
          onSearchQueryChange={(val) => {
            setSearchQuery(val);
            if (val.trim().length < 2) {
              setOsmResults([]);
              setIsSearching(false);
            }
            setIsDropdownOpen(true);
          }}
          onClearSearch={() => {
            setSearchQuery("");
            setOsmResults([]);
          }}
          onSetDropdownOpen={setIsDropdownOpen}
          onSelectOsmResult={handleSelectOsmResult}
          onMapLocationChange={(lat, lng) => {
            void handleMapLocationChange(lat, lng);
          }}
          onAddPinnedPlace={() =>
            addDestination(mapCenter.label, mapCenter.label, mapCenter.lat, mapCenter.lng)
          }
          onCenterMap={(lat, lng, label) => setMapCenter({ lat, lng, label })}
          onRemoveDestination={(id) =>
            setDestinations((prev) => prev.filter((d) => d.id !== id))
          }
          onNextStep={() => setStep(2)}
        />
      ) : (
        <TripScheduleStep
          destinations={destinations}
          todayStr={todayStr}
          startDate={startDate}
          startTime={startTime}
          endDate={endDate}
          onStartDateChange={(val) => {
            setStartDate(val);
            if (endDate && val > endDate) {
              setEndDate(val);
            }
          }}
          onStartTimeChange={setStartTime}
          onEndDateChange={setEndDate}
          onBackStep={() => setStep(1)}
          onConfirmPlan={handleConfirmPlan}
        />
      )}
    </div>
  );
}
