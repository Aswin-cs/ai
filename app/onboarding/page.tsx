"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Lock, Sparkles, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import GoogleAuthGate from "@/components/GoogleAuthGate";
import MaterialLoader from "@/components/MaterialLoader";
import { useOnboardingForm } from "@/hooks/useOnboardingForm";
import LifestyleStep from "./components/LifestyleStep";
import LocationStep from "./components/LocationStep";
import OnboardingHeader from "./components/OnboardingHeader";
import OnboardingProfileActive from "./components/OnboardingProfileActive";
import OnboardingSubmitting from "./components/OnboardingSubmitting";

export default function OnboardingPage() {
  const { data: session, status: authStatus } = useSession();
  const form = useOnboardingForm({
    userEmail: session?.user?.email,
    authStatus,
  });
  const { state, dispatch } = form;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const count = state.osmResults.length;
    if (e.key === "Escape") {
      dispatch({ type: "SET_DROPDOWN_OPEN", open: false });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      dispatch({ type: "SET_DROPDOWN_OPEN", open: true });
      dispatch({
        type: "SET_SELECTED_INDEX",
        index: state.selectedIndex < count - 1 ? state.selectedIndex + 1 : 0,
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      dispatch({ type: "SET_DROPDOWN_OPEN", open: true });
      dispatch({
        type: "SET_SELECTED_INDEX",
        index: state.selectedIndex > 0 ? state.selectedIndex - 1 : count - 1,
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target =
        state.selectedIndex >= 0 && state.osmResults[state.selectedIndex]
          ? state.osmResults[state.selectedIndex]
          : state.osmResults[0];
      if (target) form.handleSelectOsmPlace(target);
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

  return (
    <div className="bg-surface-container-low text-on-surface font-sans antialiased min-h-screen flex flex-col justify-between selection:bg-primary-fixed selection:text-on-primary-fixed">
      <OnboardingHeader
        isSubmitting={state.isSubmitting}
        currentStep={state.currentStep}
        session={session}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8 md:py-12 flex justify-center items-start outline-none"
      >
        {authStatus === "authenticated" && state.isCheckingUserStatus ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="w-full max-w-[680px] bg-surface-container-lowest rounded-[28px] border border-outline-variant shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-12 text-center flex flex-col items-center justify-center min-h-[340px] animate-pulse"
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant font-medium">Checking profile status...</p>
          </div>
        ) : state.isExistingUser && !state.isEditingProfile ? (
          <OnboardingProfileActive
            email={session?.user?.email}
            locationQuery={state.locationQuery}
            vulnerabilities={state.vulnerabilities}
            commute={state.commute}
            onEdit={() => dispatch({ type: "SET_EDITING_PROFILE", editing: true, step: 1 })}
          />
        ) : !state.isSubmitting ? (
          <div className="w-full max-w-[680px] bg-surface-container-lowest rounded-[28px] border border-outline-variant shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300">
            <div className="bg-surface-container px-6 sm:px-8 py-3.5 border-b border-outline-variant flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium text-on-primary-fixed">
                  {state.currentStep === 1
                    ? "Step 1: Calibrate your ground telemetry sensor node"
                    : "Step 2: Customize AI guidance for vulnerable family members"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {state.isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SET_EDITING_PROFILE", editing: false })}
                    className="text-xs font-semibold text-on-surface-variant hover:text-on-surface px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <span className="text-xs font-semibold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full">
                  Step {state.currentStep} of 2
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {state.currentStep === 1 ? (
                <LocationStep
                  locationQuery={state.locationQuery}
                  coords={state.coords}
                  isDropdownOpen={state.isDropdownOpen}
                  isDetecting={state.isDetecting}
                  isSearchingGeocode={state.isSearchingGeocode}
                  osmResults={state.osmResults}
                  selectedIndex={state.selectedIndex}
                  gpsError={state.gpsError}
                  connectedStation={state.connectedStation}
                  airQualityData={state.airQualityData}
                  searchContainerRef={form.searchContainerRef}
                  searchInputRef={form.searchInputRef}
                  onQueryChange={(val) => {
                    dispatch({
                      type: "SET_LOCATION_QUERY",
                      query: val,
                      clearResults: val.trim().length < 2,
                    });
                    dispatch({ type: "SET_DROPDOWN_OPEN", open: true });
                    dispatch({ type: "SET_SELECTED_INDEX", index: -1 });
                  }}
                  onFocusInput={() => dispatch({ type: "SET_DROPDOWN_OPEN", open: true })}
                  onKeyDown={handleSearchKeyDown}
                  onClearSearch={() => {
                    dispatch({ type: "SET_LOCATION_QUERY", query: "", clearResults: true });
                    dispatch({ type: "SET_DROPDOWN_OPEN", open: true });
                    form.searchInputRef.current?.focus();
                  }}
                  onDetectLocation={form.handleDetectLocation}
                  onSelectOsmPlace={form.handleSelectOsmPlace}
                  onHoverResult={(index) => dispatch({ type: "SET_SELECTED_INDEX", index })}
                  onMapLocationChange={(lat, lng) => void form.handleMapLocationChange(lat, lng)}
                />
              ) : (
                <LifestyleStep
                  state={state}
                  dispatch={dispatch}
                  onRefreshAq={() => void form.fetchOpenMeteoAirQuality(state.coords.lat, state.coords.lng)}
                  onGoToStep1={() => {
                    dispatch({ type: "SET_STEP", step: 1 });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}
            </div>

            <div className="bg-surface-container border-t border-outline-variant px-6 md:px-8 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
              {state.currentStep === 1 ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant text-center sm:text-left">
                    <Lock className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
                    <span>Your location is used only to connect nearest ground telemetry.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void form.handleNextStep()}
                    disabled={state.isFetchingAirQuality}
                    className="w-full sm:w-auto h-12 px-7 rounded-full bg-primary-container hover:bg-primary text-on-primary font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-80"
                  >
                    {state.isFetchingAirQuality ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Fetching Air Quality...</span>
                      </>
                    ) : (
                      <>
                        <span>Next: Household Profile</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "SET_STEP", step: 1 });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full sm:w-auto h-12 px-6 rounded-full bg-surface-container-lowest hover:bg-surface-container text-on-surface font-medium text-sm flex items-center justify-center gap-2 border border-outline-variant transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void form.handleGeneratePlan()}
                    className="w-full sm:w-auto h-12 px-7 rounded-full bg-primary-container hover:bg-primary text-on-primary font-medium text-sm flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <span>
                      {state.isExistingUser
                        ? "Save & Recalibrate Air Plan"
                        : "Generate My Personalised Air Plan"}
                    </span>
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <OnboardingSubmitting
            locationQuery={state.locationQuery}
            airQualityData={state.airQualityData}
            vulnerabilities={state.vulnerabilities}
            indoorSetup={state.indoorSetup}
            isOnboardingSaved={state.isOnboardingSaved}
            onCancel={() => dispatch({ type: "SET_SUBMITTING", submitting: false })}
          />
        )}
      </main>

      <footer className="py-4 border-t border-outline-variant bg-surface-container-low text-center text-xs text-on-surface-variant">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">VayuPulse</span>
            <span aria-hidden="true">•</span>
            <span>Data verified against CPCB &amp; OpenAQ Ground Truth Nodes</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Gemini AI</span>
            <span aria-hidden="true">•</span>
            <Link href="/" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
