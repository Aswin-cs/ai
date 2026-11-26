import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAiPlanOutput {
  status: {
    risk_level: "low" | "moderate" | "high" | "severe";
    headline: string;
    plain_explanation: string;
    main_concern: "pm25" | "pm10" | "ozone" | "no2" | "mixed";
  };
  do_this_now: {
    action: string;
    reason: string;
  };
  safe_outdoor_window: {
    available: boolean;
    start: string;
    end: string;
    reason: string;
    expected_pm25: number;
    best_for: string[];
  };
  member_guidance: Array<{
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
  daily_routine: Array<{
    period: "morning" | "afternoon" | "evening" | "night";
    time_range: string;
    risk_level: "low" | "moderate" | "high" | "severe";
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
  roadmap: Array<{
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
  sustainable_swaps: Array<{
    from_habit: string;
    to_habit: string;
    benefit_to_air: string;
    benefit_to_family: string;
    effort: "easy" | "medium" | "hard";
  }>;
  impact_summary: {
    headline: string;
    estimated_exposure_reduction_pct: number;
    assumptions: string;
    community_note: string;
  };
  safety_note: string;
  data_confidence: "high" | "medium" | "low";
}

export interface IAiEvaluation extends Document {
  user: Types.ObjectId; // Reference to User model
  userEmail: string;
  evaluationType: "onboarding_air_plan" | "recalibration" | "room_audit" | "custom_prompt";
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  telemetry: {
    aqi?: number;
    pm25?: number;
    pm10?: number;
    no2?: number;
    ozone?: number;
    co?: number;
    so2?: number;
    category?: string;
  };
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
  aiPlan: IAiPlanOutput | Record<string, any>;
  progress?: {
    roadmap?: Record<string, boolean>;
    indoorChecklist?: Record<string, boolean>;
  };
  modelUsed?: string;
  rawResponse?: Record<string, any> | any;
  response?: Record<string, any> | any;
  promptText?: string;
  attempts?: number;
  fallbackErrors?: any[];
  status?: "active" | "archived" | "superseded";
  createdAt: Date;
  updatedAt: Date;
}

const AiEvaluationSchema: Schema<IAiEvaluation> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    evaluationType: {
      type: String,
      enum: ["onboarding_air_plan", "recalibration", "room_audit", "custom_prompt"],
      default: "onboarding_air_plan",
    },
    location: {
      name: { type: String, default: "" },
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.209 },
    },
    telemetry: {
      aqi: { type: Number },
      pm25: { type: Number },
      pm10: { type: Number },
      no2: { type: Number },
      ozone: { type: Number },
      co: { type: Number },
      so2: { type: Number },
      category: { type: String },
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
    aiPlan: {
      type: Schema.Types.Mixed,
      required: [true, "AI plan details are required"],
    },
    progress: {
      roadmap: { type: Schema.Types.Mixed, default: {} },
      indoorChecklist: { type: Schema.Types.Mixed, default: {} },
    },
    modelUsed: {
      type: String,
      default: "",
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      default: {},
    },
    response: {
      type: Schema.Types.Mixed,
      default: {},
    },
    promptText: {
      type: String,
      default: "",
    },
    attempts: {
      type: Number,
      default: 1,
    },
    fallbackErrors: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "archived", "superseded"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during Next.js hot reload
const AiEvaluation: Model<IAiEvaluation> =
  mongoose.models.AiEvaluation ||
  mongoose.model<IAiEvaluation>("AiEvaluation", AiEvaluationSchema);

export default AiEvaluation;
