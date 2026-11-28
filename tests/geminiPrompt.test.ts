import test from "node:test";
import assert from "node:assert/strict";
import {
  AIR_PLAN_RESPONSE_SCHEMA,
  buildVayuPulsePrompt,
} from "../lib/gemini";

test("buildVayuPulsePrompt normalizes household vulnerabilities, setup, and custom windows", () => {
  const prompt = buildVayuPulsePrompt({
    location: "Indiranagar, Bengaluru",
    aqi: 142,
    pollutants: { pm25: 55.2, pm10: 94.1, no2: 31.4 },
    householdProfile: {
      vulnerabilities: ["young children", "senior citizens", "asthma"],
      commute: "metro_bus",
      indoorSetup: "purifier",
      windows: { morning: true, evening: false, custom: "Afternoon school pickup" },
    },
    language: "kn",
    customPrompt: "Is a 20-minute evening walk okay?",
  });

  assert.ok(prompt.startsWith("INPUT JSON:"));
  const parsed = JSON.parse(prompt.replace("INPUT JSON:\n", ""));
  assert.equal(parsed.location, "Indiranagar, Bengaluru");
  assert.equal(parsed.language, "kn");
  assert.equal(parsed.current_air_quality.us_aqi, 142);
  assert.equal(parsed.household_profile.indoor_setup, "hepa_purifier");
  assert.deepEqual(parsed.household_profile.members, [
    "young_children",
    "senior_citizens",
    "asthma_respiratory",
  ]);
  assert.ok(
    parsed.household_profile.typical_outdoor_windows.includes("Afternoon school pickup")
  );
  assert.equal(parsed.custom_question, "Is a 20-minute evening walk okay?");
});

test("buildVayuPulsePrompt defaults to working_adult and natural_ventilation when empty", () => {
  const prompt = buildVayuPulsePrompt({});
  const parsed = JSON.parse(prompt.replace("INPUT JSON:\n", ""));
  assert.deepEqual(parsed.household_profile.members, ["working_adult"]);
  assert.equal(parsed.household_profile.indoor_setup, "natural_ventilation");
  assert.equal(parsed.language, "en");
});

test("AIR_PLAN_RESPONSE_SCHEMA includes all required top-level plan sections", () => {
  const required = AIR_PLAN_RESPONSE_SCHEMA.required || [];
  for (const field of [
    "status",
    "do_this_now",
    "safe_outdoor_window",
    "member_guidance",
    "daily_routine",
    "roadmap",
    "sustainable_swaps",
    "impact_summary",
    "safety_note",
    "data_confidence",
  ]) {
    assert.ok(required.includes(field), `Missing required field: ${field}`);
  }
});
