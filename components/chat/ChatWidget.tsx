"use client";

import { useEffect, useRef, type ChangeEvent, type Dispatch, type FormEvent, type MutableRefObject, type RefObject } from "react";
import { MaterialCircularProgress } from "@/components/MaterialLoader";
import PlanningAssistWizard, { type TripPlanPayload } from "@/components/PlanningAssistWizard";
import type { ChatAction, ChatState } from "@/hooks/chatReducer";
import { getHeroRiskMeta } from "@/lib/airQuality";
import { DEFAULT_COORDS } from "@/lib/constants";
import type { AirPlan, UserProfileState } from "@/types/airPlan";
import ChatInput from "./ChatInput";
import ChatMessageList from "./ChatMessageList";

interface ChatWidgetProps {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  userProfile: UserProfileState;
  aiPlan: AirPlan | null;
  isGeneratingTripPlan: boolean;
  chatFileInputRef: RefObject<HTMLInputElement | null>;
  chatLauncherRef: RefObject<HTMLButtonElement | null>;
  chatTextareaRef: RefObject<HTMLTextAreaElement | null>;
  chatChipsRef: RefObject<HTMLDivElement | null>;
  chipsDragStateRef: MutableRefObject<{
    isDown: boolean;
    startX: number;
    scrollLeft: number;
    didDrag: boolean;
  }>;
  onFetchPaginatedTrips: (page?: number) => void;
  onSelectImage: (e: ChangeEvent<HTMLInputElement>) => void;
  onSendChat: (e?: FormEvent, overrideText?: string, overrideTripPlan?: TripPlanPayload | null) => void;
  onSubmitTripPlanFromChat: (plan: TripPlanPayload) => void;
}

const STANDARD_CHIPS = [
  { label: "Kids outdoor play?", query: "Can kids play outside now?", icon: "child_care" },
  { label: "Open windows?", query: "Safe window to open windows?", icon: "window" },
  { label: "N95 mask needed?", query: "Do I need an N95 mask today?", icon: "masks" },
  { label: "Purifier tonight?", query: "Is air purifier needed tonight?", icon: "air_purifier_gen" },
  { label: "Safe to jog?", query: "Is it safe to jog outdoors?", icon: "directions_run" },
];

const PLANNING_CHIPS = [
  { label: "Plan my day", query: "Plan my entire day around today's 12-hour air quality forecast.", icon: "today" },
  { label: "Kids play schedule", query: "When and how long should I schedule kids outdoor play today?", icon: "child_care" },
  { label: "Errands & commute", query: "Help me schedule my errands and commute to minimize AQI exposure.", icon: "commute" },
  { label: "Windows & purifier", query: "Plan my room ventilation and purifier schedule for the next 12 hours.", icon: "window" },
];

export default function ChatWidget({
  state,
  dispatch,
  userProfile,
  aiPlan,
  isGeneratingTripPlan,
  chatFileInputRef,
  chatLauncherRef,
  chatTextareaRef,
  chatChipsRef,
  chipsDragStateRef,
  onFetchPaginatedTrips,
  onSelectImage,
  onSendChat,
  onSubmitTripPlanFromChat,
}: ChatWidgetProps) {
  const shortLoc = userProfile.location ? userProfile.location.split(",")[0] : "your locality";
  const planningDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.chatOpen || !state.planningAssistMode || !state.showPlanningWizard) return;
    const container = planningDialogRef.current;
    if (!container) return;
    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    getFocusable()[0]?.focus();
    const handleTabTrap = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = getFocusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleTabTrap);
    return () => window.removeEventListener("keydown", handleTabTrap);
  }, [state.chatOpen, state.planningAssistMode, state.showPlanningWizard]);

  return (
    <div id="ai-chat-assistant" className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <div
        id="vayu-chat-dialog"
        role="dialog"
        aria-modal="false"
        aria-labelledby="vayu-chat-title"
        aria-hidden={!state.chatOpen}
        className={`relative ${state.chatExpanded ? "w-[760px] h-[80vh]" : "w-[395px] h-[560px]"} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] bg-surface-container-lowest border border-outline-variant rounded-[28px] shadow-[0_12px_40px_rgba(11,87,208,0.12),0_4px_12px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden mb-3.5 origin-bottom-right will-change-[transform,opacity,width,height] transition-[opacity,transform,visibility,width,height] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          state.chatOpen
            ? "opacity-100 scale-100 translate-y-0 visible pointer-events-auto"
            : "opacity-0 scale-[0.84] translate-y-5 invisible pointer-events-none"
        }`}
      >
        <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div aria-hidden="true" className="w-10 h-10 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-2xl">auto_awesome</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span id="vayu-chat-title" className="text-sm font-bold text-on-surface truncate font-headline">
                VayuPulse AI
              </span>
              <span className="text-xs text-on-surface-variant truncate">
                {userProfile.location
                  ? `${shortLoc} • PM2.5 ${userProfile.pollutants?.pm25 ?? "--"} µg/m³`
                  : "Grounded in live telemetry"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                const aqi = userProfile.aqi ?? 342;
                const aqiDesc = getHeroRiskMeta(aiPlan?.status?.risk_level, aqi).label;
                dispatch({
                  type: "APPEND_MESSAGE",
                  message: {
                    sender: "ai",
                    text: `Session recalibrated for ${shortLoc}. Ambient AQI is ${aqi} (${aqiDesc}), PM2.5 ${userProfile.pollutants?.pm25 ?? 178} µg/m³. Ask any follow-up question.`,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    tag: `${shortLoc} Grounded Live`,
                  },
                });
              }}
              aria-label="Reset conversation"
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Reset Conversation"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">restart_alt</span>
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "TOGGLE_EXPANDED" })}
              aria-label={state.chatExpanded ? "Collapse chat view" : "Expand chat view"}
              aria-pressed={state.chatExpanded}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title={state.chatExpanded ? "Collapse view" : "Expand view"}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                {state.chatExpanded ? "close_fullscreen" : "open_in_full"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "SET_OPEN", open: false });
                chatLauncherRef.current?.focus();
              }}
              aria-label="Close chat"
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Close"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xl">keyboard_arrow_down</span>
            </button>
          </div>
        </div>

        <div
          ref={chatChipsRef}
          role="toolbar"
          aria-label="Quick chat suggestions"
          tabIndex={0}
          onKeyDown={(e) => {
            const el = chatChipsRef.current;
            if (!el) return;
            if (e.key === "ArrowRight") el.scrollBy({ left: 140, behavior: "smooth" });
            if (e.key === "ArrowLeft") el.scrollBy({ left: -140, behavior: "smooth" });
          }}
          onMouseDown={(e) => {
            const el = chatChipsRef.current;
            if (!el) return;
            chipsDragStateRef.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, didDrag: false };
          }}
          onMouseMove={(e) => {
            const st = chipsDragStateRef.current;
            const el = chatChipsRef.current;
            if (!st.isDown || !el) return;
            const walk = e.pageX - el.offsetLeft - st.startX;
            if (Math.abs(walk) > 4) st.didDrag = true;
            if (st.didDrag) {
              e.preventDefault();
              el.scrollLeft = st.scrollLeft - walk;
            }
          }}
          onMouseUp={() => {
            chipsDragStateRef.current.isDown = false;
            setTimeout(() => { chipsDragStateRef.current.didDrag = false; }, 0);
          }}
          onMouseLeave={() => {
            chipsDragStateRef.current.isDown = false;
            chipsDragStateRef.current.didDrag = false;
          }}
          onClickCapture={(e) => {
            if (chipsDragStateRef.current.didDrag) {
              e.preventDefault();
              e.stopPropagation();
              chipsDragStateRef.current.didDrag = false;
            }
          }}
          onWheel={(e) => {
            const el = chatChipsRef.current;
            if (!el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            el.scrollLeft += e.deltaY;
          }}
          className="px-4 py-2.5 bg-surface-container-low/70 border-b border-outline-variant flex items-center gap-2 overflow-x-auto select-none scrollbar-none cursor-grab active:cursor-grabbing"
        >
          <button
            type="button"
            onClick={() => {
              if (!state.planningAssistMode || !state.showPlanningWizard) {
                dispatch({ type: "SET_PLANNING_MODE", enabled: true, showWizard: true, addingTrip: true });
              } else {
                dispatch({ type: "SET_PLANNING_MODE", enabled: false, showWizard: false });
              }
            }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
              state.planningAssistMode
                ? "bg-primary-container text-on-primary border-primary shadow-xs"
                : "bg-primary-fixed/70 hover:bg-primary-fixed text-on-primary-fixed-variant border-primary/30"
            }`}
            title="Toggle Trip & Outdoor Planning Assist"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">calendar_month</span>
            <span>Planning Assist</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !state.showSavedTripsPicker;
              dispatch({ type: "SET_SAVED_TRIPS_PICKER_OPEN", open: next });
              if (next) onFetchPaginatedTrips(1);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
              state.showSavedTripsPicker || state.selectedChatTrip
                ? "bg-primary-container text-on-primary border-primary shadow-xs"
                : "bg-surface-container-lowest hover:bg-primary-fixed/40 text-primary border-primary/30"
            }`}
            title="Pick a saved trip plan from DB to ask about it"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">luggage</span>
            <span>Saved Trips</span>
          </button>

          {state.planningAssistMode && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "SET_ADDING_TRIP", adding: true });
                dispatch({ type: "SET_SHOW_WIZARD", show: !state.showPlanningWizard });
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-primary-fixed/40 text-primary border border-primary/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">map</span>
              <span>{state.showPlanningWizard ? "Hide Setup" : "Trip Setup"}</span>
            </button>
          )}

          {(state.planningAssistMode ? PLANNING_CHIPS : STANDARD_CHIPS).map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onSendChat(undefined, chip.query)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-primary-fixed/40 text-on-surface hover:text-primary border border-outline-variant hover:border-primary/40 text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary">{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {state.showSavedTripsPicker && (
          <div className="bg-surface-container-low border-b border-outline-variant p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-on-surface">
                Select a Saved Trip Plan ({state.tripPickerTotal})
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_SAVED_TRIPS_PICKER_OPEN", open: false })}
                className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Close
              </button>
            </div>
            {state.isLoadingTripPicker ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                <MaterialCircularProgress size={16} strokeWidth={5} />
                <span>Loading saved trip plans...</span>
              </div>
            ) : state.paginatedTrips.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-2">
                No saved trip plans found in database. Create one in Planning Assist first.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {state.paginatedTrips.map((tp) => {
                  const title = tp.plan?.trip_summary?.title || tp.destinations.map((d) => d.name).join(" → ");
                  const places = tp.destinations.map((d) => d.name).join(", ");
                  const dates = `${tp.startDate} ${tp.startTime} → ${tp.endDate}`;
                  const isSelected = state.selectedChatTrip?._id === tp._id;
                  return (
                    <button
                      key={tp._id}
                      type="button"
                      onClick={() => dispatch({ type: "SELECT_CHAT_TRIP", trip: { _id: tp._id, title, places, dates } })}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected ? "bg-primary-fixed/40 border-primary" : "bg-surface-container-lowest hover:bg-primary-fixed/25 border-outline-variant"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">{title}</p>
                        <p className="text-xs text-on-surface-variant truncate">{places} • {dates}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary shrink-0">
                        {isSelected ? "Selected" : "Ask"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {state.tripPickerTotalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={state.tripPickerPage <= 1 || state.isLoadingTripPicker}
                  onClick={() => onFetchPaginatedTrips(state.tripPickerPage - 1)}
                  className="px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant text-xs font-semibold text-on-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="text-xs text-on-surface-variant">
                  Page {state.tripPickerPage} of {state.tripPickerTotalPages}
                </span>
                <button
                  type="button"
                  disabled={state.tripPickerPage >= state.tripPickerTotalPages || state.isLoadingTripPicker}
                  onClick={() => onFetchPaginatedTrips(state.tripPickerPage + 1)}
                  className="px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant text-xs font-semibold text-on-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {state.planningAssistMode && state.showPlanningWizard && (
          <div
            ref={planningDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="planning-assist-title"
            className="absolute inset-0 z-20 bg-surface-container-low flex flex-col overflow-hidden animate-fade-in"
          >
            <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div aria-hidden="true" className="w-9 h-9 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">calendar_month</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span id="planning-assist-title" className="text-sm font-bold text-on-surface truncate font-headline">
                    Planning Assist Mode
                  </span>
                  <span className="text-xs text-on-surface-variant truncate">
                    Pin destinations &amp; dates for your trip plan
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "TOGGLE_EXPANDED" })}
                  aria-label={state.chatExpanded ? "Collapse planning view" : "Expand planning view"}
                  aria-pressed={state.chatExpanded}
                  title={state.chatExpanded ? "Collapse view" : "Expand view"}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    {state.chatExpanded ? "close_fullscreen" : "open_in_full"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "SET_SHOW_WIZARD", show: false })}
                  aria-label="Back to chat"
                  title="Back to Chat"
                  className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant text-on-surface flex items-center justify-center cursor-pointer transition-colors"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
              </div>
            </div>
            <PlanningAssistWizard
              defaultLat={userProfile.coords?.lat ?? DEFAULT_COORDS.lat}
              defaultLng={userProfile.coords?.lng ?? DEFAULT_COORDS.lng}
              defaultLocationName={userProfile.location || DEFAULT_COORDS.label}
              initialPlan={null}
              onCancel={() => dispatch({ type: "SET_SHOW_WIZARD", show: false })}
              onSubmitPlan={(plan) => {
                dispatch({ type: "SET_SHOW_WIZARD", show: false });
                onSubmitTripPlanFromChat(plan);
              }}
            />
          </div>
        )}

        <ChatMessageList
          messages={state.messages}
          planningAssistMode={state.planningAssistMode}
          onOpenPlanningAssist={() =>
            dispatch({ type: "SET_PLANNING_MODE", enabled: true, showWizard: true, addingTrip: true })
          }
          isAiReplying={state.isReplying}
          isGeneratingTripPlan={isGeneratingTripPlan}
          selectedChatTripPlaces={state.selectedChatTrip?.places}
          locationName={userProfile.location}
        />

        <ChatInput
          chatInput={state.input}
          onChangeInput={(input) => dispatch({ type: "SET_INPUT", input })}
          chatImage={state.image}
          chatImageError={state.imageError}
          onDismissImageError={() => dispatch({ type: "SET_IMAGE_ERROR", error: null })}
          onRemoveImage={() => dispatch({ type: "SET_IMAGE", image: null })}
          onSelectFile={onSelectImage}
          selectedChatTrip={state.selectedChatTrip}
          onClearSelectedTrip={() => dispatch({ type: "SELECT_CHAT_TRIP", trip: null })}
          planningAssistMode={state.planningAssistMode}
          isAiReplying={state.isReplying}
          onSubmit={(e) => onSendChat(e)}
          chatFileInputRef={chatFileInputRef}
          chatTextareaRef={chatTextareaRef}
        />
      </div>

      <button
        ref={chatLauncherRef}
        type="button"
        onClick={() => dispatch({ type: "TOGGLE_OPEN" })}
        aria-expanded={state.chatOpen}
        aria-controls="vayu-chat-dialog"
        aria-label={state.chatOpen ? "Close VayuPulse AI Chat" : "Open VayuPulse AI Chat"}
        className={`pointer-events-auto h-14 px-5 rounded-2xl text-on-primary shadow-[0_4px_16px_rgba(11,87,208,0.3)] hover:shadow-[0_6px_20px_rgba(11,87,208,0.4)] flex items-center gap-3 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer active:scale-95 ${
          state.chatOpen ? "bg-primary ring-2 ring-primary-fixed" : "bg-primary-container hover:bg-primary"
        }`}
      >
        <div className="relative flex items-center justify-center" aria-hidden="true">
          <span
            className={`material-symbols-outlined text-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              state.chatOpen ? "rotate-90 scale-90" : "rotate-0 scale-100"
            }`}
          >
            {state.chatOpen ? "close" : "auto_awesome"}
          </span>
          {!state.chatOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim border-2 border-primary-container" />
          )}
        </div>
        <span className="text-sm font-semibold tracking-tight font-headline">
          {state.chatOpen ? "Close Chat" : "Ask VayuPulse"}
        </span>
        <span
          aria-hidden="true"
          className={`material-symbols-outlined text-lg opacity-85 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
            state.chatOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          keyboard_arrow_up
        </span>
      </button>
    </div>
  );
}
