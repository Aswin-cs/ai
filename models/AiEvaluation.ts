import mongoose, { Schema, Document, Model, Types } from "mongoose";

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
  aiPlan: Record<string, any>;
  modelUsed?: string;
  rawResponse?: string;
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
    modelUsed: {
      type: String,
      default: "",
    },
    rawResponse: {
      type: String,
      default: "",
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
