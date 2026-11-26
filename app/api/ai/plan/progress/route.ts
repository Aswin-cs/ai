import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import { requireAuthEmail } from "@/lib/apiAuth";

function sanitizeBooleanMap(input: unknown): Record<string, boolean> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Record<string, boolean> = {};
  let count = 0;
  for (const [k, v] of Object.entries(input)) {
    if (count >= 100) break;
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    if (typeof k === "string" && k.length <= 120) {
      out[k] = Boolean(v);
      count++;
    }
  }
  return out;
}

/**
 * POST /api/ai/plan/progress
 * Saves the user's checked/unchecked Action Roadmap and Indoor Air Plan progress
 * onto their active AiEvaluation document in MongoDB.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuthEmail("Unauthorized. Please sign in to save your progress.");
    if (auth.response || !auth.email) return auth.response!;

    const body = await req.json();
    const { roadmap, indoorChecklist } = body || {};

    await connectToDatabase();
    const dbUser: any = await User.findOne({ email: auth.email });
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    let evalDoc: any = null;
    if (dbUser.latestAiEvaluation) {
      evalDoc = await AiEvaluation.findById(dbUser.latestAiEvaluation);
    }
    if (!evalDoc) {
      evalDoc = await AiEvaluation.findOne({
        $or: [{ user: dbUser._id }, { userEmail: dbUser.email.toLowerCase() }],
      }).sort({ updatedAt: -1 });
    }

    if (!evalDoc) {
      return NextResponse.json(
        { success: false, error: "No active AI evaluation found to save progress." },
        { status: 404 }
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
  } catch (error: any) {
    console.error("Error saving progress in /api/ai/plan/progress:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save progress" },
      { status: 500 }
    );
  }
}
