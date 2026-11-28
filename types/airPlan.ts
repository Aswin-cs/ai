export type RiskLevel = "low" | "moderate" | "high" | "severe";
export type MainConcern = "pm25" | "pm10" | "ozone" | "no2" | "mixed";

export interface Pollutants {
  pm25: number;
  pm10: number;
  no2: number;
  ozone?: number;
  co?: number;
  so2?: number;
}

export interface HouseholdProfileState {
  vulnerabilities?: string[];
  commute?: string;
  indoorSetup?: string;
}

export interface UserProfileState {
  location: string;
  coords?: { lat: number; lng: number };
  aqi?: number;
  pollutants?: Pollutants;
  householdProfile?: HouseholdProfileState;
}

export interface HourlyTimelinePoint {
  time: string;
  label: string;
  aqi: number;
  pm25: number;
  pm10: number;
  isNow?: boolean;
}

export interface ChatMessageItem {
  sender: "user" | "ai";
  text: string;
  time: string;
  tag?: string;
  imageUrl?: string;
  suggestPlanningMode?: boolean;
}

export interface AirPlan {
  status?: {
    risk_level: RiskLevel;
    headline: string;
    plain_explanation: string;
    main_concern: MainConcern;
  };
  do_this_now?: {
    action: string;
    reason: string;
  };
  safe_outdoor_window?: {
    available: boolean;
    start: string;
    end: string;
    reason: string;
    expected_pm25: number;
    best_for: string[];
  };
  member_guidance?: Array<{
    member: "young_children" | "senior_citizens" | "asthma_respiratory" | "working_adult";
    outdoor_limit: string;
    mask_advice: string;
    key_tips: string[];
    warning_signs?: string[];
  }>;
  outdoor_window_review?: Array<{
    usual_activity: string;
    verdict: "keep" | "shift" | "cancel";
    suggestion: string;
  }>;
  daily_routine?: Array<{
    period: "morning" | "afternoon" | "evening" | "night";
    time_range: string;
    risk_level: RiskLevel;
    instead_of: string;
    do_this: string;
    why_it_matters: string;
    impact: {
      badge: string;
      estimated: boolean;
    };
  }>;
  indoor_air_plan?: {
    setup: "hepa_purifier" | "natural_ventilation";
    steps: Array<{
      action: string;
      when: string;
      cost: "free" | "low" | "medium";
    }>;
  };
  commute_plan?: {
    mode: string;
    best_departure: string;
    protection: string;
    tips: string[];
  };
  roadmap?: Array<{
    phase: "now" | "today" | "this_week" | "this_month";
    title: string;
    goal: string;
    steps: Array<{
      id: string;
      action: string;
      when: string;
      who: string;
      why: string;
      impact_badge: string;
      effort: "easy" | "medium" | "hard";
      cost: "free" | "low" | "medium";
    }>;
  }>;
  sustainable_swaps?: Array<{
    from_habit: string;
    to_habit: string;
    benefit_to_air: string;
    benefit_to_family: string;
    effort: "easy" | "medium" | "hard";
  }>;
  impact_summary?: {
    headline: string;
    estimated_exposure_reduction_pct: number;
    assumptions: string;
    community_note: string;
  };
  safety_note?: string;
  data_confidence?: "high" | "medium" | "low";
  safeOutdoorWindow?: {
    startTime?: string;
    endTime?: string;
    lowestEstimatedPm25?: number;
    reasoning?: string;
  };
  [key: string]: unknown;
}
