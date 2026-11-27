import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAuthEmail(unauthorizedMessage = "Unauthorized.") {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return {
      email: null,
      session: null,
      response: NextResponse.json(
        { success: false, error: unauthorizedMessage },
        { status: 401 }
      ),
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
  status = 500
) {
  console.error(`${context}:`, error);
  // Avoid leaking internal DB/SDK error details to clients on 5xx responses
  const safeMessage = status >= 500 ? fallback : getErrorMessage(error, fallback);
  return NextResponse.json(
    { success: false, error: safeMessage },
    { status }
  );
}
