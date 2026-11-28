import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { sanitizeBooleanMap } from "@/lib/validation";

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
  },
  async (req, auth) => {
    const body = await req.json();
    const { roadmap, indoorChecklist } = body || {};

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

    const safeRoadmap = sanitizeBooleanMap(roadmap);
    const safeChecklist = sanitizeBooleanMap(indoorChecklist);

    evalDoc.progress = {
      roadmap: safeRoadmap ?? evalDoc.progress?.roadmap ?? {},
      indoorChecklist: safeChecklist ?? evalDoc.progress?.indoorChecklist ?? {},
    };
    evalDoc.markModified("progress");
    await evalDoc.save();

    return NextResponse.json({
      success: true,
      progress: evalDoc.progress,
    });
  }
);
