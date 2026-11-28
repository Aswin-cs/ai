import type { SavedTripPlanRecord } from "@/lib/api";
import type { ChatMessageItem } from "@/types/airPlan";

export interface ChatImageAttachment {
  data: string;
  mimeType: string;
  name: string;
  size: number;
}

export interface SelectedChatTrip {
  _id: string;
  title: string;
  places: string;
  dates: string;
}

export interface ChatState {
  chatOpen: boolean;
  chatExpanded: boolean;
  messages: ChatMessageItem[];
  input: string;
  image: ChatImageAttachment | null;
  imageError: string | null;
  isReplying: boolean;
  planningAssistMode: boolean;
  showPlanningWizard: boolean;
  isAddingNewTrip: boolean;
  showSavedTripsPicker: boolean;
  paginatedTrips: SavedTripPlanRecord[];
  tripPickerPage: number;
  tripPickerTotalPages: number;
  tripPickerTotal: number;
  isLoadingTripPicker: boolean;
  selectedChatTrip: SelectedChatTrip | null;
}

export type ChatAction =
  | { type: "SET_OPEN"; open: boolean }
  | { type: "TOGGLE_OPEN" }
  | { type: "TOGGLE_EXPANDED" }
  | { type: "SET_INPUT"; input: string }
  | { type: "SET_IMAGE"; image: ChatImageAttachment | null }
  | { type: "SET_IMAGE_ERROR"; error: string | null }
  | { type: "APPEND_MESSAGE"; message: ChatMessageItem }
  | { type: "INIT_GREETING"; message: ChatMessageItem }
  | { type: "START_REPLY"; clearDraft: boolean }
  | { type: "FINISH_REPLY"; reply?: ChatMessageItem }
  | { type: "SET_PLANNING_MODE"; enabled: boolean; showWizard?: boolean; addingTrip?: boolean }
  | { type: "SET_SHOW_WIZARD"; show: boolean }
  | { type: "SET_ADDING_TRIP"; adding: boolean }
  | { type: "SET_SAVED_TRIPS_PICKER_OPEN"; open: boolean }
  | { type: "START_LOADING_TRIP_PICKER" }
  | {
      type: "SET_TRIP_PICKER_DATA";
      trips: SavedTripPlanRecord[];
      page: number;
      totalPages: number;
      total: number;
    }
  | { type: "FINISH_LOADING_TRIP_PICKER" }
  | { type: "SELECT_CHAT_TRIP"; trip: SelectedChatTrip | null };

export const initialChatState: ChatState = {
  chatOpen: false,
  chatExpanded: false,
  messages: [],
  input: "",
  image: null,
  imageError: null,
  isReplying: false,
  planningAssistMode: false,
  showPlanningWizard: false,
  isAddingNewTrip: false,
  showSavedTripsPicker: false,
  paginatedTrips: [],
  tripPickerPage: 1,
  tripPickerTotalPages: 1,
  tripPickerTotal: 0,
  isLoadingTripPicker: false,
  selectedChatTrip: null,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_OPEN":
      return { ...state, chatOpen: action.open };
    case "TOGGLE_OPEN":
      return { ...state, chatOpen: !state.chatOpen };
    case "TOGGLE_EXPANDED":
      return { ...state, chatExpanded: !state.chatExpanded };
    case "SET_INPUT":
      return { ...state, input: action.input };
    case "SET_IMAGE":
      return { ...state, image: action.image, imageError: null };
    case "SET_IMAGE_ERROR":
      return { ...state, imageError: action.error };
    case "APPEND_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "INIT_GREETING":
      if (state.messages.length > 0) return state;
      return { ...state, messages: [action.message] };
    case "START_REPLY":
      return {
        ...state,
        isReplying: true,
        input: action.clearDraft ? "" : state.input,
        image: action.clearDraft ? null : state.image,
        imageError: action.clearDraft ? null : state.imageError,
      };
    case "FINISH_REPLY":
      return {
        ...state,
        isReplying: false,
        messages: action.reply ? [...state.messages, action.reply] : state.messages,
      };
    case "SET_PLANNING_MODE":
      return {
        ...state,
        planningAssistMode: action.enabled,
        showPlanningWizard:
          action.showWizard !== undefined ? action.showWizard : state.showPlanningWizard,
        isAddingNewTrip:
          action.addingTrip !== undefined ? action.addingTrip : state.isAddingNewTrip,
      };
    case "SET_SHOW_WIZARD":
      return { ...state, showPlanningWizard: action.show };
    case "SET_ADDING_TRIP":
      return { ...state, isAddingNewTrip: action.adding };
    case "SET_SAVED_TRIPS_PICKER_OPEN":
      return { ...state, showSavedTripsPicker: action.open };
    case "START_LOADING_TRIP_PICKER":
      return { ...state, isLoadingTripPicker: true };
    case "SET_TRIP_PICKER_DATA":
      return {
        ...state,
        paginatedTrips: action.trips,
        tripPickerPage: action.page,
        tripPickerTotalPages: action.totalPages,
        tripPickerTotal: action.total,
      };
    case "FINISH_LOADING_TRIP_PICKER":
      return { ...state, isLoadingTripPicker: false };
    case "SELECT_CHAT_TRIP":
      return { ...state, selectedChatTrip: action.trip, showSavedTripsPicker: false };
  }
}
