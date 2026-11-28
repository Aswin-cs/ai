"use client";

import { useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ChatWidget from "@/components/chat/ChatWidget";
import DailyPlanTab from "@/components/dashboard/DailyPlanTab";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import HeroStatusBanner from "@/components/dashboard/HeroStatusBanner";
import IndoorAirLabTab from "@/components/dashboard/IndoorAirLabTab";
import OnboardingLockScreen from "@/components/dashboard/OnboardingLockScreen";
import PlanningAssistTab from "@/components/dashboard/PlanningAssistTab";
import RoadmapTab from "@/components/dashboard/RoadmapTab";
import SwapsImpactTab from "@/components/dashboard/SwapsImpactTab";
import GoogleAuthGate from "@/components/GoogleAuthGate";
import MaterialLoader from "@/components/MaterialLoader";
import type { TripPlanPayload } from "@/components/PlanningAssistWizard";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useChat } from "@/hooks/useChat";
import { useDashboardUi } from "@/hooks/useDashboardUi";
import { usePlan } from "@/hooks/usePlan";

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const tripSectionRef = useRef<HTMLElement>(null);
  const ui = useDashboardUi();
  const plan = usePlan(authStatus);
  const aq = useAirQuality(plan.userProfile.coords, plan.setUserProfile);
  const chat = useChat({
    userProfile: plan.userProfile,
    aiPlan: plan.aiPlan,
    hourlyTimeline: aq.hourlyTimeline,
    activeTripPlan: plan.activeTripPlan,
  });

  const handleSubmitTripPlan = async (tripPayload: TripPlanPayload, fromChat = false) => {
    chat.dispatch({ type: "SET_SHOW_WIZARD", show: false });
    chat.dispatch({ type: "SET_ADDING_TRIP", adding: false });
    ui.setActiveTab("planning-assist");
    setTimeout(() => tripSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    const placesLabel = tripPayload.destinations.map((d) => `${d.name} (AQI ${d.usAqi})`).join(", ");
    if (fromChat) {
      chat.dispatch({
        type: "APPEND_MESSAGE",
        message: {
          sender: "user",
          text: `Trip Planning Assist: ${placesLabel} • ${tripPayload.startDate} ${tripPayload.startTime} to ${tripPayload.endDate}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      });
    }

    const res = await plan.submitTripPlan(tripPayload);
    if (fromChat) {
      chat.dispatch({
        type: "APPEND_MESSAGE",
        message: {
          sender: "ai",
          text: res.ok
            ? `Your dedicated Trip & Outdoor Plan for ${placesLabel} is ready in the Planning Assist section.`
            : `Could not generate Trip & Outdoor Plan: ${res.error}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tag: res.ok ? "Planning Assist Ready" : "Planning Assist Error",
        },
      });
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen w-full bg-surface-bright flex items-center justify-center p-6">
        <MaterialLoader title="VayuPulse" subtitle="Checking your session..." compact />
      </div>
    );
  }
  if (authStatus === "unauthenticated" || !session?.user) return <GoogleAuthGate />;
  if (plan.needsOnboarding) return <OnboardingLockScreen />;

  return (
    <div className="min-h-screen bg-surface-bright text-on-surface antialiased font-sans">
      {ui.mobileNavOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close navigation menu"
          onClick={() => ui.setMobileNavOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 md:hidden animate-fade-in"
        />
      )}

      <DashboardSidebar
        activeTab={ui.activeTab}
        onSelectTab={ui.setActiveTab}
        mobileNavOpen={ui.mobileNavOpen}
        onCloseMobileNav={() => ui.setMobileNavOpen(false)}
        userMenuOpen={ui.userMenuOpen}
        onToggleUserMenu={() => ui.setUserMenuOpen((prev) => !prev)}
        onCloseUserMenu={() => ui.setUserMenuOpen(false)}
        isRecalibrating={plan.isRecalibrating}
        onRecalibrate={() => void plan.handleRecalibratePlan(aq.hourlyTimeline, aq.fetch12HrTimeline)}
        userProfile={plan.userProfile}
        session={session}
      />

      <div className="md:pl-[220px]">
        <DashboardHeader
          mobileNavOpen={ui.mobileNavOpen}
          onToggleMobileNav={() => ui.setMobileNavOpen((prev) => !prev)}
          userProfile={plan.userProfile}
          aiPlan={plan.aiPlan}
          language={plan.language}
          onLanguageChange={(nextLang) => {
            plan.setLanguage(nextLang);
            void plan.handleRecalibratePlan(aq.hourlyTimeline, aq.fetch12HrTimeline, nextLang);
          }}
          isRecalibrating={plan.isRecalibrating}
          onRecalibrate={() => void plan.handleRecalibratePlan(aq.hourlyTimeline, aq.fetch12HrTimeline)}
        />

        <main id="main-content" tabIndex={-1} className="w-full pt-[72px] min-h-screen bg-surface-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <div className="max-w-[1280px] w-full mx-auto px-6 py-6 flex flex-col gap-6">
            {plan.isLoading && !plan.aiPlan && (
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

            {!plan.isLoading && !plan.aiPlan && ui.activeTab !== "planning-assist" && (
              <div className="flex flex-col items-center justify-center gap-6 py-24 animate-fade-in">
                <div aria-hidden="true" className="w-20 h-20 rounded-3xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary">eco</span>
                </div>
                <div className="text-center max-w-md">
                  <h1 className="text-xl font-bold text-on-surface">Welcome to VayuPulse</h1>
                  <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                    Set up your household profile to generate a personalized air quality protection plan powered by Gemini AI.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/onboarding" className="h-11 px-6 rounded-full bg-primary text-on-primary text-sm font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
                    <span aria-hidden="true" className="material-symbols-outlined text-xl">tune</span>
                    Set Up Profile
                  </Link>
                  <button
                    onClick={() => void plan.handleRecalibratePlan(aq.hourlyTimeline, aq.fetch12HrTimeline)}
                    disabled={plan.isRecalibrating}
                    className="h-11 px-6 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-60"
                    type="button"
                  >
                    <span aria-hidden="true" className={`material-symbols-outlined text-xl ${plan.isRecalibrating ? "animate-spin" : ""}`}>refresh</span>
                    {plan.isRecalibrating ? "Generating..." : "Generate Plan"}
                  </button>
                </div>
              </div>
            )}

            {ui.activeTab === "planning-assist" && (
              <PlanningAssistTab
                tripSectionRef={tripSectionRef}
                userProfile={plan.userProfile}
                savedTripPlans={plan.savedTripPlans}
                openTripPlanId={plan.openTripPlanId}
                activeTripPlan={plan.activeTripPlan}
                showPlanningWizard={chat.state.showPlanningWizard}
                isAddingNewTrip={chat.state.isAddingNewTrip}
                isGeneratingTripPlan={plan.isGeneratingTripPlan}
                tripPlanError={plan.tripPlanError}
                onAddTripClick={() => {
                  chat.dispatch({ type: "SET_ADDING_TRIP", adding: true });
                  chat.dispatch({ type: "SET_SHOW_WIZARD", show: true });
                }}
                onToggleOpenTrip={(item, isOpen) => {
                  if (isOpen) {
                    plan.setOpenTripPlanId(null);
                  } else {
                    plan.setOpenTripPlanId(item._id);
                    plan.setActiveTripPlan({
                      destinations: item.destinations,
                      startDate: item.startDate,
                      startTime: item.startTime,
                      endDate: item.endDate,
                    });
                  }
                }}
                onDeleteTrip={(id) => void plan.deleteTripPlan(id)}
                onCancelWizard={() => {
                  chat.dispatch({ type: "SET_SHOW_WIZARD", show: false });
                  chat.dispatch({ type: "SET_ADDING_TRIP", adding: false });
                }}
                onSubmitPlan={(tripPayload) => void handleSubmitTripPlan(tripPayload, false)}
                onProgressSaved={(id, progress) =>
                  plan.setSavedTripPlans((prev) => prev.map((p) => (p._id === id ? { ...p, progress } : p)))
                }
                onEditTrip={() => {
                  chat.dispatch({ type: "SET_ADDING_TRIP", adding: false });
                  chat.dispatch({ type: "SET_SHOW_WIZARD", show: true });
                }}
                onCloseTripSection={() => {
                  plan.setOpenTripPlanId(null);
                  plan.setTripPlanError(null);
                }}
              />
            )}

            {plan.aiPlan && ui.activeTab !== "planning-assist" && (
              <>
                {plan.aiPlan.status && (
                  <HeroStatusBanner
                    status={plan.aiPlan.status}
                    doThisNow={plan.aiPlan.do_this_now}
                    dataConfidence={plan.aiPlan.data_confidence}
                  />
                )}
                {ui.activeTab === "daily-plan" && (
                  <DailyPlanTab
                    aiPlan={plan.aiPlan}
                    locationName={plan.userProfile.location}
                    hourlyTimeline={aq.hourlyTimeline}
                    timelineMetric={aq.timelineMetric}
                    onChangeMetric={aq.setTimelineMetric}
                    hoveredHourIdx={aq.hoveredHourIdx}
                    onHoverHour={aq.setHoveredHourIdx}
                    isLoadingTimeline={aq.isLoadingTimeline}
                    onNavigateTab={ui.setActiveTab}
                  />
                )}
                {ui.activeTab === "roadmap" && (
                  <RoadmapTab
                    aiPlan={plan.aiPlan}
                    aiEvalMeta={plan.aiEvalMeta}
                    roadmapCompleted={plan.roadmapCompleted}
                    onToggleStep={(key, nextDone) => {
                      plan.setRoadmapCompleted((prev) => ({ ...prev, [key]: nextDone }));
                      plan.setHasUnsavedProgress(true);
                      plan.setProgressSaved(false);
                    }}
                    phaseFilter={ui.roadmapPhaseFilter}
                    onChangePhaseFilter={ui.setRoadmapPhaseFilter}
                    isSavingProgress={plan.isSavingProgress}
                    progressSaved={plan.progressSaved}
                    hasUnsavedProgress={plan.hasUnsavedProgress}
                    onSaveProgress={() => void plan.handleSaveProgress()}
                  />
                )}
                {ui.activeTab === "indoor-air-lab" && (
                  <IndoorAirLabTab
                    aiPlan={plan.aiPlan}
                    completedChecklist={plan.completedChecklist}
                    onToggleChecklist={(id, nextDone) => {
                      plan.setCompletedChecklist((prev) => ({ ...prev, [id]: nextDone }));
                      plan.setHasUnsavedProgress(true);
                      plan.setProgressSaved(false);
                    }}
                    isSavingProgress={plan.isSavingProgress}
                    progressSaved={plan.progressSaved}
                    hasUnsavedProgress={plan.hasUnsavedProgress}
                    onSaveProgress={() => void plan.handleSaveProgress()}
                  />
                )}
                {ui.activeTab === "sustainable-swaps" && (
                  <SwapsImpactTab
                    aiPlan={plan.aiPlan}
                    copiedNotice={ui.copiedNotice}
                    onCopyCommunityNote={ui.copyCommunityNote}
                  />
                )}
                {plan.aiPlan.safety_note && ui.activeTab !== "daily-plan" && (
                  <div className="p-4 rounded-2xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-xs text-on-surface">
                    <span aria-hidden="true" className="material-symbols-outlined text-error text-xl shrink-0">medical_services</span>
                    <p className="leading-relaxed">{plan.aiPlan.safety_note}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30 py-4 px-8 text-on-surface-variant flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-on-surface">VayuPulse</span>
            <span aria-hidden="true">•</span>
            <span>Hyperlocal Environmental Monitoring</span>
          </div>
          <Link href="/onboarding" className="hover:text-primary transition-colors">Calibrate Household Profile</Link>
        </footer>
      </div>

      <ChatWidget
        state={chat.state}
        dispatch={chat.dispatch}
        userProfile={plan.userProfile}
        aiPlan={plan.aiPlan}
        isGeneratingTripPlan={plan.isGeneratingTripPlan}
        chatFileInputRef={chat.chatFileInputRef}
        chatLauncherRef={chat.chatLauncherRef}
        chatTextareaRef={chat.chatTextareaRef}
        chatChipsRef={chat.chatChipsRef}
        chipsDragStateRef={chat.chipsDragStateRef}
        onFetchPaginatedTrips={(page) => void chat.fetchPaginatedTrips(page)}
        onSelectImage={chat.handleChatImageSelect}
        onSendChat={(e, overrideText, overrideTrip) => void chat.handleSendChat(e, overrideText, overrideTrip)}
        onSubmitTripPlanFromChat={(tripPayload) => void handleSubmitTripPlan(tripPayload, true)}
      />

      {(plan.isRecalibrating || (plan.isGeneratingTripPlan && ui.activeTab === "planning-assist")) && (
        <div role="status" aria-live="assertive" aria-busy="true" className="fixed inset-0 bg-surface-bright/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in select-none">
          {plan.isGeneratingTripPlan && ui.activeTab === "planning-assist" ? (
            <MaterialLoader
              title="Building Trip & Outdoor Plan"
              subtitle="Checking multi-day Open-Meteo air quality forecasts for your destinations and personalizing your Gemini AI exposure plan..."
              steps={[
                { label: "Fetching hourly air quality for destinations", done: true },
                { label: "Evaluating household exposure windows", active: true },
                { label: "Generating packing list & cleaner alternatives" },
              ]}
            />
          ) : (
            <MaterialLoader
              title="Recalibrating Air Quality Plan"
              subtitle={`Rechecking live Open-Meteo telemetry for ${plan.userProfile.location ? plan.userProfile.location.split(",")[0] : "your location"} and generating your updated Gemini AI strategy...`}
              compact
            />
          )}
        </div>
      )}
    </div>
  );
}
