"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wind,
  Zap,
  Search,
  X,
  LocateFixed,
  MapPin,
  Clock,
  CheckCircle2,
  Radio,
  Plus,
  Minus,
  Info,
  Baby,
  HeartPulse,
  Activity,
  User,
  Bike,
  Car,
  Train,
  Footprints,
  Laptop,
  Fan,
  AppWindow,
  Lock,
  Sparkles,
  Loader2,
  Circle,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

type VulnerabilityKey = "children" | "seniors" | "respiratory" | "adult";
type CommuteKey = "two_wheeler" | "car" | "metro" | "walk" | "wfh";
type IndoorSetupKey = "purifier" | "natural";

export default function OnboardingPage() {
  // Navigation step: 1 (Location) | 2 (Household & Lifestyle)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1: Location state
  const [locationQuery, setLocationQuery] = useState("Sector 14, Rohini, New Delhi 110085");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [connectedStation, setConnectedStation] = useState({
    name: "CPCB / OpenAQ Rohini Station (DL-14)",
    pm25: "142 µg/m³",
    temp: "18°C",
    distance: "0.8 km from pin",
  });

  // Step 2: Household & Lifestyle state
  const [vulnerabilities, setVulnerabilities] = useState<Set<VulnerabilityKey>>(
    new Set(["children", "seniors"])
  );
  const [commute, setCommute] = useState<CommuteKey>("two_wheeler");
  const [indoorSetup, setIndoorSetup] = useState<IndoorSetupKey>("purifier");
  const [windows, setWindows] = useState({
    morning: true,
    commute: true,
    evening: true,
  });

  // Submission / Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleVulnerability = (key: VulnerabilityKey) => {
    setVulnerabilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleDetectLocation = () => {
    setIsDetecting(true);
    setTimeout(() => {
      setLocationQuery("Sector 14, Rohini, New Delhi 110085");
      setConnectedStation({
        name: "CPCB / OpenAQ Rohini Station (DL-14)",
        pm25: "142 µg/m³",
        temp: "18°C",
        distance: "0.8 km from pin",
      });
      setIsDetecting(false);
    }, 800);
  };

  const handleSelectLocation = (loc: string, station: string, pm25: string) => {
    setLocationQuery(loc);
    setConnectedStation({
      name: station,
      pm25: pm25,
      temp: "21°C",
      distance: "1.1 km from pin",
    });
    setIsDropdownOpen(false);
  };

  const handleNextStep = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGeneratePlan = () => {
    setIsSubmitting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setIsSubmitting(false);
  };

  return (
    <div className="bg-[#F8F9FA] text-[#1F1F1F] font-sans antialiased min-h-screen flex flex-col justify-between selection:bg-[#D3E3FD] selection:text-[#041E49]">
      {/* 1. Top App Bar (64px) */}
      <header className="h-16 bg-[#F8F9FA] border-b border-[#E0E3E1] px-4 sm:px-6 md:px-12 sticky top-0 z-40 flex items-center justify-between">
        {/* Left: Brand Emblem + Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Wind className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold tracking-tight text-[#1F1F1F] leading-none group-hover:text-primary transition-colors">
              VayuMitra
            </span>
            <span className="text-[11px] font-medium text-[#444746] tracking-wide mt-0.5">
              Urban Air Quality Assistant
            </span>
          </div>
        </Link>

        {/* Center: M3 Linear Progress Indicator */}
        <div className="hidden sm:flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0B57D0]" />
            <span className="text-[12px] font-semibold text-[#1F1F1F] tracking-wide">
              {isSubmitting
                ? "Calibrating Air Guidance..."
                : currentStep === 1
                ? "Step 1 of 2 • Household Location Setup"
                : "Step 2 of 2 • Household Profile & Lifestyle"}
            </span>
          </div>
          <div className="w-56 md:w-72 h-1.5 bg-[#D3E3FD] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#0B57D0] rounded-full transition-all duration-500"
              style={{
                width: isSubmitting ? "100%" : currentStep === 1 ? "50%" : "100%",
              }}
            />
          </div>
        </div>

        {/* Right: Signed-in User Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white border border-[#E0E3E1] rounded-full pl-1.5 pr-3 py-1 shadow-xs">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
                A
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-2xs">
                <GoogleIcon className="w-2.5 h-2.5" />
              </span>
            </div>
            <span className="text-[13px] font-medium text-[#1F1F1F]">Ananya S.</span>
          </div>
          <Link
            href="/"
            className="text-[13px] font-medium text-[#444746] hover:text-[#0B57D0] px-2 py-1 rounded transition-colors"
          >
            Exit
          </Link>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8 md:py-12 flex justify-center items-start">
        {!isSubmitting ? (
          /* Centered Setup Container (680px wide) */
          <div className="w-full max-w-[680px] bg-white rounded-[28px] border border-[#E0E3E1] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300">
            {/* Top Context Banner */}
            <div className="bg-gradient-to-r from-[#F0F4F9] to-[#E9EEF6] px-6 sm:px-8 py-3.5 border-b border-[#E0E3E1] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#0B57D0]" />
                <span className="text-[13px] font-medium text-[#041E49]">
                  {currentStep === 1
                    ? "Step 1: Calibrate your ground telemetry sensor node"
                    : "Step 2: Customize AI guidance for vulnerable family members"}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#0B57D0] bg-[#D3E3FD] px-2.5 py-0.5 rounded-full">
                Step {currentStep} of 2
              </span>
            </div>

            {/* Step Body */}
            <div className="p-6 md:p-8">
              {currentStep === 1 ? (
                /* ========================================== */
                /* STEP 1: Pan-India Location & Ground Station */
                /* ========================================== */
                <section className="space-y-5 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0B57D0] text-white text-[12px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <h2 className="text-[22px] md:text-[24px] font-bold text-[#1F1F1F] tracking-tight">
                        Where is your household located?
                      </h2>
                    </div>
                    <p className="text-[14px] text-[#444746] pl-8 leading-relaxed">
                      We connect to the nearest real-time CPCB / OpenAQ ground monitoring station
                      across India to calibrate your daily plan.
                    </p>
                  </div>

                  {/* Location Input Row */}
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-col sm:flex-row gap-3 relative">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <div className="relative flex items-center">
                          <Search className="w-5 h-5 absolute left-3.5 text-[#444746] pointer-events-none" />
                          <input
                            type="text"
                            value={locationQuery}
                            onFocus={() => setIsDropdownOpen(true)}
                            onChange={(e) => setLocationQuery(e.target.value)}
                            placeholder="Search Indian city, neighbourhood, or PIN code"
                            className="w-full h-14 pl-11 pr-10 bg-white border-2 border-[#0B57D0] rounded-xl text-[14px] text-[#1F1F1F] focus:outline-none shadow-xs"
                          />
                          {locationQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setLocationQuery("");
                                setIsDropdownOpen(true);
                              }}
                              className="absolute right-3 text-[#747775] hover:text-[#1F1F1F] cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown suggestions */}
                        {isDropdownOpen && (
                          <div className="absolute left-0 right-0 top-16 mt-1 bg-white border border-[#E0E3E1] rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-[#F0F4F9] animate-scale-in">
                            <div className="px-4 py-2.5 bg-[#F0F4F9] flex items-center justify-between text-[11px] font-semibold text-[#444746] uppercase tracking-wider">
                              <span>Recent Ground Monitoring Nodes</span>
                              <span className="text-[#0B57D0]">380+ pan-India feeds</span>
                            </div>
                            <div
                              onClick={() =>
                                handleSelectLocation(
                                  "Sector 14, Rohini, New Delhi 110085",
                                  "CPCB / OpenAQ Rohini Station (DL-14)",
                                  "142 µg/m³"
                                )
                              }
                              className="px-4 py-3 hover:bg-[#F0F4F9] cursor-pointer flex items-center justify-between group bg-[#D3E3FD]/20 border-l-4 border-[#0B57D0]"
                            >
                              <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-[#0B57D0]" />
                                <div>
                                  <div className="text-[14px] font-semibold text-[#1F1F1F]">
                                    Sector 14, Rohini, New Delhi
                                  </div>
                                  <div className="text-[12px] text-[#444746]">
                                    Delhi NCR • PIN 110085 (CPCB Station #DL-14)
                                  </div>
                                </div>
                              </div>
                              <span className="text-[11px] font-medium text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                                Active Sensor
                              </span>
                            </div>
                            <div
                              onClick={() =>
                                handleSelectLocation(
                                  "Indiranagar, 100ft Road, Bengaluru 560038",
                                  "BSRB Node 04, Bengaluru",
                                  "48 µg/m³"
                                )
                              }
                              className="px-4 py-2.5 hover:bg-[#F0F4F9] cursor-pointer flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-[#747775]" />
                                <div>
                                  <div className="text-[13px] font-medium text-[#1F1F1F]">
                                    Indiranagar, 100ft Road, Bengaluru
                                  </div>
                                  <div className="text-[12px] text-[#444746]">
                                    Karnataka • BSRB Node 04
                                  </div>
                                </div>
                              </div>
                              <span className="text-[12px] text-[#444746]">PM2.5: 48 µg/m³</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Detect Location Button */}
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isDetecting}
                        className="h-14 px-4 sm:px-5 bg-[#D3E3FD] text-[#041E49] hover:bg-[#c2daf9] active:scale-95 rounded-xl font-medium text-[14px] flex items-center justify-center gap-2 transition-all shrink-0 border border-[#b8d4fa] cursor-pointer"
                      >
                        {isDetecting ? (
                          <Loader2 className="w-5 h-5 text-[#0B57D0] animate-spin" />
                        ) : (
                          <LocateFixed className="w-5 h-5 text-[#0B57D0]" />
                        )}
                        <span>Detect Location</span>
                      </button>
                    </div>
                  </div>

                  {/* Simulated Map Canvas */}
                  <div className="relative w-full h-[190px] rounded-2xl border border-[#E0E3E1] overflow-hidden bg-[#E9EEF6] shadow-inner">
                    <div className="absolute inset-0 bg-[#eef3f7] opacity-90">
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern
                            id="map-grid"
                            width="40"
                            height="40"
                            patternUnits="userSpaceOnUse"
                          >
                            <path
                              d="M 40 0 L 0 0 0 40"
                              fill="none"
                              stroke="#dbe3ea"
                              strokeWidth="0.8"
                            />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#map-grid)" />
                        {/* Roads */}
                        <path d="M-20 60 L700 80" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
                        <path d="M120 -20 L160 220" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" />
                        <path d="M380 -20 L400 220" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" />
                        <path d="M-20 140 L700 130" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
                        {/* Parks */}
                        <rect x="200" y="20" width="140" height="50" rx="8" fill="#d2e7d6" opacity="0.8" />
                        <rect x="440" y="100" width="110" height="70" rx="8" fill="#d2e7d6" opacity="0.8" />
                        <text x="235" y="48" fill="#2d6a4f" fontSize="10" fontWeight="600">
                          Swarna Jayanti Park
                        </text>
                        <text x="460" y="138" fill="#2d6a4f" fontSize="10" fontWeight="600">
                          District Park
                        </text>
                        <text x="20" y="74" fill="#747775" fontSize="9" fontWeight="500">
                          Outer Ring Rd / NH44
                        </text>
                      </svg>
                    </div>

                    {/* Pin Overlay */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-12 h-12 rounded-full bg-[#0B57D0]/20 animate-ping" />
                        <span className="absolute w-7 h-7 rounded-full bg-[#0B57D0]/30" />
                        <div className="w-9 h-9 rounded-full bg-[#0B57D0] text-white flex items-center justify-center shadow-lg border-2 border-white z-10">
                          <Radio className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="mt-1 px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-full shadow-md border border-[#E0E3E1] text-[11px] font-semibold text-[#1F1F1F] flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-[#C5221F] animate-pulse" />
                        <span>{connectedStation.name}</span>
                      </div>
                    </div>

                    {/* Map Controls */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                      <button
                        type="button"
                        className="w-7 h-7 bg-white rounded-lg border border-[#E0E3E1] flex items-center justify-center text-[#1F1F1F] shadow-sm hover:bg-[#F0F4F9] text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 bg-white rounded-lg border border-[#E0E3E1] flex items-center justify-center text-[#1F1F1F] shadow-sm hover:bg-[#F0F4F9] text-xs font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-3 text-[10px] text-[#444746] bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded border border-[#E0E3E1]">
                      © OpenStreetMap contributors • Survey of India calibrated
                    </div>
                  </div>

                  {/* Station Verification Banner */}
                  <div className="bg-[#E6F4EA] border border-[#b7e1cd] rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#137333] shrink-0" />
                      <div>
                        <div className="text-[13px] font-semibold text-[#137333]">
                          Nearest Live Feed Connected: {connectedStation.name}
                        </div>
                        <div className="text-[12px] text-[#2d6a4f] flex flex-wrap items-center gap-2 mt-0.5">
                          <span>
                            Current PM2.5:{" "}
                            <strong className="font-semibold text-[#1F1F1F]">
                              {connectedStation.pm25}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>Temperature: {connectedStation.temp}</span>
                          <span>•</span>
                          <span className="text-[11px] bg-white/60 px-1.5 py-0.5 rounded text-[#146C2E]">
                            Verified just now
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#137333] bg-white border border-[#b7e1cd] px-2.5 py-1 rounded-full shrink-0 hidden sm:inline-block">
                      {connectedStation.distance}
                    </span>
                  </div>

                  <p className="text-[12px] text-[#747775] flex items-center gap-1.5 pl-1">
                    <Info className="w-4 h-4 text-[#747775]" />
                    <span>
                      Evaluators and team members can switch cities or stations anytime from the live
                      dashboard header.
                    </span>
                  </p>
                </section>
              ) : (
                /* ========================================== */
                /* STEP 2: Household Persona & Lifestyle Context */
                /* ========================================== */
                <section className="space-y-6 animate-fade-in-up">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0B57D0] text-white text-[12px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <h2 className="text-[22px] md:text-[24px] font-bold text-[#1F1F1F] tracking-tight">
                        Who are we protecting and planning for?
                      </h2>
                    </div>
                    <p className="text-[14px] text-[#444746] pl-8 leading-relaxed">
                      Two households in the same city need vastly different advice. Select all that
                      apply to tailor your AI recommendations.
                    </p>
                  </div>

                  {/* Sub-Group A — Vulnerabilities (Multi-Select 2x2 Grid) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-[#1F1F1F]">
                        Household Members &amp; Vulnerabilities
                      </span>
                      <span className="text-[12px] font-medium text-[#0B57D0]">
                        Multi-select enabled
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Card 1: Young Children */}
                      <div
                        onClick={() => toggleVulnerability("children")}
                        className={`cursor-pointer group relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          vulnerabilities.has("children")
                            ? "bg-[#D3E3FD] border-[#0B57D0] shadow-xs"
                            : "bg-[#F0F4F9] border-transparent hover:border-[#C4C7C5]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-10 h-10 rounded-xl bg-white text-[#0B57D0] flex items-center justify-center shadow-xs">
                            <Baby className="w-5 h-5 text-[#0B57D0]" />
                          </div>
                          {vulnerabilities.has("children") ? (
                            <CheckCircle2 className="w-5 h-5 text-[#0B57D0]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#C4C7C5]" />
                          )}
                        </div>
                        <div className="mt-3">
                          <div
                            className={`text-[15px] font-bold ${
                              vulnerabilities.has("children") ? "text-[#041E49]" : "text-[#1F1F1F]"
                            }`}
                          >
                            Young Children / School-Goers
                          </div>
                          <p className="text-[12px] text-[#444746] mt-1 leading-snug">
                            Safe outdoor play windows, school bus exposure &amp; pediatric mask
                            thresholds.
                          </p>
                        </div>
                      </div>

                      {/* Card 2: Senior Citizens */}
                      <div
                        onClick={() => toggleVulnerability("seniors")}
                        className={`cursor-pointer group relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          vulnerabilities.has("seniors")
                            ? "bg-[#D3E3FD] border-[#0B57D0] shadow-xs"
                            : "bg-[#F0F4F9] border-transparent hover:border-[#C4C7C5]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-10 h-10 rounded-xl bg-white text-[#0B57D0] flex items-center justify-center shadow-xs">
                            <HeartPulse className="w-5 h-5 text-[#0B57D0]" />
                          </div>
                          {vulnerabilities.has("seniors") ? (
                            <CheckCircle2 className="w-5 h-5 text-[#0B57D0]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#C4C7C5]" />
                          )}
                        </div>
                        <div className="mt-3">
                          <div
                            className={`text-[15px] font-bold ${
                              vulnerabilities.has("seniors") ? "text-[#041E49]" : "text-[#1F1F1F]"
                            }`}
                          >
                            Senior Citizens (60+)
                          </div>
                          <p className="text-[12px] text-[#444746] mt-1 leading-snug">
                            Morning walk rescheduling, indoor cold drafts &amp; cardiopulmonary
                            vigilance.
                          </p>
                        </div>
                      </div>

                      {/* Card 3: Asthma / Respiratory */}
                      <div
                        onClick={() => toggleVulnerability("respiratory")}
                        className={`cursor-pointer group relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          vulnerabilities.has("respiratory")
                            ? "bg-[#D3E3FD] border-[#0B57D0] shadow-xs"
                            : "bg-[#F0F4F9] border-transparent hover:border-[#C4C7C5]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-10 h-10 rounded-xl bg-white text-[#444746] flex items-center justify-center shadow-xs">
                            <Activity className="w-5 h-5 text-[#0B57D0]" />
                          </div>
                          {vulnerabilities.has("respiratory") ? (
                            <CheckCircle2 className="w-5 h-5 text-[#0B57D0]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#C4C7C5]" />
                          )}
                        </div>
                        <div className="mt-3">
                          <div
                            className={`text-[15px] font-bold ${
                              vulnerabilities.has("respiratory")
                                ? "text-[#041E49]"
                                : "text-[#1F1F1F]"
                            }`}
                          >
                            Asthma / Respiratory Sensitivity
                          </div>
                          <p className="text-[12px] text-[#444746] mt-1 leading-snug">
                            Strict PM2.5 spike pre-warnings, humidification advice &amp; N95 fit
                            alerts.
                          </p>
                        </div>
                      </div>

                      {/* Card 4: Working Adult */}
                      <div
                        onClick={() => toggleVulnerability("adult")}
                        className={`cursor-pointer group relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          vulnerabilities.has("adult")
                            ? "bg-[#D3E3FD] border-[#0B57D0] shadow-xs"
                            : "bg-[#F0F4F9] border-transparent hover:border-[#C4C7C5]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-10 h-10 rounded-xl bg-white text-[#444746] flex items-center justify-center shadow-xs">
                            <User className="w-5 h-5 text-[#0B57D0]" />
                          </div>
                          {vulnerabilities.has("adult") ? (
                            <CheckCircle2 className="w-5 h-5 text-[#0B57D0]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#C4C7C5]" />
                          )}
                        </div>
                        <div className="mt-3">
                          <div
                            className={`text-[15px] font-bold ${
                              vulnerabilities.has("adult") ? "text-[#041E49]" : "text-[#1F1F1F]"
                            }`}
                          >
                            Working Adult / Wellness
                          </div>
                          <p className="text-[12px] text-[#444746] mt-1 leading-snug">
                            Commute exposure minimization &amp; evening exercise window optimization.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Group B — Commute Mode Chips */}
                  <div className="space-y-2">
                    <span className="text-[14px] font-semibold text-[#1F1F1F]">
                      Primary Daily Commute Mode
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { key: "two_wheeler" as CommuteKey, label: "Two-Wheeler", icon: Bike },
                        { key: "car" as CommuteKey, label: "Personal Car", icon: Car },
                        { key: "metro" as CommuteKey, label: "Metro / Bus", icon: Train },
                        { key: "walk" as CommuteKey, label: "Walk / Cycle", icon: Footprints },
                        { key: "wfh" as CommuteKey, label: "Work From Home", icon: Laptop },
                      ].map(({ key, label, icon: Icon }) => {
                        const isSelected = commute === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setCommute(key)}
                            className={`h-9 px-3.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#D3E3FD] border border-[#0B57D0] text-[#041E49] font-semibold shadow-2xs"
                                : "bg-[#F0F4F9] border border-transparent hover:border-[#C4C7C5] text-[#444746]"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? "text-[#0B57D0]" : ""}`} />
                            <span>{label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#0B57D0] ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[12px] text-[#444746] pl-1">
                      Two-wheelers experience 3.4x higher particulate deposition during winter mornings
                      compared to sealed transit.
                    </p>
                  </div>

                  {/* Sub-Group C — Indoor Air Setup Radio Cards */}
                  <div className="space-y-2">
                    <span className="text-[14px] font-semibold text-[#1F1F1F]">
                      Indoor Air Setup
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setIndoorSetup("purifier")}
                        className={`cursor-pointer p-4 rounded-2xl border-2 flex items-start gap-3.5 transition-all ${
                          indoorSetup === "purifier"
                            ? "bg-[#D3E3FD] border-[#0B57D0] shadow-xs"
                            : "bg-[#F0F4F9] border-transparent hover:border-[#C4C7C5]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white text-[#0B57D0] flex items-center justify-center shrink-0">
                          <Fan className="w-5 h-5 text-[#0B57D0]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-bold text-[#041E49]">
                              Have HEPA Air Purifier
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full ${
                                indoorSetup === "purifier"
                                  ? "border-4 border-[#0B57D0] bg-white"
                                  : "border border-[#C4C7C5] bg-white"
                              }`}
                            />
                          </div>
                          <p className="text-[12px] text-[#444746] mt-1 leading-snug">
                            We optimize CADR fan schedules, night bedroom mode &amp; filter life
                            economics.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => setIndoorSetup("natural")}
                        className={`cursor-pointer p-4 rounded-2xl border-2 flex items-start gap-3.5 transition-all ${
                          indoorSetup === "natural"
                            ? "bg-[#D3E3FD] border-[#0B57D0] shadow-xs"
                            : "bg-[#F0F4F9] border-transparent hover:border-[#C4C7C5]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white text-[#444746] flex items-center justify-center shrink-0">
                          <AppWindow className="w-5 h-5 text-[#0B57D0]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-bold text-[#1F1F1F]">
                              Natural Ventilation Only
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full ${
                                indoorSetup === "natural"
                                  ? "border-4 border-[#0B57D0] bg-white"
                                  : "border border-[#C4C7C5] bg-white"
                              }`}
                            />
                          </div>
                          <p className="text-[12px] text-[#444746] mt-1 leading-snug">
                            Zero-cost timed cross-ventilation, wet microfiber mopping &amp; window
                            draft seals.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Group D — Outdoor Windows */}
                  <div className="space-y-2 bg-[#F0F4F9]/60 p-4 rounded-2xl border border-[#E0E3E1]">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-[#1F1F1F] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#0B57D0]" />
                        Typical Outdoor Windows (Optional)
                      </span>
                      <span className="text-[11px] font-medium text-[#444746]">
                        Calibrates AI shift warnings
                      </span>
                    </div>
                    <p className="text-[12px] text-[#444746]">
                      Select the daily windows your family typically spends outdoors:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#0B57D0] text-[#041E49] text-[12px] font-medium shadow-2xs">
                        <input
                          type="checkbox"
                          checked={windows.morning}
                          onChange={(e) =>
                            setWindows((w) => ({ ...w, morning: e.target.checked }))
                          }
                          className="rounded text-[#0B57D0] focus:ring-0 cursor-pointer"
                        />
                        <span>Morning Walk / Exercise (6:30 AM – 8:00 AM)</span>
                      </label>
                      <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#0B57D0] text-[#041E49] text-[12px] font-medium shadow-2xs">
                        <input
                          type="checkbox"
                          checked={windows.commute}
                          onChange={(e) =>
                            setWindows((w) => ({ ...w, commute: e.target.checked }))
                          }
                          className="rounded text-[#0B57D0] focus:ring-0 cursor-pointer"
                        />
                        <span>School / Office Commute (8:30 AM – 10:00 AM)</span>
                      </label>
                      <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#0B57D0] text-[#041E49] text-[12px] font-medium shadow-2xs">
                        <input
                          type="checkbox"
                          checked={windows.evening}
                          onChange={(e) =>
                            setWindows((w) => ({ ...w, evening: e.target.checked }))
                          }
                          className="rounded text-[#0B57D0] focus:ring-0 cursor-pointer"
                        />
                        <span>Evening Park Play / Errands (5:30 PM – 7:30 PM)</span>
                      </label>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Sticky Bottom Action Bar with Next and Previous buttons */}
            <div className="bg-[#F0F4F9] border-t border-[#E0E3E1] px-6 md:px-8 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
              {currentStep === 1 ? (
                <>
                  <div className="flex items-center gap-2 text-[12px] text-[#444746] text-center sm:text-left">
                    <Lock className="w-4 h-4 text-[#137333] shrink-0" />
                    <span>Your location is used only to connect nearest ground telemetry.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full sm:w-auto h-12 px-7 rounded-full bg-[#0B57D0] hover:bg-[#0842a0] text-white font-medium text-[14px] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <span>Next: Household Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="w-full sm:w-auto h-12 px-6 rounded-full bg-white hover:bg-[#F0F4F9] text-[#1F1F1F] font-medium text-[14px] flex items-center justify-center gap-2 border border-[#E0E3E1] transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleGeneratePlan}
                      className="w-full sm:w-auto h-12 px-7 rounded-full bg-[#0B57D0] hover:bg-[#0842a0] text-white font-medium text-[14px] flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                    >
                      <span>Generate My Personalised Air Plan</span>
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Transition / Loading State (Triggered on Submit) */
          <div className="w-full max-w-[680px] bg-white rounded-[28px] border border-[#E0E3E1] shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-8 md:p-12 text-center space-y-8 animate-fade-in">
            {/* Animated Circular Progress */}
            <div className="flex flex-col items-center justify-center pt-4">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#E9EEF6"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#0B57D0"
                    strokeWidth="8"
                    strokeDasharray="264"
                    strokeDashoffset="66"
                    strokeLinecap="round"
                    className="origin-center animate-spin"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-[#0B57D0]" />
                </div>
              </div>
              <h3 className="text-[22px] font-bold text-[#1F1F1F] mt-5">
                Creating Your Tailored Winter Air Plan
              </h3>
              <p className="text-[14px] text-[#444746] mt-1 max-w-md">
                Gemini 1.5 is calibrating solar inversion models and microclimate physics for{" "}
                <strong className="text-[#1F1F1F]">Sector 14, Rohini</strong>.
              </p>
            </div>

            {/* Progressive Status List */}
            <div className="bg-[#F0F4F9] rounded-2xl p-5 border border-[#E0E3E1] text-left space-y-3 max-w-lg mx-auto">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#137333] shrink-0" />
                <span className="text-[13px] font-medium text-[#1F1F1F]">
                  Fetched live PM2.5 (142 µg/m³) &amp; hourly boundary layer curve for Rohini
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#0B57D0] animate-spin shrink-0" />
                <span className="text-[13px] font-medium text-[#041E49]">
                  Evaluating exposure risks for Young Children &amp; Senior Citizens...
                </span>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <Circle className="w-5 h-5 text-[#747775] shrink-0" />
                <span className="text-[13px] text-[#444746]">
                  Building low-emission daily routine &amp; purifier schedule...
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col items-center gap-3">
              <Link
                href="/"
                className="h-11 px-6 rounded-full bg-[#0B57D0] hover:bg-[#0842a0] text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <span>View Dashboard Plan</span>
                <Check className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={handleCancel}
                className="text-[13px] font-medium text-[#0B57D0] hover:underline cursor-pointer"
              >
                Cancel &amp; Edit Household Profile
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Clean M3 Minimal Footer */}
      <footer className="py-4 border-t border-[#E0E3E1] bg-[#F8F9FA] text-center text-[12px] text-[#747775]">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1F1F1F]">VayuMitra</span>
            <span>•</span>
            <span>Data verified against CPCB &amp; OpenAQ Ground Truth Nodes</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Gemini 1.5 Flash</span>
            <span>•</span>
            <Link href="/" className="hover:text-[#0B57D0] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-[#0B57D0] transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
