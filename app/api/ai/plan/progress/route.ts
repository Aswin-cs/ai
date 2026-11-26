import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";

/**
 * POST /api/ai/plan/progress
 * Saves the user's checked/unchecked Action Roadmap and Indoor Air Plan progress
 * onto their active AiEvaluation document in MongoDB.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to save your progress." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { roadmap, indoorChecklist } = body || {};

    await connectToDatabase();
    const dbUser: any = await User.findOne({ email: session.user.email });
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

    evalDoc.progress = {
      roadmap: roadmap && typeof roadmap === "object" ? roadmap : evalDoc.progress?.roadmap || {},
      indoorChecklist:
        indoorChecklist && typeof indoorChecklist === "object"
          ? indoorChecklist
          : evalDoc.progress?.indoorChecklist || {},
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
