"use client";

import { MaterialCircularProgress } from "@/components/MaterialLoader";
import type { ChatMessageItem } from "@/types/airPlan";

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  planningAssistMode: boolean;
  onOpenPlanningAssist: () => void;
  isAiReplying: boolean;
  isGeneratingTripPlan: boolean;
  selectedChatTripPlaces?: string;
  locationName?: string;
}

export default function ChatMessageList({
  messages,
  planningAssistMode,
  onOpenPlanningAssist,
  isAiReplying,
  isGeneratingTripPlan,
  selectedChatTripPlaces,
  locationName,
}: ChatMessageListProps) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Chat messages"
      className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-surface-container-lowest"
    >
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-start gap-2.5 max-w-[88%] ${
            msg.sender === "user" ? "self-end flex-row-reverse" : "self-start"
          }`}
        >
          {msg.sender === "ai" && (
            <div
              aria-hidden="true"
              className="w-7 h-7 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div
              className={`px-4 py-3 text-xs leading-relaxed whitespace-pre-line flex flex-col gap-2 ${
                msg.sender === "user"
                  ? "bg-primary-container text-on-primary rounded-[20px] rounded-br-[6px] shadow-xs"
                  : "bg-surface-container text-on-surface rounded-[20px] rounded-tl-[6px]"
              }`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt={
                    msg.text
                      ? `Photo you attached: ${msg.text.slice(0, 60)}`
                      : "Photo you attached to your message"
                  }
                  className="max-h-40 w-auto rounded-xl object-cover border border-white/20"
                />
              )}
              <span>{msg.text}</span>
              {msg.sender === "ai" && msg.suggestPlanningMode && !planningAssistMode && (
                <button
                  type="button"
                  onClick={onOpenPlanningAssist}
                  className="mt-1 self-start px-3 py-1.5 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                    calendar_month
                  </span>
                  <span>Open Planning Assist Mode</span>
                </button>
              )}
            </div>
            <div
              className={`flex items-center gap-1.5 text-xs text-on-surface-variant px-1.5 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <span>{msg.time}</span>
              {msg.tag && (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="font-medium text-on-surface-variant">{msg.tag}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {(isAiReplying || isGeneratingTripPlan) && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2.5 self-start max-w-[88%] animate-fade-in"
        >
          <div className="w-7 h-7 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <MaterialCircularProgress size={16} strokeWidth={5} />
          </div>
          <div className="px-4 py-2.5 rounded-[20px] rounded-tl-[6px] bg-surface-container text-xs text-on-surface-variant font-medium flex items-center gap-2">
            <span>
              {isGeneratingTripPlan
                ? "Building your Trip & Outdoor Air Plan..."
                : selectedChatTripPlaces
                  ? `Checking live air quality for ${selectedChatTripPlaces}...`
                  : `Checking ${locationName ? locationName.split(",")[0] : "local"} air telemetry...`}
            </span>
            <span aria-hidden="true" className="inline-flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.1s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
