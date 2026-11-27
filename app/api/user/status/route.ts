import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import { checkAndUpdateStalePlan } from "@/lib/autoUpdatePlan";
import { requireAuthEmail, getErrorMessage } from "@/lib/apiAuth";

export async function GET() {
  const auth = await requireAuthEmail("Unauthorized. Please sign in to view user status.");
  if (auth.response || !auth.email) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        inDb: false,
        onboardingCompleted: false,
        error: "Unauthorized. Please sign in to view user status.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json({
      authenticated: true,
      inDb: false,
      onboardingCompleted: false,
    });
  }

  try {
    await connectToDatabase();
    const evalProjection = "-promptText -rawResponse -response -attempts";
    const dbUser = await User.findOne({ email: auth.email }).populate({
      path: "latestAiEvaluation",
      select: evalProjection,
    });

    let finalUser = dbUser ? dbUser.toObject() : null;
    let fallbackEvalObj: { aiPlan?: unknown } | null = null;

    // Check if no AiEvaluation collection/document is found or if it is stale (> 6 hours).
    // In either case, automatically create a new one using the API.
    if (dbUser) {
      try {
        let existingEval: unknown = dbUser.latestAiEvaluation;
        if (!existingEval) {
          const fallbackEval = await AiEvaluation.findOne({
            $or: [{ user: dbUser._id }, { userEmail: dbUser.email.toLowerCase() }],
          })
            .select(evalProjection)
            .sort({ updatedAt: -1 });
          if (fallbackEval) {
            dbUser.latestAiEvaluation = fallbackEval._id;
            dbUser.aiPlan = fallbackEval.aiPlan;
            await dbUser.save();
            existingEval = fallbackEval;
            fallbackEvalObj = fallbackEval.toObject() as { aiPlan?: unknown };
          }
        }
        if (existingEval) {
          const updateCheck = await checkAndUpdateStalePlan(dbUser, false);
          if (updateCheck.updated) {
            finalUser = await User.findOne({ email: auth.email })
              .populate({ path: "latestAiEvaluation", select: evalProjection })
              .lean();
            fallbackEvalObj = null;
          }
        }
      } catch (autoErr) {
        console.warn("[status] Auto-update / create check error:", autoErr);
      }
    }

    const latestEvalDoc = (fallbackEvalObj || finalUser?.latestAiEvaluation) as
      | { aiPlan?: unknown }
      | null
      | undefined;
    const hasAiEvaluation = Boolean(latestEvalDoc);
    let resolvedAiPlan = hasAiEvaluation ? latestEvalDoc?.aiPlan || finalUser?.aiPlan || null : null;
    if (typeof resolvedAiPlan === "string") {
      try {
        resolvedAiPlan = JSON.parse(resolvedAiPlan);
      } catch {
        // Keep string if unparseable
      }
    }

    return NextResponse.json(
      {
        authenticated: true,
        inDb: !!finalUser,
        onboardingCompleted: !!finalUser?.onboardingCompleted && hasAiEvaluation,
        hasAiEvaluation,
        user: finalUser
          ? {
            id: String(finalUser._id),
            name: finalUser.name,
            email: finalUser.email,
            image: finalUser.image,
            defaultLocation: finalUser.defaultLocation,
            householdProfile: finalUser.householdProfile,
            aiPlan: resolvedAiPlan,
            latestAiEvaluation: latestEvalDoc || null,
          }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    console.error("Error in /api/user/status:", error);
    return NextResponse.json(
      {
        authenticated: true,
        inDb: false,
        onboardingCompleted: false,
        error: getErrorMessage(error, "Failed to check user status"),
      },
      { status: 500 }
    );
  }
}
