import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import TripPlan from "@/models/TripPlan";
import { requireAuthEmail, apiErrorResponse } from "@/lib/apiAuth";

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
export async function POST(req: Request) {
  try {
    const auth = await requireAuthEmail("Unauthorized. Please sign in to save your trip progress.");
    if (auth.response || !auth.email) return auth.response!;

    const body = await req.json();
    const { tripPlanId, roadmapSteps, packingItems } = body || {};

    if (!tripPlanId || typeof tripPlanId !== "string" || !mongoose.Types.ObjectId.isValid(tripPlanId)) {
      return NextResponse.json(
        { success: false, error: "Valid tripPlanId is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const tripDoc = await TripPlan.findOne({
      _id: tripPlanId,
      userEmail: auth.email,
      status: "active",
    });

    if (!tripDoc) {
      return NextResponse.json(
        { success: false, error: "Trip plan not found." },
        { status: 404 }
      );
    }

    const safeRoadmapSteps = sanitizeStringArray(roadmapSteps);
    const safePackingItems = sanitizeStringArray(packingItems);

    tripDoc.progress = {
      roadmapSteps: safeRoadmapSteps,
      packingItems: safePackingItems,
    };
    tripDoc.markModified("progress");
    await tripDoc.save();

    return NextResponse.json({
      success: true,
      progress: tripDoc.progress,
    });
  } catch (error: unknown) {
    return apiErrorResponse("Error saving trip progress in /api/ai/trip-plan/progress", error, "Failed to save trip progress");
  }
}
