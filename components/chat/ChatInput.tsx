"use client";

import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { ChatImageAttachment, SelectedChatTrip } from "@/hooks/chatReducer";

interface ChatInputProps {
  chatInput: string;
  onChangeInput: (val: string) => void;
  chatImage: ChatImageAttachment | null;
  chatImageError: string | null;
  onDismissImageError: () => void;
  onRemoveImage: () => void;
  onSelectFile: (e: ChangeEvent<HTMLInputElement>) => void;
  selectedChatTrip: SelectedChatTrip | null;
  onClearSelectedTrip: () => void;
  planningAssistMode: boolean;
  isAiReplying: boolean;
  onSubmit: (e?: FormEvent) => void;
  chatFileInputRef: RefObject<HTMLInputElement | null>;
  chatTextareaRef: RefObject<HTMLTextAreaElement | null>;
}

export default function ChatInput({
  chatInput,
  onChangeInput,
  chatImage,
  chatImageError,
  onDismissImageError,
  onRemoveImage,
  onSelectFile,
  selectedChatTrip,
  onClearSelectedTrip,
  planningAssistMode,
  isAiReplying,
  onSubmit,
  chatFileInputRef,
  chatTextareaRef,
}: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-3 bg-surface-container-lowest border-t border-outline-variant flex flex-col gap-2"
    >
      <input
        type="file"
        ref={chatFileInputRef}
        accept="image/*"
        aria-label="Upload an image"
        onChange={onSelectFile}
        className="hidden"
      />

      {selectedChatTrip && (
        <div className="flex items-center justify-between gap-2 bg-primary-fixed/50 border border-primary/30 rounded-xl px-3 py-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">
              luggage
            </span>
            <span className="text-xs font-semibold text-on-primary-fixed-variant truncate">
              Asking about: {selectedChatTrip.title} (live AQI checked)
            </span>
          </div>
          <button
            type="button"
            aria-label="Clear selected trip"
            onClick={onClearSelectedTrip}
            className="text-on-primary-fixed-variant hover:text-on-surface text-xs font-bold shrink-0 cursor-pointer"
            title="Clear selected trip"
          >
            ✕
          </button>
        </div>
      )}

      {chatImageError && (
        <div
          role="alert"
          className="px-3 py-1.5 rounded-xl bg-error-container text-on-error-container text-xs font-medium flex items-center justify-between"
        >
          <span>{chatImageError}</span>
          <button
            type="button"
            aria-label="Dismiss image error"
            onClick={onDismissImageError}
            className="ml-2 text-on-error-container hover:opacity-75 cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              close
            </span>
          </button>
        </div>
      )}

      {chatImage && (
        <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-surface-container border border-primary/25">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL, cannot be optimized */}
            <img
              src={chatImage.data}
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-cover border border-outline-variant shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface truncate">
                {chatImage.name}
              </span>
              <span className="text-xs text-on-surface-variant">
                {(chatImage.size / (1024 * 1024)).toFixed(2)} MB • Max 1 image
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Remove attached image"
            onClick={onRemoveImage}
            className="w-7 h-7 rounded-full hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0 cursor-pointer"
            title="Remove image"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              close
            </span>
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5 bg-surface-container focus-within:bg-surface-container-lowest border border-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 focus-within:shadow-xs rounded-3xl pl-2 pr-1.5 py-1.5 transition-all">
        <button
          type="button"
          disabled={isAiReplying}
          onClick={() => chatFileInputRef.current?.click()}
          aria-label="Upload 1 image (max 5 MB)"
          className="w-9 h-9 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          title="Upload 1 image (max 5 MB)"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">
            add_photo_alternate
          </span>
        </button>
        <textarea
          ref={chatTextareaRef}
          rows={1}
          value={chatInput}
          onChange={(e) => {
            onChangeInput(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-label="Ask VayuPulse AI a question"
          placeholder={
            chatImage
              ? "Ask about this image..."
              : planningAssistMode
                ? "Share your plans (e.g., gym at 7 AM, market at 5 PM)..."
                : "Ask about air quality, masks, windows..."
          }
          className="flex-1 min-w-0 bg-transparent text-xs leading-5 text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded placeholder:text-on-surface-variant resize-none py-2 max-h-28 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        />
        <button
          type="submit"
          disabled={isAiReplying || (!chatInput.trim() && !chatImage)}
          aria-label="Send message"
          className="w-9 h-9 rounded-full bg-primary-container hover:bg-primary disabled:bg-primary-fixed disabled:text-on-surface-variant text-on-primary flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          title="Send"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            arrow_upward
          </span>
        </button>
      </div>
    </form>
  );
}
