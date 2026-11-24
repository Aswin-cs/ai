import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { checkAndUpdateStalePlan, updateAllStalePlans } from "@/lib/autoUpdatePlan";

/**
 * POST /api/ai/plan/auto-update
 * Checks if the current authenticated user's AiEvaluation is older than 6 hours.
 * If > 6hr (or force=true), generates a new plan with real-time air quality,
 * deletes the old evaluation documents for that user, and creates the new one.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const force = Boolean(body?.force);
    const targetEmail = session?.user?.email || body?.email;

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: "Unauthorized or missing user email" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const dbUser = await User.findOne({ email: targetEmail });
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
  } catch (error: any) {
    console.error("Error in /api/ai/plan/auto-update (POST):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to auto-update plan" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/plan/auto-update
 * Cron / background trigger: scans all registered users and automatically
 * updates any plan whose AiEvaluation is older than 6 hours.
 */
export async function GET() {
  try {
    const result = await updateAllStalePlans();
    return NextResponse.json({
      success: true,
      scanned: result.scanned,
      updated: result.updated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/ai/plan/auto-update (GET):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to scan and update stale plans" },
      { status: 500 }
    );
  }
}
