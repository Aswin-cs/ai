import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { apiErrorResponse, rateLimitResponse, requireAuthEmail } from "./apiAuth";
import { checkRateLimit, getClientIp } from "./rateLimit";

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
  checkAuth?: typeof requireAuthEmail;
}

export interface PublicApiHandlerOptions {
  context: string;
  fallbackError: string;
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
      const checkAuth = options.checkAuth ?? requireAuthEmail;
      const auth = await checkAuth(options.unauthorizedMessage);
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

/**
 * Wraps public/system Next.js App Router handlers (e.g. IP-rate-limited telemetry or cron)
 * with consistent IP rate limiting and safe structured error responses.
 */
export function withPublicApiHandler(
  options: PublicApiHandlerOptions,
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      if (options.rateLimit) {
        const rl = checkRateLimit(
          `${options.rateLimit.prefix}:${getClientIp(req)}`,
          options.rateLimit.limit,
          options.rateLimit.windowMs
        );
        if (!rl.allowed) {
          return rateLimitResponse(rl.retryAfterSeconds);
        }
      }

      return await handler(req);
    } catch (error: unknown) {
      return apiErrorResponse(options.context, error, options.fallbackError);
    }
  };
}
