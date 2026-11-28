"use client";

import dynamic from "next/dynamic";
import type { KeyboardEvent, RefObject } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  LocateFixed,
  Navigation,
  Search,
  X,
} from "lucide-react";
import type { ConnectedStationState, OpenMeteoAirQuality } from "@/hooks/onboardingReducer";
import type { OsmSearchResult } from "@/lib/airQuality";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[220px] rounded-2xl border border-outline-variant bg-surface-container flex items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
        <span>Loading OpenStreetMap &amp; live sensor nodes...</span>
      </div>
    </div>
  ),
});

interface LocationStepProps {
  locationQuery: string;
  coords: { lat: number; lng: number };
  isDropdownOpen: boolean;
  isDetecting: boolean;
  isSearchingGeocode: boolean;
  osmResults: OsmSearchResult[];
  selectedIndex: number;
  gpsError: string | null;
  connectedStation: ConnectedStationState;
  airQualityData: OpenMeteoAirQuality | null;
  searchContainerRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (val: string) => void;
  onFocusInput: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onDetectLocation: () => void;
  onSelectOsmPlace: (osm: OsmSearchResult) => void;
  onHoverResult: (idx: number) => void;
  onMapLocationChange: (lat: number, lng: number) => void;
}

export default function LocationStep({
  locationQuery,
  coords,
  isDropdownOpen,
  isDetecting,
  isSearchingGeocode,
  osmResults,
  selectedIndex,
  gpsError,
  connectedStation,
  airQualityData,
  searchContainerRef,
  searchInputRef,
  onQueryChange,
  onFocusInput,
  onKeyDown,
  onClearSearch,
  onDetectLocation,
  onSelectOsmPlace,
  onHoverResult,
  onMapLocationChange,
}: LocationStepProps) {
  const trimmed = locationQuery.trim();

  return (
    <section className="space-y-5 animate-fade-in-up">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center"
          >
            1
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">
            Where is your household located?
          </h1>
        </div>
        <p className="text-sm text-on-surface-variant pl-8 leading-relaxed">
          We connect to the nearest real-time CPCB / OpenAQ ground monitoring station across India
          to calibrate your daily plan.
        </p>
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex flex-col sm:flex-row gap-3 relative">
          <div ref={searchContainerRef} className="relative flex-1">
            <div
              className={`relative flex items-center rounded-xl bg-surface-container-lowest border transition-all shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 ${
                isDropdownOpen
                  ? "border-primary"
                  : "border-outline-variant hover:border-on-surface-variant"
              }`}
            >
              <Search
                className="w-5 h-5 absolute left-3.5 text-on-surface-variant pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-label="Search Indian city, locality, or 6-digit PIN code"
                aria-expanded={isDropdownOpen && osmResults.length > 0}
                aria-controls="onboarding-osm-results"
                aria-autocomplete="list"
                value={locationQuery}
                onFocus={onFocusInput}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search Indian city, locality, or 6-digit PIN code (e.g. Rohini, BKC, Indiranagar, 110092)"
                className="w-full h-14 pl-11 pr-20 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-xl"
                autoComplete="off"
                spellCheck={false}
              />

              <div className="absolute right-3 flex items-center gap-1.5">
                {isSearchingGeocode && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" aria-hidden="true" />
                )}
                {locationQuery && (
                  <button
                    type="button"
                    aria-label="Clear location search"
                    onClick={onClearSearch}
                    title="Clear search"
                    className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-16 mt-1.5 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden max-h-84 overflow-y-auto divide-y divide-surface-container animate-scale-in">
                {(!trimmed || trimmed.length < 2) && (
                  <div className="p-3 space-y-2">
                    <button
                      type="button"
                      onClick={onDetectLocation}
                      className="w-full px-3.5 py-3 hover:bg-surface-container rounded-xl cursor-pointer flex items-center gap-3 transition-colors text-left group"
                    >
                      <div
                        aria-hidden="true"
                        className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                      >
                        <LocateFixed className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-on-primary-fixed">
                          Use Live Device GPS
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          Pin your current coordinates and query local air quality
                        </div>
                      </div>
                    </button>
                    <div className="px-3.5 py-2 text-xs text-on-surface-variant border-t border-surface-container flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-on-surface-variant" aria-hidden="true" />
                      <span>
                        Type 2 or more characters to search any Indian city, area, or PIN code live.
                      </span>
                    </div>
                  </div>
                )}

                {trimmed.length >= 2 && isSearchingGeocode && (
                  <div className="p-6 flex items-center justify-center gap-2.5 text-sm text-on-surface-variant">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
                    <span>Searching live locations via OpenStreetMap...</span>
                  </div>
                )}

                {osmResults.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-surface-container-low flex items-center justify-between text-xs font-semibold text-on-surface-variant uppercase tracking-wider sticky top-0 z-10 border-b border-outline-variant">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>Live OpenStreetMap Locations</span>
                      </span>
                      <span className="text-primary font-medium lowercase">
                        {osmResults.length} matches
                      </span>
                    </div>
                    <div
                      id="onboarding-osm-results"
                      role="listbox"
                      aria-label="OpenStreetMap location suggestions"
                      className="divide-y divide-surface-container"
                    >
                      {osmResults.map((osm, idx) => {
                        const isHighlighted = selectedIndex === idx;
                        const parts = osm.display_name.split(",");
                        const mainTitle = parts[0]?.trim();
                        const subTitle = parts.slice(1, 4).join(",").trim();

                        return (
                          <div
                            key={osm.place_id}
                            role="option"
                            tabIndex={-1}
                            aria-selected={isHighlighted}
                            onClick={() => onSelectOsmPlace(osm)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectOsmPlace(osm);
                              }
                            }}
                            onMouseEnter={() => onHoverResult(idx)}
                            className={`px-4 py-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                              isHighlighted ? "bg-primary-fixed/40" : "hover:bg-surface-container-low"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                aria-hidden="true"
                                className="w-9 h-9 rounded-xl bg-surface-container text-primary flex items-center justify-center shrink-0"
                              >
                                <Navigation className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-on-surface truncate">
                                  {mainTitle}
                                </div>
                                <div className="text-xs text-on-surface-variant truncate mt-0.5">
                                  {subTitle || osm.display_name}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-primary bg-primary-fixed/60 border border-primary/25 px-2.5 py-1 rounded-full shrink-0">
                              Pin onto Map
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {trimmed.length >= 2 && osmResults.length === 0 && !isSearchingGeocode && (
                  <div className="p-6 text-center text-on-surface-variant space-y-1">
                    <p className="text-xs font-semibold text-on-surface">
                      No live locations found for &ldquo;{locationQuery}&rdquo;
                    </p>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                      Try searching by city name, major colony, or 6-digit Indian PIN code.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDetectLocation}
            disabled={isDetecting}
            className="h-14 px-4 sm:px-5 bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim active:scale-95 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shrink-0 border border-primary/25 cursor-pointer"
          >
            {isDetecting ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="w-5 h-5 text-primary" aria-hidden="true" />
            )}
            <span>{isDetecting ? "Reading GPS..." : "Use my current location"}</span>
          </button>
        </div>
        {gpsError && (
          <p role="alert" className="text-xs text-error flex items-center gap-1.5 pl-1 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
            <span>{gpsError}</span>
          </p>
        )}
      </div>

      <LeafletMap
        lat={coords.lat}
        lng={coords.lng}
        stationName={connectedStation.name}
        pm25={airQualityData ? `${airQualityData.pm25} µg/m³` : "Live Sync"}
        onLocationChange={onMapLocationChange}
      />

      <div className="bg-secondary-container/40 border border-secondary/25 rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" aria-hidden="true" />
          <div>
            <div className="text-xs font-semibold text-secondary">
              Nearest Live Feed Connected: {connectedStation.name}
            </div>
            <div className="text-xs text-on-secondary-fixed-variant flex flex-wrap items-center gap-2 mt-0.5">
              <span>
                Current PM2.5:{" "}
                <strong className="font-semibold text-on-surface">
                  {airQualityData ? `${airQualityData.pm25} µg/m³` : "Measuring..."}
                </strong>
              </span>
              <span aria-hidden="true">•</span>
              <span>
                Air Index:{" "}
                <strong className="font-semibold text-on-surface">
                  {airQualityData
                    ? `${airQualityData.usAqi} (${airQualityData.category.label.split(" ")[0]})`
                    : "Calculating..."}
                </strong>
              </span>
              <span aria-hidden="true">•</span>
              <span className="text-xs bg-surface-container-lowest/70 px-1.5 py-0.5 rounded text-secondary">
                Open-Meteo live sync
              </span>
            </div>
          </div>
        </div>
        <span className="text-xs font-medium text-secondary bg-surface-container-lowest border border-secondary/25 px-2.5 py-1 rounded-full shrink-0 hidden sm:inline-block">
          {connectedStation.distance}
        </span>
      </div>

      <p className="text-xs text-on-surface-variant flex items-center gap-1.5 pl-1">
        <Info className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden="true" />
        <span>
          Evaluators and team members can switch cities or stations anytime from the live dashboard
          header.
        </span>
      </p>
    </section>
  );
}
