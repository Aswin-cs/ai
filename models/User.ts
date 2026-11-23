import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  emailVerified?: Date | null;
  googleId?: string;
  role?: "user" | "admin";
  onboardingCompleted?: boolean;
  defaultLocation?: {
    name: string;
    lat: number;
    lng: number;
  };
  savedLocations?: Array<{
    name: string;
    lat: number;
    lng: number;
    lastAqi?: number;
    savedAt: Date;
  }>;
  householdProfile?: {
    vulnerabilities: string[];
    commute: string;
    indoorSetup: string;
    windows: {
      morning: boolean;
      commute: boolean;
      evening: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    defaultLocation: {
      name: { type: String, default: "" },
      lat: { type: Number, default: 28.7144 },
      lng: { type: Number, default: 77.1264 },
    },
    savedLocations: [
      {
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        lastAqi: { type: Number },
        savedAt: { type: Date, default: Date.now },
      },
    ],
    householdProfile: {
      vulnerabilities: {
        type: [String],
        default: ["children", "seniors"],
      },
      commute: {
        type: String,
        default: "two_wheeler",
      },
      indoorSetup: {
        type: String,
        default: "purifier",
      },
      windows: {
        morning: { type: Boolean, default: true },
        commute: { type: Boolean, default: true },
        evening: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during Next.js Turbopack hot reloading
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
