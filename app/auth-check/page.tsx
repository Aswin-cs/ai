"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Wind } from "lucide-react";

export default function AuthCheckPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.email) {
      router.replace("/");
      return;
    }

    async function checkUser() {
      try {
        const res = await fetch("/api/user/status");
        if (res.ok) {
          const data = await res.json();
          if (!data.inDb || !data.onboardingCompleted) {
            router.replace("/onboarding");
          } else {
            router.replace("/");
          }
          return;
        }
      } catch (err) {
        console.error("Status check failed:", err);
      }
      router.replace("/onboarding");
    }

    checkUser();
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#0B57D0] flex items-center justify-center text-white mb-4 shadow-sm animate-pulse">
        <Wind className="w-6 h-6 text-white" />
      </div>
      <Loader2 className="w-6 h-6 text-[#0B57D0] animate-spin mb-3" />
      <h2 className="text-lg font-semibold text-[#1F1F1F]">Verifying your profile...</h2>
      <p className="text-xs text-[#444746] mt-1">
        Checking air monitoring calibration in database
      </p>
    </div>
  );
}
