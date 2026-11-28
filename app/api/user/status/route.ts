import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AiEvaluation from "@/models/AiEvaluation";
import { checkAndUpdateStalePlan } from "@/lib/autoUpdatePlan";
import { withAuthApiHandler } from "@/lib/apiHandler";
import { RATE_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const GET = withAuthApiHandler(
  {
    context: "Error in /api/user/status",
    fallbackError: "Failed to check user status",
    unauthorizedMessage: "Unauthorized. Please sign in to view user status.",
    rateLimit: {
      prefix: "user-status",
      limit: RATE_LIMITS.userStatus.limit,
      windowMs: RATE_LIMITS.userStatus.windowMs,
    },
  },
  async (_req, auth) => {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        {
          authenticated: true,
          inDb: false,
          onboardingCompleted: false,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    await connectToDatabase();
    const evalProjection = "-promptText -rawResponse -response -attempts";
    const dbUser = await User.findOne({ email: auth.email }).populate({
      path: "latestAiEvaluation",
      select: evalProjection,
    });

    let finalUser = dbUser ? dbUser.toObject() : null;
    let fallbackEvalObj: { aiPlan?: unknown } | null = null;

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
        logger.warn("[status] Auto-update / create check error:", autoErr);
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
  }
);
