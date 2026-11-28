import { logger } from "./logger";

export interface EnvValidationResult {
  ok: boolean;
  missing: string[];
}

/**
 * Validates that required production secrets and configuration exist.
 * Skips throwing during `next build` (`NEXT_PHASE=phase-production-build`) so CI
 * builds without runtime secrets remain clean, while logging a clear error at runtime.
 */
export function validateProductionEnv(options?: {
  env?: Record<string, string | undefined>;
  throwOnMissing?: boolean;
}): EnvValidationResult {
  const env = options?.env ?? process.env;
  if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") {
    return { ok: true, missing: [] };
  }

  const missing: string[] = [];
  if (!env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");
  if (!env.MONGODB_URI) missing.push("MONGODB_URI");
  if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!env.GEMINI_API_KEY && !env.GOOGLE_API_KEY) {
    missing.push("GEMINI_API_KEY (or GOOGLE_API_KEY)");
  }

  if (missing.length > 0) {
    const message = `[Env] Missing required production environment variable(s): ${missing.join(", ")}`;
    logger.error(message);
    if (options?.throwOnMissing) {
      throw new Error(message);
    }
    return { ok: false, missing };
  }

  return { ok: true, missing: [] };
}
