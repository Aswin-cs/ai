"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut, signIn } from "next-auth/react";
import MaterialLoader, { MaterialCircularProgress } from "@/components/MaterialLoader";
import GoogleAuthGate from "@/components/GoogleAuthGate";

// ─── TypeScript interfaces matching the new VayuPulse outputSchema ───
interface AirPlan {
  status?: {
    risk_level: "low" | "moderate" | "high" | "severe";
    headline: string;
    plain_explanation: string;
    main_concern: "pm25" | "pm10" | "ozone" | "no2" | "mixed";
  };
  do_this_now?: {
    action: string;
    reason: string;
  };
  safe_outdoor_window?: {
    available: boolean;
    start: string;
    end: string;
    reason: string;
    expected_pm25: number;
    best_for: string[];
  };
  member_guidance?: Array<{
    member: "young_children" | "senior_citizens" | "asthma_respiratory" | "working_adult";
    outdoor_limit: string;
    mask_advice: string;
    key_tips: string[];
    warning_signs?: string[];
  }>;
  outdoor_window_review?: Array<{
    usual_activity: string;
    verdict: "keep" | "shift" | "cancel";
    suggestion: string;
  }>;
  daily_routine?: Array<{
    period: "morning" | "afternoon" | "evening" | "night";
    time_range: string;
    risk_level: "low" | "moderate" | "high" | "severe";
    instead_of: string;
    do_this: string;
    why_it_matters: string;
    impact: {
      badge: string;
      estimated: boolean;
    };
  }>;
  indoor_air_plan?: {
    setup: "hepa_purifier" | "natural_ventilation";
    steps: Array<{
      action: string;
      when: string;
      cost: "free" | "low" | "medium";
    }>;
  };
  commute_plan?: {
    mode: string;
    best_departure: string;
    protection: string;
    tips: string[];
  };
  roadmap?: Array<{
    phase: "now" | "today" | "this_week" | "this_month";
    title: string;
    goal: string;
    steps: Array<{
      id: string;
      action: string;
      when: string;
      who: string;
      why: string;
      impact_badge: string;
      effort: "easy" | "medium" | "hard";
      cost: "free" | "low" | "medium";
    }>;
  }>;
  sustainable_swaps?: Array<{
    from_habit: string;
    to_habit: string;
    benefit_to_air: string;
    benefit_to_family: string;
    effort: "easy" | "medium" | "hard";
  }>;
  impact_summary?: {
    headline: string;
    estimated_exposure_reduction_pct: number;
    assumptions: string;
    community_note: string;
  };
  safety_note?: string;
  data_confidence?: "high" | "medium" | "low";
  // Optional legacy fields for smooth transition
  [key: string]: any;
}

// ─── Main Dashboard ───
export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();

  const [activeTab, setActiveTab] = useState<
    "daily-plan" | "roadmap" | "indoor-air-lab" | "sustainable-swaps"
  >("daily-plan");

  const [language, setLanguage] = useState<"en" | "ml">("en");
  const [roadmapPhaseFilter, setRoadmapPhaseFilter] = useState<
    "all" | "now" | "today" | "this_week" | "this_month"
  >("all");

  const [userProfile, setUserProfile] = useState<{
    location: string;
    coords?: { lat: number; lng: number };
    aqi?: number;
    pollutants?: { pm25: number; pm10: number; no2: number; ozone?: number; co?: number; so2?: number };
    householdProfile?: {
      vulnerabilities?: string[];
      commute?: string;
      indoorSetup?: string;
    };
  }>({ location: "" });

  const [aiPlan, setAiPlan] = useState<AirPlan | null>(null);
  const [aiEvalMeta, setAiEvalMeta] = useState<{
    modelUsed?: string;
    updatedAt?: string;
    evaluationType?: string;
  } | null>(null);
  const [roadmapCompleted, setRoadmapCompleted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // 12-Hour Air Quality Timeline State (Live Open-Meteo Hourly Forecast)
  const [hourlyTimeline, setHourlyTimeline] = useState<
    Array<{ time: string; label: string; aqi: number; pm25: number; pm10: number; isNow?: boolean }>
  >([]);
  const [timelineMetric, setTimelineMetric] = useState<"aqi" | "pm25">("aqi");
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Interactive state for Indoor checklist
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({});

  // Interactive state for Sustainable swaps toggles
  const [activeSwaps, setActiveSwaps] = useState<Record<string, boolean>>({});

  // Community hub copy state
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Chat widget state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string; tag?: string; imageUrl?: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatImage, setChatImage] = useState<{
    data: string;
    mimeType: string;
    name: string;
    size: number;
  } | null>(null);
  const [chatImageError, setChatImageError] = useState<string | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [isAiReplying, setIsAiReplying] = useState(false);

  // Initial localized greeting for chat
  useEffect(() => {
    if (chatMessages.length === 0 && userProfile.location) {
      const loc = userProfile.location.split(",")[0];
      const aqi = userProfile.aqi ?? 342;
      const aqiDesc = aqi > 300 ? "Very Poor" : aqi > 200 ? "Poor" : "Moderate";
      setChatMessages([
        {
          sender: "ai",
          text: `Namaste! I am VayuPulse AI, calibrated for ${loc}. Current ambient AQI is ${aqi} (${aqiDesc}) with PM2.5 at ${userProfile.pollutants?.pm25 ?? 178} µg/m³. How can I assist your household's air protection today?`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tag: `${loc} Grounded Live`,
        },
      ]);
    }
  }, [userProfile.location, userProfile.aqi]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProfile = localStorage.getItem("vayumitra_user_profile");
      const savedPlan = localStorage.getItem("vayumitra_active_plan");
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setUserProfile((prev) => ({
            ...prev,
            location: parsed.location || prev.location,
            coords: parsed.coords || prev.coords,
            aqi: parsed.aqi ?? prev.aqi,
            pollutants: parsed.pollutants || prev.pollutants,
            householdProfile: parsed.householdProfile || prev.householdProfile,
          }));
        } catch {}
      }
      if (savedPlan) {
        try {
          const parsed = JSON.parse(savedPlan);
          const planObj = parsed?.data && (parsed.data.safeOutdoorWindow || parsed.data.priorityAdvisory)
            ? parsed.data
            : parsed;
          setAiPlan(planObj);
          initSwaps(planObj);
        } catch {}
      }
    }

    async function fetchDbUserStatus() {
      try {
        const res = await fetch("/api/user/status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const evalTel = data.user.latestAiEvaluation?.telemetry;
            const locObj = data.user.defaultLocation;
            const resolvedProfile = {
              location: locObj?.name || "",
              coords: locObj?.lat && locObj?.lng ? { lat: locObj.lat, lng: locObj.lng } : undefined,
              aqi: evalTel?.aqi ?? data.user.aqi,
              pollutants: evalTel?.pm25 != null ? {
                pm25: evalTel.pm25,
                pm10: evalTel.pm10 ?? 0,
                no2: evalTel.no2 ?? 0,
                ozone: evalTel.ozone,
                co: evalTel.co,
                so2: evalTel.so2,
              } : data.user.pollutants,
              householdProfile: data.user.householdProfile,
            };

            setUserProfile((prev) => ({
              ...prev,
              location: resolvedProfile.location || prev.location,
              coords: resolvedProfile.coords || prev.coords,
              aqi: resolvedProfile.aqi ?? prev.aqi,
              pollutants: resolvedProfile.pollutants || prev.pollutants,
              householdProfile: resolvedProfile.householdProfile || prev.householdProfile,
            }));

            if (data.user.latestAiEvaluation) {
              setAiEvalMeta({
                modelUsed: data.user.latestAiEvaluation.modelUsed,
                updatedAt: data.user.latestAiEvaluation.updatedAt || data.user.latestAiEvaluation.createdAt,
                evaluationType: data.user.latestAiEvaluation.evaluationType,
              });
            }

            let raw = data.user.latestAiEvaluation?.aiPlan || data.user.aiPlan;
            if (typeof raw === "string") {
              try {
                raw = JSON.parse(raw);
              } catch {}
            }
            if (raw && typeof raw === "object") {
              const plan = raw?.data && (raw.data.safeOutdoorWindow || raw.data.priorityAdvisory)
                ? raw.data
                : raw;
              setAiPlan(plan);
              initSwaps(plan);

              // Sync authoritative DB data into localStorage
              if (typeof window !== "undefined") {
                localStorage.setItem("vayumitra_active_plan", JSON.stringify(plan));
                localStorage.setItem("vayumitra_user_profile", JSON.stringify(resolvedProfile));
              }
            }
          }
        }
      } catch {}
      setIsLoading(false);
    }

    if (authStatus === "authenticated") {
      fetchDbUserStatus();
    } else if (authStatus === "unauthenticated") {
      setIsLoading(false);
    }
  }, [authStatus]);

  // Fetch accurate 12-Hour Air Quality Timeline anchored to exact current hour & live telemetry
  const fetch12HrTimeline = async (lat: number, lng: number) => {
    setIsLoadingTimeline(true);
    try {
      const res = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide&hourly=pm2_5,pm10,us_aqi&forecast_days=2&timezone=auto`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const current = data.current || {};
        const times: string[] = data.hourly?.time || [];
        const aqis: number[] = data.hourly?.us_aqi || [];
        const pm25s: number[] = data.hourly?.pm2_5 || [];
        const pm10s: number[] = data.hourly?.pm10 || [];

        // Sync live current telemetry with header so graph & header match 100%
        if (current.us_aqi != null) {
          setUserProfile((prev) => ({
            ...prev,
            aqi: Math.round(current.us_aqi),
            pollutants: {
              ...prev.pollutants,
              pm25: Number((current.pm2_5 ?? prev.pollutants?.pm25 ?? 0).toFixed(1)),
              pm10: Number((current.pm10 ?? prev.pollutants?.pm10 ?? 0).toFixed(1)),
              no2: Number((current.nitrogen_dioxide ?? prev.pollutants?.no2 ?? 0).toFixed(1)),
            },
          }));
        }

        // Find the exact starting hour matching current local time at coordinates
        const currentIsoPrefix = typeof current.time === "string" ? current.time.slice(0, 13) : "";
        let startIdx = times.findIndex((t) => t.startsWith(currentIsoPrefix));
        if (startIdx < 0) {
          const nowMs = Date.now() - 30 * 60 * 1000; // within current hour
          startIdx = times.findIndex((t) => new Date(t).getTime() >= nowMs);
          if (startIdx < 0) startIdx = 0;
        }

        const sliceEnd = Math.min(times.length, startIdx + 12);
        const points = [];
        for (let idx = startIdx; idx < sliceEnd; idx++) {
          const t = times[idx];
          const isNow = idx === startIdx;
          const d = new Date(t);
          const label = isNow
            ? "Now"
            : d.toLocaleTimeString([], { hour: "numeric", hour12: true });

          // Anchor the "Now" point to exact live current reading
          const aqiVal = isNow && current.us_aqi != null ? Math.round(current.us_aqi) : Math.round(aqis[idx] ?? 0);
          const pm25Val = isNow && current.pm2_5 != null ? Number(current.pm2_5.toFixed(1)) : Number((pm25s[idx] ?? 0).toFixed(1));
          const pm10Val = isNow && current.pm10 != null ? Number(current.pm10.toFixed(1)) : Number((pm10s[idx] ?? 0).toFixed(1));

          points.push({
            time: t,
            label,
            aqi: aqiVal,
            pm25: pm25Val,
            pm10: pm10Val,
            isNow,
          });
        }

        if (points.length > 0) {
          setHourlyTimeline(points);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch 12h timeline:", err);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  useEffect(() => {
    const lat = userProfile.coords?.lat ?? 28.6139;
    const lng = userProfile.coords?.lng ?? 77.209;
    fetch12HrTimeline(lat, lng);
  }, [userProfile.coords?.lat, userProfile.coords?.lng]);

  function initSwaps(plan: any) {
    const swapsList = plan?.sustainable_swaps || plan?.sustainableSwaps;
    if (swapsList && Array.isArray(swapsList)) {
      const obj: Record<string, boolean> = {};
      swapsList.forEach((s: any, i: number) => {
        const key = s?.id || `swap-${i}`;
        obj[key] = true;
      });
      setActiveSwaps((prev) => ({ ...obj, ...prev }));
    }
  }

  // ─── Recalibrate / Refresh Plan (Rechecks live Air Quality API -> submits to /api/ai/plan) ───
  const handleRecalibratePlan = async (langOverride?: "en" | "ml") => {
    const activeLang = langOverride || language;
    setIsRecalibrating(true);
    try {
      const lat = userProfile.coords?.lat ?? 28.6139;
      const lng = userProfile.coords?.lng ?? 77.209;

      let freshAqi = userProfile.aqi;
      let freshPollutants = userProfile.pollutants;

      // 1. Recheck fresh live air quality values from Open-Meteo API
      try {
        const aqRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`,
          { cache: "no-store" }
        );
        if (aqRes.ok) {
          const aqData = await aqRes.json();
          const current = aqData.current || {};
          freshAqi = Math.round(current.us_aqi ?? freshAqi ?? 145);
          freshPollutants = {
            pm25: Number((current.pm2_5 ?? freshPollutants?.pm25 ?? 88).toFixed(1)),
            pm10: Number((current.pm10 ?? freshPollutants?.pm10 ?? 136).toFixed(1)),
            no2: Number((current.nitrogen_dioxide ?? freshPollutants?.no2 ?? 44).toFixed(1)),
            ozone: Number((current.ozone ?? freshPollutants?.ozone ?? 36).toFixed(1)),
            co: Number((current.carbon_monoxide ?? freshPollutants?.co ?? 640).toFixed(1)),
            so2: Number((current.sulphur_dioxide ?? freshPollutants?.so2 ?? 12).toFixed(1)),
          };
        }
      } catch (aqErr) {
        console.warn("Live Open-Meteo recheck failed, falling back to server telemetry:", aqErr);
      }

      const updatedProfile = {
        ...userProfile,
        aqi: freshAqi,
        pollutants: freshPollutants,
      };
      setUserProfile(updatedProfile);
      fetch12HrTimeline(lat, lng);

      // 2. Submit fresh telemetry to /api/ai/plan (deletes old evaluation & creates new one)
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: updatedProfile.location,
          coords: updatedProfile.coords || { lat, lng },
          aqi: freshAqi,
          pollutants: freshPollutants,
          hourlyForecast: hourlyTimeline.map((pt) => ({
            time: pt.time,
            us_aqi: pt.aqi,
            pm25: pt.pm25,
          })),
          householdProfile: updatedProfile.householdProfile,
          language: activeLang,
          evaluationType: "recalibration",
          refreshTelemetry: freshAqi == null,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const plan = result.data as AirPlan;
          setAiPlan(plan);
          initSwaps(plan);

          // Sync server-resolved telemetry if returned
          if (result.telemetry?.aqi != null) {
            updatedProfile.aqi = result.telemetry.aqi;
            updatedProfile.pollutants = result.telemetry.pollutants || updatedProfile.pollutants;
            setUserProfile({ ...updatedProfile });
          }

          if (typeof window !== "undefined") {
            localStorage.setItem("vayumitra_active_plan", JSON.stringify(plan));
            localStorage.setItem("vayumitra_user_profile", JSON.stringify(updatedProfile));
          }
        }
      }
    } catch (e) {
      console.warn("Recalibrate error:", e);
    } finally {
      setIsRecalibrating(false);
    }
  };

  // ─── Impact calculator (derived from toggled swaps) ───
  const calculateImpact = () => {
    let co2 = 0, pm = 0, savings = 0;
    (aiPlan?.sustainableSwaps || []).forEach((swap: any) => {
      if (swap?.id && activeSwaps[swap.id] !== false) {
        co2 += swap.monthlyCo2SavedKg || 0;
        pm += swap.personalPm25ReductionPercent || 0;
        savings += swap.monthlyMoneySavedInr || 0;
      }
    });
    return {
      co2: `-${co2.toFixed(1)} kg`,
      pm: `-${Math.min(85, Math.round(pm))}%`,
      savings: `₹${Math.round(savings).toLocaleString("en-IN")}`,
    };
  };
  const impactMetrics = calculateImpact();

  // ─── Chat Image Upload (max 1 image, under 5 MB) ───
  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatImageError(null);
    const file = e.target.files?.[0];
    // Reset input value so the same file can be re-selected if needed
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setChatImageError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size >= MAX_BYTES) {
      setChatImageError("Image must be under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setChatImage({
        data: dataUrl,
        mimeType: file.type || "image/jpeg",
        name: file.name,
        size: file.size,
      });
    };
    reader.onerror = () => {
      setChatImageError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // ─── Chat ───
  const handleSendChat = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const userText = (overrideText || chatInput).trim();
    const attachedImage = overrideText ? null : chatImage;
    if ((!userText && !attachedImage) || isAiReplying) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userText || "Analyze this image",
        time: timeStr,
        imageUrl: attachedImage?.data,
      },
    ]);
    if (!overrideText) {
      setChatInput("");
      setChatImage(null);
      setChatImageError(null);
    }
    setIsAiReplying(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          image: attachedImage
            ? { data: attachedImage.data, mimeType: attachedImage.mimeType }
            : undefined,
          history: chatMessages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          location: userProfile.location || "Delhi NCR, India",
          aqi: userProfile.aqi ?? 342,
          pollutants: userProfile.pollutants,
          householdProfile: userProfile.householdProfile,
          safeOutdoorWindow: aiPlan?.safe_outdoor_window || aiPlan?.safeOutdoorWindow,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || "Analysis complete based on local air telemetry.";
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            tag: data.tag || `${(userProfile.location || "Local").split(",")[0]} • AQI ${userProfile.aqi ?? 342}`,
          },
        ]);
      } else {
        throw new Error("Chat failed");
      }
    } catch {
      // Local fallback grounded in telemetry
      const locName = (userProfile.location || "your locality").split(",")[0];
      const aqiVal = userProfile.aqi ?? 342;
      const isSevere = aqiVal > 250;
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `Current AQI in ${locName} is ${aqiVal} (${isSevere ? "Elevated / Very Poor" : "Moderate"}). ${
            isSevere
              ? "Vigorous outdoor activities and unvented exposure are not recommended right now due to ground-level particulate concentration. Wait for the afternoon solar expansion window (~1:30 PM–4:00 PM)."
              : "Outdoor conditions are within moderate limits. Ensure sensitive family members wear N95 masks near busy arterial roads."
          }`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tag: `${locName} Grounded Telemetry`,
        },
      ]);
    } finally {
      setIsAiReplying(false);
    }
  };

  const personaLabel = userProfile.householdProfile?.vulnerabilities?.includes("children")
    ? "Family with Children"
    : userProfile.householdProfile?.vulnerabilities?.includes("seniors")
    ? "Senior Citizen Household"
    : "Active Urban Household";

  // ═══════════════════════════════════════════════════════════════
  // AUTH GATE (Do not allow unauthenticated users on /)
  // ═══════════════════════════════════════════════════════════════
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen w-full bg-surface-bright flex items-center justify-center p-6">
        <MaterialLoader title="VayuPulse" subtitle="Checking your session..." compact />
      </div>
    );
  }

  if (authStatus === "unauthenticated" || !session?.user) {
    return <GoogleAuthGate />;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-surface-bright text-on-surface antialiased font-sans">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="fixed left-0 top-0 h-full w-[220px] bg-surface-container z-50 flex flex-col justify-between py-5 px-3 select-none border-r border-[#E0E3E1]">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-3 px-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">air</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[18px] text-on-surface leading-tight tracking-tight">VayuPulse</span>
              <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Clean Air AI</span>
            </div>
          </Link>

          <div className="px-1">
            <button
              onClick={() => handleRecalibratePlan()}
              disabled={isRecalibrating}
              className="w-full h-11 bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed-variant rounded-full flex items-center justify-center gap-2 px-4 transition-all text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-60"
              type="button"
            >
              <span className={`material-symbols-outlined text-[18px] ${isRecalibrating ? "animate-spin" : ""}`}>refresh</span>
              <span>{isRecalibrating ? "Calibrating..." : "Refresh Plan"}</span>
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {([
              { id: "daily-plan" as const, icon: "today", label: "Daily Plan" },
              { id: "roadmap" as const, icon: "route", label: "Action Roadmap" },
              { id: "indoor-air-lab" as const, icon: "family_restroom", label: "Family & Home" },
              { id: "sustainable-swaps" as const, icon: "eco", label: "Swaps & Impact" },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === tab.id
                    ? "bg-primary-container text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom: Household & Account */}
        <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/30 relative">
          {userProfile.location && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
              <span className="material-symbols-outlined text-secondary text-[20px]">family_restroom</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-on-surface-variant truncate font-semibold uppercase tracking-wider">Household</span>
                <span className="text-xs font-semibold text-on-surface truncate">{userProfile.location.split(",")[0]}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {session?.user?.image ? (
                <img src={session.user.image} alt={session.user.name || "User"} className="w-8 h-8 rounded-full object-cover border border-surface-container" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shrink-0">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-on-surface truncate">{session?.user?.name || "User"}</span>
                <span className="text-[10px] text-on-surface-variant truncate">{session?.user ? "Google User" : "Guest"}</span>
              </div>
            </div>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container cursor-pointer"
              title="Account Menu"
            >
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>

          {userMenuOpen && (
            <div className="absolute bottom-16 left-2 right-2 bg-white rounded-2xl shadow-xl border border-[#E0E3E1] p-2 z-50 animate-scale-in">
              <Link href="/onboarding" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
                <span>Edit Air Profile</span>
              </Link>
              {session?.user ? (
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">logout</span>
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); signIn("google", { callbackUrl: "/auth-check" }); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary hover:bg-[#EAF2FD] rounded-xl transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  <span>Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="pl-[220px]">
        {/* ── TOP HEADER ── */}
        <header className="fixed top-0 left-[220px] right-0 h-[72px] bg-white/90 backdrop-blur-md border-b border-[#E0E3E1] z-20 px-8 flex items-center justify-between shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            {userProfile.location && (
              <Link
                href="/onboarding"
                className="border border-[#D0D5DD] hover:border-[#0B57D0] bg-[#F8F9FA] hover:bg-white text-[#1F1F1F] font-medium text-xs rounded-full px-3.5 py-2 flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#0B57D0]">location_on</span>
                <span className="font-medium max-w-[220px] truncate">{userProfile.location}</span>
              </Link>
            )}
          </div>

          {/* Telemetry strip (only if data present) */}
          {userProfile.aqi != null && (
            <div className="hidden md:flex items-center gap-3 bg-[#F8F9FA] border border-[#E0E3E1] rounded-full px-4 py-1.5 text-xs shadow-inner">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                </span>
                <span className="text-on-surface-variant font-medium">AQI</span>
                <span className="font-bold text-on-surface text-[13px]">{userProfile.aqi}</span>
                <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] border ${
                  userProfile.aqi > 300
                    ? "bg-[#FCE8E6] text-[#B3261E] border-[#F9DEDC]"
                    : userProfile.aqi > 200
                    ? "bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]"
                    : "bg-[#F0FDF4] text-[#14532D] border-[#BBF7D0]"
                }`}>
                  {userProfile.aqi > 300 ? "Very Poor" : userProfile.aqi > 200 ? "Poor" : "Moderate"}
                </span>
              </div>
              {userProfile.pollutants && (
                <>
                  <span className="w-[1px] h-3.5 bg-[#E0E3E1]"></span>
                  <div className="flex items-center gap-3 font-medium text-on-surface-variant text-[11px]">
                    <span>PM2.5 <strong className="text-on-surface font-semibold text-xs ml-0.5">{userProfile.pollutants.pm25}</strong> <span className="text-[10px] text-on-surface-variant/80">µg/m³</span></span>
                    <span className="text-outline-variant/60">•</span>
                    <span>PM10 <strong className="text-on-surface font-semibold text-xs ml-0.5">{userProfile.pollutants.pm10}</strong> <span className="text-[10px] text-on-surface-variant/80">µg/m³</span></span>
                    <span className="text-outline-variant/60">•</span>
                    <span>NO₂ <strong className="text-on-surface font-semibold text-xs ml-0.5">{userProfile.pollutants.no2}</strong> <span className="text-[10px] text-on-surface-variant/80">ppb</span></span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            {/* Language Switcher (en / ml) */}
            <div className="flex items-center bg-surface-container rounded-full p-0.5 border border-[#E0E3E1] text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  if (language !== "en") {
                    setLanguage("en");
                    handleRecalibratePlan("en");
                  }
                }}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === "en" ? "bg-white text-primary shadow-2xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  if (language !== "ml") {
                    setLanguage("ml");
                    handleRecalibratePlan("ml");
                  }
                }}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === "ml" ? "bg-white text-primary shadow-2xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                മലയാളം
              </button>
            </div>

            <button
              onClick={() => handleRecalibratePlan()}
              disabled={isRecalibrating}
              type="button"
              className="h-9 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors text-xs font-medium shadow-2xs cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${isRecalibrating ? "animate-spin" : ""}`}>sync</span>
              <span>{isRecalibrating ? "Recalibrating..." : "Recalibrate"}</span>
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="w-full pt-[72px] min-h-screen bg-surface-bright">
          <div className="max-w-[1280px] w-full mx-auto px-6 py-6 flex flex-col gap-6">

            {/* ── LOADING SCREEN (Google Material 3) ── */}
            {isLoading && !aiPlan && (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                <MaterialLoader
                  title="Calibrating VayuPulse AI"
                  subtitle="Checking live atmospheric telemetry and synchronizing your household air protection strategy..."
                  steps={[
                    { label: "Fetching real-time AQI & PM2.5 telemetry", done: true },
                    { label: "Evaluating boundary layer & safe windows", active: true },
                    { label: "Loading personalized routine & IAQ checklist" },
                  ]}
                />
              </div>
            )}

            {/* ── NO PLAN STATE ── */}
            {!isLoading && !aiPlan && (
              <div className="flex flex-col items-center justify-center gap-6 py-24 animate-fade-in">
                <div className="w-20 h-20 rounded-3xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[44px] text-primary">eco</span>
                </div>
                <div className="text-center max-w-md">
                  <h2 className="text-xl font-bold text-on-surface">Welcome to VayuPulse</h2>
                  <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                    Set up your household profile to generate a personalized air quality protection plan powered by Gemini AI.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/onboarding"
                    className="h-11 px-6 rounded-full bg-primary text-on-primary text-sm font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[20px]">tune</span>
                    Set Up Profile
                  </Link>
                  <button
                    onClick={() => handleRecalibratePlan()}
                    disabled={isRecalibrating}
                    className="h-11 px-6 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-60"
                    type="button"
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isRecalibrating ? "animate-spin" : ""}`}>refresh</span>
                    {isRecalibrating ? "Generating..." : "Generate Plan"}
                  </button>
                </div>
              </div>
            )}

            {/* ── PLAN LOADED: Schema-Driven Dashboard ── */}
            {aiPlan && (
              <>
                {/* ── TOP HERO STATUS & DO THIS NOW BANNER ── */}
                {aiPlan.status && (
                  <div
                    className={`rounded-3xl p-6 border shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-5 items-center animate-fade-in ${
                      aiPlan.status.risk_level === "severe"
                        ? "bg-[#FCE8E6]/60 border-[#F9DEDC]"
                        : aiPlan.status.risk_level === "high"
                        ? "bg-[#FFF3E0]/70 border-[#FFE0B2]"
                        : aiPlan.status.risk_level === "moderate"
                        ? "bg-[#FEF7E0]/80 border-[#FDE293]"
                        : "bg-[#F0FDF4] border-[#BBF7D0]"
                    }`}
                  >
                    {/* Left: Status Headline & Explanation */}
                    <div className="lg:col-span-7 flex flex-col gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            aiPlan.status.risk_level === "severe" || aiPlan.status.risk_level === "high"
                              ? "bg-error text-on-error"
                              : aiPlan.status.risk_level === "moderate"
                              ? "bg-tertiary text-on-tertiary"
                              : "bg-secondary text-on-secondary"
                          }`}
                        >
                          {aiPlan.status.risk_level} risk
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/90 border border-[#E0E3E1] text-[11px] font-semibold text-on-surface uppercase">
                          Focus: {aiPlan.status.main_concern}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/80 text-[10px] font-medium text-on-surface-variant capitalize">
                          Data Confidence: {aiPlan.data_confidence || "medium"}
                        </span>
                      </div>

                      <h1 className="text-xl md:text-2xl font-bold text-on-surface font-headline tracking-tight">
                        {aiPlan.status.headline}
                      </h1>
                      <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
                        {aiPlan.status.plain_explanation}
                      </p>
                    </div>

                    {/* Right: Do This Right Now Action Card */}
                    {aiPlan.do_this_now && (
                      <div className="lg:col-span-5 bg-white rounded-2xl p-4.5 border border-[#E0E3E1] shadow-2xs flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[22px]">bolt</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            Do This Right Now
                          </span>
                          <p className="text-xs md:text-[13px] font-bold text-on-surface leading-snug">
                            {aiPlan.do_this_now.action}
                          </p>
                          <p className="text-[11px] text-on-surface-variant leading-snug">
                            {aiPlan.do_this_now.reason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ TAB 1: DAILY PLAN ═══ */}
                {activeTab === "daily-plan" && (
                  <section className="flex flex-col gap-6 w-full animate-fade-in">
                    {/* Priority Advisory + Safe Window */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                      {/* Safe Outdoor Window */}
                      <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                            <span className="material-symbols-outlined text-[20px]">verified_user</span>
                          </div>
                          <div>
                            <h2 className="text-[17px] font-bold text-on-surface">Safe Outdoor Window</h2>
                            <p className="text-[11px] text-on-surface-variant">Best time for outdoor activities today</p>
                          </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-secondary-container/30 border border-[#CEEAD6] flex flex-col gap-3">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-secondary text-[28px]">schedule</span>
                              <span className="text-2xl font-bold text-secondary font-headline">
                                {aiPlan?.safe_outdoor_window
                                  ? aiPlan.safe_outdoor_window.available
                                    ? `${aiPlan.safe_outdoor_window.start} – ${aiPlan.safe_outdoor_window.end}`
                                    : "No Safe Outdoor Window Today"
                                  : `${aiPlan?.safeOutdoorWindow?.startTime || "1:30 PM"} – ${aiPlan?.safeOutdoorWindow?.endTime || "4:00 PM"}`}
                              </span>
                            </div>
                            {(aiPlan?.safe_outdoor_window?.expected_pm25 != null || aiPlan?.safeOutdoorWindow?.lowestEstimatedPm25 != null) && (
                              <span className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-semibold">
                                Est. PM2.5: {aiPlan?.safe_outdoor_window?.expected_pm25 ?? aiPlan?.safeOutdoorWindow?.lowestEstimatedPm25} µg/m³
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            {aiPlan?.safe_outdoor_window?.reason || aiPlan?.safeOutdoorWindow?.reasoning || "Solar irradiation causes planetary boundary layer expansion, dispersing ground particulates."}
                          </p>
                          {aiPlan?.safe_outdoor_window?.best_for && aiPlan.safe_outdoor_window.best_for.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {aiPlan.safe_outdoor_window.best_for.map((tag: string, i: number) => (
                                <span key={i} className="px-2.5 py-0.5 rounded-full bg-white/90 border border-[#CEEAD6] text-[11px] font-medium text-secondary">
                                  Best for: {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ── 12-HOUR LIVE AIR QUALITY TIMELINE GRAPH ── */}
                        <div className="flex flex-col gap-3 pt-2 border-t border-[#E0E3E1]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[19px]">show_chart</span>
                              <div>
                                <h3 className="text-xs font-bold text-on-surface">
                                  12-Hour Air Quality Timeline
                                </h3>
                                <p className="text-[10px] text-on-surface-variant">
                                  Live hourly forecast for {userProfile.location ? userProfile.location.split(",")[0] : "your location"}
                                </p>
                              </div>
                            </div>

                            {/* Metric Toggle: US AQI vs PM2.5 */}
                            <div className="flex items-center gap-1 p-0.5 bg-surface-container rounded-full">
                              <button
                                type="button"
                                onClick={() => setTimelineMetric("aqi")}
                                className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                                  timelineMetric === "aqi"
                                    ? "bg-white text-primary shadow-2xs"
                                    : "text-on-surface-variant hover:text-on-surface"
                                }`}
                              >
                                US AQI
                              </button>
                              <button
                                type="button"
                                onClick={() => setTimelineMetric("pm25")}
                                className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                                  timelineMetric === "pm25"
                                    ? "bg-white text-primary shadow-2xs"
                                    : "text-on-surface-variant hover:text-on-surface"
                                }`}
                              >
                                PM2.5 (µg/m³)
                              </button>
                            </div>
                          </div>

                          {isLoadingTimeline && hourlyTimeline.length === 0 ? (
                            <div className="h-44 rounded-2xl bg-surface-container-low flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                              <MaterialCircularProgress size={18} strokeWidth={5} />
                              <span>Loading 12-hour forecast...</span>
                            </div>
                          ) : hourlyTimeline.length > 0 ? (
                            (() => {
                              const values = hourlyTimeline.map((pt) =>
                                timelineMetric === "aqi" ? pt.aqi : pt.pm25
                              );
                              const maxVal = Math.max(...values, timelineMetric === "aqi" ? 150 : 60);
                              const minVal = Math.max(0, Math.min(...values) - (maxVal * 0.15));
                              const range = Math.max(1, maxVal - minVal);
                              const width = 640;
                              const height = 160;
                              const padX = 24;
                              const padY = 20;
                              const chartW = width - padX * 2;
                              const chartH = height - padY * 2;

                              const coords = hourlyTimeline.map((pt, i) => {
                                const val = timelineMetric === "aqi" ? pt.aqi : pt.pm25;
                                const x = padX + (i / Math.max(1, hourlyTimeline.length - 1)) * chartW;
                                const y = padY + chartH - ((val - minVal) / range) * chartH;
                                return { x, y, val, pt };
                              });

                              // Smooth cubic bezier SVG path
                              const linePath = coords.reduce((acc, point, i, arr) => {
                                if (i === 0) return `M ${point.x} ${point.y}`;
                                const prev = arr[i - 1];
                                const cx = (prev.x + point.x) / 2;
                                return `${acc} C ${cx} ${prev.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
                              }, "");

                              const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`;

                              const activePoint =
                                hoveredHourIdx != null && coords[hoveredHourIdx]
                                  ? coords[hoveredHourIdx]
                                  : coords[0];

                              const getPointColor = (aqiVal: number) =>
                                aqiVal > 250 ? "#BA1A1A" : aqiVal > 150 ? "#B45309" : "#156D2F";

                              const bestHour = hourlyTimeline.reduce((best, cur) =>
                                cur.aqi < best.aqi ? cur : best, hourlyTimeline[0]
                              );
                              const peakHour = hourlyTimeline.reduce((peak, cur) =>
                                cur.aqi > peak.aqi ? cur : peak, hourlyTimeline[0]
                              );

                              return (
                                <div className="bg-surface-container-low rounded-2xl p-3.5 border border-[#E0E3E1]/70 flex flex-col gap-2">
                                  {/* Selected / Hovered Hour Readout */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: getPointColor(activePoint.pt.aqi) }}
                                      ></span>
                                      <span className="font-bold text-on-surface">
                                        {activePoint.pt.label}
                                      </span>
                                      <span className="text-on-surface-variant">•</span>
                                      <span className="font-semibold text-primary">
                                        AQI {activePoint.pt.aqi}
                                      </span>
                                      <span className="text-on-surface-variant">•</span>
                                      <span className="text-on-surface-variant font-medium">
                                        PM2.5: {activePoint.pt.pm25} µg/m³
                                      </span>
                                      <span className="text-on-surface-variant hidden sm:inline">•</span>
                                      <span className="text-on-surface-variant font-medium hidden sm:inline">
                                        PM10: {activePoint.pt.pm10} µg/m³
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <span className="px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] font-semibold">
                                        Best: {bestHour.label} ({bestHour.aqi})
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-[#FCE8E6] text-[#B3261E] font-semibold">
                                        Peak: {peakHour.label} ({peakHour.aqi})
                                      </span>
                                    </div>
                                  </div>

                                  {/* SVG Line & Area Graph */}
                                  <div className="w-full overflow-hidden">
                                    <svg
                                      viewBox={`0 0 ${width} ${height}`}
                                      className="w-full h-40 overflow-visible select-none"
                                    >
                                      <defs>
                                        <linearGradient id="aqTimelineGradient" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#0B57D0" stopOpacity="0.28" />
                                          <stop offset="100%" stopColor="#0B57D0" stopOpacity="0.02" />
                                        </linearGradient>
                                      </defs>

                                      {/* Horizontal reference gridlines */}
                                      {[0, 0.5, 1].map((ratio, gIdx) => {
                                        const gy = padY + ratio * chartH;
                                        const gVal = Math.round(maxVal - ratio * range);
                                        return (
                                          <g key={gIdx}>
                                            <line
                                              x1={padX}
                                              y1={gy}
                                              x2={width - padX}
                                              y2={gy}
                                              stroke="#D0D5DD"
                                              strokeDasharray="3 3"
                                              strokeWidth="1"
                                            />
                                            <text
                                              x={padX - 6}
                                              y={gy + 3}
                                              textAnchor="end"
                                              className="fill-[#737785] text-[9px]"
                                            >
                                              {gVal}
                                            </text>
                                          </g>
                                        );
                                      })}

                                      {/* Area Fill */}
                                      <path d={areaPath} fill="url(#aqTimelineGradient)" />

                                      {/* Smooth Line */}
                                      <path
                                        d={linePath}
                                        fill="none"
                                        stroke="#0B57D0"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                      />

                                      {/* Interactive Data Nodes */}
                                      {coords.map((c, idx) => {
                                        const isHovered = hoveredHourIdx === idx;
                                        const dotColor = getPointColor(c.pt.aqi);
                                        return (
                                          <g
                                            key={idx}
                                            className="cursor-pointer"
                                            onMouseEnter={() => setHoveredHourIdx(idx)}
                                            onMouseLeave={() => setHoveredHourIdx(null)}
                                          >
                                            {/* Invisible larger hit target */}
                                            <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                                            {/* Vertical guide line on hover */}
                                            {isHovered && (
                                              <line
                                                x1={c.x}
                                                y1={padY}
                                                x2={c.x}
                                                y2={height - padY}
                                                stroke="#0B57D0"
                                                strokeDasharray="2 2"
                                                strokeWidth="1"
                                                opacity="0.5"
                                              />
                                            )}
                                            <circle
                                              cx={c.x}
                                              cy={c.y}
                                              r={isHovered ? 5.5 : 3.5}
                                              fill="#FFFFFF"
                                              stroke={dotColor}
                                              strokeWidth={isHovered ? 3 : 2}
                                              className="transition-all duration-150"
                                            />
                                            {/* X-axis Hour Label */}
                                            <text
                                              x={c.x}
                                              y={height - 2}
                                              textAnchor="middle"
                                              className={`text-[9px] ${
                                                isHovered ? "fill-[#0B57D0] font-bold" : "fill-[#424654]"
                                              }`}
                                            >
                                              {idx % 2 === 0 || isHovered ? c.pt.label : ""}
                                            </text>
                                          </g>
                                        );
                                      })}
                                    </svg>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="h-32 rounded-2xl bg-surface-container-low flex items-center justify-center text-xs text-on-surface-variant">
                              12-hour forecast unavailable right now.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Usual Window Review, Impact Preview & Member Limits */}
                      <div className="lg:col-span-4 bg-surface-container rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-4">
                        <div className="flex flex-col gap-4">
                          {/* Impact Reduction Highlight */}
                          {aiPlan?.impact_summary && (
                            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-[#E0E3E1] flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-bold text-sm shrink-0">
                                ~{aiPlan.impact_summary.estimated_exposure_reduction_pct}%
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                  Estimated Protection
                                </span>
                                <span className="text-xs font-semibold text-on-surface leading-snug">
                                  {aiPlan.impact_summary.headline}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Usual Outdoor Window Review */}
                          {aiPlan?.outdoor_window_review && aiPlan.outdoor_window_review.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                Your Usual Windows Review
                              </span>
                              {aiPlan.outdoor_window_review.map((rev, idx) => (
                                <div key={idx} className="p-3 bg-surface-container-lowest rounded-2xl border border-[#E0E3E1] flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-on-surface">{rev.usual_activity}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                      rev.verdict === "keep" ? "bg-secondary-container text-on-secondary-container" :
                                      rev.verdict === "shift" ? "bg-tertiary-fixed text-on-tertiary-fixed" :
                                      "bg-error-container text-on-error-container"
                                    }`}>
                                      {rev.verdict}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-on-surface-variant leading-snug">{rev.suggestion}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick Member Exposure Limits */}
                          {aiPlan?.member_guidance && aiPlan.member_guidance.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                  Member Outdoor Limits
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("indoor-air-lab")}
                                  className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                                >
                                  View all tips
                                </button>
                              </div>
                              {aiPlan.member_guidance.map((mg, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-container-lowest rounded-xl border border-[#E0E3E1] text-[11px]">
                                  <span className="font-semibold text-on-surface capitalize">{mg.member.replace("_", " ")}</span>
                                  <span className="text-secondary font-medium truncate max-w-[165px]">{mg.outdoor_limit}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab("roadmap")}
                          className="w-full h-10 rounded-full bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs hover:opacity-95 transition-opacity cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">route</span>
                          <span>Open Checkable Roadmap</span>
                        </button>
                      </div>
                    </div>

                    {/* Daily Routine Plan (morning, afternoon, evening, night) */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[22px]">schedule</span>
                        <h3 className="text-[17px] font-bold text-on-surface">Daily Routine Plan</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(aiPlan?.daily_routine || []).map((routine, idx) => (
                          <div
                            key={idx}
                            className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-[#E0E3E1] flex flex-col justify-between hover:shadow-md transition-shadow"
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10.5px] font-semibold capitalize ${
                                  routine.risk_level === "severe" || routine.risk_level === "high"
                                    ? "bg-error-container text-on-error-container"
                                    : routine.risk_level === "moderate"
                                    ? "bg-tertiary-fixed text-on-tertiary-fixed"
                                    : "bg-secondary-container text-on-secondary-container"
                                }`}>
                                  {routine.period} • {routine.time_range}
                                </span>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                {routine.instead_of && (
                                  <span className="text-[11px] text-on-surface-variant line-through">
                                    Instead of: {routine.instead_of}
                                  </span>
                                )}
                                <p className="text-xs font-bold text-on-surface leading-relaxed">
                                  {routine.do_this}
                                </p>
                              </div>

                              {routine.why_it_matters && (
                                <details className="text-[11px] text-on-surface-variant">
                                  <summary className="cursor-pointer font-semibold text-primary hover:underline">Why it matters</summary>
                                  <p className="mt-1 leading-snug">{routine.why_it_matters}</p>
                                </details>
                              )}
                            </div>

                            {routine.impact?.badge && (
                              <div className="mt-4 p-2.5 rounded-2xl bg-surface-container flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[16px] shrink-0">insights</span>
                                <span className="text-[11px] font-semibold text-on-surface">
                                  {routine.impact.badge}
                                </span>
                                {routine.impact.estimated && (
                                  <span className="text-[9px] text-on-surface-variant ml-auto">(est.)</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Safety Note Banner */}
                    {aiPlan?.safety_note && (
                      <div className="p-4 rounded-2xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-xs text-on-surface">
                        <span className="material-symbols-outlined text-error text-[20px] shrink-0">medical_services</span>
                        <p className="leading-relaxed">{aiPlan.safety_note}</p>
                      </div>
                    )}
                  </section>
                )}

                {/* ═══ TAB: ACTION ROADMAP (Extracted from AiEvaluation roadmap[]) ═══ */}
                {activeTab === "roadmap" && (() => {
                  const phases = aiPlan?.roadmap || [];
                  const allSteps = phases.flatMap((p) => p.steps || []);
                  const completedCount = allSteps.filter((st) => roadmapCompleted[st.id]).length;
                  const progressPct = allSteps.length > 0 ? Math.round((completedCount / allSteps.length) * 100) : 0;

                  const phaseStyle = (phase: string) => {
                    if (phase === "now") return "bg-error-container text-on-error-container";
                    if (phase === "today") return "bg-primary-fixed text-on-primary-fixed-variant";
                    if (phase === "this_week") return "bg-secondary-container text-on-secondary-container";
                    return "bg-tertiary-fixed text-on-tertiary-fixed";
                  };

                  return (
                    <section className="flex flex-col gap-6 w-full animate-fade-in">
                      {/* Roadmap Header & Progress */}
                      <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                              <span className="material-symbols-outlined text-[24px]">route</span>
                            </div>
                            <div>
                              <h2 className="text-[17px] font-bold text-on-surface">
                                Your Personalized Air Protection Roadmap
                              </h2>
                              <p className="text-[11px] text-on-surface-variant">
                                Extracted from your active AI Evaluation
                                {aiEvalMeta?.modelUsed ? ` • Model: ${aiEvalMeta.modelUsed}` : ""}
                                {aiEvalMeta?.updatedAt ? ` • Updated ${new Date(aiEvalMeta.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                              </p>
                            </div>
                          </div>

                          <span className="px-3.5 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold">
                            {completedCount} of {allSteps.length} Done ({progressPct}%)
                          </span>
                        </div>

                        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        {/* Phase Filter Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {([
                            { id: "all", label: "All Phases" },
                            { id: "now", label: "Now (1-2h)" },
                            { id: "today", label: "Today" },
                            { id: "this_week", label: "This Week" },
                            { id: "this_month", label: "This Month" },
                          ] as const).map((pill) => (
                            <button
                              key={pill.id}
                              type="button"
                              onClick={() => setRoadmapPhaseFilter(pill.id)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                roadmapPhaseFilter === pill.id
                                  ? "bg-primary text-on-primary shadow-2xs"
                                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                              }`}
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Phases from AiEvaluation.roadmap */}
                      {phases
                        .filter((p) => roadmapPhaseFilter === "all" || p.phase === roadmapPhaseFilter)
                        .map((phaseGroup, pIdx) => (
                        <div key={pIdx} className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E0E3E1]">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${phaseStyle(phaseGroup.phase)}`}>
                                  {phaseGroup.phase.replace("_", " ")}
                                </span>
                                <h3 className="text-sm font-bold text-on-surface">{phaseGroup.title}</h3>
                              </div>
                              <p className="text-xs text-on-surface-variant">{phaseGroup.goal}</p>
                            </div>
                          </div>

                          <div className="relative flex flex-col gap-4 pl-6 border-l-2 border-[#DAE2FF] ml-2">
                            {(phaseGroup.steps || []).map((step) => {
                              const isDone = !!roadmapCompleted[step.id];
                              return (
                                <div
                                  key={step.id}
                                  onClick={() =>
                                    setRoadmapCompleted((prev) => ({ ...prev, [step.id]: !isDone }))
                                  }
                                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                                    isDone
                                      ? "bg-surface-container-low/60 border-[#E0E3E1] opacity-75"
                                      : "bg-surface-container-low hover:bg-surface-container border-[#E0E3E1]"
                                  }`}
                                >
                                  <div
                                    className={`absolute -left-[35px] top-4 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-2xs transition-colors ${
                                      isDone ? "bg-secondary text-white" : "bg-primary text-white"
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[12px]">
                                      {isDone ? "check" : "bolt"}
                                    </span>
                                  </div>

                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                        <span className="font-bold text-primary">{step.when}</span>
                                        <span className="text-on-surface-variant">•</span>
                                        <span className="font-semibold text-on-surface-variant">For: {step.who}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-white border border-[#E0E3E1] font-semibold capitalize">
                                          Effort: {step.effort}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold capitalize">
                                          Cost: {step.cost}
                                        </span>
                                      </div>

                                      <h4 className={`text-xs font-bold ${isDone ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                                        {step.action}
                                      </h4>
                                      <p className="text-[11px] text-on-surface-variant leading-snug">
                                        {step.why}
                                      </p>
                                      {step.impact_badge && (
                                        <div className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary mt-0.5">
                                          <span className="material-symbols-outlined text-[14px]">insights</span>
                                          <span>{step.impact_badge} (est.)</span>
                                        </div>
                                      )}
                                    </div>

                                    <input
                                      type="checkbox"
                                      checked={isDone}
                                      onChange={() => {}}
                                      className="mt-1 w-4 h-4 rounded border-outline text-primary accent-primary cursor-pointer shrink-0"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </section>
                  );
                })()}

                {/* ═══ TAB 2: INDOOR AIR LAB (Indoor Plan + Member Guidance + Commute Plan) ═══ */}
                {activeTab === "indoor-air-lab" && (
                  <section className="flex flex-col gap-6 w-full animate-fade-in">
                    {/* Indoor Air Plan */}
                    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-5">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                            <span className="material-symbols-outlined text-[22px]">home_health</span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-on-surface">Indoor Air Plan</h3>
                            <p className="text-[11px] text-on-surface-variant capitalize">
                              Setup: {(aiPlan?.indoor_air_plan?.setup || "natural_ventilation").replace("_", " ")}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-surface-container text-on-surface text-xs font-semibold rounded-full">
                          {(aiPlan?.indoor_air_plan?.steps || []).filter((_, i) => completedChecklist[`check-${i}`]).length} of {(aiPlan?.indoor_air_plan?.steps || []).length} Done
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {(aiPlan?.indoor_air_plan?.steps || []).map((item, idx) => {
                          const id = `check-${idx}`;
                          const done = !!completedChecklist[id];
                          return (
                            <label
                              key={id}
                              className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => setCompletedChecklist((prev) => ({ ...prev, [id]: !done }))}
                                className="mt-1 w-4 h-4 rounded border-outline text-primary focus:ring-primary accent-primary cursor-pointer"
                              />
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-xs font-semibold ${done ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                                    {item.action}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 capitalize shrink-0">
                                    Cost: {item.cost}
                                  </span>
                                </div>
                                <span className="text-[11px] text-on-surface-variant mt-1">When: {item.when}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Member Guidance Cards */}
                    {aiPlan?.member_guidance && aiPlan.member_guidance.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {aiPlan.member_guidance.map((mg, idx) => (
                          <div key={idx} className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-[#E0E3E1] flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold capitalize">
                                {mg.member.replace("_", " ")}
                              </span>
                              <span className="text-[11px] font-semibold text-secondary">{mg.outdoor_limit}</span>
                            </div>
                            <div className="text-xs text-on-surface">
                              <strong>Mask Advice:</strong> {mg.mask_advice}
                            </div>
                            <ul className="list-disc pl-4 text-[11.5px] text-on-surface-variant space-y-1">
                              {(mg.key_tips || []).map((t, ti) => <li key={ti}>{t}</li>)}
                            </ul>
                            {mg.warning_signs && mg.warning_signs.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-error-container/40 text-[11px] text-on-error-container">
                                <strong>Watch for:</strong> {mg.warning_signs.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Commute Plan */}
                    {aiPlan?.commute_plan && (
                      <div className="bg-surface-container rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[22px]">commute</span>
                            <h3 className="text-base font-bold text-on-surface capitalize">
                              Commute Plan ({aiPlan.commute_plan.mode.replace("_", " ")})
                            </h3>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-white text-xs font-semibold text-primary">
                            Best Departure: {aiPlan.commute_plan.best_departure}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface">
                          <strong>Protection:</strong> {aiPlan.commute_plan.protection}
                        </p>
                        <ul className="list-disc pl-5 text-xs text-on-surface-variant space-y-1">
                          {(aiPlan.commute_plan.tips || []).map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {/* ═══ TAB 3: SUSTAINABLE SWAPS & IMPACT ═══ */}
                {activeTab === "sustainable-swaps" && (
                  <section className="flex flex-col gap-6 w-full animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                      {/* Swaps List */}
                      <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant">
                            <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-on-surface">Sustainable Lifestyle Swaps</h3>
                            <p className="text-[11px] text-on-surface-variant">Lower-emission habits tailored to your household</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          {(aiPlan?.sustainable_swaps || []).map((swap, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-surface-container-low border border-[#E0E3E1]/70 flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-on-surface-variant line-through">From: {swap.from_habit}</span>
                                <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-semibold capitalize border border-[#E0E3E1]">
                                  Effort: {swap.effort}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-on-surface">To: {swap.to_habit}</span>
                              <p className="text-[11px] text-on-surface-variant">{swap.benefit_to_family}</p>
                              <p className="text-[11px] text-primary font-medium">{swap.benefit_to_air}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Impact Summary Card */}
                      <div className="lg:col-span-5 bg-surface-container rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-5">
                        <div className="flex flex-col gap-4">
                          <span className="text-base font-bold text-on-surface">Impact Summary</span>
                          {aiPlan?.impact_summary ? (
                            <>
                              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-[#E0E3E1] flex flex-col items-center text-center gap-2">
                                <span className="text-3xl font-bold text-primary font-headline">
                                  ~{aiPlan.impact_summary.estimated_exposure_reduction_pct}%
                                </span>
                                <span className="text-xs font-semibold text-on-surface">
                                  {aiPlan.impact_summary.headline}
                                </span>
                              </div>
                              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-[#E0E3E1] text-xs text-on-surface-variant space-y-2.5">
                                <p><strong>Assumptions (Estimated):</strong> {aiPlan.impact_summary.assumptions}</p>
                                <p><strong>Community Effect:</strong> {aiPlan.impact_summary.community_note}</p>
                              </div>

                              {/* Shareable Community Note Actions */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    const msg = aiPlan.impact_summary?.community_note;
                                    if (msg) {
                                      navigator.clipboard.writeText(msg);
                                      setCopiedNotice(true);
                                      setTimeout(() => setCopiedNotice(false), 2500);
                                    }
                                  }}
                                  className="flex-1 h-10 rounded-full bg-secondary text-on-secondary text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[16px]">{copiedNotice ? "check" : "content_copy"}</span>
                                  <span>{copiedNotice ? "Copied Note!" : "Copy Community Note"}</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-on-surface-variant">Recalibrate plan to view updated impact summary.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Persistent Safety Note across all tabs */}
                {aiPlan.safety_note && activeTab !== "daily-plan" && (
                  <div className="p-4 rounded-2xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-xs text-on-surface">
                    <span className="material-symbols-outlined text-error text-[20px] shrink-0">medical_services</span>
                    <p className="leading-relaxed">{aiPlan.safety_note}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30 py-4 px-8 text-on-surface-variant flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-on-surface">VayuPulse</span>
            <span>•</span>
            <span>Hyperlocal Environmental Monitoring</span>
          </div>
          <Link href="/onboarding" className="hover:text-primary transition-colors">Calibrate Household Profile</Link>
        </footer>
      </div>

      {/* ── GOOGLE MATERIAL 3 AI CHAT WIDGET ── */}
      <div id="ai-chat-assistant" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <div
          aria-hidden={!chatOpen}
          className={`w-[395px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-white border border-[#E0E3E1] rounded-[28px] shadow-[0_12px_40px_rgba(11,87,208,0.12),0_4px_12px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden mb-3.5 origin-bottom-right will-change-[transform,opacity] transition-[opacity,transform,visibility] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            chatOpen
              ? "opacity-100 scale-100 translate-y-0 visible pointer-events-auto"
              : "opacity-0 scale-[0.84] translate-y-5 invisible pointer-events-none"
          }`}
        >
            {/* Material 3 Top App Bar */}
            <div className="px-5 py-3.5 bg-[#F8FAFD] border-b border-[#E0E3E1] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#DAE2FF] text-[#0041A2] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#1F1F1F] truncate font-headline">
                      VayuPulse AI
                    </span>
                    {userProfile.aqi != null && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          userProfile.aqi > 300
                            ? "bg-[#FCE8E6] text-[#B3261E]"
                            : userProfile.aqi > 200
                            ? "bg-[#FFF3E0] text-[#E65100]"
                            : "bg-[#E6F4EA] text-[#137333]"
                        }`}
                      >
                        AQI {userProfile.aqi}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#444746] truncate">
                    {userProfile.location
                      ? `${userProfile.location.split(",")[0]} • PM2.5 ${userProfile.pollutants?.pm25 ?? "--"} µg/m³`
                      : "Grounded in live telemetry"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const loc = userProfile.location ? userProfile.location.split(",")[0] : "your locality";
                    const aqi = userProfile.aqi ?? 342;
                    const aqiDesc = aqi > 300 ? "Very Poor" : aqi > 200 ? "Poor" : "Moderate";
                    setChatMessages([
                      {
                        sender: "ai",
                        text: `Namaste! I am VayuPulse AI, calibrated for ${loc}. Current ambient AQI is ${aqi} (${aqiDesc}) with PM2.5 at ${userProfile.pollutants?.pm25 ?? 178} µg/m³. How can I assist your household's air protection today?`,
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        tag: `${loc} Grounded Live`,
                      },
                    ]);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] hover:text-[#1F1F1F] hover:bg-[#E8EDF5] transition-colors cursor-pointer"
                  title="Reset Conversation"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#444746] hover:text-[#1F1F1F] hover:bg-[#E8EDF5] transition-colors cursor-pointer"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                </button>
              </div>
            </div>

            {/* Material 3 Assist Chips */}
            <div className="px-4 py-2.5 bg-[#F8FAFD]/70 border-b border-[#E0E3E1] flex items-center gap-2 overflow-x-auto select-none scrollbar-none">
              {[
                { label: "Kids outdoor play?", query: "Can kids play outside now?", icon: "child_care" },
                { label: "Open windows?", query: "Safe window to open windows?", icon: "window" },
                { label: "N95 mask needed?", query: "Do I need an N95 mask today?", icon: "masks" },
                { label: "Purifier tonight?", query: "Is air purifier needed tonight?", icon: "air_purifier_gen" },
                { label: "Safe to jog?", query: "Is it safe to jog outdoors?", icon: "directions_run" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendChat(undefined, chip.query)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-[#EAF2FD] text-[#1F1F1F] hover:text-[#0B57D0] border border-[#C4C7C5] hover:border-[#A8C7FA] text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[14px] text-[#0B57D0]">{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-white">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 max-w-[88%] ${
                    msg.sender === "user" ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-7 h-7 rounded-xl bg-[#DAE2FF] text-[#0041A2] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div
                      className={`px-4 py-3 text-[12.5px] leading-relaxed whitespace-pre-line flex flex-col gap-2 ${
                        msg.sender === "user"
                          ? "bg-[#0B57D0] text-white rounded-[20px] rounded-br-[6px] shadow-xs"
                          : "bg-[#F0F4F9] text-[#1F1F1F] rounded-[20px] rounded-tl-[6px]"
                      }`}
                    >
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Uploaded context"
                          className="max-h-40 w-auto rounded-xl object-cover border border-white/20"
                        />
                      )}
                      <span>{msg.text}</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 text-[10px] text-[#747775] px-1.5 ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span>{msg.time}</span>
                      {msg.tag && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-[#444746]">{msg.tag}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isAiReplying && (
                <div className="flex items-center gap-2.5 self-start max-w-[85%]">
                  <div className="w-7 h-7 rounded-xl bg-[#DAE2FF] text-[#0041A2] flex items-center justify-center shrink-0">
                    <MaterialCircularProgress size={16} strokeWidth={5} />
                  </div>
                  <div className="px-4 py-2.5 rounded-[20px] rounded-tl-[6px] bg-[#F0F4F9] text-xs text-[#444746] font-medium">
                    Checking {userProfile.location ? userProfile.location.split(",")[0] : "local"} air telemetry...
                  </div>
                </div>
              )}
            </div>

            {/* Material 3 Pill Input Bar + Single Image Upload (< 5 MB) */}
            <form
              onSubmit={handleSendChat}
              className="p-3 bg-white border-t border-[#E0E3E1] flex flex-col gap-2"
            >
              <input
                type="file"
                ref={chatFileInputRef}
                accept="image/*"
                onChange={handleChatImageSelect}
                className="hidden"
              />

              {chatImageError && (
                <div className="px-3 py-1.5 rounded-xl bg-[#FCE8E6] text-[#B3261E] text-[11px] font-medium flex items-center justify-between">
                  <span>{chatImageError}</span>
                  <button
                    type="button"
                    onClick={() => setChatImageError(null)}
                    className="ml-2 text-[#B3261E] hover:opacity-75 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}

              {chatImage && (
                <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-[#F0F4F9] border border-[#D3E3FD]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={chatImage.data}
                      alt={chatImage.name}
                      className="w-10 h-10 rounded-xl object-cover border border-[#C4C7C5] shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold text-[#1F1F1F] truncate">
                        {chatImage.name}
                      </span>
                      <span className="text-[10px] text-[#444746]">
                        {(chatImage.size / (1024 * 1024)).toFixed(2)} MB • Max 1 image
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatImage(null)}
                    className="w-7 h-7 rounded-full hover:bg-[#E0E3E1] text-[#444746] flex items-center justify-center shrink-0 cursor-pointer"
                    title="Remove image"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-[#F0F4F9] focus-within:bg-white border border-transparent focus-within:border-[#0B57D0] focus-within:shadow-xs rounded-full pl-2 pr-1.5 py-1.5 transition-all">
                <button
                  type="button"
                  disabled={isAiReplying}
                  onClick={() => chatFileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-[#E0E3E1]/70 text-[#444746] hover:text-[#0B57D0] flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  title="Upload 1 image (max 5 MB)"
                >
                  <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={chatImage ? "Ask about this image..." : "Ask about air quality, masks, windows..."}
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] text-[#1F1F1F] outline-none placeholder:text-[#747775]"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={isAiReplying || (!chatInput.trim() && !chatImage)}
                  className="w-9 h-9 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] disabled:bg-[#D3E3FD] disabled:text-[#747775] text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  title="Send"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              </div>
            </form>
          </div>

        {/* Material 3 Extended FAB Launcher */}
        <button
          type="button"
          onClick={() => setChatOpen((prev) => !prev)}
          className={`h-14 px-5 rounded-2xl text-white shadow-[0_4px_16px_rgba(11,87,208,0.3)] hover:shadow-[0_6px_20px_rgba(11,87,208,0.4)] flex items-center gap-3 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer active:scale-95 ${
            chatOpen
              ? "bg-[#0842A0] ring-2 ring-[#DAE2FF]"
              : "bg-[#0B57D0] hover:bg-[#0842A0]"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-[22px] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                chatOpen ? "rotate-90 scale-90" : "rotate-0 scale-100"
              }`}
            >
              {chatOpen ? "close" : "auto_awesome"}
            </span>
            {!chatOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#85d98e] border-2 border-[#0B57D0]"></span>
            )}
          </div>
          <span className="text-[13px] font-semibold tracking-tight font-headline">
            {chatOpen ? "Close Chat" : "Ask VayuPulse"}
          </span>
          <span
            className={`material-symbols-outlined text-[18px] opacity-85 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              chatOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            keyboard_arrow_up
          </span>
        </button>
      </div>

      {/* ── FULL-SCREEN RECALIBRATION LOADING OVERLAY (Google Material 3) ── */}
      {isRecalibrating && (
        <div className="fixed inset-0 bg-surface-bright/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in select-none">
          <MaterialLoader
            title="Recalibrating Air Quality Plan"
            subtitle={`Rechecking live Open-Meteo telemetry for ${userProfile.location ? userProfile.location.split(",")[0] : "your location"} and generating your updated Gemini AI strategy...`}
            compact
          />
        </div>
      )}
    </div>
  );
}
