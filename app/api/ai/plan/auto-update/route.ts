import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { checkAndUpdateStalePlan, updateAllStalePlans } from "@/lib/autoUpdatePlan";
import { requireAuthEmail, apiErrorResponse } from "@/lib/apiAuth";

function verifyCronBearerToken(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "Cron endpoint is not configured." },
      { status: 503 }
    );
  }
  const authHeader = req.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Valid cron bearer token required." },
      { status: 401 }
    );
  }
  const provided = Buffer.from(authHeader.slice(prefix.length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return NextResponse.json(
      { success: false, error: "Forbidden. Invalid cron token." },
      { status: 403 }
    );
  }
  return null;
}

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
export async function GET(req: Request) {
  try {
    const cronAuthError = verifyCronBearerToken(req);
    if (cronAuthError) return cronAuthError;

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
