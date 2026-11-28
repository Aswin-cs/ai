import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import OnboardingHeader from "@/app/onboarding/components/OnboardingHeader";
import LocationStep from "@/app/onboarding/components/LocationStep";
import TripDestinationStep from "@/components/trip/TripDestinationStep";
import TripScheduleStep from "@/components/trip/TripScheduleStep";
import { getAqiMeta } from "@/lib/airQuality";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
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
    function MockDynamicLeaflet() {
      return <div data-testid="mock-leaflet-map">Interactive Map</div>;
    },
}));

describe("Onboarding & Trip Components + Accessibility", () => {
  it("OnboardingHeader shows progress step, user pill/Sign Out or Sign In CTA, and passes axe", async () => {
    const { container, rerender } = render(
      <OnboardingHeader
        isSubmitting={false}
        currentStep={1}
        session={{
          expires: "2026-12-31",
          user: { name: "Kiran", email: "kiran@example.com", image: "https://lh3.googleusercontent.com/a/k" },
        }}
      />
    );

    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);

    rerender(<OnboardingHeader isSubmitting={true} currentStep={2} session={null} />);
    expect(screen.getByText(/Calibrating Air Guidance/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });

  it("LocationStep exposes combobox input and keyboard GPS alternative button, handles GPS error alert, and passes axe", async () => {
    const onQueryChange = vi.fn();
    const onDetectLocation = vi.fn();
    const onSelectOsmPlace = vi.fn();

    const onClearSearch = vi.fn();
    const onHoverResult = vi.fn();
    const { container, rerender } = render(
      <LocationStep
        locationQuery="Indi"
        coords={{ lat: 12.97, lng: 77.64 }}
        isDropdownOpen={true}
        isDetecting={false}
        isSearchingGeocode={false}
        osmResults={[
          {
            place_id: 1,
            display_name: "Indiranagar, Bengaluru, Karnataka, India",
            lat: "12.978",
            lon: "77.64",
            address: { suburb: "Indiranagar", city: "Bengaluru" },
          },
        ]}
        selectedIndex={0}
        gpsError="Location permission denied."
        connectedStation={{
          name: "BTM Layout Station",
          pm25: "42",
          temp: "Live",
          distance: "3.1 km",
        }}
        airQualityData={null}
        searchContainerRef={{ current: null }}
        searchInputRef={{ current: null }}
        onQueryChange={onQueryChange}
        onFocusInput={vi.fn()}
        onKeyDown={vi.fn()}
        onClearSearch={onClearSearch}
        onDetectLocation={onDetectLocation}
        onSelectOsmPlace={onSelectOsmPlace}
        onHoverResult={onHoverResult}
        onMapLocationChange={vi.fn()}
      />
    );

    const searchInput = screen.getByRole("combobox", { name: /Search Indian city/i });
    fireEvent.change(searchInput, { target: { value: "Indiranagar" } });
    expect(onQueryChange).toHaveBeenCalledWith("Indiranagar");

    fireEvent.click(screen.getByRole("button", { name: /Clear location search/i }));
    expect(onClearSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Use my current location/i }));
    expect(onDetectLocation).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("alert")).toHaveTextContent("Location permission denied.");

    const option = screen.getByRole("option");
    fireEvent.mouseEnter(option);
    fireEvent.keyDown(option, { key: "Enter" });
    fireEvent.click(option);
    expect(onHoverResult).toHaveBeenCalledWith(0);
    expect(onSelectOsmPlace).toHaveBeenCalledTimes(2);

    expect((await axe(container)).violations).toEqual([]);

    // Empty search dropdown & populated airQualityData
    rerender(
      <LocationStep
        locationQuery=""
        coords={{ lat: 12.97, lng: 77.64 }}
        isDropdownOpen={true}
        isDetecting={true}
        isSearchingGeocode={true}
        osmResults={[]}
        selectedIndex={-1}
        gpsError={null}
        connectedStation={{
          name: "BTM Layout Station",
          pm25: "24",
          temp: "Live",
          distance: "3.1 km",
        }}
        airQualityData={{
          usAqi: 72,
          europeanAqi: 36,
          pm25: 24.5,
          pm10: 42.1,
          no2: 18,
          ozone: 32,
          co: 300,
          so2: 5,
          time: "Now",
          category: getAqiMeta(72),
        }}
        searchContainerRef={{ current: null }}
        searchInputRef={{ current: null }}
        onQueryChange={onQueryChange}
        onFocusInput={vi.fn()}
        onKeyDown={vi.fn()}
        onClearSearch={onClearSearch}
        onDetectLocation={onDetectLocation}
        onSelectOsmPlace={onSelectOsmPlace}
        onHoverResult={onHoverResult}
        onMapLocationChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Use Live Device GPS/i }));
    expect(screen.getByText(/24.5/i)).toBeInTheDocument();
  });

  it("TripDestinationStep and TripScheduleStep handle destination add/remove, schedule validation, and pass axe", async () => {
    const onNextStep = vi.fn();
    const onRemove = vi.fn();

    const { container: destContainer } = render(
      <TripDestinationStep
        searchContainerRef={{ current: null }}
        searchQuery="Jaipur"
        osmResults={[
          {
            place_id: 10,
            display_name: "Jaipur, Rajasthan, India",
            lat: "26.912",
            lon: "75.787",
            address: { city: "Jaipur", state: "Rajasthan" },
          },
        ]}
        isSearching={false}
        isDropdownOpen={true}
        mapCenter={{ lat: 26.912, lng: 75.787, label: "Jaipur" }}
        hasCustomPin={true}
        destinations={[
          {
            id: "d1",
            name: "Jaipur",
            fullName: "Jaipur, Rajasthan",
            lat: 26.912,
            lng: 75.787,
            loadingAq: false,
            usAqi: 132,
            pm25: 48,
            pm10: 82,
          },
        ]}
        canProceedStep1={true}
        onSearchQueryChange={vi.fn()}
        onClearSearch={vi.fn()}
        onSetDropdownOpen={vi.fn()}
        onSelectOsmResult={vi.fn()}
        onMapLocationChange={vi.fn()}
        onAddPinnedPlace={vi.fn()}
        onCenterMap={vi.fn()}
        onRemoveDestination={onRemove}
        onNextStep={onNextStep}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Remove Jaipur/i }));
    expect(onRemove).toHaveBeenCalledWith("d1");
    fireEvent.click(screen.getByRole("button", { name: /Add Pinned Place/i }));
    fireEvent.click(screen.getByRole("button", { name: /Clear destination search/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /Search destination/i }), {
      target: { value: "Manali" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Next: Time & End Date/i }));
    expect(onNextStep).toHaveBeenCalledTimes(1);
    expect((await axe(destContainer)).violations).toEqual([]);

    const onConfirmPlan = vi.fn();
    const onStartDateChange = vi.fn();
    const onStartTimeChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onBackStep = vi.fn();
    const { container: schedContainer } = render(
      <TripScheduleStep
        destinations={[
          {
            id: "d1",
            name: "Jaipur",
            fullName: "Jaipur, Rajasthan",
            lat: 26.912,
            lng: 75.787,
            loadingAq: false,
            usAqi: 132,
          },
        ]}
        todayStr="2026-12-01"
        startDate="2026-12-05"
        startTime="09:00"
        endDate="2026-12-07"
        onStartDateChange={onStartDateChange}
        onStartTimeChange={onStartTimeChange}
        onEndDateChange={onEndDateChange}
        onBackStep={onBackStep}
        onConfirmPlan={onConfirmPlan}
      />
    );

    fireEvent.change(screen.getByLabelText(/Start date/i), { target: { value: "2026-12-06" } });
    fireEvent.change(screen.getByLabelText(/Start time/i), { target: { value: "10:30" } });
    fireEvent.change(screen.getByLabelText(/End date/i), { target: { value: "2026-12-08" } });
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    fireEvent.click(screen.getByRole("button", { name: /Generate Trip Air Plan/i }));
    expect(onStartDateChange).toHaveBeenCalledWith("2026-12-06");
    expect(onStartTimeChange).toHaveBeenCalledWith("10:30");
    expect(onEndDateChange).toHaveBeenCalledWith("2026-12-08");
    expect(onBackStep).toHaveBeenCalledTimes(1);
    expect(onConfirmPlan).toHaveBeenCalledTimes(1);
    expect((await axe(schedContainer)).violations).toEqual([]);
  });
});
