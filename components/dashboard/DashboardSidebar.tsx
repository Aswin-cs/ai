"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { signIn, signOut } from "next-auth/react";
import type { DashboardTab } from "@/hooks/useDashboardUi";
import type { UserProfileState } from "@/types/airPlan";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  mobileNavOpen: boolean;
  onCloseMobileNav: () => void;
  userMenuOpen: boolean;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;
  isRecalibrating: boolean;
  onRecalibrate: () => void;
  userProfile: UserProfileState;
  session: Session | null;
}

const NAV_TABS: Array<{ id: DashboardTab; icon: string; label: string }> = [
  { id: "daily-plan", icon: "today", label: "Daily Plan" },
  { id: "roadmap", icon: "route", label: "Action Roadmap" },
  { id: "indoor-air-lab", icon: "family_restroom", label: "Family & Home" },
  { id: "sustainable-swaps", icon: "eco", label: "Swaps & Impact" },
  { id: "planning-assist", icon: "travel_explore", label: "Planning Assist" },
];

export default function DashboardSidebar({
  activeTab,
  onSelectTab,
  mobileNavOpen,
  onCloseMobileNav,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  isRecalibrating,
  onRecalibrate,
  userProfile,
  session,
}: DashboardSidebarProps) {
  return (
    <aside
      id="primary-sidebar"
      aria-label="Primary Sidebar"
      className={`fixed left-0 top-0 h-full w-[240px] md:w-[220px] bg-surface-container z-50 flex flex-col justify-between py-5 px-3 select-none border-r border-outline-variant transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
        mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className="flex flex-col gap-6">
        <Link href="/" className="flex items-center gap-3 px-3 group" aria-label="VayuPulse Home">
          <div
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-2xl">air</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-on-surface leading-tight tracking-tight">
              VayuPulse
            </span>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Clean Air AI
            </span>
          </div>
        </Link>

        <div className="px-1">
          <button
            onClick={onRecalibrate}
            disabled={isRecalibrating}
            aria-busy={isRecalibrating}
            className="w-full h-11 bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed-variant rounded-full flex items-center justify-center gap-2 px-4 transition-all text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-60"
            type="button"
          >
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-lg ${isRecalibrating ? "animate-spin" : ""}`}
            >
              refresh
            </span>
            <span>{isRecalibrating ? "Calibrating..." : "Refresh Plan"}</span>
          </button>
        </div>

        <nav aria-label="Dashboard sections" className="flex flex-col gap-1.5">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => {
                onSelectTab(tab.id);
                onCloseMobileNav();
              }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === tab.id
                  ? "bg-primary-container text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xl">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/30 relative">
        {userProfile.location && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-secondary text-xl"
            >
              family_restroom
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-on-surface-variant truncate font-semibold uppercase tracking-wider">
                Household
              </span>
              <span className="text-xs font-semibold text-on-surface truncate">
                {userProfile.location.split(",")[0]}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border border-surface-container"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  person
                </span>
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface truncate">
                {session?.user?.name || "User"}
              </span>
              <span className="text-xs text-on-surface-variant truncate">
                {session?.user ? "Google User" : "Guest"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleUserMenu}
            aria-label="Account menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container cursor-pointer"
            title="Account Menu"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              more_vert
            </span>
          </button>
        </div>

        {userMenuOpen && (
          <div
            role="menu"
            aria-label="Account options"
            className="absolute bottom-16 left-2 right-2 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant p-2 z-50 animate-scale-in"
          >
            <Link
              role="menuitem"
              href="/onboarding"
              onClick={onCloseUserMenu}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low rounded-xl transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">
                tune
              </span>
              <span>Edit Air Profile</span>
            </Link>
            {session?.user ? (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  onCloseUserMenu();
                  void signOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-error hover:bg-error-container/40 rounded-xl transition-colors cursor-pointer text-left"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base text-error">
                  logout
                </span>
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  onCloseUserMenu();
                  void signIn("google", { callbackUrl: "/auth-check" });
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary hover:bg-primary-fixed/40 rounded-xl transition-colors cursor-pointer text-left"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  login
                </span>
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
