import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import TripPlan from "@/models/TripPlan";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { RATE_LIMITS } from "@/lib/constants";
import { validateKnownProgressIds } from "@/lib/validation";

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
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > 32 * 1024) {
      return errorResponse("BAD_REQUEST", "Trip progress payload exceeds 32 KB limit.", 400);
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return errorResponse("BAD_REQUEST", "Request body must be an object.", 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON body.", 400);
    }

    const { tripPlanId, roadmapSteps, packingItems } = body;

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

    const allowedRoadmapIds = new Set<string>();
    for (const phase of tripDoc.plan?.roadmap || []) {
      for (const step of phase.steps || []) {
        if (step.id) allowedRoadmapIds.add(step.id);
      }
    }
    const allowedPackingItems = new Set<string>(
      (tripDoc.plan?.packing_list || []).map((p) => p.item).filter(Boolean)
    );

    const roadmapCheck = validateKnownProgressIds(roadmapSteps, allowedRoadmapIds);
    if (!roadmapCheck.ok) {
      return errorResponse("BAD_REQUEST", roadmapCheck.error, 400);
    }
    const packingCheck = validateKnownProgressIds(packingItems, allowedPackingItems);
    if (!packingCheck.ok) {
      return errorResponse("BAD_REQUEST", packingCheck.error, 400);
    }

    tripDoc.progress = {
      roadmapSteps: roadmapCheck.ids,
      packingItems: packingCheck.ids,
    };
    tripDoc.markModified("progress");
    await tripDoc.save();

    return NextResponse.json({
      success: true,
      progress: tripDoc.progress,
    });
  }
);
