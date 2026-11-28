"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";

export type DashboardTab =
  | "daily-plan"
  | "roadmap"
  | "indoor-air-lab"
  | "sustainable-swaps"
  | "planning-assist";

export type RoadmapPhaseFilter = "all" | "now" | "today" | "this_week" | "this_month";

export function useDashboardUi() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("daily-plan");
  const [roadmapPhaseFilter, setRoadmapPhaseFilter] = useState<RoadmapPhaseFilter>("all");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const copyCommunityNote = useCallback((note: string | undefined) => {
    if (!note) return;
    navigator.clipboard.writeText(note);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  }, []);

  const clearClientStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.activePlan);
    localStorage.removeItem(STORAGE_KEYS.userProfile);
    localStorage.removeItem(STORAGE_KEYS.progress);
  }, []);

  return {
    activeTab,
    setActiveTab,
    roadmapPhaseFilter,
    setRoadmapPhaseFilter,
    userMenuOpen,
    setUserMenuOpen,
    mobileNavOpen,
    setMobileNavOpen,
    copiedNotice,
    copyCommunityNote,
    clearClientStorage,
  };
}
