import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { RATE_LIMITS } from "@/lib/constants";
import { validateProgressBooleanMap } from "@/lib/validation";

/**
 * POST /api/ai/plan/progress
 * Saves the user's checked/unchecked Action Roadmap and Indoor Air Plan progress
 * onto their active AiEvaluation document in MongoDB.
 */
export const POST = withAuthApiHandler(
  {
    context: "Error saving progress in /api/ai/plan/progress",
    fallbackError: "Failed to save progress",
    unauthorizedMessage: "Unauthorized. Please sign in to save your progress.",
    rateLimit: {
      prefix: "plan-progress",
      limit: RATE_LIMITS.planProgress.limit,
      windowMs: RATE_LIMITS.planProgress.windowMs,
    },
  },
  async (req, auth) => {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > 32 * 1024) {
      return errorResponse("BAD_REQUEST", "Progress payload exceeds 32 KB limit.", 400);
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

    const { roadmap, indoorChecklist } = body;

    await connectToDatabase();
    const dbUser = await User.findOne({ email: auth.email })
      .select("_id email latestAiEvaluation")
      .lean();
    if (!dbUser) {
      return errorResponse("NOT_FOUND", "User not found.", 404);
    }

    let evalDoc = null;
    if (dbUser.latestAiEvaluation) {
      evalDoc = await AiEvaluation.findById(dbUser.latestAiEvaluation);
    }
    if (!evalDoc) {
      evalDoc = await AiEvaluation.findOne({
        $or: [{ user: dbUser._id }, { userEmail: dbUser.email.toLowerCase() }],
      }).sort({ updatedAt: -1 });
    }

    if (!evalDoc) {
      return errorResponse(
        "NOT_FOUND",
        "No active AI evaluation found to save progress.",
        404
      );
    }

    const plan = evalDoc.aiPlan as
      | {
          roadmap?: Array<{ phase?: string; steps?: Array<{ id?: string }> }>;
          indoor_air_plan?: { steps?: unknown[] };
        }
      | undefined;

    const allowedRoadmapIds = new Set<string>();
    for (const phaseGroup of plan?.roadmap || []) {
      const steps = phaseGroup.steps || [];
      steps.forEach((step, idx) => {
        allowedRoadmapIds.add(step.id || `${phaseGroup.phase || "step"}-${idx}`);
      });
    }
    const allowedChecklistIds = new Set<string>();
    (plan?.indoor_air_plan?.steps || []).forEach((_, idx) => {
      allowedChecklistIds.add(`check-${idx}`);
    });

    const safeRoadmap = validateProgressBooleanMap(roadmap, allowedRoadmapIds);
    if (!safeRoadmap.ok) {
      return errorResponse("BAD_REQUEST", safeRoadmap.error, 400);
    }
    const safeChecklist = validateProgressBooleanMap(indoorChecklist, allowedChecklistIds);
    if (!safeChecklist.ok) {
      return errorResponse("BAD_REQUEST", safeChecklist.error, 400);
    }

    evalDoc.progress = {
      roadmap: safeRoadmap.value ?? evalDoc.progress?.roadmap ?? {},
      indoorChecklist: safeChecklist.value ?? evalDoc.progress?.indoorChecklist ?? {},
    };
    evalDoc.markModified("progress");
    await evalDoc.save();

    return NextResponse.json({
      success: true,
      progress: evalDoc.progress,
    });
  }
);
