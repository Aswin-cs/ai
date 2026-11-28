import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatWidget from "@/components/chat/ChatWidget";
import { initialChatState, type ChatAction, type ChatState } from "@/hooks/chatReducer";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockDynamicMap() {
      return <div data-testid="mock-leaflet-map">Map</div>;
    },
}));

describe("Chat Components & Accessibility", () => {
  it("ChatInput renders input, disabled state while replying, image attachment preview/error, and passes axe", async () => {
    const onSubmit = vi.fn((e?: React.FormEvent) => e?.preventDefault());
    const onChangeInput = vi.fn();
    const onRemoveImage = vi.fn();
    const onDismissImageError = vi.fn();

    const { container, rerender } = render(
      <ChatInput
        chatInput="Safe to walk?"
        onChangeInput={onChangeInput}
        chatImage={{
          data: "data:image/png;base64,iVBORw0KGgo=",
          mimeType: "image/png",
          name: "skyline.png",
          size: 512000,
        }}
        chatImageError={null}
        onDismissImageError={onDismissImageError}
        onRemoveImage={onRemoveImage}
        onSelectFile={vi.fn()}
        selectedChatTrip={{ _id: "t1", title: "Jaipur Trip", places: "Jaipur", dates: "2026-12-05" }}
        onClearSelectedTrip={vi.fn()}
        planningAssistMode={false}
        isAiReplying={false}
        onSubmit={onSubmit}
        chatFileInputRef={{ current: null }}
        chatTextareaRef={{ current: null }}
      />
    );

    expect(screen.getByText("skyline.png")).toBeInTheDocument();
    expect(screen.getByText(/Asking about: Jaipur Trip/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Remove attached image/i }));
    expect(onRemoveImage).toHaveBeenCalledTimes(1);

    fireEvent.submit(
      screen.getByRole("textbox", { name: /Ask VayuPulse AI a question/i }).closest("form")!
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);

    expect((await axe(container)).violations).toEqual([]);

    rerender(
      <ChatInput
        chatInput=""
        onChangeInput={onChangeInput}
        chatImage={null}
        chatImageError="Image must be under 5 MB."
        onDismissImageError={onDismissImageError}
        onRemoveImage={onRemoveImage}
        onSelectFile={vi.fn()}
        selectedChatTrip={null}
        onClearSelectedTrip={vi.fn()}
        planningAssistMode={true}
        isAiReplying={true}
        onSubmit={onSubmit}
        chatFileInputRef={{ current: null }}
        chatTextareaRef={{ current: null }}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Image must be under 5 MB.");
    expect(screen.getByRole("button", { name: /Upload 1 image/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Send message/i })).toBeDisabled();
  });

  it("ChatMessageList exposes role=log, descriptive attached image alt, status loader, and passes axe", async () => {
    const onOpenPlanningAssist = vi.fn();
    const { container, rerender } = render(
      <ChatMessageList
        messages={[
          {
            sender: "user",
            text: "Check outer haze",
            time: "10:00 AM",
            imageUrl: "data:image/jpeg;base64,/9j/4AAQ=",
          },
          {
            sender: "ai",
            text: "PM2.5 is high outdoors. Use Planning Assist for multi-day travel.",
            time: "10:01 AM",
            tag: "Delhi Live",
            suggestPlanningMode: true,
          },
        ]}
        planningAssistMode={false}
        onOpenPlanningAssist={onOpenPlanningAssist}
        isAiReplying={true}
        isGeneratingTripPlan={false}
        locationName="New Delhi, India"
      />
    );

    const logRegion = screen.getByRole("log", { name: /Chat messages/i });
    expect(logRegion).toBeInTheDocument();
    expect(screen.getByAltText(/Photo you attached: Check outer haze/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Checking New Delhi air telemetry/i);

    fireEvent.click(screen.getByRole("button", { name: /Open Planning Assist Mode/i }));
    expect(onOpenPlanningAssist).toHaveBeenCalledTimes(1);

    expect((await axe(container)).violations).toEqual([]);

    rerender(
      <ChatMessageList
        messages={[{ sender: "user", text: "", time: "10:02 AM", imageUrl: "data:image/png;base64,AAA=" }]}
        planningAssistMode={true}
        onOpenPlanningAssist={onOpenPlanningAssist}
        isAiReplying={false}
        isGeneratingTripPlan={true}
        selectedChatTripPlaces="Manali"
      />
    );
    expect(screen.getByAltText(/Photo you attached to your message/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Building your Trip/i);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("ChatInput handles textarea input, Enter submission, trip clear, and alert dismiss", () => {
    const onSubmit = vi.fn((e?: React.FormEvent) => e?.preventDefault());
    const onChangeInput = vi.fn();
    const onClearSelectedTrip = vi.fn();
    const onDismissImageError = vi.fn();

    render(
      <ChatInput
        chatInput="Check AQI"
        onChangeInput={onChangeInput}
        chatImage={null}
        chatImageError="Too large"
        onDismissImageError={onDismissImageError}
        onRemoveImage={vi.fn()}
        onSelectFile={vi.fn()}
        selectedChatTrip={{ _id: "t1", title: "Agra", places: "Agra", dates: "2026-12-05" }}
        onClearSelectedTrip={onClearSelectedTrip}
        planningAssistMode={false}
        isAiReplying={false}
        onSubmit={onSubmit}
        chatFileInputRef={{ current: null }}
        chatTextareaRef={{ current: null }}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Ask VayuPulse AI a question/i });
    fireEvent.change(textarea, { target: { value: "Air today?" } });
    expect(onChangeInput).toHaveBeenCalledWith("Air today?");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Clear selected trip/i }));
    expect(onClearSelectedTrip).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Dismiss image error/i }));
    expect(onDismissImageError).toHaveBeenCalledTimes(1);
  });

  it("ChatWidget opens, triggers chips & saved trip picker, toggles Planning Assist, and passes axe", async () => {
    const dispatch = vi.fn<(action: ChatAction) => void>();
    const onFetchPaginatedTrips = vi.fn();
    const onSendChat = vi.fn();

    const openState: ChatState = {
      ...initialChatState,
      chatOpen: true,
      messages: [
        { sender: "ai", text: "Namaste! AQI is 220.", time: "10:00 AM", tag: "Live" },
      ],
      showSavedTripsPicker: true,
      paginatedTrips: [
        {
          _id: "trip-1",
          destinations: [
            {
              name: "Manali",
              fullName: "Manali, HP",
              lat: 32.24,
              lng: 77.18,
              usAqi: 42,
              pm25: 12,
              pm10: 20,
              no2: 10,
              ozone: 28,
              categoryLabel: "Good",
            },
          ],
          startDate: "2026-12-10",
          startTime: "09:00",
          endDate: "2026-12-12",
          plan: {
            trip_summary: {
              title: "Manali Clean Air Trip",
              start: "2026-12-10",
              end: "2026-12-12",
              duration_days: 3,
              overall_risk: "low",
              headline: "Good air expected.",
              top_advice: ["Walk in morning"],
            },
            places_overview: [],
            days: [],
            alerts: [],
            better_options: [],
            packing_list: [],
            roadmap: [],
            impact_summary: {
              headline: "Low exposure",
              estimated_exposure_reduction_pct: 40,
              assumptions_note: "Based on forecast",
            },
            assumptions: [],
            safety_note: "Consult physician for symptoms.",
            data_confidence: "medium",
          },
        },
      ],
      tripPickerPage: 1,
      tripPickerTotalPages: 2,
      tripPickerTotal: 4,
    };

    const { container, rerender } = render(
      <ChatWidget
        state={openState}
        dispatch={dispatch}
        userProfile={{ location: "Delhi, India", aqi: 220, pollutants: { pm25: 120, pm10: 190, no2: 40 } }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={{ current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } }}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: /VayuPulse AI/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Open windows\?/i }));
    expect(onSendChat).toHaveBeenCalledWith(undefined, "Safe window to open windows?");

    const toolbar = screen.getByRole("toolbar", { name: /Quick chat suggestions/i });
    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    fireEvent.mouseDown(toolbar, { pageX: 10 });
    fireEvent.mouseMove(toolbar, { pageX: 40 });
    fireEvent.mouseUp(toolbar);
    fireEvent.mouseLeave(toolbar);
    fireEvent.wheel(toolbar, { deltaY: 20, deltaX: 0 });

    fireEvent.click(screen.getByRole("button", { name: /Saved Trips/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "SET_SAVED_TRIPS_PICKER_OPEN", open: false });

    fireEvent.click(screen.getByRole("button", { name: /Manali Clean Air Trip/i }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SELECT_CHAT_TRIP" })
    );

    fireEvent.click(screen.getByRole("button", { name: /Reset conversation/i }));
    fireEvent.click(screen.getByRole("button", { name: /Expand chat view/i }));
    fireEvent.click(screen.getByRole("button", { name: /Close chat/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Planning Assist$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }));
    expect(onFetchPaginatedTrips).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: /Close VayuPulse AI Chat/i }));

    expect((await axe(container)).violations).toEqual([]);

    rerender(
      <ChatWidget
        state={{
          ...initialChatState,
          chatOpen: true,
          chatExpanded: true,
          planningAssistMode: true,
          showPlanningWizard: true,
        }}
        dispatch={dispatch}
        userProfile={{ location: "Delhi, India", coords: { lat: 28.61, lng: 77.2 } }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={{ current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } }}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: /Planning Assist Mode/i })).toBeInTheDocument();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
    fireEvent.click(screen.getByRole("button", { name: /Collapse planning view/i }));
    fireEvent.click(screen.getByRole("button", { name: /Back to chat/i }));

    // Empty saved trips branch + launcher toggle
    rerender(
      <ChatWidget
        state={{
          ...initialChatState,
          chatOpen: true,
          planningAssistMode: true,
          showSavedTripsPicker: true,
          paginatedTrips: [],
        }}
        dispatch={dispatch}
        userProfile={{ location: "" }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={{ current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } }}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Trip Setup/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Close$/i }));

    // Loading spinner in saved trips picker + Prev pagination + Tab focus trap inside Planning Wizard
    rerender(
      <ChatWidget
        state={{
          ...initialChatState,
          chatOpen: true,
          showSavedTripsPicker: true,
          isLoadingTripPicker: true,
          tripPickerPage: 2,
          tripPickerTotalPages: 3,
          paginatedTrips: [],
        }}
        dispatch={dispatch}
        userProfile={{ location: "Delhi" }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={{ current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } }}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );
    expect(screen.getByText(/Loading saved trip plans/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Prev$/i })).toBeDisabled();
    expect((await axe(container)).violations).toEqual([]);

    rerender(
      <ChatWidget
        state={{
          ...initialChatState,
          chatOpen: true,
          showSavedTripsPicker: true,
          isLoadingTripPicker: false,
          tripPickerPage: 2,
          tripPickerTotalPages: 3,
          paginatedTrips: [],
        }}
        dispatch={dispatch}
        userProfile={{ location: "Delhi" }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={{ current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } }}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Prev$/i }));
    expect(onFetchPaginatedTrips).toHaveBeenCalledWith(1);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("ChatWidget covers closed launcher state, saved-trips open fetch, drag-click suppression, focus trap wrap, and planning prompt action", async () => {
    const dispatch = vi.fn<(action: ChatAction) => void>();
    const onFetchPaginatedTrips = vi.fn();
    const onSendChat = vi.fn();

    const { container, rerender } = render(
      <ChatWidget
        state={{ ...initialChatState, chatOpen: false }}
        dispatch={dispatch}
        userProfile={{ location: "" }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={{ current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } }}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Open VayuPulse AI Chat/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "TOGGLE_OPEN" });
    expect((await axe(container)).violations).toEqual([]);

    const chipsDragRef = { current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } };
    rerender(
      <ChatWidget
        state={{
          ...initialChatState,
          chatOpen: true,
          planningAssistMode: false,
          showSavedTripsPicker: false,
          selectedChatTrip: { _id: "t-untitled", title: "Agra → Mathura", places: "Agra, Mathura", dates: "2026-12-10" },
          messages: [
            { sender: "ai", text: "Need a trip check?", time: "09:00", suggestPlanningMode: true },
          ],
        }}
        dispatch={dispatch}
        userProfile={{ location: "Delhi, India", aqi: 210 }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={chipsDragRef}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );

    // Dragging the chip rail suppresses chip click
    const toolbar = screen.getByRole("toolbar", { name: /Quick chat suggestions/i });
    const downEv = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(downEv, "pageX", { value: 0 });
    fireEvent(toolbar, downEv);
    const moveEv = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(moveEv, "pageX", { value: 25 });
    fireEvent(toolbar, moveEv);
    expect(chipsDragRef.current.didDrag).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Open windows\?/i }));
    expect(onSendChat).not.toHaveBeenCalled();

    // Clicking Saved Trips while closed opens picker and triggers fetch(1)
    fireEvent.click(screen.getByRole("button", { name: /Saved Trips/i }));
    expect(onFetchPaginatedTrips).toHaveBeenCalledWith(1);

    // Clicking Open Planning Assist Mode from AI suggestion
    fireEvent.click(screen.getByRole("button", { name: /Open Planning Assist Mode/i }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_PLANNING_MODE",
      enabled: true,
      showWizard: true,
      addingTrip: true,
    });

    // Selected untitled trip fallback + Tab wrap in open Planning Assist modal
    rerender(
      <ChatWidget
        state={{
          ...initialChatState,
          chatOpen: true,
          planningAssistMode: true,
          showPlanningWizard: true,
          showSavedTripsPicker: true,
          selectedChatTrip: { _id: "t-untitled", title: "Agra → Mathura", places: "Agra, Mathura", dates: "2026-12-10" },
          paginatedTrips: [
            {
              _id: "t-untitled",
              destinations: [
                { name: "Agra", fullName: "Agra, UP", lat: 27.17, lng: 78.0, usAqi: 180, pm25: 90, pm10: 140, no2: 30, ozone: 25, categoryLabel: "Unhealthy" },
              ],
              startDate: "2026-12-10",
              startTime: "08:00",
              endDate: "2026-12-11",
            } as unknown as ChatState["paginatedTrips"][number],
          ],
        }}
        dispatch={dispatch}
        userProfile={{ location: "Delhi, India" }}
        aiPlan={null}
        isGeneratingTripPlan={false}
        chatFileInputRef={{ current: null }}
        chatLauncherRef={{ current: null }}
        chatTextareaRef={{ current: null }}
        chatChipsRef={{ current: null }}
        chipsDragStateRef={{ current: { isDown: false, startX: 0, scrollLeft: 0, didDrag: false } }}
        onFetchPaginatedTrips={onFetchPaginatedTrips}
        onSelectImage={vi.fn()}
        onSendChat={onSendChat}
        onSubmitTripPlanFromChat={vi.fn()}
      />
    );
    expect(screen.getByText("Selected")).toBeInTheDocument();
    const planningDialog = screen.getByRole("dialog", { name: /Planning Assist Mode/i });
    const focusableInWizard = planningDialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusableInWizard[focusableInWizard.length - 1]?.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(focusableInWizard[0]);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(focusableInWizard[focusableInWizard.length - 1]);
  });
});
