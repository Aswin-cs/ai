import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import TripPlan from "@/models/TripPlan";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { RATE_LIMITS } from "@/lib/constants";

function sanitizeStringArray(input: unknown, maxItems = 200): string[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<string>();
  for (const item of input) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed.length > 0 && trimmed.length <= 300) {
        unique.add(trimmed);
      }
    }
    if (unique.size >= maxItems) break;
  }
  return Array.from(unique);
}

/**
 * POST /api/ai/trip-plan/progress
 * Saves marked and unmarked selections for a TripPlan's 3-Phase Action Roadmap
 * and Packing Checklist onto the TripPlan document in MongoDB.
 */
export const POST = withAuthApiHandler(
  {
    context: "Error saving trip progress in /api/ai/trip-plan/progress",
    fallbackError: "Failed to save trip progress",
    unauthorizedMessage: "Unauthorized. Please sign in to save your trip progress.",
    rateLimit: {
      prefix: "trip-progress",
      limit: RATE_LIMITS.tripProgress.limit,
      windowMs: RATE_LIMITS.tripProgress.windowMs,
    },
  },
  async (req, auth) => {
    const body = await req.json();
    const { tripPlanId, roadmapSteps, packingItems } = body || {};

    if (!tripPlanId || typeof tripPlanId !== "string" || !mongoose.Types.ObjectId.isValid(tripPlanId)) {
      return errorResponse("BAD_REQUEST", "Valid tripPlanId is required.", 400);
    }

    await connectToDatabase();
    const tripDoc = await TripPlan.findOne({
      _id: tripPlanId,
      userEmail: auth.email,
      status: "active",
    });

    if (!tripDoc) {
      return errorResponse("NOT_FOUND", "Trip plan not found.", 404);
    }

    tripDoc.progress = {
      roadmapSteps: sanitizeStringArray(roadmapSteps),
      packingItems: sanitizeStringArray(packingItems),
    };
    tripDoc.markModified("progress");
    await tripDoc.save();

    return NextResponse.json({
      success: true,
      progress: tripDoc.progress,
    });
  }
);
