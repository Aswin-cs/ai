import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { checkAndUpdateStalePlan, updateAllStalePlans } from "@/lib/autoUpdatePlan";
import { errorResponse } from "@/lib/apiAuth";
import { withAuthApiHandler, withPublicApiHandler } from "@/lib/apiHandler";

function verifyCronBearerToken(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return errorResponse("SERVICE_UNAVAILABLE", "Cron endpoint is not configured.", 503);
  }
  const authHeader = req.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) {
    return errorResponse(
      "UNAUTHORIZED",
      "Unauthorized. Valid cron bearer token required.",
      401
    );
  }
  const provided = Buffer.from(authHeader.slice(prefix.length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return errorResponse("FORBIDDEN", "Forbidden. Invalid cron token.", 403);
  }
  return null;
}

export const POST = withAuthApiHandler(
  {
    context: "Error in /api/ai/plan/auto-update (POST)",
    fallbackError: "Failed to auto-update plan",
    unauthorizedMessage: "Unauthorized. Please sign in to auto-update your plan.",
  },
  async (req, auth) => {
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
      return errorResponse("NOT_FOUND", "User not found in database", 404);
    }

    const result = await checkAndUpdateStalePlan(dbUser, force);

    return NextResponse.json({
      success: true,
      updated: result.updated,
      reason: result.reason,
      evaluation: result.evaluation,
    });
  }
);

export const GET = withPublicApiHandler(
  {
    context: "Error in /api/ai/plan/auto-update (GET)",
    fallbackError: "Failed to scan and update stale plans",
  },
  async (req) => {
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
  }
);
