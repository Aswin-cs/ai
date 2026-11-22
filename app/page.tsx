"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ComponentType } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Wind,
  User,
  Zap,
  PlayCircle,
  BadgeCheck,
  CloudSun,
  Radio,
  Sparkles,
  TrendingUp,
  Bell,
  Clock,
  CheckCircle2,
  Home as HomeIcon,
  Fan,
  Droplets,
  Leaf,
  Users,
  Check,
  Baby,
  HeartPulse,
  Navigation,
  Building2,
  Bus,
  Trees,
  Moon,
  Footprints,
  Pill,
  SunMedium,
  Shield,
  Route,
  Flame,
  Megaphone,
  Eye,
  LogOut,
} from "lucide-react";

type CityKey = "delhi" | "mumbai";
type PersonaKey = "parents" | "seniors" | "commuters" | "rwa";

interface CityData {
  name: string;
  label: string;
  aqi: number;
  status: string;
  statusBg: string;
  statusColor: string;
  meta: string;
  weather: string;
  humidity: string;
  pm25: string;
  pm10: string;
  inversion: string;
  provenance: string;
  advisory: string;
}

const CITIES: Record<CityKey, CityData> = {
  delhi: {
    name: "New Delhi",
    label: "New Delhi • Family",
    aqi: 338,
    status: "Very Poor",
    statusBg: "#F9DEDC",
    statusColor: "#8C1D18",
    meta: "PM2.5 Dominant Spikepoint",
    weather: "18°C • Light Haze",
    humidity: "Humidity 68% • Wind 4 km/h",
    pm25: "PM2.5: 174 µg/m³",
    pm10: "PM10: 289 µg/m³",
    inversion: "Boundary Layer: 140m (Low)",
    provenance: "Source: OpenAQ / CPCB Rohini Station • Updated 3 mins ago",
    advisory:
      "Shift children’s 5:30 PM park play indoors today. Evening temperature inversion traps PM2.5 near ground level—this reduces daily inhaled particulate load by ~46%.",
  },
  mumbai: {
    name: "Mumbai",
    label: "Mumbai • Commuter",
    aqi: 142,
    status: "Moderate",
    statusBg: "#FEF7E0",
    statusColor: "#B06000",
    meta: "Coastal Sea Breeze Dispersion Active",
    weather: "28°C • Sunny & Humid",
    humidity: "Humidity 78% • Wind 14 km/h",
    pm25: "PM2.5: 48 µg/m³",
    pm10: "PM10: 96 µg/m³",
    inversion: "Boundary Layer: 820m (High)",
    provenance: "Source: CPCB Bandra Kurla Complex • Updated 7 mins ago",
    advisory:
      "Optimal window for coastal transit and morning running before 8:30 AM. Sea breeze will peak around 2 PM, reducing localized vehicular particulates by ~30%.",
  },
};

interface PersonaStep {
  icon: ComponentType<{ className?: string }>;
  color: string;
  title: string;
  desc: string;
}

interface PersonaData {
  id: PersonaKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  location: string;
  metric: string;
  progress: number;
  quote: string;
  author: string;
  steps: PersonaStep[];
}

const PERSONAS: Record<PersonaKey, PersonaData> = {
  parents: {
    id: "parents",
    label: "Parents & Toddlers",
    icon: Baby,
    location: "Delhi NCR • Parents of 4-Year Old",
    metric: "51% less particulate exposure",
    progress: 51,
    quote:
      "“Early morning school runs are peak smog hazards. Timed ventilation and micro-window planning protects developing lungs without interrupting childhood routines.”",
    author: "— Dr. R. Sharma, Pediatric Pulmonologist, Gurugram",
    steps: [
      {
        icon: Bus,
        color: "#ba1a1a",
        title: "Morning School Drop: 7:45 AM (AQI 362 - Severe)",
        desc: "Pre-condition car AC on internal recirculation 5 mins prior; fit child with pediatric N95 mask. Avoid open auto-rickshaws before 9 AM.",
      },
      {
        icon: Trees,
        color: "#156d2f",
        title: "Afternoon Outdoor Play: Shift from 5:00 PM to 2:15 PM",
        desc: "Sunlight breaks the thermal boundary inversion; PM2.5 levels drop from 280 to 92 µg/m³ during early afternoon.",
      },
      {
        icon: Moon,
        color: "#0041a2",
        title: "Sleep Environment: Purifier to Sleep Mode 2 from 8:30 PM",
        desc: "Ensures deep REM cycle protection without cold draft discomfort. Prevents early morning dry cough spikes.",
      },
    ],
  },
  seniors: {
    id: "seniors",
    label: "Senior Citizen Care",
    icon: HeartPulse,
    location: "Pune & Bengaluru • Seniors with Mild Asthma",
    metric: "68% reduced respiratory flare-ups",
    progress: 68,
    quote:
      "“Postponing elder morning walks by just 90 minutes when the winter fog lifts dramatically reduces bronchospasm episodes in older patients.”",
    author: "— Dr. A. Kulkarni, Consultant Geriatrician, Apollo Hospitals",
    steps: [
      {
        icon: Footprints,
        color: "#156d2f",
        title: "Morning Walk Window: Move from 6:30 AM to 8:45 AM",
        desc: "Waiting for early morning ground fog to clear prevents direct inhalation of trapped micro-particles and chilled dry air.",
      },
      {
        icon: Pill,
        color: "#0041a2",
        title: "Preventive Inhaler & Hydration Schedule",
        desc: "Drink warm water with tulsi before stepping out. Keep SOS bronchodilator accessible during sudden drops in ambient humidity.",
      },
      {
        icon: SunMedium,
        color: "#6e3a00",
        title: "Mid-Day Sunlit Balcony Therapy (1:00 PM - 3:00 PM)",
        desc: "Safely enjoy fresh air and natural Vitamin D during maximum vertical dispersion hours without respiratory strain.",
      },
    ],
  },
  commuters: {
    id: "commuters",
    label: "Daily Office Commuters",
    icon: Navigation,
    location: "Bengaluru & Delhi • Two-Wheeler / Metro Commuters",
    metric: "44% lower black carbon inhalation",
    progress: 44,
    quote:
      "“Traffic intersections expose bike riders to extreme localized concentrations of PM1. High-filtration masks with silicone exhalation seals are vital during peak hours.”",
    author: "— Center for Clean Mobility Research, IIT Delhi",
    steps: [
      {
        icon: Shield,
        color: "#0041a2",
        title: "Mask Strategy: Dual-Strap FFP2 / N95 during Transit",
        desc: "Standard cloth masks filter less than 15% of vehicular soot. Switch to certified particulate respirators on active road corridors.",
      },
      {
        icon: Route,
        color: "#156d2f",
        title: "Route Selection: Green Corridor & Secondary Roads",
        desc: "Choosing metro-linked feeder routes over congested arterial ring roads cuts continuous idling smog exposure by 35%.",
      },
      {
        icon: Droplets,
        color: "#6e3a00",
        title: "Arrival Hygiene Routine at Workplace",
        desc: "Rinse nasal passages with saline spray and wash eyes to clear fine soot particles deposited during road transit.",
      },
    ],
  },
  rwa: {
    id: "rwa",
    label: "Apartment RWAs & Schools",
    icon: Building2,
    location: "Noida & Gurugram • Gated Societies & Campus RWAs",
    metric: "35% neighborhood PM10 reduction",
    progress: 35,
    quote:
      "“Community anti-smog misting and synchronized security guard warming stations eliminate open wood burning across residential blocks entirely.”",
    author: "— Federation of NCR Resident Welfare Associations",
    steps: [
      {
        icon: Droplets,
        color: "#156d2f",
        title: "Perimeter Water Spraying: 11:00 AM & 3:00 PM",
        desc: "Utilize recycled STP water misting on internal society roads to suppress vehicular dust resuspension without water wastage.",
      },
      {
        icon: Flame,
        color: "#0041a2",
        title: "Electric Heating for Night Security Guards",
        desc: "Provide low-wattage infrared heaters at guard checkpoints to completely eliminate open biomass and waste burning.",
      },
      {
        icon: Megaphone,
        color: "#6e3a00",
        title: "Automated Intercom Broadcasts for Kids Sports",
        desc: "Society sports coordinators receive automatic alerts to reschedule turf coaching when localized sensors cross 300 AQI.",
      },
    ],
  },
};

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

export default function Home() {
  const { data: session, status } = useSession();
  const [selectedCity, setSelectedCity] = useState<CityKey>("delhi");
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>("parents");
  const [metroChecked, setMetroChecked] = useState(true);
  const [incenseChecked, setIncenseChecked] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("features");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const city = CITIES[selectedCity];
  const persona = PERSONAS[selectedPersona];
  const PersonaIcon = persona.icon;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 84;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  const scrollToPersona = () => {
    scrollToSection("persona-section");
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      const sectionIds = ["features", "persona-section", "impact-section"];

      // If at bottom of page, activate last section
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80) {
        setActiveSection("impact-section");
        return;
      }

      let current = "features";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          if (el.offsetTop <= scrollPosition) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container transition-all duration-300">
        <div className="h-16 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <span className="font-title text-xl text-on-surface tracking-tight font-bold group-hover:text-primary transition-colors">
              VayuMitra
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 relative h-16">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("features");
              }}
              className={`relative flex items-center h-full text-sm transition-all duration-200 cursor-pointer ${
                activeSection === "features"
                  ? "text-primary-container font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-container"
                  : "text-on-surface-variant font-medium hover:text-on-surface"
              }`}
            >
              Features
            </a>
            <a
              href="#persona-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("persona-section");
              }}
              className={`relative flex items-center h-full text-sm transition-all duration-200 cursor-pointer ${
                activeSection === "persona-section"
                  ? "text-primary-container font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-container"
                  : "text-on-surface-variant font-medium hover:text-on-surface"
              }`}
            >
              Household Profiles
            </a>
            <a
              href="#impact-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("impact-section");
              }}
              className={`relative flex items-center h-full text-sm transition-all duration-200 cursor-pointer ${
                activeSection === "impact-section"
                  ? "text-primary-container font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-container"
                  : "text-on-surface-variant font-medium hover:text-on-surface"
              }`}
            >
              Data & Impact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToPersona}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium text-primary-container hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer"
            >
              Evaluator Demo
            </button>

            {session?.user ? (
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Link
                    href="/onboarding"
                    className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold text-primary bg-primary-fixed hover:bg-primary-fixed/80 transition-all shadow-2xs"
                  >
                    My Air Plan
                  </Link>

                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 bg-white border border-surface-container rounded-full pl-1.5 pr-3 py-1 shadow-xs hover:border-primary transition-all cursor-pointer"
                  >
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-7 h-7 rounded-full object-cover border border-surface-container"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
                        {(session.user.name || "U")[0]}
                      </div>
                    )}
                    <span className="text-[13px] font-medium text-on-surface max-w-[100px] truncate">
                      {session.user.name?.split(" ")[0] || "Account"}
                    </span>
                  </button>
                </div>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white border border-surface-container rounded-2xl shadow-xl p-2 z-50 animate-scale-in">
                    <div className="px-3 py-2 border-b border-surface-container-low mb-1">
                      <p className="text-[13px] font-semibold text-on-surface truncate">
                        {session.user.name}
                      </p>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {session.user.email}
                      </p>
                    </div>
                    <Link
                      href="/onboarding"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-on-surface hover:bg-surface-container-low rounded-xl transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Onboarding Wizard</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn("google")}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-on-primary bg-primary-container hover:bg-primary hover:shadow-md active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5">
                  <GoogleIcon className="w-3.5 h-3.5" />
                </div>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-16 flex-1 bg-surface">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col w-full">
            {/* Top Notification / Telemetry Status Banner */}
            <section className="w-full max-w-[1200px] mx-auto pt-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low px-4 py-2 rounded-full border border-surface-container hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse-ring" />
                  <span className="text-xs text-on-surface-variant font-medium">
                    Real-time CPCB ground telemetry active across 380+ Indian sensor nodes
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-on-surface-variant text-xs">
                  <span>NCR Winter Smog Window: Active</span>
                  <span className="text-outline-variant">•</span>
                  <span className="text-primary font-semibold">Gemini Guidance Engine 1.5</span>
                </div>
              </div>
            </section>

            {/* Hero Section */}
            <section className="w-full max-w-[1200px] mx-auto pt-8 pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Left Column (Hero Content) */}
                <div className="lg:col-span-6 flex flex-col items-start animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-[#E9EEF6] px-3.5 py-1.5 rounded-lg mb-6 shadow-xs border border-[#D3E3FD] hover:bg-[#D3E3FD]/60 transition-colors">
                    <Zap className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-xs font-semibold text-primary">
                      Powered by Gemini &amp; Live CPCB / OpenAQ Data
                    </span>
                  </div>

                  <h1 className="font-headline text-3xl sm:text-4xl lg:text-[44px] lg:leading-[52px] font-bold tracking-tight text-on-surface mb-5">
                    Breathe smarter through winter smog with personalised daily air guidance.
                  </h1>

                  <p className="text-base sm:text-lg text-on-surface-variant mb-8 max-w-xl leading-relaxed">
                    Get real-time, location-specific routines, indoor air protection steps, and
                    sustainable lifestyle swaps tailored to your Indian household—with clear
                    explanations of every choice&apos;s direct impact.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mb-6 w-full sm:w-auto">
                    <Link
                      href="/onboarding"
                      className="h-12 px-7 rounded-full bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold inline-flex items-center gap-3 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shadow-2xs">
                        <GoogleIcon className="w-4 h-4" />
                      </div>
                      <span>Continue with Google</span>
                    </Link>
                    <button
                      type="button"
                      onClick={scrollToPersona}
                      className="h-12 px-6 rounded-full bg-primary-fixed hover:bg-primary-fixed/80 text-on-primary-fixed text-sm font-semibold inline-flex items-center gap-2 transition-all hover:shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <PlayCircle className="w-5 h-5 text-primary" />
                      <span>Try Sample Household Demo</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <BadgeCheck className="w-4 h-4 text-primary" />
                    <span className="text-xs text-on-surface-variant">
                      Real-time ground monitoring across India • Transparent source &amp; timestamp
                      on every reading.
                    </span>
                  </div>
                </div>

                {/* Right Column: Interactive Live Telemetry Card */}
                <div className="lg:col-span-6 w-full animate-scale-in">
                  <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-md hover:shadow-xl transition-all duration-300 border border-surface-container-high relative overflow-hidden">
                    {/* Header & Segmented Control */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
                      <div className="flex items-center gap-2">
                        <CloudSun className="w-5 h-5 text-secondary animate-pulse" />
                        <span className="text-sm font-semibold text-on-surface font-title">
                          Live Telemetry &amp; Persona Advisory
                        </span>
                      </div>

                      {/* Segmented Control */}
                      <div className="inline-flex p-1 bg-surface-container rounded-full">
                        <button
                          type="button"
                          onClick={() => setSelectedCity("delhi")}
                          className={`py-1.5 px-4 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                            selectedCity === "delhi"
                              ? "bg-primary-fixed text-on-primary-fixed font-semibold shadow-xs scale-100"
                              : "text-on-surface-variant hover:text-on-surface font-medium hover:bg-surface-container-high"
                          }`}
                        >
                          New Delhi • Family
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCity("mumbai")}
                          className={`py-1.5 px-4 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                            selectedCity === "mumbai"
                              ? "bg-primary-fixed text-on-primary-fixed font-semibold shadow-xs scale-100"
                              : "text-on-surface-variant hover:text-on-surface font-medium hover:bg-surface-container-high"
                          }`}
                        >
                          Mumbai • Commuter
                        </button>
                      </div>
                    </div>

                    {/* Animated Live Metric Container */}
                    <div key={selectedCity} className="mt-6 flex flex-col gap-4 animate-fade-in">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-3">
                          <span
                            className="font-headline text-5xl sm:text-6xl font-bold tracking-tight transition-colors duration-300"
                            style={{ color: city.statusColor }}
                          >
                            {city.aqi}
                          </span>
                          <div className="flex flex-col">
                            <span
                              className="px-3 py-0.5 rounded-full text-xs font-bold w-fit transition-all duration-300"
                              style={{ backgroundColor: city.statusBg, color: city.statusColor }}
                            >
                              {city.status}
                            </span>
                            <span className="text-xs text-on-surface-variant mt-1">
                              {city.meta}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-on-surface font-title">
                            {city.weather}
                          </div>
                          <div className="text-xs text-on-surface-variant">{city.humidity}</div>
                        </div>
                      </div>

                      {/* Tonal Metric Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-surface-container text-on-surface text-xs px-3 py-1 rounded-full font-medium hover:bg-surface-container-high transition-colors">
                          {city.pm25}
                        </span>
                        <span className="bg-surface-container text-on-surface text-xs px-3 py-1 rounded-full font-medium hover:bg-surface-container-high transition-colors">
                          {city.pm10}
                        </span>
                        <span className="bg-surface-container text-on-surface-variant text-xs px-3 py-1 rounded-full hover:bg-surface-container-high transition-colors">
                          {city.inversion}
                        </span>
                      </div>

                      {/* Provenance Strip */}
                      <div className="flex items-center gap-1.5 py-1 text-on-surface-variant text-xs">
                        <Radio className="w-4 h-4 text-outline animate-pulse" />
                        <span>{city.provenance}</span>
                      </div>
                    </div>

                    {/* Highlighted Recommendation Box */}
                    <div
                      key={`advisory-${selectedCity}`}
                      className="mt-5 bg-[#E9EEF6] rounded-2xl p-5 shadow-xs border border-[#D3E3FD]/60 animate-fade-in"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-primary-container" />
                        <span className="text-sm font-semibold text-on-surface font-title">
                          Recommended Routine Shift (Gemini AI)
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {city.advisory}
                      </p>
                    </div>

                    {/* Quick Action Footer Inside Card */}
                    <div className="mt-5 pt-4 border-t border-surface-container flex flex-wrap items-center justify-between gap-3 text-xs text-primary font-medium">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-primary-container active:scale-95 transition-all cursor-pointer group"
                      >
                        <TrendingUp className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        <span>View 24h hourly curve</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface active:scale-95 transition-all cursor-pointer group"
                      >
                        <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span>WhatsApp morning brief</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Three Pillars of Action Section */}
            <section id="features" className="w-full max-w-[1200px] mx-auto py-16 scroll-mt-24">
              <div className="animate-fade-in-up">
                <h2 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface">
                  Personalised, Actionable, Ground-Truth Guided
                </h2>
                <p className="text-base text-on-surface-variant mt-2 max-w-2xl">
                  Every recommendation is backed by microclimate physics and tailored to Indian homes.
                </p>
              </div>

              {/* 3 Equal-Height M3 Tonal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {/* Card 1: Low-Emission Daily Routines */}
                <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 border border-surface-container-high flex flex-col justify-between group">
                  <div>
                    <div className="w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="font-title text-lg font-bold text-on-surface mb-2">
                      Low-Emission Daily Routines
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-5">
                      Avoid peak pollution spikes with real-time solar boundary layer forecasting.
                    </p>

                    {/* 24-hr Bar Sparkline Chart with Hover Highlight */}
                    <div className="bg-surface-container-low rounded-2xl p-4 mb-4 border border-surface-container">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-on-surface">
                          24h Smog Dispersion Profile
                        </span>
                        <span className="text-xs text-secondary font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                          1 PM - 4 PM Safe
                        </span>
                      </div>
                      <svg
                        className="w-full h-14 overflow-visible"
                        preserveAspectRatio="none"
                        viewBox="0 0 240 60"
                      >
                        <rect fill="#ba1a1a" height="45" opacity="0.8" rx="3" width="12" x="5" y="10" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#ba1a1a" height="41" opacity="0.85" rx="3" width="12" x="23" y="14" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#6e3a00" height="35" opacity="0.75" rx="3" width="12" x="41" y="20" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#6e3a00" height="23" opacity="0.6" rx="3" width="12" x="59" y="32" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#156d2f" height="13" opacity="0.85" rx="3" width="12" x="77" y="42" className="hover:opacity-100 hover:scale-y-110 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#156d2f" height="9" opacity="0.95" rx="3" width="12" x="95" y="46" className="hover:opacity-100 hover:scale-y-110 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#156d2f" height="11" opacity="0.95" rx="3" width="12" x="113" y="44" className="hover:opacity-100 hover:scale-y-110 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#156d2f" height="17" opacity="0.85" rx="3" width="12" x="131" y="38" className="hover:opacity-100 hover:scale-y-110 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#6e3a00" height="27" opacity="0.7" rx="3" width="12" x="149" y="28" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#ba1a1a" height="37" opacity="0.8" rx="3" width="12" x="167" y="18" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#ba1a1a" height="43" opacity="0.9" rx="3" width="12" x="185" y="12" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                        <rect fill="#ba1a1a" height="47" opacity="0.95" rx="3" width="12" x="203" y="8" className="hover:opacity-100 hover:scale-y-105 transition-all origin-bottom cursor-pointer" />
                      </svg>
                      <div className="flex justify-between text-[10px] text-outline font-medium mt-1">
                        <span>6 AM</span>
                        <span className="text-secondary font-bold">1:30 PM (Sun Peak)</span>
                        <span>10 PM</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary-container/40 p-3 rounded-xl border border-secondary-container group-hover:bg-secondary-container/60 transition-colors">
                    <p className="text-xs text-on-secondary-fixed-variant leading-relaxed">
                      <strong>Optimal Window:</strong> Batch outdoor errands between 1:30 PM &amp;
                      3:45 PM to cut particulate inhalation by 32%.
                    </p>
                  </div>
                </div>

                {/* Card 2: Indoor Air Quality Guidance */}
                <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 border border-surface-container-high flex flex-col justify-between group">
                  <div>
                    <div className="w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                      <HomeIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-title text-lg font-bold text-on-surface mb-2">
                      Indoor Air Quality Guidance
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-5">
                      Pragmatic indoor defense that balances HEPA air purifiers with zero-cost
                      natural habits.
                    </p>
                    <div className="space-y-3 mb-4">
                      <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container hover:bg-surface-container transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Fan className="w-4 h-4 text-primary group-hover:animate-spin" />
                          <span className="text-xs font-semibold text-on-surface">
                            Purifier Dynamic Schedule
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Auto-ramps fan CADR 45 mins before bedtime, lowering decibels during deep
                          sleep cycles.
                        </p>
                      </div>
                      <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container hover:bg-surface-container transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Droplets className="w-4 h-4 text-secondary" />
                          <span className="text-xs font-semibold text-on-surface">
                            Zero-Cost Indian Home Practices
                          </span>
                        </div>
                        <ul className="text-[12px] text-on-surface-variant space-y-1 list-disc list-inside">
                          <li>Timed 20-min cross-breeze at 2:00 PM</li>
                          <li>Damp microfiber mopping (traps resuspension)</li>
                          <li>Turn kitchen exhaust ON before tadka sizzle</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary-fixed/40 p-3 rounded-xl border border-primary-fixed group-hover:bg-primary-fixed/60 transition-colors">
                    <p className="text-xs text-on-primary-fixed-variant leading-relaxed">
                      Combining wet-draft door seals with 2 PM ventilation purges 40% indoor VOCs
                      without purifier load.
                    </p>
                  </div>
                </div>

                {/* Card 3: Sustainable Alternatives & Impact */}
                <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 border border-surface-container-high flex flex-col justify-between group">
                  <div>
                    <div className="w-11 h-11 rounded-full bg-secondary-container text-secondary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                      <Leaf className="w-6 h-6" />
                    </div>
                    <h3 className="font-title text-lg font-bold text-on-surface mb-2">
                      Sustainable Alternatives &amp; Impact
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-5">
                      Community-scale air cleanliness starts with individual actionable swaps.
                    </p>

                    {/* Interactive Switches */}
                    <div className="space-y-3 mb-4">
                      {/* Switch 1 */}
                      <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-surface-container hover:bg-surface-container transition-colors">
                        <div className="flex flex-col pr-2">
                          <span className="text-xs font-medium text-on-surface">
                            Carpool / Metro 3 days/week
                          </span>
                          <span
                            className={`text-xs font-semibold mt-0.5 transition-all duration-300 ${
                              metroChecked ? "text-secondary scale-100" : "text-outline opacity-75"
                            }`}
                          >
                            {metroChecked ? "-22 kg CO₂ / month" : "No offset"}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={metroChecked}
                            onChange={(e) => setMetroChecked(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                        </label>
                      </div>

                      {/* Switch 2 */}
                      <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-surface-container hover:bg-surface-container transition-colors">
                        <div className="flex flex-col pr-2">
                          <span className="text-xs font-medium text-on-surface">
                            Incense to water vaporizers
                          </span>
                          <span
                            className={`text-xs font-semibold mt-0.5 transition-all duration-300 ${
                              incenseChecked ? "text-secondary scale-100" : "text-outline opacity-75"
                            }`}
                          >
                            {incenseChecked ? "-38% indoor PM2.5" : "Standard indoor load"}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={incenseChecked}
                            onChange={(e) => setIncenseChecked(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-3 rounded-xl flex items-center gap-2 border border-surface-container group-hover:bg-surface-container transition-colors">
                    <Users className="w-5 h-5 text-secondary animate-pulse" />
                    <span className="text-xs text-on-surface font-semibold">
                      1,420 Indian families participating this week
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Household Persona Showcase */}
            <section id="persona-section" className="w-full max-w-[1200px] mx-auto py-12 scroll-mt-24">
              <div className="mb-6 animate-fade-in-up">
                <h2 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface">
                  Built for Diverse Indian Households
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Select a household profile to inspect AI recommendations tuned to vulnerabilities.
                </p>
              </div>

              {/* Horizontal Filter Chips */}
              <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
                {(Object.keys(PERSONAS) as PersonaKey[]).map((key) => {
                  const p = PERSONAS[key];
                  const isActive = selectedPersona === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPersona(key)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-95 ${
                        isActive
                          ? "bg-primary-fixed text-on-primary-fixed shadow-sm scale-100"
                          : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container hover:text-on-surface"
                      }`}
                    >
                      {isActive && <Check className="w-4 h-4 animate-scale-in" />}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Wide 24px-rounded M3 Outlined Card */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 border border-surface-container-high">
                <div
                  key={selectedPersona}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in-up"
                >
                  {/* Left 7 cols: Dynamic Action Plan */}
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shadow-xs">
                        <PersonaIcon className="w-6 h-6 text-primary animate-scale-in" />
                      </div>
                      <span className="font-title text-lg sm:text-xl font-bold text-on-surface">
                        {persona.location}
                      </span>
                    </div>

                    {/* Dynamic Steps List */}
                    <div className="space-y-3.5">
                      {persona.steps.map((s, idx) => {
                        const StepIcon = s.icon;
                        return (
                          <div
                            key={idx}
                            className="p-4 bg-surface-container-low rounded-2xl border border-surface-container hover:bg-surface-container hover:border-outline-variant transition-all duration-200 cursor-default"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface mb-1">
                              <span style={{ color: s.color }}>
                                <StepIcon className="w-4 h-4" />
                              </span>
                              <span>{s.title}</span>
                            </div>
                            <p className="text-xs text-on-surface-variant leading-relaxed">
                              {s.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right 5 cols: Metric Summary & Medical Endorsement */}
                  <div className="lg:col-span-5 bg-surface-container-low rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6 border border-surface-container hover:bg-surface-container/70 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                          Estimated Risk Reduction
                        </span>
                        <Shield className="w-5 h-5 text-secondary animate-pulse" />
                      </div>
                      <div className="font-headline text-2xl lg:text-3xl font-bold text-secondary mb-3 transition-all duration-500">
                        {persona.metric}
                      </div>
                      <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-secondary h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${persona.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-surface-container-highest pt-5">
                      <blockquote className="text-xs text-on-surface-variant italic leading-relaxed mb-3">
                        {persona.quote}
                      </blockquote>
                      <cite className="text-xs font-semibold text-on-surface not-italic block">
                        {persona.author}
                      </cite>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Auth Banner / Community Impact */}
            <section id="impact-section" className="w-full max-w-[1200px] mx-auto py-8 mb-16 scroll-mt-24">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#E9EEF6] via-surface-container to-[#C4EED0]/30 p-8 sm:p-12 shadow-sm hover:shadow-lg transition-all duration-300 border border-surface-container-high group">
                <div className="relative z-10 max-w-2xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Zero Setup Hassle
                  </span>
                  <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface mt-2 mb-3">
                    Protect your home this winter in under 60 seconds.
                  </h2>
                  <p className="text-sm sm:text-base text-on-surface-variant mb-8 leading-relaxed">
                    Personalise safe hours, get proactive WhatsApp warnings, and protect sensitive
                    family members with simple, tailored habits.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Link
                      href="/onboarding"
                      className="h-12 px-7 rounded-full bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold inline-flex items-center gap-3 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shadow-2xs">
                        <GoogleIcon className="w-4 h-4" />
                      </div>
                      <span>Sign in with Google</span>
                    </Link>
                    <button
                      type="button"
                      className="h-12 px-6 rounded-full bg-surface-container-lowest hover:bg-surface-container-high text-on-surface text-sm font-semibold inline-flex items-center gap-2 transition-all duration-200 shadow-sm border border-surface-container active:scale-[0.98] cursor-pointer"
                    >
                      <Eye className="w-5 h-5 text-on-surface-variant" />
                      <span>View Public Neighborhood Dashboard</span>
                    </button>
                  </div>

                  <p className="text-xs text-on-surface-variant">
                    No spam. Data encrypted. Powered by Open Data &amp; Gemini AI.
                  </p>
                </div>

                {/* Animated subtle ambient circle */}
                <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-secondary-container/30 blur-3xl pointer-events-none animate-float-slow" />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container py-8 border-t border-surface-container-high">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="max-w-sm text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
              <span className="font-title text-base font-bold text-on-surface">VayuMitra</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Empowering Indian homes and communities with proactive, Gemini-driven clean air
              routines.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs hover:bg-surface-container-highest transition-colors">
              CPCB Station Network
            </span>
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs hover:bg-surface-container-highest transition-colors">
              OpenAQ Validated
            </span>
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs hover:bg-surface-container-highest transition-colors">
              Open-Meteo API
            </span>
            <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold hover:bg-primary-fixed/80 transition-colors">
              Gemini 1.5 Flash
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a
              href="#github"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              GitHub
            </a>
            <span className="text-outline-variant">•</span>
            <a
              href="#terms"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Terms
            </a>
            <span className="text-outline-variant">•</span>
            <a
              href="#privacy"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
