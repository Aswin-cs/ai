import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { checkAndUpdateStalePlan, updateAllStalePlans } from "@/lib/autoUpdatePlan";
import { requireAuthEmail, apiErrorResponse } from "@/lib/apiAuth";

/**
 * POST /api/ai/plan/auto-update
 * Checks if the current authenticated user's AiEvaluation is older than 6 hours.
 * If > 6hr (or force=true), generates a new plan with real-time air quality,
 * deletes the old evaluation documents for that user, and creates the new one.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuthEmail("Unauthorized. Please sign in to auto-update your plan.");
    if (auth.response || !auth.email) return auth.response!;

    let body: { force?: boolean } = {};
    try {
      body = (await req.json()) as { force?: boolean };
    } catch {
      // Optional JSON body
    }

    const force = Boolean(body?.force);

    await connectToDatabase();
    const dbUser = await User.findOne({ email: auth.email });
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      );
    }

    const result = await checkAndUpdateStalePlan(dbUser, force);

    return NextResponse.json({
      success: true,
      updated: result.updated,
      reason: result.reason,
      evaluation: result.evaluation,
    });
  } catch (error: unknown) {
    return apiErrorResponse("Error in /api/ai/plan/auto-update (POST)", error, "Failed to auto-update plan");
  }
}

/**
 * GET /api/ai/plan/auto-update
 * Cron / background trigger: scans all registered users and automatically
 * updates any plan whose AiEvaluation is older than 6 hours.
 */
export async function GET() {
  try {
    const auth = await requireAuthEmail("Unauthorized. Please sign in to run plan auto-update.");
    if (auth.response || !auth.email) return auth.response!;

    const result = await updateAllStalePlans();
    return NextResponse.json({
      success: true,
      scanned: result.scanned,
      updated: result.updated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return apiErrorResponse("Error in /api/ai/plan/auto-update (GET)", error, "Failed to scan and update stale plans");
  }
}
