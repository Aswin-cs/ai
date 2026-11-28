import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import ThemeToggle from "@/components/ThemeToggle";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import HeroStatusBanner from "@/components/dashboard/HeroStatusBanner";
import DailyPlanTab from "@/components/dashboard/DailyPlanTab";
import OnboardingLockScreen from "@/components/dashboard/OnboardingLockScreen";
import RoadmapTab from "@/components/dashboard/RoadmapTab";
import IndoorAirLabTab from "@/components/dashboard/IndoorAirLabTab";
import SwapsImpactTab from "@/components/dashboard/SwapsImpactTab";
import PlanningAssistTab from "@/components/dashboard/PlanningAssistTab";
import type { AirPlan, HourlyTimelinePoint } from "@/types/airPlan";

const signOutMock = vi.fn();
const signInMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockMap() {
      return <div data-testid="mock-leaflet-map">Map</div>;
    },
}));

const SAMPLE_PLAN: AirPlan = {
  status: {
    risk_level: "high",
    headline: "Morning smog spike expected until noon",
    plain_explanation: "Keep intense outdoor exertion for the early afternoon window.",
    main_concern: "pm25",
  },
  do_this_now: {
    action: "Close street-facing windows",
    reason: "Traps cooler humid morning particulates outside.",
  },
  safe_outdoor_window: {
    available: true,
    start: "13:30",
    end: "16:00",
    reason: "Strongest afternoon vertical mixing.",
    expected_pm25: 58,
    best_for: ["Brisk walk", "School pickup"],
  },
  impact_summary: {
    headline: "Masking and timing cut inhaled PM2.5",
    estimated_exposure_reduction_pct: 42,
    assumptions: "Assumes fitted N95 on main road commutes.",
    community_note: "Share clean-air commute slots with neighbors.",
  },
  outdoor_window_review: [
    { usual_activity: "Morning jog", verdict: "shift", suggestion: "Move to 2 PM" },
  ],
  member_guidance: [
    {
      member: "young_children",
      outdoor_limit: "Max 25 min",
      mask_advice: "KF94 child fit",
      key_tips: ["Avoid roadside wait"],
    },
  ],
  daily_routine: [
    {
      period: "morning",
      time_range: "07:00 - 10:00",
      risk_level: "high",
      instead_of: "Outdoor run",
      do_this: "Indoor mobility",
      why_it_matters: "Avoids peak inversion smog",
      impact: { badge: "~35% lower peak dose", estimated: true },
    },
  ],
  indoor_air_plan: {
    setup: "hepa_purifier",
    steps: [{ action: "Run HEPA on medium", when: "06:00 - 11:00", cost: "low" }],
  },
  commute_plan: {
    mode: "metro",
    best_departure: "10:15",
    protection: "N95 on feeder walk",
    tips: ["Use AC recirculation in cabs"],
  },
  roadmap: [
    {
      phase: "now",
      title: "Immediate Setup",
      goal: "Lower indoor PM2.5",
      steps: [
        {
          id: "step-1",
          action: "Seal balcony door gap",
          when: "Now",
          who: "Household",
          why: "Cuts infiltration",
          impact_badge: "~20% cleaner indoors",
          effort: "easy",
          cost: "free",
        },
      ],
    },
  ],
  sustainable_swaps: [
    {
      from_habit: "Solo petrol scoop",
      to_habit: "Metro + EV feeder",
      benefit_to_air: "Cuts NOx and tailpipe PM",
      benefit_to_family: "Calmer commute & cleaner lungs",
      effort: "easy",
    },
  ],
  safety_note: "Seek medical care for wheezing.",
  data_confidence: "high",
};

const SAMPLE_TIMELINE: HourlyTimelinePoint[] = [
  { time: "2026-12-05T10:00", label: "Now", aqi: 185, pm25: 102, pm10: 150, isNow: true },
  { time: "2026-12-05T14:00", label: "2 PM", aqi: 118, pm25: 55, pm10: 95, isNow: false },
];

describe("Dashboard Components & Accessibility", () => {
  it("ThemeToggle announces state, toggles theme class cleanly, and passes axe", async () => {
    document.documentElement.classList.remove("dark");
    const { container } = render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /Switch to Night mode/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    const iconSpan = btn.querySelector("span[aria-hidden='true']");
    expect(iconSpan).toHaveClass("material-symbols-outlined");

    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /Switch to Day mode/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("OnboardingLockScreen renders setup link and passes axe", async () => {
    const { container } = render(<OnboardingLockScreen />);
    expect(screen.getByRole("heading", { name: /Complete the Onboarding Setup/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Onboarding Setup/i })).toHaveAttribute(
      "href",
      "/onboarding"
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("HeroStatusBanner renders all risk levels and passes axe", async () => {
    const { container, rerender } = render(
      <HeroStatusBanner
        status={SAMPLE_PLAN.status!}
        doThisNow={SAMPLE_PLAN.do_this_now}
        dataConfidence="high"
      />
    );
    expect(screen.getByText(/high risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Focus: pm25/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Morning smog spike/i })).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);

    for (const risk of ["low", "moderate", "severe"] as const) {
      rerender(
        <HeroStatusBanner
          status={{ ...SAMPLE_PLAN.status!, risk_level: risk }}
          doThisNow={undefined}
          dataConfidence={undefined}
        />
      );
      expect(screen.getByText(new RegExp(`${risk} risk`, "i"))).toBeInTheDocument();
    }
  });

  it("DashboardHeader handles mobile toggle, language switching, recalibrate state, and passes axe", async () => {
    const onLanguageChange = vi.fn();
    const onRecalibrate = vi.fn();
    const onToggleMobileNav = vi.fn();
    const { container, rerender } = render(
      <DashboardHeader
        mobileNavOpen={false}
        onToggleMobileNav={onToggleMobileNav}
        userProfile={{
          location: "Rohini, Delhi",
          aqi: 185,
          pollutants: { pm25: 102, pm10: 150, no2: 34 },
        }}
        aiPlan={SAMPLE_PLAN}
        language="en"
        onLanguageChange={onLanguageChange}
        isRecalibrating={false}
        onRecalibrate={onRecalibrate}
      />
    );

    expect(screen.getByText("185")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Open navigation menu/i }));
    expect(onToggleMobileNav).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole("combobox", { name: /Select preferred language/i }), {
      target: { value: "hi" },
    });
    expect(onLanguageChange).toHaveBeenCalledWith("hi");

    fireEvent.click(screen.getByRole("button", { name: /Recalibrate/i }));
    expect(onRecalibrate).toHaveBeenCalledTimes(1);

    expect((await axe(container)).violations).toEqual([]);

    rerender(
      <DashboardHeader
        mobileNavOpen={true}
        onToggleMobileNav={onToggleMobileNav}
        userProfile={{ location: "Rohini, Delhi", aqi: 185 }}
        aiPlan={SAMPLE_PLAN}
        language="hi"
        onLanguageChange={onLanguageChange}
        isRecalibrating={true}
        onRecalibrate={onRecalibrate}
      />
    );
    expect(screen.getByRole("button", { name: /Recalibrating/i })).toBeDisabled();
  });

  it("DashboardSidebar switches tabs, handles guest sign-in & sign-out menus, and passes axe", async () => {
    const onSelectTab = vi.fn();
    const onToggleUserMenu = vi.fn();
    const { container, rerender } = render(
      <DashboardSidebar
        activeTab="daily-plan"
        onSelectTab={onSelectTab}
        mobileNavOpen={false}
        onCloseMobileNav={vi.fn()}
        userMenuOpen={true}
        onToggleUserMenu={onToggleUserMenu}
        onCloseUserMenu={vi.fn()}
        isRecalibrating={false}
        onRecalibrate={vi.fn()}
        userProfile={{ location: "Rohini, Delhi" }}
        session={{
          expires: "2026-12-31",
          user: { name: "Asha", email: "asha@example.com", image: "https://lh3.googleusercontent.com/a/avatar" },
        }}
      />
    );

    expect(screen.getByRole("button", { name: /Daily Plan/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    fireEvent.click(screen.getByRole("button", { name: /Action Roadmap/i }));
    expect(onSelectTab).toHaveBeenCalledWith("roadmap");
    fireEvent.click(screen.getByRole("button", { name: /Account menu/i }));
    expect(onToggleUserMenu).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("menuitem", { name: /Sign Out/i }));
    expect(signOutMock).toHaveBeenCalledTimes(1);

    expect((await axe(container)).violations).toEqual([]);

    rerender(
      <DashboardSidebar
        activeTab="roadmap"
        onSelectTab={onSelectTab}
        mobileNavOpen={true}
        onCloseMobileNav={vi.fn()}
        userMenuOpen={true}
        onToggleUserMenu={onToggleUserMenu}
        onCloseUserMenu={vi.fn()}
        isRecalibrating={true}
        onRecalibrate={vi.fn()}
        userProfile={{ location: "" }}
        session={null}
      />
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /Sign In/i }));
    expect(signInMock).toHaveBeenCalledTimes(1);
  });

  it("DailyPlanTab, RoadmapTab, IndoorAirLabTab, SwapsImpactTab, and PlanningAssistTab render and pass axe", async () => {
    const onNavigateTab = vi.fn();
    const onChangeMetric = vi.fn();
    const onHoverHour = vi.fn();
    const { container: c1, rerender: r1 } = render(
      <DailyPlanTab
        aiPlan={SAMPLE_PLAN}
        locationName="Rohini, Delhi"
        hourlyTimeline={SAMPLE_TIMELINE}
        timelineMetric="aqi"
        onChangeMetric={onChangeMetric}
        hoveredHourIdx={0}
        onHoverHour={onHoverHour}
        isLoadingTimeline={false}
        onNavigateTab={onNavigateTab}
      />
    );
    expect(screen.getByText(/Safe Outdoor Window/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /PM2.5/i }));
    expect(onChangeMetric).toHaveBeenCalledWith("pm25");
    fireEvent.click(screen.getByRole("button", { name: /US AQI/i }));
    expect(onChangeMetric).toHaveBeenCalledWith("aqi");
    fireEvent.click(screen.getByRole("button", { name: /View all tips/i }));
    expect(onNavigateTab).toHaveBeenCalledWith("indoor-air-lab");
    fireEvent.click(screen.getByRole("button", { name: /Open Checkable Roadmap/i }));
    expect(onNavigateTab).toHaveBeenCalledWith("roadmap");
    expect((await axe(c1)).violations).toEqual([]);

    r1(
      <DailyPlanTab
        aiPlan={{
          ...SAMPLE_PLAN,
          safe_outdoor_window: {
            available: false,
            start: "",
            end: "",
            reason: "Stagnant boundary layer",
            expected_pm25: 190,
            best_for: [],
          },
          outdoor_window_review: [
            { usual_activity: "Lunch stroll", verdict: "keep", suggestion: "Carry water" },
            { usual_activity: "Dawn sprint", verdict: "cancel", suggestion: "Stay indoors" },
          ],
          daily_routine: [
            { period: "afternoon", time_range: "12:00 - 16:00", risk_level: "moderate", instead_of: "", do_this: "Short walk", why_it_matters: "" } as NonNullable<AirPlan["daily_routine"]>[number],
            { ...SAMPLE_PLAN.daily_routine![0], period: "evening", risk_level: "severe" },
            { ...SAMPLE_PLAN.daily_routine![0], period: "night", risk_level: "low" },
          ],
          safety_note: undefined,
        }}
        locationName="Rohini, Delhi"
        hourlyTimeline={SAMPLE_TIMELINE}
        timelineMetric="pm25"
        onChangeMetric={onChangeMetric}
        hoveredHourIdx={null}
        onHoverHour={onHoverHour}
        isLoadingTimeline={true}
        onNavigateTab={onNavigateTab}
      />
    );
    expect(screen.getByText(/No Safe Outdoor Window Today/i)).toBeInTheDocument();
    expect((await axe(c1)).violations).toEqual([]);

    // Legacy safeOutdoorWindow camelCase fallback & default window fallback
    r1(
      <DailyPlanTab
        aiPlan={{
          status: SAMPLE_PLAN.status,
          do_this_now: SAMPLE_PLAN.do_this_now,
          safeOutdoorWindow: { startTime: "14:00", endTime: "16:30", lowestEstimatedPm25: 48, reasoning: "Afternoon sun" },
          data_confidence: "medium",
        }}
        locationName={undefined}
        hourlyTimeline={[]}
        timelineMetric="aqi"
        onChangeMetric={onChangeMetric}
        hoveredHourIdx={null}
        onHoverHour={onHoverHour}
        isLoadingTimeline={false}
        onNavigateTab={onNavigateTab}
      />
    );
    expect(screen.getByText(/2:00 PM – 4:30 PM/i)).toBeInTheDocument();
    expect(screen.getByText(/Afternoon sun/i)).toBeInTheDocument();

    const onToggleStep = vi.fn();
    const onChangePhaseFilter = vi.fn();
    const { container: c2, rerender: r2 } = render(
      <RoadmapTab
        aiPlan={{
          ...SAMPLE_PLAN,
          roadmap: [
            {
              phase: "now",
              title: "Immediate Setup",
              goal: "Lower indoor PM2.5",
              steps: SAMPLE_PLAN.roadmap![0].steps,
            },
            {
              phase: "today",
              title: "Afternoon Routine",
              goal: "Ventilate safely",
              steps: [{ id: "", action: "Air bedrooms", when: "15:00", who: "Family", why: "Lower CO2", impact_badge: "", effort: "easy", cost: "free" }],
            },
            {
              phase: "this_week",
              title: "Weekly Prep",
              goal: "Stock filters",
              steps: [{ id: "step-w", action: "Check HEPA indicator", when: "Weekend", who: "Home", why: "Maintain CADR", impact_badge: "", effort: "easy", cost: "low" }],
            },
            {
              phase: "this_month",
              title: "Monthly Check",
              goal: "Seal gaps",
              steps: [{ id: "step-m", action: "Inspect door weatherstrips", when: "Month end", who: "Home", why: "Block infiltration", impact_badge: "", effort: "medium", cost: "low" }],
            },
          ],
        }}
        aiEvalMeta={{ modelUsed: "gemini-3.8-flash", updatedAt: "2026-12-05T08:00:00Z" }}
        roadmapCompleted={{}}
        onToggleStep={onToggleStep}
        phaseFilter="all"
        onChangePhaseFilter={onChangePhaseFilter}
        isSavingProgress={false}
        progressSaved={false}
        hasUnsavedProgress={false}
        onSaveProgress={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Today/i }));
    expect(onChangePhaseFilter).toHaveBeenCalledWith("today");
    fireEvent.click(screen.getByText(/Seal balcony door gap/i));
    expect(onToggleStep).toHaveBeenCalled();
    expect((await axe(c2)).violations).toEqual([]);

    r2(
      <RoadmapTab
        aiPlan={{ ...SAMPLE_PLAN, roadmap: [] }}
        aiEvalMeta={null}
        roadmapCompleted={{ "step-1": true }}
        onToggleStep={onToggleStep}
        phaseFilter="now"
        onChangePhaseFilter={onChangePhaseFilter}
        isSavingProgress={true}
        progressSaved={true}
        hasUnsavedProgress={false}
        onSaveProgress={vi.fn()}
      />
    );

    const onToggleChecklist = vi.fn();
    const { container: c3, rerender: r3 } = render(
      <IndoorAirLabTab
        aiPlan={{
          ...SAMPLE_PLAN,
          member_guidance: [
            { ...SAMPLE_PLAN.member_guidance![0], warning_signs: ["Persistent cough"] },
          ],
        }}
        completedChecklist={{ "check-0": true }}
        onToggleChecklist={onToggleChecklist}
        isSavingProgress={false}
        progressSaved={true}
        hasUnsavedProgress={false}
        onSaveProgress={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Run HEPA on medium/i));
    expect(onToggleChecklist).toHaveBeenCalled();
    expect(screen.getByText(/Persistent cough/i)).toBeInTheDocument();
    expect((await axe(c3)).violations).toEqual([]);

    r3(
      <IndoorAirLabTab
        aiPlan={{
          ...SAMPLE_PLAN,
          indoor_air_plan: {
            setup: undefined,
            steps: [{ action: "Wet mop floors", when: "18:00", cost: "free" }],
          } as unknown as AirPlan["indoor_air_plan"],
          commute_plan: undefined,
          member_guidance: [{ ...SAMPLE_PLAN.member_guidance![0], warning_signs: [] }],
        }}
        completedChecklist={{}}
        onToggleChecklist={onToggleChecklist}
        isSavingProgress={false}
        progressSaved={false}
        hasUnsavedProgress={false}
        onSaveProgress={vi.fn()}
      />
    );
    expect((await axe(c3)).violations).toEqual([]);

    const onCopy = vi.fn();
    const { container: c4, rerender: r4 } = render(
      <SwapsImpactTab
        aiPlan={SAMPLE_PLAN}
        copiedNotice={false}
        onCopyCommunityNote={onCopy}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Copy Community Note/i }));
    expect(onCopy).toHaveBeenCalled();
    expect(screen.getByText(/Metro \+ EV feeder/i)).toBeInTheDocument();
    expect((await axe(c4)).violations).toEqual([]);

    r4(
      <SwapsImpactTab
        aiPlan={{ ...SAMPLE_PLAN, sustainable_swaps: undefined }}
        copiedNotice={true}
        onCopyCommunityNote={onCopy}
      />
    );
    expect(screen.getByText(/Copied Note!/i)).toBeInTheDocument();
    expect((await axe(c4)).violations).toEqual([]);

    r4(
      <SwapsImpactTab
        aiPlan={{ ...SAMPLE_PLAN, sustainable_swaps: [], impact_summary: undefined }}
        copiedNotice={false}
        onCopyCommunityNote={onCopy}
      />
    );

    const onAddTrip = vi.fn();
    const onToggleOpenTrip = vi.fn();
    const onDeleteTrip = vi.fn();
    const { container: c5, rerender: r5 } = render(
      <PlanningAssistTab
        tripSectionRef={{ current: null }}
        userProfile={{ location: "Delhi", coords: { lat: 28.61, lng: 77.2 } }}
        savedTripPlans={[
          {
            _id: "tp-1",
            destinations: [
              {
                name: "Shimla",
                fullName: "Shimla, HP",
                lat: 31.1,
                lng: 77.17,
                usAqi: 38,
                pm25: 10,
                pm10: 18,
                no2: 8,
                ozone: 22,
                categoryLabel: "Good",
              },
            ],
            startDate: "2026-12-15",
            startTime: "08:00",
            endDate: "2026-12-17",
            plan: {
              trip_summary: {
                title: "Shimla Weekend",
                start: "2026-12-15",
                end: "2026-12-17",
                duration_days: 3,
                overall_risk: "low",
                headline: "Clean air mountain escape",
                top_advice: ["Morning walk"],
              },
              places_overview: [],
              days: [],
              alerts: [],
              better_options: [],
              packing_list: [],
              roadmap: [],
              impact_summary: {
                headline: "Minimal PM2.5 exposure",
                estimated_exposure_reduction_pct: 55,
                assumptions_note: "Based on forecast",
              },
              assumptions: [],
              safety_note: "Consult physician if symptomatic.",
              data_confidence: "high",
            },
          },
          {
            _id: "tp-untitled",
            destinations: [
              {
                name: "Nainital",
                fullName: "Nainital, UK",
                lat: 29.38,
                lng: 79.45,
                usAqi: 42,
                pm25: 11,
                pm10: 19,
                no2: 9,
                ozone: 21,
                categoryLabel: "Good",
              },
            ],
            startDate: "2026-12-20",
            startTime: "09:00",
            endDate: "2026-12-21",
          } as unknown as Parameters<typeof PlanningAssistTab>[0]["savedTripPlans"][number],
        ]}
        openTripPlanId="tp-1"
        activeTripPlan={null}
        showPlanningWizard={true}
        isAddingNewTrip={true}
        isGeneratingTripPlan={false}
        tripPlanError={null}
        onAddTripClick={onAddTrip}
        onToggleOpenTrip={onToggleOpenTrip}
        onDeleteTrip={onDeleteTrip}
        onCancelWizard={vi.fn()}
        onSubmitPlan={vi.fn()}
        onProgressSaved={vi.fn()}
        onEditTrip={vi.fn()}
        onCloseTripSection={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Trip Plan/i }));
    expect(onAddTrip).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /^Shimla Weekend/i }));
    expect(onToggleOpenTrip).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Delete Shimla Weekend/i }));
    expect(onDeleteTrip).toHaveBeenCalledWith("tp-1");
    // Delete button inside TripPlanSection triggers onDelete(openTripRecord._id)
    const deleteBtns = screen.getAllByRole("button", { name: /^Delete$/i });
    fireEvent.click(deleteBtns[0]);
    expect(onDeleteTrip).toHaveBeenCalledWith("tp-1");
    expect((await axe(c5)).violations).toEqual([]);

    r5(
      <PlanningAssistTab
        tripSectionRef={{ current: null }}
        userProfile={{ location: "" }}
        savedTripPlans={[]}
        openTripPlanId={null}
        activeTripPlan={null}
        showPlanningWizard={false}
        isAddingNewTrip={false}
        isGeneratingTripPlan={true}
        tripPlanError={null}
        onAddTripClick={onAddTrip}
        onToggleOpenTrip={onToggleOpenTrip}
        onDeleteTrip={onDeleteTrip}
        onCancelWizard={vi.fn()}
        onSubmitPlan={vi.fn()}
        onProgressSaved={vi.fn()}
        onEditTrip={vi.fn()}
        onCloseTripSection={vi.fn()}
      />
    );
  });
});
