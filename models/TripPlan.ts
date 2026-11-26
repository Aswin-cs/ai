import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITripPlanDestination {
  name: string;
  fullName?: string;
  lat: number;
  lng: number;
  usAqi?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  ozone?: number;
  categoryLabel?: string;
}

export interface ITripPlanOutput {
  trip_summary: {
    title: string;
    start: string;
    end: string;
    duration_days: number;
    overall_risk: "low" | "moderate" | "high" | "severe";
    headline: string;
    top_advice: string[];
  };
  places_overview: Array<{
    place: string;
    risk_level: "low" | "moderate" | "high" | "severe";
    main_concern: "pm25" | "pm10" | "ozone" | "no2" | "mixed";
    best_day: string;
    worst_day: string;
    note: string;
  }>;
  days: Array<{
    date: string;
    place: string;
    risk_level: "low" | "moderate" | "high" | "severe";
    data_basis: "forecast" | "seasonal_estimate";
    headline: string;
    periods: Array<{
      period: "morning" | "afternoon" | "evening" | "night";
      time_range: string;
      risk_level: "low" | "moderate" | "high" | "severe";
      aqi?: number;
      pm25?: number;
      do: string;
      avoid: string;
      mask_advice: string;
    }>;
    best_outdoor_window: {
      available: boolean;
      start: string;
      end: string;
      reason: string;
    };
    indoor_tip: string;
    travel_tip?: string;
  }>;
  alerts: Array<{
    date: string;
    severity: "info" | "warning" | "critical";
    message: string;
    action: string;
  }>;
  better_options: Array<{
    suggestion: string;
    reason: string;
    expected_benefit: string;
    estimated: boolean;
  }>;
  packing_list: Array<{
    item: string;
    reason: string;
    priority: "must" | "recommended" | "optional";
  }>;
  roadmap: Array<{
    phase: "before_trip" | "during_trip" | "after_trip";
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
  impact_summary: {
    headline: string;
    estimated_exposure_reduction_pct: number;
    assumptions_note: string;
  };
  assumptions: string[];
  safety_note: string;
  data_confidence: "high" | "medium" | "low";
}

export interface ITripPlan extends Document {
  user?: Types.ObjectId;
  userEmail: string;
  destinations: ITripPlanDestination[];
  startDate: string;
  startTime: string;
  endDate: string;
  language: "en" | "ml";
  householdProfileSnapshot?: {
    vulnerabilities?: string[];
    commute?: string;
    indoorSetup?: string;
    windows?: {
      morning?: boolean;
      commute?: boolean;
      evening?: boolean;
      custom?: string;
      customList?: string[];
    };
  };
  forecastCoverage?: {
    dates_with_forecast: string[];
    dates_without_forecast: string[];
  };
  plan: ITripPlanOutput;
  progress?: {
    roadmapSteps: string[];
    packingItems: string[];
  };
  modelUsed?: string;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const TripPlanSchema = new Schema<ITripPlan>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    destinations: [
      {
        name: { type: String, required: true },
        fullName: { type: String },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        usAqi: { type: Number },
        pm25: { type: Number },
        pm10: { type: Number },
        no2: { type: Number },
        ozone: { type: Number },
        categoryLabel: { type: String },
      },
    ],
    startDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endDate: { type: String, required: true },
    language: {
      type: String,
      enum: ["en", "ml"],
      default: "en",
    },
    householdProfileSnapshot: {
      vulnerabilities: { type: [String], default: [] },
      commute: { type: String },
      indoorSetup: { type: String },
      windows: {
        morning: { type: Boolean, default: true },
        commute: { type: Boolean, default: true },
        evening: { type: Boolean, default: true },
        custom: { type: String, default: "" },
        customList: { type: [String], default: [] },
      },
    },
    forecastCoverage: {
      dates_with_forecast: { type: [String], default: [] },
      dates_without_forecast: { type: [String], default: [] },
    },
    plan: {
      type: Schema.Types.Mixed,
      required: [true, "Trip plan output is required"],
    },
    progress: {
      roadmapSteps: { type: [String], default: [] },
      packingItems: { type: [String], default: [] },
    },
    modelUsed: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const TripPlan: Model<ITripPlan> =
  mongoose.models.TripPlan || mongoose.model<ITripPlan>("TripPlan", TripPlanSchema);

export default TripPlan;
