import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import { checkAndUpdateStalePlan } from "@/lib/autoUpdatePlan";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
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
    let dbUser = await User.findOne({ email: session.user.email }).populate("latestAiEvaluation");

    // Check if no AiEvaluation collection/document is found or if it is stale (> 6 hours).
    // In either case, automatically create a new one using the API.
    if (dbUser) {
      try {
        let existingEval: any = dbUser.latestAiEvaluation;
        if (!existingEval) {
          existingEval = await AiEvaluation.findOne({
            $or: [{ user: dbUser._id }, { userEmail: dbUser.email.toLowerCase() }],
          }).sort({ updatedAt: -1 });
          if (existingEval) {
            dbUser.latestAiEvaluation = existingEval._id;
            dbUser.aiPlan = existingEval.aiPlan;
            await dbUser.save();
          }
        }
        const noEvalFound = !existingEval;
        const updateCheck = await checkAndUpdateStalePlan(dbUser, noEvalFound);
        if (updateCheck.updated) {
          dbUser = await User.findOne({ email: session.user.email }).populate("latestAiEvaluation");
        }
      } catch (autoErr) {
        console.warn("[status] Auto-update / create check error:", autoErr);
      }
    }

    const finalUser: any = dbUser
      ? await User.findOne({ email: session.user.email }).populate("latestAiEvaluation").lean()
      : null;

    const latestEvalDoc: any = finalUser?.latestAiEvaluation;
    let resolvedAiPlan = latestEvalDoc?.aiPlan || finalUser?.aiPlan || null;
    if (typeof resolvedAiPlan === "string") {
      try {
        resolvedAiPlan = JSON.parse(resolvedAiPlan);
      } catch {}
    }

    return NextResponse.json(
      {
        authenticated: true,
        inDb: !!finalUser,
        onboardingCompleted: !!finalUser?.onboardingCompleted,
        user: finalUser
          ? {
            id: finalUser._id.toString(),
            name: finalUser.name,
            email: finalUser.email,
            image: finalUser.image,
            defaultLocation: finalUser.defaultLocation,
            householdProfile: finalUser.householdProfile,
            aiPlan: resolvedAiPlan,
            latestAiEvaluation: latestEvalDoc,
          }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Error in /api/user/status:", error);
    return NextResponse.json(
      {
        authenticated: true,
        inDb: false,
        onboardingCompleted: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
