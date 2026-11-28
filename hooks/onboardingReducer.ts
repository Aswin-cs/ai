import type { AqiMeta, OsmSearchResult } from "@/lib/airQuality";
import { DEFAULT_COORDS } from "@/lib/constants";

export type VulnerabilityKey = "children" | "seniors" | "respiratory" | "adult";
export type CommuteKey = "two_wheeler" | "car" | "metro" | "walk" | "wfh";
export type IndoorSetupKey = "purifier" | "natural";

export interface OpenMeteoAirQuality {
  usAqi: number;
  europeanAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  ozone: number;
  co: number;
  so2: number;
  time: string;
  category: AqiMeta;
}

export interface OnboardingWindows {
  morning: boolean;
  commute: boolean;
  evening: boolean;
  custom: string;
  customList: string[];
}

export interface ConnectedStationState {
  name: string;
  pm25: string;
  temp: string;
  distance: string;
}

export interface OnboardingFormState {
  isExistingUser: boolean;
  isEditingProfile: boolean;
  isCheckingUserStatus: boolean;
  currentStep: 1 | 2;
  locationQuery: string;
  coords: { lat: number; lng: number };
  vulnerabilities: VulnerabilityKey[];
  commute: CommuteKey;
  indoorSetup: IndoorSetupKey;
  windows: OnboardingWindows;
  customWindowInput: string;
  isDropdownOpen: boolean;
  isDetecting: boolean;
  isSearchingGeocode: boolean;
  osmResults: OsmSearchResult[];
  selectedIndex: number;
  gpsError: string | null;
  connectedStation: ConnectedStationState;
  airQualityData: OpenMeteoAirQuality | null;
  aqSource: "CPCB" | "Open-Meteo";
  isFetchingAirQuality: boolean;
  isOnboardingSaved: boolean;
  isSubmitting: boolean;
}

export type OnboardingAction =
  | { type: "SET_CHECKING_STATUS"; checking: boolean }
  | {
      type: "HYDRATE_EXISTING_USER";
      locationQuery?: string;
      coords?: { lat: number; lng: number };
      vulnerabilities?: VulnerabilityKey[];
      commute?: CommuteKey;
      indoorSetup?: IndoorSetupKey;
      windows?: OnboardingWindows;
    }
  | { type: "SET_EDITING_PROFILE"; editing: boolean; step?: 1 | 2 }
  | { type: "SET_STEP"; step: 1 | 2 }
  | { type: "SET_LOCATION_QUERY"; query: string; clearResults?: boolean }
  | { type: "SET_COORDS"; coords: { lat: number; lng: number } }
  | { type: "SET_STATION"; station: ConnectedStationState }
  | { type: "SET_DROPDOWN_OPEN"; open: boolean }
  | { type: "SET_SELECTED_INDEX"; index: number }
  | { type: "SET_DETECTING"; detecting: boolean }
  | { type: "SET_SEARCHING_GEOCODE"; searching: boolean }
  | { type: "SET_OSM_RESULTS"; results: OsmSearchResult[] }
  | { type: "SET_GPS_ERROR"; error: string | null }
  | { type: "SET_FETCHING_AQ"; fetching: boolean }
  | {
      type: "SET_AIR_QUALITY";
      data: OpenMeteoAirQuality;
      source: "CPCB" | "Open-Meteo";
      station?: ConnectedStationState;
    }
  | { type: "TOGGLE_VULNERABILITY"; key: VulnerabilityKey }
  | { type: "SET_COMMUTE"; commute: CommuteKey }
  | { type: "SET_INDOOR_SETUP"; setup: IndoorSetupKey }
  | { type: "SET_WINDOWS"; windows: OnboardingWindows }
  | { type: "SET_CUSTOM_WINDOW_INPUT"; value: string }
  | { type: "ADD_CUSTOM_WINDOW" }
  | { type: "REMOVE_CUSTOM_WINDOW"; index: number }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "SET_ONBOARDING_SAVED"; saved: boolean };

export const initialOnboardingState: OnboardingFormState = {
  isExistingUser: false,
  isEditingProfile: false,
  isCheckingUserStatus: true,
  currentStep: 1,
  locationQuery: DEFAULT_COORDS.label,
  coords: { lat: DEFAULT_COORDS.lat, lng: DEFAULT_COORDS.lng },
  vulnerabilities: ["children", "seniors"],
  commute: "two_wheeler",
  indoorSetup: "purifier",
  windows: {
    morning: true,
    commute: true,
    evening: true,
    custom: "",
    customList: [],
  },
  customWindowInput: "",
  isDropdownOpen: false,
  isDetecting: false,
  isSearchingGeocode: false,
  osmResults: [],
  selectedIndex: -1,
  gpsError: null,
  connectedStation: {
    name: "Air Telemetry Node (New Delhi)",
    pm25: "Live Sync",
    temp: "Live",
    distance: "0.5 km from pin",
  },
  airQualityData: null,
  aqSource: "Open-Meteo",
  isFetchingAirQuality: false,
  isOnboardingSaved: false,
  isSubmitting: false,
};

export function onboardingReducer(
  state: OnboardingFormState,
  action: OnboardingAction
): OnboardingFormState {
  switch (action.type) {
    case "SET_CHECKING_STATUS":
      return { ...state, isCheckingUserStatus: action.checking };
    case "HYDRATE_EXISTING_USER":
      return {
        ...state,
        isExistingUser: true,
        locationQuery: action.locationQuery ?? state.locationQuery,
        coords: action.coords ?? state.coords,
        vulnerabilities: action.vulnerabilities?.length
          ? action.vulnerabilities
          : state.vulnerabilities,
        commute: action.commute ?? state.commute,
        indoorSetup: action.indoorSetup ?? state.indoorSetup,
        windows: action.windows ?? state.windows,
        connectedStation: action.locationQuery
          ? {
              ...state.connectedStation,
              name: `Air Telemetry Node (${action.locationQuery.split(",")[0]})`,
            }
          : state.connectedStation,
      };
    case "SET_EDITING_PROFILE":
      return {
        ...state,
        isEditingProfile: action.editing,
        currentStep: action.step ?? state.currentStep,
      };
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "SET_LOCATION_QUERY":
      return {
        ...state,
        locationQuery: action.query,
        osmResults: action.clearResults ? [] : state.osmResults,
        isSearchingGeocode: action.clearResults ? false : state.isSearchingGeocode,
      };
    case "SET_COORDS":
      return { ...state, coords: action.coords };
    case "SET_STATION":
      return { ...state, connectedStation: action.station };
    case "SET_DROPDOWN_OPEN":
      return { ...state, isDropdownOpen: action.open };
    case "SET_SELECTED_INDEX":
      return { ...state, selectedIndex: action.index };
    case "SET_DETECTING":
      return { ...state, isDetecting: action.detecting };
    case "SET_SEARCHING_GEOCODE":
      return { ...state, isSearchingGeocode: action.searching };
    case "SET_OSM_RESULTS":
      return { ...state, osmResults: action.results };
    case "SET_GPS_ERROR":
      return { ...state, gpsError: action.error };
    case "SET_FETCHING_AQ":
      return { ...state, isFetchingAirQuality: action.fetching };
    case "SET_AIR_QUALITY":
      return {
        ...state,
        airQualityData: action.data,
        aqSource: action.source,
        connectedStation: action.station ?? state.connectedStation,
      };
    case "TOGGLE_VULNERABILITY": {
      const exists = state.vulnerabilities.includes(action.key);
      return {
        ...state,
        vulnerabilities: exists
          ? state.vulnerabilities.filter((v) => v !== action.key)
          : [...state.vulnerabilities, action.key],
      };
    }
    case "SET_COMMUTE":
      return { ...state, commute: action.commute };
    case "SET_INDOOR_SETUP":
      return { ...state, indoorSetup: action.setup };
    case "SET_WINDOWS":
      return { ...state, windows: action.windows };
    case "SET_CUSTOM_WINDOW_INPUT":
      return { ...state, customWindowInput: action.value };
    case "ADD_CUSTOM_WINDOW": {
      const trimmed = state.customWindowInput.trim();
      if (!trimmed) return state;
      const customList = state.windows.customList.includes(trimmed)
        ? state.windows.customList
        : [...state.windows.customList, trimmed];
      return {
        ...state,
        windows: { ...state.windows, customList, custom: trimmed },
        customWindowInput: "",
      };
    }
    case "REMOVE_CUSTOM_WINDOW": {
      const updated = state.windows.customList.filter((_, idx) => idx !== action.index);
      return {
        ...state,
        windows: {
          ...state.windows,
          customList: updated,
          custom: updated.length > 0 ? updated[updated.length - 1] : "",
        },
      };
    }
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.submitting };
    case "SET_ONBOARDING_SAVED":
      return { ...state, isOnboardingSaved: action.saved };
  }
}
