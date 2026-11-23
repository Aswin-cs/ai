"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut, signIn } from "next-auth/react";

// ─── TypeScript interfaces matching the airPlanResponseSchema ───
interface Bullet {
  category: string;
  guidance: string;
}
interface PriorityAdvisory {
  headline: string;
  bullets: Bullet[];
}
interface SafeOutdoorWindow {
  startTime: string;
  endTime: string;
  lowestEstimatedPm25: number;
  reasoning: string;
}
interface RoutineBlock {
  timeBlock: "Morning" | "Afternoon" | "Evening";
  timeRange: string;
  title: string;
  originalHabit: string;
  recommendedShift: string;
  whyItMatters: string;
  directImpactMetric: string;
}
interface ChecklistItem {
  action: string;
  scientificReason: string;
  costTier: "Zero-Cost" | "Low-Cost" | "Equipment Optimization";
}
interface IndoorAirGuidance {
  ventilationDirective: string;
  actionChecklist: ChecklistItem[];
}
interface SwapItem {
  id: string;
  swapTitle: string;
  description: string;
  monthlyCo2SavedKg: number;
  personalPm25ReductionPercent: number;
  monthlyMoneySavedInr: number;
  localImpactExplanation: string;
}
interface CommunitySnippet {
  targetAudience: string;
  circularTitle: string;
  shareableMessage: string;
}
interface AirPlan {
  priorityAdvisory: PriorityAdvisory;
  safeOutdoorWindow: SafeOutdoorWindow;
  dailyRoutinePlan: RoutineBlock[];
  indoorAirGuidance: IndoorAirGuidance;
  sustainableSwaps: SwapItem[];
  communityActionSnippet: CommunitySnippet;
}

// ─── Main Dashboard ───
export default function DashboardPage() {
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<
    "daily-plan" | "indoor-air-lab" | "sustainable-swaps" | "community-hub"
  >("daily-plan");

  const [userProfile, setUserProfile] = useState<{
    location: string;
    aqi?: number;
    pollutants?: { pm25: number; pm10: number; no2: number };
    householdProfile?: {
      vulnerabilities?: string[];
      commute?: string;
      indoorSetup?: string;
    };
  }>({ location: "" });

  const [aiPlan, setAiPlan] = useState<AirPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Interactive state for Indoor checklist
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({});

  // Interactive state for Sustainable swaps toggles
  const [activeSwaps, setActiveSwaps] = useState<Record<string, boolean>>({});

  // Community hub copy state
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Chat widget state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string; tag?: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");
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
        const res = await fetch("/api/user/status");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserProfile((prev) => ({
              ...prev,
              location: data.user.defaultLocation?.name || prev.location,
              aqi: data.user.aqi ?? prev.aqi,
              pollutants: data.user.pollutants || prev.pollutants,
              householdProfile: data.user.householdProfile || prev.householdProfile,
            }));
            if (data.user.aiPlan) {
              const raw = data.user.aiPlan;
              const plan = raw?.data && (raw.data.safeOutdoorWindow || raw.data.priorityAdvisory)
                ? raw.data
                : raw;
              setAiPlan(plan);
              initSwaps(plan);
            }
          }
        }
      } catch {}
      setIsLoading(false);
    }

    fetchDbUserStatus();
  }, []);

  function initSwaps(plan: any) {
    if (plan?.sustainableSwaps && Array.isArray(plan.sustainableSwaps)) {
      const obj: Record<string, boolean> = {};
      plan.sustainableSwaps.forEach((s: any) => {
        if (s?.id) obj[s.id] = true;
      });
      setActiveSwaps((prev) => ({ ...obj, ...prev }));
    }
  }

  // ─── Recalibrate ───
  const handleRecalibratePlan = async () => {
    setIsRecalibrating(true);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: userProfile.location,
          aqi: userProfile.aqi,
          pollutants: userProfile.pollutants,
          householdProfile: userProfile.householdProfile,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const plan = result.data as AirPlan;
          setAiPlan(plan);
          initSwaps(plan);
          if (typeof window !== "undefined") {
            localStorage.setItem("vayumitra_active_plan", JSON.stringify(plan));
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

  // ─── Chat ───
  const handleSendChat = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const userText = (overrideText || chatInput).trim();
    if (!userText || isAiReplying) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { sender: "user", text: userText, time: timeStr }]);
    if (!overrideText) setChatInput("");
    setIsAiReplying(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: chatMessages.slice(-6),
          location: userProfile.location || "Delhi NCR, India",
          aqi: userProfile.aqi ?? 342,
          pollutants: userProfile.pollutants,
          householdProfile: userProfile.householdProfile,
          safeOutdoorWindow: aiPlan?.safeOutdoorWindow,
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
              onClick={handleRecalibratePlan}
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
              { id: "indoor-air-lab" as const, icon: "home_health", label: "Indoor Air Lab" },
              { id: "sustainable-swaps" as const, icon: "eco", label: "Sustainable Swaps" },
              { id: "community-hub" as const, icon: "groups", label: "Community Hub" },
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
            <div className="bg-[#EAF2FD] text-[#041E49] border border-[#C2D7FA] px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-[#0B57D0]">child_friendly</span>
              <span>{personaLabel}</span>
            </div>
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
            <button
              onClick={handleRecalibratePlan}
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

            {/* ── LOADING STATE ── */}
            {isLoading && !aiPlan && (
              <div className="flex flex-col items-center justify-center gap-6 py-24 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[36px] text-primary animate-spin">sync</span>
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-on-surface">Loading your VayuPulse plan...</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Fetching your personalized air quality strategy.</p>
                </div>
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
                    onClick={handleRecalibratePlan}
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

            {/* ── PLAN LOADED: Tabbed Dashboard ── */}
            {aiPlan && (
              <>
                {/* Tab Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-full shadow-2xs">
                    {([
                      { id: "daily-plan" as const, icon: "today", label: "Daily Plan" },
                      { id: "indoor-air-lab" as const, icon: "home_health", label: "Indoor Air Lab" },
                      { id: "sustainable-swaps" as const, icon: "eco", label: "Sustainable Swaps" },
                      { id: "community-hub" as const, icon: "groups", label: "Community Hub" },
                    ]).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          activeTab === tab.id
                            ? "bg-primary-container text-on-primary shadow-xs"
                            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

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
                                {aiPlan?.safeOutdoorWindow?.startTime || "1:30 PM"} – {aiPlan?.safeOutdoorWindow?.endTime || "4:00 PM"}
                              </span>
                            </div>
                            {aiPlan?.safeOutdoorWindow?.lowestEstimatedPm25 != null && (
                              <span className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-semibold">
                                Est. PM2.5: {aiPlan.safeOutdoorWindow.lowestEstimatedPm25} µg/m³
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            {aiPlan?.safeOutdoorWindow?.reasoning || "Solar irradiation causes planetary boundary layer expansion, dispersing ground particulates."}
                          </p>
                        </div>
                      </div>

                      {/* Priority Advisory */}
                      <div className="lg:col-span-4 bg-surface-container rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[22px]">auto_awesome</span>
                          <span className="text-[17px] font-bold text-on-surface">Priority Advisory</span>
                        </div>
                        <h3 className="text-sm font-bold text-on-surface">
                          {aiPlan?.priorityAdvisory?.headline || "Daily Household Protection Strategy"}
                        </h3>

                        <div className="flex flex-col gap-3">
                          {(aiPlan?.priorityAdvisory?.bullets || []).map((bullet, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-[#E0E3E1]">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                idx === 0 ? "bg-error-container text-on-error-container" :
                                idx === 1 ? "bg-primary-fixed text-on-primary-fixed-variant" :
                                "bg-secondary-container text-on-secondary-container"
                              }`}>
                                <span className="material-symbols-outlined text-[16px]">
                                  {idx === 0 ? "warning" : idx === 1 ? "commute" : "home"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-on-surface">{bullet?.category}</span>
                                <span className="text-[11px] text-on-surface-variant leading-snug">{bullet?.guidance}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Daily Routine Plan — 3 time-block cards */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[22px]">schedule</span>
                        <h3 className="text-[17px] font-bold text-on-surface">Adaptive Daily Routine</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {(aiPlan?.dailyRoutinePlan || []).map((routine, idx) => (
                          <div
                            key={idx}
                            className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-[#E0E3E1] flex flex-col justify-between hover:shadow-md transition-shadow"
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                                  routine?.timeBlock === "Morning"
                                    ? "bg-error-container text-on-error-container"
                                    : routine?.timeBlock === "Afternoon"
                                    ? "bg-secondary-container text-on-secondary-container"
                                    : "bg-tertiary-fixed text-on-tertiary-fixed"
                                }`}>
                                  {routine?.timeBlock} • {routine?.timeRange}
                                </span>
                                <span className="material-symbols-outlined text-primary text-[20px]">
                                  {routine?.timeBlock === "Morning" ? "warning" : routine?.timeBlock === "Afternoon" ? "check_circle" : "air"}
                                </span>
                              </div>

                              <div className="flex flex-col gap-1">
                                {routine?.originalHabit && (
                                  <span className="text-[11px] text-on-surface-variant line-through">
                                    Standard: {routine.originalHabit}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="material-symbols-outlined text-primary text-[17px]">verified</span>
                                  <span className="text-xs font-bold text-on-surface">{routine?.title}</span>
                                </div>
                                <p className="text-xs text-on-surface leading-relaxed">{routine?.recommendedShift}</p>
                              </div>

                              {/* Why it matters — expandable */}
                              {routine?.whyItMatters && (
                                <details className="text-[11px] text-on-surface-variant">
                                  <summary className="cursor-pointer font-semibold text-primary hover:underline">Why it matters</summary>
                                  <p className="mt-1 leading-snug">{routine.whyItMatters}</p>
                                </details>
                              )}
                            </div>

                            {routine?.directImpactMetric && (
                              <div className="mt-4 p-3 rounded-2xl bg-surface-container flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">insights</span>
                                <p className="text-[11px] text-on-surface-variant leading-snug">{routine.directImpactMetric}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* ═══ TAB 2: INDOOR AIR LAB ═══ */}
                {activeTab === "indoor-air-lab" && (
                  <section className="flex flex-col gap-6 w-full animate-fade-in">
                    {/* Ventilation Directive Banner */}
                    <div className="p-6 rounded-3xl bg-secondary-container/30 text-on-secondary-container flex flex-wrap items-center justify-between gap-4 shadow-xs border border-[#CEEAD6]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-on-secondary shadow-sm">
                          <span className="material-symbols-outlined text-[28px]">window</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-secondary">Ventilation Directive</span>
                          <p className="text-base font-bold text-on-surface mt-0.5">
                            {aiPlan?.indoorAirGuidance?.ventilationDirective || "Keep windows sealed during high ambient pollution periods."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[11px] text-on-surface-variant block">Safe Window</span>
                          <span className="text-lg font-bold text-secondary font-headline">
                            {aiPlan?.safeOutdoorWindow?.startTime || "1:30 PM"} – {aiPlan?.safeOutdoorWindow?.endTime || "4:00 PM"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Checklist */}
                    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                            <span className="material-symbols-outlined text-[22px]">checklist</span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-on-surface">Indoor Air Action Checklist</h3>
                            <p className="text-[11px] text-on-surface-variant">
                              {(aiPlan?.indoorAirGuidance?.actionChecklist || []).length} tailored actions
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-surface-container text-on-surface text-xs font-semibold rounded-full">
                          {(aiPlan?.indoorAirGuidance?.actionChecklist || []).filter((_, i) => completedChecklist[`check-${i}`]).length} of {(aiPlan?.indoorAirGuidance?.actionChecklist || []).length} Done
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {(aiPlan?.indoorAirGuidance?.actionChecklist || []).map((item, idx) => {
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
                                    {item?.action}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                                    item?.costTier === "Zero-Cost"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : item?.costTier === "Low-Cost"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}>
                                    {item?.costTier || "Zero-Cost"}
                                  </span>
                                </div>
                                <span className="text-[11px] text-on-surface-variant mt-1 leading-snug">{item?.scientificReason}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {/* ═══ TAB 3: SUSTAINABLE SWAPS ═══ */}
                {activeTab === "sustainable-swaps" && (
                  <section className="flex flex-col gap-6 w-full animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                      {/* Swaps List */}
                      <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-5">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant">
                                <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-on-surface">Lifestyle Emission Swaps</h3>
                                <p className="text-[11px] text-on-surface-variant">Toggle swaps to simulate impact</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const resetObj: Record<string, boolean> = {};
                                (aiPlan?.sustainableSwaps || []).forEach((s) => { if (s?.id) resetObj[s.id] = true; });
                                setActiveSwaps(resetObj);
                              }}
                              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                              type="button"
                            >
                              Reset All
                            </button>
                          </div>

                          <div className="flex flex-col gap-3">
                            {(aiPlan?.sustainableSwaps || []).map((swap, idx) => {
                              const isChecked = activeSwaps[swap.id] !== false;
                              const icons = ["directions_car", "subway", "traffic", "pest_control"];
                              const bgClasses = [
                                "bg-primary-fixed text-primary",
                                "bg-secondary-container text-secondary",
                                "bg-tertiary-fixed text-tertiary",
                                "bg-surface-container text-on-surface",
                              ];
                              return (
                                <div key={swap?.id || idx} className="flex items-start justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors gap-4">
                                  <div className="flex items-start gap-3.5 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgClasses[idx % 4]}`}>
                                      <span className="material-symbols-outlined text-[20px]">{icons[idx % 4]}</span>
                                    </div>
                                    <div className="flex flex-col flex-1">
                                      <span className="text-xs font-bold text-on-surface">{swap?.swapTitle}</span>
                                      <span className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{swap?.description}</span>
                                      {swap?.localImpactExplanation && (
                                        <span className="text-[10px] text-primary font-medium mt-1">{swap.localImpactExplanation}</span>
                                      )}
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {swap?.monthlyCo2SavedKg != null && (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                                            -{swap.monthlyCo2SavedKg} kg CO₂/mo
                                          </span>
                                        )}
                                        {swap?.personalPm25ReductionPercent != null && (
                                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-semibold border border-blue-200">
                                            -{swap.personalPm25ReductionPercent}% PM2.5
                                          </span>
                                        )}
                                        {swap?.monthlyMoneySavedInr != null && (
                                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                                            +₹{swap.monthlyMoneySavedInr}/mo saved
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => setActiveSwaps((s) => ({ ...s, [swap.id]: e.target.checked }))}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Impact Scorecard */}
                      <div className="lg:col-span-5 bg-surface-container rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-5">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-on-surface">Simulated Impact</span>
                            <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">Household Scale</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-surface-container-lowest p-4 rounded-2xl flex flex-col items-center text-center border border-[#E0E3E1]">
                              <span className="material-symbols-outlined text-secondary text-[24px] mb-1">co2</span>
                              <span className="text-lg font-bold text-secondary">{impactMetrics.co2}</span>
                              <span className="text-[10px] text-on-surface-variant mt-0.5">Monthly CO₂ Avoided</span>
                            </div>
                            <div className="bg-surface-container-lowest p-4 rounded-2xl flex flex-col items-center text-center border border-[#E0E3E1]">
                              <span className="material-symbols-outlined text-primary text-[24px] mb-1">air</span>
                              <span className="text-lg font-bold text-primary">{impactMetrics.pm}</span>
                              <span className="text-[10px] text-on-surface-variant mt-0.5">Inhaled PM2.5 Load</span>
                            </div>
                            <div className="bg-surface-container-lowest p-4 rounded-2xl flex flex-col items-center text-center border border-[#E0E3E1]">
                              <span className="material-symbols-outlined text-tertiary text-[24px] mb-1">savings</span>
                              <span className="text-lg font-bold text-tertiary">{impactMetrics.savings}</span>
                              <span className="text-[10px] text-on-surface-variant mt-0.5">Monthly Net Saved</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* ═══ TAB 4: COMMUNITY HUB ═══ */}
                {activeTab === "community-hub" && (
                  <section className="flex flex-col gap-6 w-full animate-fade-in">
                    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                          <span className="material-symbols-outlined text-[22px]">campaign</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-on-surface">Community Advisory</h3>
                          <p className="text-[11px] text-on-surface-variant">
                            AI-generated neighbourhood notice ready to share
                          </p>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-secondary-container/30 border border-[#CEEAD6] flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-semibold">
                            VayuPulse Advisory
                          </span>
                          <span className="text-[11px] font-bold text-secondary">
                            {aiPlan?.communityActionSnippet?.targetAudience || "Community & Residents"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-on-surface">
                          {aiPlan?.communityActionSnippet?.circularTitle || "Air Quality Advisory Notice"}
                        </h4>
                        <p className="text-xs text-on-surface bg-white/90 p-4 rounded-xl leading-relaxed border border-[#E0E3E1] whitespace-pre-line select-all">
                          {aiPlan?.communityActionSnippet?.shareableMessage || "Keep windows closed during early morning and late evening inversion layers."}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (aiPlan?.communityActionSnippet?.shareableMessage) {
                                navigator.clipboard.writeText(aiPlan.communityActionSnippet.shareableMessage);
                                setCopiedNotice(true);
                                setTimeout(() => setCopiedNotice(false), 2500);
                              }
                            }}
                            className="flex-1 h-10 rounded-xl bg-secondary text-on-secondary text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">{copiedNotice ? "check" : "content_copy"}</span>
                            <span>{copiedNotice ? "Copied!" : "Copy Notice"}</span>
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(aiPlan?.communityActionSnippet?.shareableMessage || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 px-4 rounded-xl bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">share</span>
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </section>
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

      {/* ── FLOATING AI CHAT WIDGET ── */}
      <div id="ai-chat-assistant" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="w-[380px] h-[520px] bg-white border border-[#D0D5DD] rounded-3xl shadow-xl flex flex-col overflow-hidden mb-3.5 animate-scale-in">
            {/* Chat Header */}
            <div className="px-4 py-3 bg-surface-container-low border-b border-[#E0E3E1] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAF2FD] text-[#0B57D0] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-on-surface truncate">VayuPulse AI Assistant</span>
                  <span className="text-[10px] text-on-surface-variant truncate font-medium">
                    {userProfile.location ? `${userProfile.location.split(",")[0]} • AQI ${userProfile.aqi ?? 342}` : "Powered by Gemini"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-3 py-2 bg-surface-container-low/60 border-b border-[#E0E3E1] flex items-center gap-1.5 overflow-x-auto select-none scrollbar-none">
              {[
                "Can kids play outside now?",
                "Safe window to open windows?",
                "Do I need an N95 mask today?",
                "Is air purifier needed tonight?",
                "Is it safe to jog outdoors?",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendChat(undefined, chip)}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAF2FD] text-on-surface hover:text-[#0B57D0] border border-[#D0D5DD] text-[10px] font-medium transition-colors shadow-2xs cursor-pointer active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 text-xs">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] text-primary/40">forum</span>
                  <p className="text-xs">Ask VayuPulse about commute timing, ventilation windows, or exposure risks.</p>
                </div>
              )}
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 max-w-[90%] ${msg.sender === "user" ? "self-end flex-row-reverse" : "self-start"}`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-[#EAF2FD] text-[#0B57D0] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className={`p-3 rounded-2xl text-[12px] leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-primary text-on-primary rounded-tr-sm shadow-xs"
                        : "bg-surface-container-low text-on-surface rounded-tl-sm border border-[#E0E3E1]"
                    }`}>
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-1.5 text-[9px] text-on-surface-variant/80 px-1 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <span>{msg.time}</span>
                      {msg.tag && (<><span>•</span><span>{msg.tag}</span></>)}
                    </div>
                  </div>
                </div>
              ))}
              {isAiReplying && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-2xl w-fit">
                  <span className="material-symbols-outlined text-[15px] text-primary animate-spin">sync</span>
                  <span>Analyzing...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-2.5 bg-surface-container-lowest border-t border-[#E0E3E1] flex items-center gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about commute, ventilation, masks..."
                className="flex-1 min-w-0 bg-[#F8F9FA] border border-[#D0D5DD] focus:border-[#0B57D0] focus:ring-1 focus:ring-primary rounded-full px-3.5 py-1.5 text-xs text-on-surface outline-none placeholder:text-on-surface-variant/70"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isAiReplying || !chatInput.trim()}
                className="w-8 h-8 rounded-full bg-primary hover:bg-[#0B57D0] disabled:bg-[#E0E3E1] text-on-primary flex items-center justify-center shrink-0 shadow-2xs transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[17px]">send</span>
              </button>
            </form>
          </div>
        )}

        {/* FAB Launcher */}
        <button
          type="button"
          onClick={() => setChatOpen((prev) => !prev)}
          className="h-12 px-4 rounded-full bg-primary hover:bg-[#0B57D0] text-on-primary shadow-md flex items-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <div className="relative flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#85d98e] border-2 border-primary"></span>
          </div>
          <span className="text-xs font-bold">Ask VayuPulse AI</span>
          <span className="material-symbols-outlined text-[18px] opacity-80">
            {chatOpen ? "keyboard_arrow_down" : "keyboard_arrow_up"}
          </span>
        </button>
      </div>
    </div>
  );
}
