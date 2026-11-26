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
