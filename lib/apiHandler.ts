import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { apiErrorResponse, rateLimitResponse, requireAuthEmail } from "./apiAuth";
import { checkRateLimit } from "./rateLimit";

export interface AuthenticatedContext {
  email: string;
  session: Session;
}

export interface AuthApiHandlerOptions {
  context: string;
  fallbackError: string;
  unauthorizedMessage?: string;
  rateLimit?: {
    prefix: string;
    limit: number;
    windowMs: number;
  };
}

/**
 * Wraps authenticated Next.js App Router handlers with consistent
 * session verification, optional per-user rate limiting, and safe 5xx error handling.
 */
export function withAuthApiHandler(
  options: AuthApiHandlerOptions,
  handler: (req: Request, auth: AuthenticatedContext) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const auth = await requireAuthEmail(options.unauthorizedMessage);
      if (auth.response || !auth.email || !auth.session) {
        return auth.response!;
      }

      if (options.rateLimit) {
        const rl = checkRateLimit(
          `${options.rateLimit.prefix}:${auth.email}`,
          options.rateLimit.limit,
          options.rateLimit.windowMs
        );
        if (!rl.allowed) {
          return rateLimitResponse(rl.retryAfterSeconds);
        }
      }

      return await handler(req, { email: auth.email, session: auth.session });
    } catch (error: unknown) {
      return apiErrorResponse(options.context, error, options.fallbackError);
    }
  };
}
