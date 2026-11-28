"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Wind } from "lucide-react";
import { fetchUserStatus } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function AuthCheckPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.email) {
      router.replace("/");
      return;
    }

    const controller = new AbortController();

    async function checkUser() {
      try {
        const data = await fetchUserStatus(controller.signal);
        if (!data.inDb || !data.onboardingCompleted) {
          router.replace("/onboarding");
        } else {
          router.replace("/");
        }
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        logger.error("Status check failed:", err);
      }
      router.replace("/onboarding");
    }

    void checkUser();
    return () => controller.abort();
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary mb-4 shadow-sm animate-pulse">
        <Wind className="w-6 h-6" aria-hidden="true" />
      </div>
      <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-on-surface">Verifying your profile...</h1>
      <p className="text-xs text-on-surface-variant mt-1">
        Checking air monitoring calibration in database
      </p>
    </div>
  );
}
