"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { TripPlanPayload } from "@/components/PlanningAssistWizard";
import { getHeroRiskMeta } from "@/lib/airQuality";
import { fetchTripPlansApi, sendChatMessageApi } from "@/lib/api";
import { playAiResponseSound } from "@/lib/sound";
import type { AirPlan, HourlyTimelinePoint, UserProfileState } from "@/types/airPlan";
import { chatReducer, initialChatState } from "./chatReducer";

export function useChat(params: {
  userProfile: UserProfileState;
  aiPlan: AirPlan | null;
  hourlyTimeline: HourlyTimelinePoint[];
  activeTripPlan: TripPlanPayload | null;
}) {
  const { userProfile, aiPlan, hourlyTimeline, activeTripPlan } = params;
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatLauncherRef = useRef<HTMLButtonElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const chatChipsRef = useRef<HTMLDivElement>(null);
  const chipsDragStateRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    didDrag: false,
  });

  // Escape key handling for chat & planning assist modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch({ type: "SET_SAVED_TRIPS_PICKER_OPEN", open: false });
        if (state.chatOpen) {
          if (state.planningAssistMode && state.showPlanningWizard) {
            dispatch({ type: "SET_SHOW_WIZARD", show: false });
          } else {
            dispatch({ type: "SET_OPEN", open: false });
            chatLauncherRef.current?.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.chatOpen, state.planningAssistMode, state.showPlanningWizard]);

  // Initial localized greeting for chat (deferred callback avoids sync setState in effect)
  useEffect(() => {
    if (state.messages.length === 0 && userProfile.location) {
      const loc = userProfile.location.split(",")[0];
      const aqi = userProfile.aqi ?? 342;
      const pm25 = userProfile.pollutants?.pm25 ?? 178;
      const aqiDesc = getHeroRiskMeta(aiPlan?.status?.risk_level, aqi).label;
      const timer = setTimeout(() => {
        dispatch({
          type: "INIT_GREETING",
          message: {
            sender: "ai",
            text: `Namaste! I am VayuPulse AI, calibrated for ${loc}. Current ambient AQI is ${aqi} (${aqiDesc}) with PM2.5 at ${pm25} µg/m³. How can I assist your household's air protection today?`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            tag: `${loc} Grounded Live`,
          },
        });
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    state.messages.length,
    userProfile.location,
    userProfile.aqi,
    userProfile.pollutants?.pm25,
    aiPlan?.status?.risk_level,
  ]);

  const fetchPaginatedTrips = useCallback(async (page = 1) => {
    dispatch({ type: "START_LOADING_TRIP_PICKER" });
    try {
      const data = await fetchTripPlansApi({ page, limit: 3 });
      dispatch({
        type: "SET_TRIP_PICKER_DATA",
        trips: Array.isArray(data.tripPlans) ? data.tripPlans : [],
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
      });
    } catch {
      // Non-critical picker fetch error
    } finally {
      dispatch({ type: "FINISH_LOADING_TRIP_PICKER" });
    }
  }, []);

  const handleChatImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_IMAGE_ERROR", error: null });
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      dispatch({
        type: "SET_IMAGE_ERROR",
        error: "Please select a valid image file (JPG, PNG, WebP).",
      });
      return;
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size >= MAX_BYTES) {
      dispatch({ type: "SET_IMAGE_ERROR", error: "Image must be under 5 MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      dispatch({
        type: "SET_IMAGE",
        image: {
          data: reader.result as string,
          mimeType: file.type || "image/jpeg",
          name: file.name,
          size: file.size,
        },
      });
    };
    reader.onerror = () => {
      dispatch({ type: "SET_IMAGE_ERROR", error: "Failed to read image file." });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSendChat = useCallback(
    async (
      e?: React.FormEvent,
      overrideText?: string,
      overrideTripPlan?: TripPlanPayload | null
    ) => {
      if (e) e.preventDefault();
      const userText = (overrideText || state.input).trim();
      const attachedImage = overrideText ? null : state.image;
      const tripContext = overrideTripPlan !== undefined ? overrideTripPlan : activeTripPlan;
      if ((!userText && !attachedImage && !tripContext) || state.isReplying) return;

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      dispatch({
        type: "APPEND_MESSAGE",
        message: {
          sender: "user",
          text: userText || "Analyze this image",
          time: timeStr,
          imageUrl: attachedImage?.data,
        },
      });

      if (!overrideText && chatTextareaRef.current) {
        chatTextareaRef.current.style.height = "auto";
      }
      dispatch({ type: "START_REPLY", clearDraft: !overrideText });

      try {
        const data = await sendChatMessageApi({
          message: userText,
          mode: state.planningAssistMode ? "planning_assist" : "standard",
          hourlyForecast: hourlyTimeline,
          tripPlan: state.planningAssistMode ? tripContext : null,
          selectedTripPlanId: state.selectedChatTrip?._id || null,
          image: attachedImage
            ? { data: attachedImage.data, mimeType: attachedImage.mimeType }
            : undefined,
          history: state.messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
            time: m.time,
          })),
          location: userProfile.location || "Delhi NCR, India",
          aqi: userProfile.aqi ?? 342,
          pollutants: userProfile.pollutants,
          householdProfile: userProfile.householdProfile,
          safeOutdoorWindow: (aiPlan?.safeOutdoorWindow || aiPlan?.safe_outdoor_window) as
            | AirPlan["safeOutdoorWindow"]
            | undefined,
        });

        playAiResponseSound();
        dispatch({
          type: "FINISH_REPLY",
          reply: {
            sender: "ai",
            text: data.reply || "Analysis complete based on local air telemetry.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            tag:
              data.tag ||
              `${(userProfile.location || "Local").split(",")[0]} • AQI ${userProfile.aqi ?? 342}`,
            suggestPlanningMode: Boolean(data.suggestPlanningMode),
          },
        });
      } catch {
        const locName = (userProfile.location || "your locality").split(",")[0];
        const aqiVal = userProfile.aqi ?? 342;
        const isSevere = aqiVal > 250;
        dispatch({
          type: "FINISH_REPLY",
          reply: {
            sender: "ai",
            text: `Current AQI in ${locName} is ${aqiVal} (${isSevere ? "Elevated / Very Poor" : "Moderate"}). ${
              isSevere
                ? "Vigorous outdoor activities and unvented exposure are not recommended right now due to ground-level particulate concentration. Wait for the afternoon solar expansion window (~1:30 PM–4:00 PM)."
                : "Outdoor conditions are within moderate limits. Ensure sensitive family members wear N95 masks near busy arterial roads."
            }`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            tag: `${locName} Grounded Telemetry`,
          },
        });
      }
    },
    [
      state.input,
      state.image,
      state.isReplying,
      state.planningAssistMode,
      state.selectedChatTrip,
      state.messages,
      activeTripPlan,
      hourlyTimeline,
      userProfile,
      aiPlan,
    ]
  );

  return {
    state,
    dispatch,
    chatFileInputRef,
    chatLauncherRef,
    chatTextareaRef,
    chatChipsRef,
    chipsDragStateRef,
    fetchPaginatedTrips,
    handleChatImageSelect,
    handleSendChat,
  };
}
