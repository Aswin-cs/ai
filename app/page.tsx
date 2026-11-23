"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut, signIn } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();

  // Active dashboard tab: 'daily-plan' | 'indoor-air-lab' | 'sustainable-swaps' | 'community-hub'
  const [activeTab, setActiveTab] = useState<
    "daily-plan" | "indoor-air-lab" | "sustainable-swaps" | "community-hub"
  >("daily-plan");

  // User & Telemetry State
  const [userProfile, setUserProfile] = useState<{
    location: string;
    coords?: { lat: number; lng: number };
    aqi?: number;
    pollutants?: { pm25: number; pm10: number; no2: number };
    householdProfile?: {
      vulnerabilities?: string[];
      commute?: string;
      indoorSetup?: string;
      windows?: { morning?: boolean; commute?: boolean; evening?: boolean; custom?: string };
    };
  }>({
    location: "Rohini Sector 14, New Delhi",
    aqi: 342,
    pollutants: { pm25: 178, pm10: 294, no2: 48 },
    householdProfile: {
      vulnerabilities: ["children", "seniors"],
      commute: "two_wheeler",
      indoorSetup: "purifier",
      windows: { morning: true, commute: true, evening: true },
    },
  });

  const [aiPlan, setAiPlan] = useState<any>(null);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showScientificLog, setShowScientificLog] = useState(false);

  // Indoor Air Lab State
  const [checklist, setChecklist] = useState([
    { id: 1, title: "Run Purifier on Turbo 30 mins Before Bedtime", desc: "Purges micro-particulates trapped inside room linens. Shift down to Silent Mode at 10 PM.", done: true },
    { id: 2, title: "Wet-mop with Microfiber Cloth (No Dry Sweeping)", desc: "Dry broom sweeping resuspends coarse PM10 up to head height for 4.2 hours.", done: true },
    { id: 3, title: "Zero-Combustion Prayer Room Rule", desc: "Substituted traditional agarbatti and dhoop with clean essential oil or electric diffusers.", done: true },
    { id: 4, title: "Seal Balcony Door Draft Gaps", desc: "Use foam weatherstrip tape on master bedroom balcony frame to curb ambient infiltration.", done: false },
    { id: 5, title: "Clean Purifier Pre-Mesh Filter under Running Tap", desc: "Due every 14 days in winter NCR air to maintain 380 m³/h Clean Air Delivery Rate.", done: false },
  ]);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadedScanResult, setUploadedScanResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sustainable Swaps State
  const [swaps, setSwaps] = useState({
    carpool: true,
    metro: true,
    idling: true,
    mosquito: true,
  });

  // Community Hub Notice Generator State
  const [noticeAudience, setNoticeAudience] = useState<"rwa" | "school" | "office">("rwa");
  const [noticeGoal, setNoticeGoal] = useState<"gate" | "sports" | "leaf">("gate");
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [showReportSmokeModal, setShowReportSmokeModal] = useState(false);
  const [smokeReportSuccess, setSmokeReportSuccess] = useState(false);

  // AI Assistant Chat Widget State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string; tag?: string }>
  >([
    {
      sender: "ai",
      text: "Namaste! Rohini Sector 14 PM2.5 is currently 178 µg/m³ (Very Poor). Boundary layer will expand at 1:30 PM. How can I assist your family's routine today?",
      time: "1:03 PM",
      tag: "Grounded in CPCB DL-14",
    },
    {
      sender: "user",
      text: "Can I take my 4-year-old to the park around 5:00 PM today?",
      time: "1:04 PM",
    },
    {
      sender: "ai",
      text: "Avoid park play at 5:00 PM. Rapid radiative winter cooling traps tailpipe soot near breathing level by 4:45 PM. Recommended window: Shift outdoor play to 1:30 PM – 3:30 PM when boundary layer disperses particulates below 120 µg/m³.",
      time: "1:05 PM",
      tag: "Pediatric IAQ Safe • Confidence 99%",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiReplying, setIsAiReplying] = useState(false);

  // Load user data from localStorage and database status
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
            aqi: parsed.aqi || prev.aqi,
            pollutants: parsed.pollutants || prev.pollutants,
            householdProfile: parsed.householdProfile || prev.householdProfile,
          }));
        } catch (e) {}
      }
      if (savedPlan) {
        try {
          setAiPlan(JSON.parse(savedPlan));
        } catch (e) {}
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
              householdProfile: data.user.householdProfile || prev.householdProfile,
            }));
            if (data.user.aiPlan) {
              setAiPlan(data.user.aiPlan);
            }
          }
        }
      } catch (err) {}
    }

    fetchDbUserStatus();
  }, []);

  // Recalibrate IAQ Plan
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
          setAiPlan(result.data);
          if (typeof window !== "undefined") {
            localStorage.setItem("vayumitra_active_plan", JSON.stringify(result.data));
          }
        }
      }
    } catch (e) {
      console.warn("Recalibrate error:", e);
    } finally {
      setIsRecalibrating(false);
    }
  };

  // Sustainable Swaps Dynamic Impact
  const calculateImpact = () => {
    let co2 = 0;
    let pm = 0;
    let savings = 0;

    if (swaps.carpool) {
      co2 += 12.2;
      pm += 14;
      savings += 850;
    }
    if (swaps.metro) {
      co2 += 11.4;
      pm += 16;
      savings += 980;
    }
    if (swaps.idling) {
      co2 += 4.8;
      pm += 9;
      savings += 320;
    }
    return {
      co2: `-${co2.toFixed(1)} kg`,
      pm: `-${pm}%`,
      savings: `₹${savings.toLocaleString("en-IN")}`,
    };
  };

  const impactMetrics = calculateImpact();

  // Notice Text Generator
  const getNoticeContent = () => {
    if (noticeAudience === "school") {
      if (noticeGoal === "sports") {
        return `⚠️ URGENT HEALTH NOTICE: PARENT-TEACHER ASSOCIATION\n\nDue to local ambient AQI exceeding ${userProfile.aqi || 342} (Very Poor) during morning temperature inversion, all outdoor sports coaching and morning assemblies are suspended. Classes will conduct indoor stretching and yoga in cross-ventilated auditoriums.\n\n— Issued by VayuMitra School Safety Board`;
      }
      return `⚠️ ADVISORY: SCHOOL COMMUTE PARTICULATE SAFETY\n\nParents and van drivers are advised that all students boarding school transit must wear fitted pediatric N95 respirators. High tailpipe density along school zones triggers acute pediatric airway inflammation.\n\n— Issued by VayuMitra School Safety Board`;
    }
    if (noticeAudience === "office") {
      return `⚠️ WORKPLACE IAQ ADVISORY: COMMERCIAL CAMPUS\n\nBuilding management has activated secondary HEPA ceiling filtration cycles. Zero-idling policy is in effect at all basement visitor drop-offs. Carpooling and hybrid work arrangements recommended today.\n\n— Issued by VayuMitra Environmental Hub`;
    }
    // RWA default
    if (noticeGoal === "gate") {
      return `⚠️ URGENT ADVISORY: ${userProfile.location.split(",")[0].toUpperCase()} RWA\n\nDue to CPCB monitoring AQI crossing ${userProfile.aqi || 342}, we mandate a strict ZERO-IDLING RULE at Society Gates. Delivery vehicles, school cabs, and private cars must switch off engines immediately upon stopping. High idling exhaust severely concentrates particulate traps at toddler breathing heights.\n\n— Issued by VayuMitra Environmental Hub`;
    }
    return `⚠️ RWA CLEAN AIR REGULATION: BIOMASS & LEAF COMBUSTION BAN\n\nSecurity staff and maintenance personnel are strictly prohibited from burning dry leaves, cardboard, or wood for heating. Infrared heaters are operational at guard posts. Violations reportable directly to CPCB green portal.\n\n— Issued by VayuMitra Environmental Hub`;
  };

  const handleCopyNotice = () => {
    const text = getNoticeContent();
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  // Image Upload IAQ Vision Simulation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setTimeout(() => {
      setIsUploadingPhoto(false);
      setUploadedScanResult(
        "Gemini Vision Scan: High VOC source detected near kitchen balcony (unvented gas burners). Recommend running exhaust chimney 5 mins prior to oil heating."
      );
    }, 2000);
  };

  // AI Chat Assistant
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isAiReplying) return;

    const userText = chatInput.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setChatMessages((prev) => [
      ...prev,
      { sender: "user", text: userText, time: timeStr },
    ]);
    setChatInput("");
    setIsAiReplying(true);

    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: userProfile.location,
          aqi: userProfile.aqi,
          pollutants: userProfile.pollutants,
          householdProfile: userProfile.householdProfile,
          customPrompt: userText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText =
          data.data?.summary ||
          data.rawText ||
          "Grounded in current telemetry: Safe outdoor transition window is 1:30 PM - 4:00 PM. Keep indoor HEPA filtration active.";

        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            tag: `Grounded in ${data.modelUsed || "Gemini 3.8 Flash"}`,
          },
        ]);
      } else {
        throw new Error("Chat failed");
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `Based on current AQI (${userProfile.aqi || 342}) in ${userProfile.location}: Restrict high-intensity outdoor activities. Thermal boundary layer lifts between 1:30 PM and 4:00 PM for safer ventilation.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tag: "Calibrated Microclimate Rule",
        },
      ]);
    } finally {
      setIsAiReplying(false);
    }
  };

  const handleChipClick = (prompt: string) => {
    setChatInput(prompt);
  };

  const personaLabel = userProfile.householdProfile?.vulnerabilities?.includes("children")
    ? "Family with Toddler & Senior"
    : userProfile.householdProfile?.vulnerabilities?.includes("seniors")
    ? "Senior Citizen Household"
    : "Active Urban Household";

  return (
    <div className="min-h-screen bg-surface-bright text-on-surface antialiased font-sans">
      {/* ============================================================ */}
      {/* 1. LEFT SIDEBAR COMMAND DRAWER (220px fixed)                  */}
      {/* ============================================================ */}
      <aside className="fixed left-0 top-0 h-full w-[220px] bg-surface-container z-50 flex flex-col justify-between py-5 px-3 select-none border-r border-[#E0E3E1]">
        <div className="flex flex-col gap-6">
          {/* Brand Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-3 px-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">air</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[18px] text-on-surface leading-tight tracking-tight">
                VayuMitra
              </span>
              <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Clean Air AI
              </span>
            </div>
          </Link>

          {/* Recalibrate / Refresh Plan Button */}
          <div className="px-1">
            <button
              onClick={handleRecalibratePlan}
              disabled={isRecalibrating}
              className="w-full h-11 bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed-variant rounded-full flex items-center justify-center gap-2 px-4 transition-all text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-60"
              type="button"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  isRecalibrating ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              <span>{isRecalibrating ? "Calibrating..." : "Refresh Plan"}</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab("daily-plan")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "daily-plan"
                  ? "bg-primary-container text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">today</span>
              <span>Daily Plan</span>
            </button>
            <button
              onClick={() => setActiveTab("indoor-air-lab")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "indoor-air-lab"
                  ? "bg-primary-container text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">home_health</span>
              <span>Indoor Air Lab</span>
            </button>
            <button
              onClick={() => setActiveTab("sustainable-swaps")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "sustainable-swaps"
                  ? "bg-primary-container text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">eco</span>
              <span>Sustainable Swaps</span>
            </button>
            <button
              onClick={() => setActiveTab("community-hub")}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "community-hub"
                  ? "bg-primary-container text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">groups</span>
              <span>Community Hub</span>
            </button>
          </nav>
        </div>

        {/* Bottom Household & Account Section */}
        <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/30 relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              family_restroom
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-on-surface-variant truncate font-semibold uppercase tracking-wider">
                Household
              </span>
              <span className="text-xs font-semibold text-on-surface truncate">
                {userProfile.location.split(",")[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-8 h-8 rounded-full object-cover border border-surface-container"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shrink-0">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-on-surface truncate">
                  {session?.user?.name || "Ananya S."}
                </span>
                <span className="text-[10px] text-on-surface-variant truncate">
                  {session?.user ? "Google User" : "Demo Household"}
                </span>
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

          {/* User Popover Menu */}
          {userMenuOpen && (
            <div className="absolute bottom-16 left-2 right-2 bg-white rounded-2xl shadow-xl border border-[#E0E3E1] p-2 z-50 animate-scale-in">
              <Link
                href="/onboarding"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
                <span>Edit Air Profile</span>
              </Link>
              {session?.user ? (
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">
                    logout
                  </span>
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    signIn("google", { callbackUrl: "/auth-check" });
                  }}
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

      {/* ============================================================ */}
      {/* 2. TOP COMMAND HEADER (72px fixed, left-[220px])             */}
      {/* ============================================================ */}
      <div className="pl-[220px]">
        <header className="fixed top-0 left-[220px] right-0 h-[72px] bg-white/90 backdrop-blur-md border-b border-[#E0E3E1] z-20 px-8 flex items-center justify-between shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
          {/* Left: Location & Persona Selector */}
          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className="border border-[#D0D5DD] hover:border-[#0B57D0] bg-[#F8F9FA] hover:bg-white text-[#1F1F1F] font-medium text-xs rounded-full px-3.5 py-2 flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#0B57D0]">
                location_on
              </span>
              <span className="font-medium max-w-[220px] truncate">{userProfile.location}</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                keyboard_arrow_down
              </span>
            </Link>
            <div className="bg-[#EAF2FD] text-[#041E49] border border-[#C2D7FA] px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-[#0B57D0]">
                child_friendly
              </span>
              <span>{personaLabel}</span>
            </div>
          </div>

          {/* Center: Live Precision Telemetry Strip */}
          <div className="hidden md:flex items-center gap-3 bg-[#F8F9FA] border border-[#E0E3E1] rounded-full px-4 py-1.5 text-xs shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
              </span>
              <span className="text-on-surface-variant font-medium">AQI</span>
              <span className="font-bold text-on-surface text-[13px]">
                {userProfile.aqi ?? 342}
              </span>
              <span className="bg-[#FCE8E6] text-[#B3261E] border border-[#F9DEDC] font-semibold px-2 py-0.5 rounded-full text-[11px]">
                {(userProfile.aqi ?? 342) > 300
                  ? "Very Poor"
                  : (userProfile.aqi ?? 342) > 200
                  ? "Poor"
                  : "Moderate"}
              </span>
            </div>
            <span className="w-[1px] h-3.5 bg-[#E0E3E1]"></span>
            <div className="flex items-center gap-3 font-medium text-on-surface-variant text-[11px]">
              <span>
                PM2.5{" "}
                <strong className="text-on-surface font-semibold text-xs ml-0.5">
                  {userProfile.pollutants?.pm25 ?? 178}
                </strong>{" "}
                <span className="text-[10px] text-on-surface-variant/80">µg/m³</span>
              </span>
              <span className="text-outline-variant/60">•</span>
              <span>
                PM10{" "}
                <strong className="text-on-surface font-semibold text-xs ml-0.5">
                  {userProfile.pollutants?.pm10 ?? 294}
                </strong>{" "}
                <span className="text-[10px] text-on-surface-variant/80">µg/m³</span>
              </span>
              <span className="text-outline-variant/60">•</span>
              <span>
                NO₂{" "}
                <strong className="text-on-surface font-semibold text-xs ml-0.5">
                  {userProfile.pollutants?.no2 ?? 48}
                </strong>{" "}
                <span className="text-[10px] text-on-surface-variant/80">ppb</span>
              </span>
            </div>
          </div>

          {/* Right: Data Provenance */}
          <div className="flex items-center gap-2.5">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] text-[#14532D] text-[11px] font-medium px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
              </span>
              <span className="material-symbols-outlined text-[15px] text-[#16A34A]">verified</span>
              <span>CPCB &amp; Open-Meteo Ground Truth</span>
            </div>
            <button
              onClick={handleRecalibratePlan}
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Recalibrate"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 3. MAIN DASHBOARD CONTENT (pt-[72px])                        */}
        {/* ============================================================ */}
        <main className="w-full pt-[72px] min-h-screen bg-surface-bright">
          <div className="max-w-[1280px] w-full mx-auto px-6 py-6 flex flex-col gap-6">
            {/* Context Sub-bar with Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-full shadow-2xs">
                <button
                  onClick={() => setActiveTab("daily-plan")}
                  className={`px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "daily-plan"
                      ? "bg-primary-container text-on-primary shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">today</span>
                  <span>Daily Plan</span>
                </button>
                <button
                  onClick={() => setActiveTab("indoor-air-lab")}
                  className={`px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "indoor-air-lab"
                      ? "bg-primary-container text-on-primary shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">home_health</span>
                  <span>Indoor Air Lab</span>
                </button>
                <button
                  onClick={() => setActiveTab("sustainable-swaps")}
                  className={`px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "sustainable-swaps"
                      ? "bg-primary-container text-on-primary shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">eco</span>
                  <span>Sustainable Swaps</span>
                </button>
                <button
                  onClick={() => setActiveTab("community-hub")}
                  className={`px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "community-hub"
                      ? "bg-primary-container text-on-primary shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  <span>Community Hub</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-full">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    Live Telemetry Inversion Sync
                  </span>
                </div>
                <button
                  onClick={handleRecalibratePlan}
                  disabled={isRecalibrating}
                  className="h-9 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors text-xs font-medium shadow-2xs cursor-pointer"
                  type="button"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] text-primary ${
                      isRecalibrating ? "animate-spin" : ""
                    }`}
                  >
                    sync
                  </span>
                  <span>{isRecalibrating ? "Recalibrating..." : "Recalibrate IAQ"}</span>
                </button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* TAB 1: DAILY PLAN                                            */}
            {/* ============================================================ */}
            {activeTab === "daily-plan" && (
              <section className="flex flex-col gap-6 w-full animate-fade-in">
                {/* Top Split (65% / 35%) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                  {/* Left 65%: Diurnal Smog & Safe Window Timeline */}
                  <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                            <span className="material-symbols-outlined text-[20px]">
                              show_chart
                            </span>
                          </div>
                          <div>
                            <h2 className="text-[17px] font-bold text-on-surface">
                              24-Hour Diurnal Smog &amp; Safe-Window Timeline
                            </h2>
                            <p className="text-[11px] text-on-surface-variant">
                              Hourly surface PM2.5 (µg/m³) vs Atmospheric Boundary Layer Expansion
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-medium">
                          <span className="w-2 h-2 rounded-full bg-secondary"></span>
                          <span>Safe Transition Pocket: 1:30 PM – 4:00 PM</span>
                        </div>
                      </div>

                      {/* Diurnal Bar Curve Visualization */}
                      <div className="w-full bg-surface-container-low rounded-2xl p-4 flex flex-col gap-3">
                        <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4 px-2">
                          {/* 6 AM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-error opacity-0 group-hover:opacity-100 transition-opacity">
                              268
                            </span>
                            <div
                              className="w-full bg-error rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "88%" }}
                            ></div>
                            <span className="text-[10px] text-on-surface-variant">06:00</span>
                          </div>
                          {/* 8 AM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-error opacity-0 group-hover:opacity-100 transition-opacity">
                              312
                            </span>
                            <div
                              className="w-full bg-error rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "100%" }}
                            ></div>
                            <span className="text-[10px] text-on-surface-variant">08:00</span>
                          </div>
                          {/* 10 AM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                              220
                            </span>
                            <div
                              className="w-full bg-tertiary-fixed-dim rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "72%" }}
                            ></div>
                            <span className="text-[10px] text-on-surface-variant">10:00</span>
                          </div>
                          {/* 12 PM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                              155
                            </span>
                            <div
                              className="w-full bg-tertiary-fixed-dim rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "52%" }}
                            ></div>
                            <span className="text-[10px] text-on-surface-variant">12:00</span>
                          </div>
                          {/* 2 PM (Optimal Green Window) */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                            <span className="text-[10px] font-bold text-secondary opacity-100">
                              118
                            </span>
                            <div
                              className="w-full bg-secondary-fixed rounded-t-md ring-2 ring-secondary/40 transition-all group-hover:brightness-95 shadow-sm"
                              style={{ height: "38%" }}
                            ></div>
                            <span className="text-[10px] font-bold text-secondary">14:00</span>
                          </div>
                          {/* 3:30 PM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                              126
                            </span>
                            <div
                              className="w-full bg-secondary-fixed rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "42%" }}
                            ></div>
                            <span className="text-[10px] font-bold text-secondary">15:30</span>
                          </div>
                          {/* 5:30 PM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                              194
                            </span>
                            <div
                              className="w-full bg-tertiary-fixed-dim rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "64%" }}
                            ></div>
                            <span className="text-[10px] text-on-surface-variant">17:30</span>
                          </div>
                          {/* 7 PM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-error opacity-0 group-hover:opacity-100 transition-opacity">
                              285
                            </span>
                            <div
                              className="w-full bg-error rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "92%" }}
                            ></div>
                            <span className="text-[10px] text-on-surface-variant">19:00</span>
                          </div>
                          {/* 10 PM */}
                          <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-semibold text-error opacity-0 group-hover:opacity-100 transition-opacity">
                              304
                            </span>
                            <div
                              className="w-full bg-error rounded-t-md transition-all group-hover:brightness-95"
                              style={{ height: "98%" }}
                            ></div>
                            <span className="text-[10px] text-on-surface-variant">22:00</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Highlighted Safe Outdoor Window Box */}
                    <div className="mt-4 p-4 rounded-2xl bg-secondary-container/40 text-on-secondary-container flex items-start gap-3 border border-[#CEEAD6]">
                      <span className="material-symbols-outlined text-[24px] text-secondary shrink-0 mt-0.5">
                        verified_user
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-secondary">
                          Best Outdoor Window Today: 1:30 PM – 4:00 PM (Est. PM2.5 drops to 118 µg/m³)
                        </span>
                        <p className="text-[12px] text-on-surface-variant leading-relaxed">
                          Solar irradiation causes planetary boundary layer expansion from 280m to
                          1,450m, dispersing particulate traps. Schedule outdoor errands, dog
                          walks, and balcony ventilation strictly within this 2.5-hour frame.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right 35%: Gemini Household Safety Brief */}
                  <div className="lg:col-span-4 bg-surface-container rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[22px]">
                            auto_awesome
                          </span>
                          <span className="text-[18px] font-bold text-on-surface">
                            Gemini IAQ Brief
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold bg-primary-fixed text-on-primary-fixed-variant px-2.5 py-0.5 rounded-full">
                          Gemini 3.8 Flash
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                          Today's Priority Advisory
                        </span>
                        <h3 className="text-sm font-bold text-on-surface">
                          {aiPlan?.summary
                            ? aiPlan.summary
                            : `Tailored for ${userProfile.location.split(",")[0]} Flat (${personaLabel})`}
                        </h3>
                      </div>

                      {/* Tailored 3-Card Breakdown */}
                      <div className="flex flex-col gap-3 mt-1">
                        <div className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-[#E0E3E1]">
                          <div className="w-7 h-7 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">
                              child_care
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-on-surface">
                              No Outdoor Play After 5:30 PM
                            </span>
                            <span className="text-[11px] text-on-surface-variant leading-snug">
                              Rapid winter radiative cooling drops boundary layer; surface PM2.5
                              jumps by 110 µg/m³ in 45 minutes.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-[#E0E3E1]">
                          <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">masks</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-on-surface">
                              Pediatric N95 on Commutes
                            </span>
                            <span className="text-[11px] text-on-surface-variant leading-snug">
                              Mandatory for open auto/two-wheeler morning rides. Standard cloth masks
                              pass 85% of fine soot.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-[#E0E3E1]">
                          <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">
                              air_purifier_gen
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-on-surface">
                              Bedroom CADR Turbo Surge
                            </span>
                            <span className="text-[11px] text-on-surface-variant leading-snug">
                              Pre-filter bedroom at 9:00 PM for 35 mins before sleep to bring
                              night PM2.5 below 25 µg/m³.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 flex items-center justify-between text-on-surface-variant text-[11px] border-t border-[#E0E3E1]">
                      <span>Confidence Index: 98.4%</span>
                      <button
                        onClick={() => setShowScientificLog(true)}
                        className="flex items-center gap-1 text-primary cursor-pointer hover:underline font-semibold"
                      >
                        <span>View Scientific Log</span>
                        <span className="material-symbols-outlined text-[14px]">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Three Time-Block Routine Cards */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[22px]">
                        schedule
                      </span>
                      <h3 className="text-[17px] font-bold text-on-surface">
                        Adaptive Daily Household Routine
                      </h3>
                    </div>
                    <span className="text-xs text-on-surface-variant font-medium">
                      Calibrated for {userProfile.location.split(",")[0]} micro-wind patterns
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Morning Routine Card */}
                    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-[#E0E3E1] flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container text-[11px] font-semibold">
                            Morning • 7:30 AM – 9:30 AM
                          </span>
                          <span className="material-symbols-outlined text-error text-[20px]">
                            warning
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-on-surface-variant line-through">
                            Standard: 7:45 AM outdoor jog + open balcony breakfast
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="material-symbols-outlined text-primary text-[17px]">
                              verified
                            </span>
                            <span className="text-xs font-bold text-on-surface">
                              VayuMitra Re-route
                            </span>
                          </div>
                          <p className="text-xs text-on-surface leading-relaxed">
                            Keep home envelope sealed. Shift outdoor walk to 2:15 PM window. Fit child
                            with pediatric N95 before boarding school van.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-2xl bg-surface-container flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                          insights
                        </span>
                        <p className="text-[11px] text-on-surface-variant leading-snug">
                          Reduces child's daily inhaled PM2.5 load by{" "}
                          <strong className="text-on-surface">~46%</strong> and cuts local tailpipe
                          emissions by 1.8 kg CO₂.
                        </p>
                      </div>
                    </div>

                    {/* Afternoon Routine Card */}
                    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-[#E0E3E1] flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                            Afternoon • 1:30 PM – 4:30 PM
                          </span>
                          <span className="material-symbols-outlined text-secondary text-[20px]">
                            check_circle
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-on-surface-variant line-through">
                            Standard: Separate car trip for grocery at 11 AM &amp; pharmacy at 5 PM
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="material-symbols-outlined text-primary text-[17px]">
                              verified
                            </span>
                            <span className="text-xs font-bold text-on-surface">
                              VayuMitra Re-route
                            </span>
                          </div>
                          <p className="text-xs text-on-surface leading-relaxed">
                            Batch errands into single 2:30 PM trip via Metro or shared E-Rickshaw.
                            Open cross-ventilation dampers for 25 minutes.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-2xl bg-surface-container flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">
                          insights
                        </span>
                        <p className="text-[11px] text-on-surface-variant leading-snug">
                          Cuts traffic congestion idling exposure by{" "}
                          <strong className="text-on-surface">35 mins</strong> and exploits natural
                          boundary layer air wash.
                        </p>
                      </div>
                    </div>

                    {/* Evening Routine Card */}
                    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-[#E0E3E1] flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-semibold">
                            Evening • 5:30 PM – 8:30 PM
                          </span>
                          <span className="material-symbols-outlined text-tertiary text-[20px]">
                            air
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-on-surface-variant line-through">
                            Standard: 6:00 PM park play &amp; deep frying with open kitchen windows
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="material-symbols-outlined text-primary text-[17px]">
                              verified
                            </span>
                            <span className="text-xs font-bold text-on-surface">
                              VayuMitra Re-route
                            </span>
                          </div>
                          <p className="text-xs text-on-surface leading-relaxed">
                            Move children's play indoors. Run kitchen chimney on high boost 5 mins
                            prior to oil heating; seal kitchen door during dinner prep.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-2xl bg-surface-container flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                          insights
                        </span>
                        <p className="text-[11px] text-on-surface-variant leading-snug">
                          Prevents <strong className="text-on-surface">65 µg/m³ spike</strong> in
                          bedroom VOCs &amp; PM2.5, maintaining safe sleeping baseline.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* TAB 2: INDOOR AIR LAB                                        */}
            {/* ============================================================ */}
            {activeTab === "indoor-air-lab" && (
              <section className="flex flex-col gap-6 w-full animate-fade-in">
                {/* Top Banner Card: Smart Cross-Ventilation Timer */}
                <div className="p-6 rounded-3xl bg-secondary-container/30 text-on-secondary-container flex flex-wrap items-center justify-between gap-4 shadow-xs border border-[#CEEAD6]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-on-secondary shadow-sm">
                      <span className="material-symbols-outlined text-[28px]">window</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-secondary">
                          Smart Ventilation Automation
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-error text-on-error text-[10px] font-semibold">
                          Inversion Trap Active
                        </span>
                      </div>
                      <p className="text-base font-bold text-on-surface mt-0.5">
                        Keep windows closed right now (Outdoor PM2.5 is 3.4x WHO safe limit).
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Open east-facing windows for exactly 25 mins at 2:30 PM when thermal
                        convection elevates ambient particulate layers.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-on-surface-variant block">
                        Ventilation Countdown
                      </span>
                      <span className="text-2xl font-bold text-secondary font-headline">
                        01h 28m
                      </span>
                    </div>
                    <button
                      onClick={() => alert("Ventilation reminder alarm set for 2:30 PM!")}
                      className="h-10 px-4 rounded-full bg-secondary text-on-secondary text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                      type="button"
                    >
                      Set Auto Alarm
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                  {/* Left: Action Checklist */}
                  <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                          <span className="material-symbols-outlined text-[22px]">checklist</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-on-surface">
                            Action Checklist for HEPA Purifier Owners
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">
                            Dynamic protocols based on real-time indoor CADR and humidity
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-surface-container text-on-surface text-xs font-semibold rounded-full">
                        {checklist.filter((c) => c.done).length} of {checklist.length} Done
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {checklist.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() =>
                              setChecklist((prev) =>
                                prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c))
                              )
                            }
                            className="mt-1 w-4 h-4 rounded border-outline text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span
                              className={`text-xs font-semibold ${
                                item.done ? "line-through text-on-surface-variant" : "text-on-surface"
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                              {item.desc}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Right: Gemini Vision IAQ Audit */}
                  <div className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                          <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-on-surface">
                            Gemini Vision IAQ Audit
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">
                            Detect silent particulate, VOC, and mold sources
                          </p>
                        </div>
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      {/* Upload Dropzone */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-outline-variant/60 rounded-3xl p-6 bg-surface-container-low flex flex-col items-center justify-center text-center gap-3 hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                          <span
                            className={`material-symbols-outlined text-[28px] ${
                              isUploadingPhoto ? "animate-spin" : ""
                            }`}
                          >
                            {isUploadingPhoto ? "sync" : "add_a_photo"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">
                            {isUploadingPhoto
                              ? "Analyzing with Gemini Vision..."
                              : "Upload Room or Kitchen Photo"}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            Drop photo here for automated indoor hazard scan
                          </span>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-semibold">
                          Supports JPG, PNG up to 12MB
                        </span>
                      </div>

                      {uploadedScanResult && (
                        <div className="p-3 bg-[#EAF2FD] rounded-2xl border border-[#C2D7FA] text-xs text-[#041E49] leading-relaxed">
                          <strong>Scan Result:</strong> {uploadedScanResult}
                        </div>
                      )}

                      {/* Quick Habit Trigger Tags */}
                      <div className="flex flex-col gap-2 pt-2">
                        <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                          Frequently Identified Triggers
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-error-container text-on-error-container text-xs font-medium flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">skillet</span>
                            <span>Gas Stove Without Chimney</span>
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs font-medium flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">balcony</span>
                            <span>Road-Facing Balcony Gap</span>
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-medium flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">bed</span>
                            <span>Off-Gassing Foam Mattress</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-surface-container rounded-2xl flex items-center justify-between text-xs">
                      <span className="text-on-surface">
                        Last Kitchen Scan: <strong>Clean (Chimney Active)</strong>
                      </span>
                      <span className="text-secondary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check</span> Healthy
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* TAB 3: SUSTAINABLE SWAPS                                     */}
            {/* ============================================================ */}
            {activeTab === "sustainable-swaps" && (
              <section className="flex flex-col gap-6 w-full animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                  {/* Left 55%: Interactive Swaps List */}
                  <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant">
                            <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-on-surface">
                              Household Emission Swaps
                            </h3>
                            <p className="text-[11px] text-on-surface-variant">
                              Toggle routine swaps to simulate your micro-climate &amp; wallet impact
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setSwaps({ carpool: true, metro: true, idling: true, mosquito: true })
                          }
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                          type="button"
                        >
                          Reset
                        </button>
                      </div>

                      {/* Interactive Switches */}
                      <div className="flex flex-col gap-3">
                        {/* Swap 1 */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-[20px]">
                                directions_car
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-on-surface">
                                Carpool 3 Days / Week with Neighbours
                              </span>
                              <span className="text-[11px] text-on-surface-variant">
                                Reduces 2 personal petrol sedan cold-starts per morning
                              </span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={swaps.carpool}
                              onChange={(e) =>
                                setSwaps((s) => ({ ...s, carpool: e.target.checked }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>

                        {/* Swap 2 */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                              <span className="material-symbols-outlined text-[20px]">subway</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-on-surface">
                                Switch Solo Cab to Delhi Metro (Red Line)
                              </span>
                              <span className="text-[11px] text-on-surface-variant">
                                Zero peak idling exposure + subterranean filtered station airflow
                              </span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={swaps.metro}
                              onChange={(e) =>
                                setSwaps((s) => ({ ...s, metro: e.target.checked }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>

                        {/* Swap 3 */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                              <span className="material-symbols-outlined text-[20px]">traffic</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-on-surface">
                                Cut Engine at Signals &gt; 30 Seconds
                              </span>
                              <span className="text-[11px] text-on-surface-variant">
                                Zero-idling protocol at Madhuban Chowk &amp; Ring Road junctions
                              </span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={swaps.idling}
                              onChange={(e) =>
                                setSwaps((s) => ({ ...s, idling: e.target.checked }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>

                        {/* Swap 4 */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
                              <span className="material-symbols-outlined text-[20px]">
                                pest_control
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-on-surface">
                                Switch Coil to Electric Mosquito Repellent
                              </span>
                              <span className="text-[11px] text-on-surface-variant">
                                Eliminates 1 coil = 85 cigarettes equivalent PM2.5 release indoors
                              </span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={swaps.mosquito}
                              onChange={(e) =>
                                setSwaps((s) => ({ ...s, mosquito: e.target.checked }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-on-surface-variant">
                      Data models parameterized with IIT Kanpur &amp; TERI clean air urban commute indices.
                    </div>
                  </div>

                  {/* Right 45%: Live Quantified Impact Scorecard */}
                  <div className="lg:col-span-5 bg-surface-container rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-on-surface">
                          Simulated Impact
                        </span>
                        <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                          Household Scale
                        </span>
                      </div>

                      {/* 3 Metric Tiles */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-surface-container-lowest p-4 rounded-2xl flex flex-col items-center text-center border border-[#E0E3E1]">
                          <span className="material-symbols-outlined text-secondary text-[24px] mb-1">
                            co2
                          </span>
                          <span className="text-lg font-bold text-secondary">
                            {impactMetrics.co2}
                          </span>
                          <span className="text-[10px] text-on-surface-variant mt-0.5">
                            Monthly CO₂ Avoided
                          </span>
                        </div>
                        <div className="bg-surface-container-lowest p-4 rounded-2xl flex flex-col items-center text-center border border-[#E0E3E1]">
                          <span className="material-symbols-outlined text-primary text-[24px] mb-1">
                            file_copy
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {impactMetrics.pm}
                          </span>
                          <span className="text-[10px] text-on-surface-variant mt-0.5">
                            Inhaled PM2.5 Load
                          </span>
                        </div>
                        <div className="bg-surface-container-lowest p-4 rounded-2xl flex flex-col items-center text-center border border-[#E0E3E1]">
                          <span className="material-symbols-outlined text-tertiary text-[24px] mb-1">
                            savings
                          </span>
                          <span className="text-lg font-bold text-tertiary">
                            {impactMetrics.savings}
                          </span>
                          <span className="text-[10px] text-on-surface-variant mt-0.5">
                            Monthly Net Saved
                          </span>
                        </div>
                      </div>

                      {/* Gemini Explanation Box */}
                      <div className="p-4 bg-surface-container-lowest rounded-2xl flex flex-col gap-2 border border-[#E0E3E1]">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            psychology
                          </span>
                          <span className="text-xs font-semibold text-on-surface">
                            Gemini Impact Synthesis
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">
                          By switching daily solo cab commutes to the Red Line Metro and cutting car engine idle
                          intervals at signals, your family prevents 28.4 kg of direct tailpipe carbon from concentrating
                          in the {userProfile.location.split(",")[0]} boundary layer while expanding your HEPA filter lifespan by 42 days.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => alert("Household Clean Air Impact Certificate downloaded!")}
                      className="w-full h-11 bg-primary hover:bg-[#0842a0] text-on-primary rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                      <span>Export Household Impact Certificate</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* TAB 4: COMMUNITY & NEIGHBOURHOOD HUB                         */}
            {/* ============================================================ */}
            {activeTab === "community-hub" && (
              <section className="flex flex-col gap-6 w-full animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                  {/* Left 60%: Hyperlocal Air Map */}
                  <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                          <span className="material-symbols-outlined text-[22px]">map</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-on-surface">
                            {userProfile.location.split(",")[0]} Hyperlocal Air Map
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">
                            Live station readings, safe biophilic green zones &amp; community reports
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-surface-container text-[11px] font-semibold text-on-surface-variant">
                        Radius: 3.5 km
                      </span>
                    </div>

                    {/* Interactive Map Visual */}
                    <div className="w-full h-80 rounded-2xl relative overflow-hidden bg-gradient-to-br from-[#E8F0FE] to-[#D2E3FC] border border-[#C2D7FA] shadow-inner flex flex-col justify-between p-4">
                      {/* Map HUD Overlays */}
                      <div className="flex items-center justify-between relative z-10 flex-wrap gap-2">
                        <div className="flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-2xs text-xs font-semibold text-on-surface">
                          <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                          <span>CPCB Ground Node: AQI {userProfile.aqi ?? 342}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-2xs text-xs font-semibold text-secondary">
                          <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                          <span>Bio-Canopy Pocket: AQI 198</span>
                        </div>
                      </div>

                      {/* Flagged Markers */}
                      <div className="relative z-10 flex flex-wrap gap-2">
                        <div className="bg-error text-on-error text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <span className="material-symbols-outlined text-[13px]">
                            local_fire_department
                          </span>
                          <span>Active Waste Combustion Flagged (Sec 16)</span>
                        </div>
                        <div className="bg-secondary text-on-secondary text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <span className="material-symbols-outlined text-[13px]">park</span>
                          <span>Canopy Safe Zone (Sec 10)</span>
                        </div>
                      </div>
                    </div>

                    {/* Legend Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface-container-low rounded-2xl text-[11px] text-on-surface-variant font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span> Safe Pocket (&lt;200)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span> Moderate (200-300)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-error"></span> Critical Hazard (&gt;300)
                      </span>
                      <button
                        onClick={() => setShowReportSmokeModal(true)}
                        className="font-semibold text-primary cursor-pointer hover:underline"
                      >
                        + Report Local Smoke
                      </button>
                    </div>
                  </div>

                  {/* Right 40%: RWA & School Advisory Circular AI */}
                  <div className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-6 shadow-xs border border-[#E0E3E1] flex flex-col justify-between gap-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                          <span className="material-symbols-outlined text-[22px]">campaign</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-on-surface">
                            RWA &amp; School Circular AI
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">
                            Instant, science-backed advisory templates
                          </p>
                        </div>
                      </div>

                      {/* Audience Selector */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-on-surface-variant">
                          Target Community Audience
                        </label>
                        <select
                          value={noticeAudience}
                          onChange={(e: any) => setNoticeAudience(e.target.value)}
                          className="w-full h-10 px-3.5 rounded-xl bg-surface-container text-xs text-on-surface border-0 focus:ring-2 focus:ring-primary cursor-pointer outline-none"
                        >
                          <option value="rwa">Apartment Society RWA</option>
                          <option value="school">School Parent-Teacher Group</option>
                          <option value="office">Local Commercial Complex / Co-working</option>
                        </select>
                      </div>

                      {/* Action Goal */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-on-surface-variant">
                          Policy Action Focus
                        </label>
                        <select
                          value={noticeGoal}
                          onChange={(e: any) => setNoticeGoal(e.target.value)}
                          className="w-full h-10 px-3.5 rounded-xl bg-surface-container text-xs text-on-surface border-0 focus:ring-2 focus:ring-primary cursor-pointer outline-none"
                        >
                          <option value="gate">Enforce Zero-Idling at Main Gates</option>
                          <option value="sports">Pause Outdoor Physical Training (Sports)</option>
                          <option value="leaf">Ban Dry Leaf / Garbage Open Combustion</option>
                        </select>
                      </div>

                      {/* Notice Output Box */}
                      <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2 border border-[#E0E3E1]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            Draft Circular Notice
                          </span>
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            auto_awesome
                          </span>
                        </div>
                        <p className="text-xs text-on-surface bg-white p-3 rounded-xl leading-relaxed select-all whitespace-pre-line border border-[#E0E3E1]">
                          {getNoticeContent()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyNotice}
                      className="w-full h-11 bg-primary hover:bg-[#0842a0] text-on-primary rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copiedNotice ? "check" : "content_copy"}
                      </span>
                      <span>{copiedNotice ? "Copied to Clipboard!" : "Copy WhatsApp / Notice Circular"}</span>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30 py-4 px-8 text-on-surface-variant flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-on-surface">VayuMitra</span>
            <span>•</span>
            <span>Continuous Hyperlocal Environmental Monitoring</span>
            <span>•</span>
            <span>CPCB &amp; OpenAQ Ground Standards</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">shield</span>
              Data Integrity Guaranteed
            </span>
            <Link href="/onboarding" className="hover:text-primary transition-colors">
              Calibrate Household Profile
            </Link>
          </div>
        </footer>
      </div>

      {/* ============================================================ */}
      {/* 4. AI FLOATING CHAT ASSISTANT WIDGET                         */}
      {/* ============================================================ */}
      <div id="ai-chat-assistant" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {chatOpen && (
          <div
            id="ai-chat-window"
            className="w-[380px] h-[520px] bg-white border border-[#D0D5DD] rounded-3xl shadow-xl flex flex-col overflow-hidden mb-3.5 transition-all duration-200 select-none animate-scale-in"
          >
            {/* Chat Header */}
            <div className="px-4 py-3 bg-surface-container-low border-b border-[#E0E3E1] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAF2FD] text-[#0B57D0] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-on-surface truncate">
                      VayuMitra AI Assistant
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#EAF2FD] text-[#0B57D0] text-[9px] font-semibold uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant truncate">
                    Powered by Gemini 3.8 Flash • Sensor Grounded
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Minimize"
              >
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
            </div>

            {/* Prompt Quick Chips */}
            <div className="px-3 py-2 bg-surface-container-low/60 border-b border-[#E0E3E1] flex items-center gap-1.5 overflow-x-auto select-none scrollbar-none">
              <button
                type="button"
                onClick={() => handleChipClick("Can kids play outside now?")}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAF2FD] text-on-surface hover:text-[#0B57D0] border border-[#D0D5DD] text-[10px] font-medium transition-colors shadow-2xs cursor-pointer"
              >
                Can kids play outside?
              </button>
              <button
                type="button"
                onClick={() => handleChipClick("Safe window to open balcony?")}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAF2FD] text-on-surface hover:text-[#0B57D0] border border-[#D0D5DD] text-[10px] font-medium transition-colors shadow-2xs cursor-pointer"
              >
                Balcony window time?
              </button>
              <button
                type="button"
                onClick={() => handleChipClick("N95 mask advice today")}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAF2FD] text-on-surface hover:text-[#0B57D0] border border-[#D0D5DD] text-[10px] font-medium transition-colors shadow-2xs cursor-pointer"
              >
                N95 mask protocol
              </button>
              <button
                type="button"
                onClick={() => handleChipClick("Is air purifier needed tonight?")}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAF2FD] text-on-surface hover:text-[#0B57D0] border border-[#D0D5DD] text-[10px] font-medium transition-colors shadow-2xs cursor-pointer"
              >
                Purifier tonight?
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 text-xs">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 max-w-[90%] ${
                    msg.sender === "user" ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-[#EAF2FD] text-[#0B57D0] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div
                      className={`p-3 rounded-2xl text-[12px] leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-primary text-on-primary rounded-tr-sm shadow-xs"
                          : "bg-surface-container-low text-on-surface rounded-tl-sm border border-[#E0E3E1]"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div
                      className={`flex items-center gap-1.5 text-[9px] text-on-surface-variant/80 px-1 ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span>{msg.time}</span>
                      {msg.tag && (
                        <>
                          <span>•</span>
                          <span>{msg.tag}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isAiReplying && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-2xl w-fit">
                  <span className="material-symbols-outlined text-[15px] text-primary animate-spin">
                    sync
                  </span>
                  <span>Gemini is evaluating atmospheric models...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSendChat}
              className="p-2.5 bg-surface-container-lowest border-t border-[#E0E3E1] flex items-center gap-1.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Gemini about commute, park, or HEPA..."
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
          id="ai-fab-launcher"
          type="button"
          onClick={() => setChatOpen((prev) => !prev)}
          className="h-12 px-4 rounded-full bg-primary hover:bg-[#0B57D0] text-on-primary shadow-md flex items-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <div className="relative flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#85d98e] border-2 border-primary"></span>
          </div>
          <span className="text-xs font-bold">Ask VayuMitra AI</span>
          <span className="material-symbols-outlined text-[18px] opacity-80">
            {chatOpen ? "keyboard_arrow_down" : "keyboard_arrow_up"}
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 5. SCIENTIFIC LOG MODAL                                      */}
      {/* ============================================================ */}
      {showScientificLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E0E3E1] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E3E1] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  science
                </span>
                <h3 className="text-base font-bold text-on-surface">Atmospheric Physics Log</h3>
              </div>
              <button
                onClick={() => setShowScientificLog(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="text-xs text-on-surface-variant space-y-2.5 leading-relaxed">
              <p>
                <strong>Planetary Boundary Layer Dynamics:</strong> Winter nocturnal radiative cooling
                compresses the ground layer to ~140m between 7:00 PM and 9:00 AM, trapping vehicular
                and biomass PM2.5 within human inhalation levels.
              </p>
              <p>
                <strong>Solar Expansion Window:</strong> Thermal convection begins at 12:30 PM,
                expanding the mixing height to &gt;1,400m by 2:00 PM, resulting in a ~58% drop in
                ambient ground-level soot density.
              </p>
              <p>
                <strong>Indoor Infiltration Co-efficient:</strong> Residential flats in Delhi NCR experience
                an unfiltered ambient air change rate of 0.72 ACH without foam draft seals.
              </p>
            </div>
            <button
              onClick={() => setShowScientificLog(false)}
              className="w-full h-10 rounded-full bg-primary text-white font-semibold text-xs mt-2 cursor-pointer"
            >
              Close Log
            </button>
          </div>
        </div>
      )}

      {/* Report Local Smoke Modal */}
      {showReportSmokeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E0E3E1] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E3E1] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">
                  local_fire_department
                </span>
                <h3 className="text-base font-bold text-on-surface">Report Local Smoke / Fire</h3>
              </div>
              <button
                onClick={() => {
                  setShowReportSmokeModal(false);
                  setSmokeReportSuccess(false);
                }}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {smokeReportSuccess ? (
              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-secondary">check_circle</span>
                <p className="text-xs font-bold text-[#14532D]">Report Submitted to Community Hub</p>
                <p className="text-[11px] text-on-surface-variant">
                  Area coordinates flagged for society marshals and RWA broadcast.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSmokeReportSuccess(true);
                  setTimeout(() => {
                    setShowReportSmokeModal(false);
                    setSmokeReportSuccess(false);
                  }, 2000);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">
                    Locality / Street Landmark
                  </label>
                  <input
                    type="text"
                    required
                    defaultValue={`${userProfile.location.split(",")[0]}, Sector 14`}
                    className="w-full h-9.5 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-[#E0E3E1]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">
                    Combustion Type
                  </label>
                  <select className="w-full h-9.5 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-[#E0E3E1]">
                    <option>Dry Leaf / Horticulture Waste</option>
                    <option>Plastic / Solid Municipal Waste</option>
                    <option>Construction Dust Uncovered</option>
                    <option>Diesel Generator Exhaust</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-full bg-error hover:bg-[#8C1D18] text-white font-semibold text-xs mt-2 cursor-pointer shadow-sm"
                >
                  Submit Real-time Flag
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
