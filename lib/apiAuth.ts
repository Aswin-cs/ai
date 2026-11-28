import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { logger } from "./logger";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  options?: {
    extra?: Record<string, unknown>;
    headers?: HeadersInit;
  }
) {
  return NextResponse.json(
    {
      success: false,
      ...(options?.extra || {}),
      error: { code, message } satisfies ApiErrorPayload,
    },
    { status, headers: options?.headers }
  );
}

export async function requireAuthEmail(unauthorizedMessage = "Unauthorized.") {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return {
      email: null,
      session: null,
      response: errorResponse("UNAUTHORIZED", unauthorizedMessage, 401),
    };
  }
  return { email, session, response: null };
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function apiErrorResponse(
  context: string,
  error: unknown,
  fallback: string,
  status = 500,
  code?: ApiErrorCode
) {
  logger.error(`${context}:`, error);
  const safeMessage = status >= 500 ? fallback : getErrorMessage(error, fallback);
  const resolvedCode: ApiErrorCode =
    code ?? (status === 400 ? "BAD_REQUEST" : status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR");
  return errorResponse(resolvedCode, safeMessage, status);
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return errorResponse(
    "RATE_LIMITED",
    "Too many requests. Please wait a moment before trying again.",
    429,
    {
      headers: {
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
        "Cache-Control": "no-store",
      },
    }
  );
}
