import "./testAlias";
import test from "node:test";
import assert from "node:assert/strict";
import { chatReducer, initialChatState } from "../hooks/chatReducer";
import { initialOnboardingState, onboardingReducer } from "../hooks/onboardingReducer";

test("chatReducer handles greeting, reply lifecycle, image clearing, and planning mode", () => {
  let state = chatReducer(initialChatState, { type: "SET_OPEN", open: true });
  assert.equal(state.chatOpen, true);

  const greeting = { sender: "ai" as const, text: "Hello", time: "Now" };
  state = chatReducer(state, { type: "INIT_GREETING", message: greeting });
  assert.equal(state.messages.length, 1);
  // INIT_GREETING is idempotent once messages exist
  state = chatReducer(state, { type: "INIT_GREETING", message: greeting });
  assert.equal(state.messages.length, 1);

  state = chatReducer(state, { type: "SET_INPUT", input: "Can I run?" });
  state = chatReducer(state, { type: "START_REPLY", clearDraft: true });
  assert.equal(state.isReplying, true);
  assert.equal(state.input, "");

  state = chatReducer(state, {
    type: "FINISH_REPLY",
    reply: { sender: "ai", text: "Wait until 2 PM.", time: "Now" },
  });
  assert.equal(state.isReplying, false);
  assert.equal(state.messages.length, 2);

  state = chatReducer(state, {
    type: "SET_PLANNING_MODE",
    enabled: true,
    showWizard: true,
    addingTrip: true,
  });
  assert.equal(state.planningAssistMode, true);
  assert.equal(state.showPlanningWizard, true);
  assert.equal(state.isAddingNewTrip, true);
});

test("onboardingReducer manages hydration, vulnerabilities, and custom windows", () => {
  let state = onboardingReducer(initialOnboardingState, {
    type: "HYDRATE_EXISTING_USER",
    locationQuery: "Indiranagar, Bengaluru",
    coords: { lat: 12.97, lng: 77.64 },
    vulnerabilities: ["children"],
    commute: "metro",
    indoorSetup: "natural",
  });
  assert.equal(state.isExistingUser, true);
  assert.equal(state.locationQuery, "Indiranagar, Bengaluru");
  assert.equal(state.commute, "metro");

  state = onboardingReducer(state, { type: "TOGGLE_VULNERABILITY", key: "seniors" });
  assert.deepEqual(state.vulnerabilities, ["children", "seniors"]);
  state = onboardingReducer(state, { type: "TOGGLE_VULNERABILITY", key: "children" });
  assert.deepEqual(state.vulnerabilities, ["seniors"]);

  state = onboardingReducer(state, { type: "SET_CUSTOM_WINDOW_INPUT", value: "Evening gym (6-7 PM)" });
  state = onboardingReducer(state, { type: "ADD_CUSTOM_WINDOW" });
  assert.deepEqual(state.windows.customList, ["Evening gym (6-7 PM)"]);
  assert.equal(state.customWindowInput, "");

  state = onboardingReducer(state, { type: "REMOVE_CUSTOM_WINDOW", index: 0 });
  assert.deepEqual(state.windows.customList, []);
});
