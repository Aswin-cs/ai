"use client";

import type { RefObject } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Loader2, MapPin, Plus, Search, X } from "lucide-react";
import {
  formatOsmPlaceShortName,
  getAqiMeta,
  type OsmSearchResult,
} from "@/lib/airQuality";
import type { TripDestination } from "@/components/PlanningAssistWizard";

const LeafletMap = dynamic(() => import("@/app/onboarding/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[175px] rounded-xl border border-outline-variant bg-surface-container flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <Loader2 className="w-4 h-4 text-primary animate-spin" aria-hidden="true" />
        <span>Loading OpenStreetMap &amp; Leaflet...</span>
      </div>
    </div>
  ),
});

interface TripDestinationStepProps {
  searchContainerRef: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  osmResults: OsmSearchResult[];
  isSearching: boolean;
  isDropdownOpen: boolean;
  mapCenter: { lat: number; lng: number; label: string };
  hasCustomPin: boolean;
  destinations: TripDestination[];
  canProceedStep1: boolean;
  onSearchQueryChange: (val: string) => void;
  onClearSearch: () => void;
  onSetDropdownOpen: (open: boolean) => void;
  onSelectOsmResult: (item: OsmSearchResult) => void;
  onMapLocationChange: (lat: number, lng: number) => void;
  onAddPinnedPlace: () => void;
  onCenterMap: (lat: number, lng: number, label: string) => void;
  onRemoveDestination: (id: string) => void;
  onNextStep: () => void;
}

export default function TripDestinationStep({
  searchContainerRef,
  searchQuery,
  osmResults,
  isSearching,
  isDropdownOpen,
  mapCenter,
  hasCustomPin,
  destinations,
  canProceedStep1,
  onSearchQueryChange,
  onClearSearch,
  onSetDropdownOpen,
  onSelectOsmResult,
  onMapLocationChange,
  onAddPinnedPlace,
  onCenterMap,
  onRemoveDestination,
  onNextStep,
}: TripDestinationStepProps) {
  const matchedDest = destinations.find(
    (d) =>
      Math.abs(d.lat - mapCenter.lat) < 0.002 && Math.abs(d.lng - mapCenter.lng) < 0.002
  );
  const pm25Display =
    matchedDest?.pm25 !== undefined ? `${matchedDest.pm25} µg/m³` : "Tap map or search";

  return (
    <>
      <div ref={searchContainerRef} className="relative">
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 rounded-xl px-3 py-2 shadow-2xs">
          <Search className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden="true" />
          <input
            type="text"
            role="combobox"
            aria-label="Search destination"
            aria-expanded={isDropdownOpen && osmResults.length > 0 && destinations.length < 3}
            aria-controls="osm-search-results"
            aria-autocomplete="list"
            value={searchQuery}
            disabled={destinations.length >= 3}
            onFocus={() => onSetDropdownOpen(true)}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={
              destinations.length >= 3
                ? "Maximum 3 destinations reached"
                : "Search destination (e.g. India Gate, Manali, Pune)..."
            }
            className="flex-1 min-w-0 bg-transparent text-xs text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded placeholder:text-on-surface-variant disabled:cursor-not-allowed"
          />
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" aria-hidden="true" />
          )}
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear destination search"
              onClick={onClearSearch}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded-full"
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
            className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-[500] max-h-[165px] overflow-y-auto divide-y divide-outline-variant/50"
          >
            {osmResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onSelectOsmResult(item)}
                className="w-full text-left px-3 py-2 hover:bg-primary-fixed/40 transition-colors flex items-start gap-2 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-on-surface truncate">
                    {formatOsmPlaceShortName(item)}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">{item.display_name}</p>
                </div>
                <Plus className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-outline-variant">
        <div className="h-[175px] w-full [&>div]:!h-[175px]">
          <LeafletMap
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            stationName={mapCenter.label}
            pm25={pm25Display}
            onLocationChange={onMapLocationChange}
          />
        </div>
        {hasCustomPin && destinations.length < 3 && (
          <button
            type="button"
            onClick={onAddPinnedPlace}
            className="absolute bottom-2.5 right-2.5 z-[400] px-2.5 py-1.5 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold shadow-md flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Pinned Place</span>
          </button>
        )}
      </div>

      {destinations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {destinations.map((dest, idx) => {
            const badge = getAqiMeta(dest.loadingAq ? undefined : dest.usAqi);
            return (
              <div
                key={dest.id}
                className="flex items-center justify-between gap-2 bg-surface-container-lowest border border-outline-variant hover:border-primary/40 rounded-xl px-2.5 py-2 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onCenterMap(dest.lat, dest.lng, dest.name)}
                  aria-label={`Center map on ${dest.name}`}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer rounded-lg"
                >
                  <span className="w-5 h-5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">{dest.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {dest.loadingAq
                        ? "Fetching Open-Meteo air quality..."
                        : `PM2.5: ${dest.pm25} µg/m³ • PM10: ${dest.pm10} µg/m³`}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  {dest.loadingAq ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" aria-hidden="true" />
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.badgeBg} ${badge.badgeText} ${badge.badgeBorder}`}
                    >
                      AQI {dest.usAqi} • {badge.shortLabel}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveDestination(dest.id)}
                    aria-label={`Remove ${dest.name}`}
                    className="w-7 h-7 rounded-full hover:bg-error-container text-on-surface-variant hover:text-error flex items-center justify-center cursor-pointer"
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

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-on-surface-variant">
          {destinations.length === 0
            ? "Add at least 1 destination to continue"
            : `${destinations.length}/3 destinations selected`}
        </span>
        <button
          type="button"
          disabled={!canProceedStep1}
          onClick={onNextStep}
          className="px-3.5 py-2 rounded-full bg-primary-container hover:bg-primary disabled:bg-surface-container-highest disabled:text-on-surface-variant text-on-primary text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Next: Time &amp; End Date</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
