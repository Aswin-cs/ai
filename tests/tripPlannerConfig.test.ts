import test from "node:test";
import assert from "node:assert/strict";
import { Type } from "@google/genai";
import {
  VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION,
  TRIP_PLAN_RESPONSE_SCHEMA,
} from "../lib/tripPlannerConfig";

test("VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION includes core safety and grounding rules", () => {
  assert.match(VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION, /VayuPulse Planner/);
  assert.match(VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION, /seasonal_estimate/);
  assert.match(VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION, /before_trip, during_trip, after_trip/);
  assert.match(VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION, /You are not a doctor/);
  assert.match(VAYUPULSE_PLANNER_SYSTEM_INSTRUCTION, /Output ONLY valid JSON/);
});

test("TRIP_PLAN_RESPONSE_SCHEMA enforces all required top-level sections", () => {
  const expectedRequired = [
    "trip_summary",
    "places_overview",
    "days",
    "alerts",
    "better_options",
    "packing_list",
    "roadmap",
    "impact_summary",
    "assumptions",
    "safety_note",
    "data_confidence",
  ];

  assert.equal(TRIP_PLAN_RESPONSE_SCHEMA.type, Type.OBJECT);
  assert.deepEqual(TRIP_PLAN_RESPONSE_SCHEMA.required, expectedRequired);
  const props = TRIP_PLAN_RESPONSE_SCHEMA.properties;
  assert.ok(props, "Schema should define properties");

  for (const key of expectedRequired) {
    assert.ok(key in props, `Schema missing property: ${key}`);
  }
});

test("TRIP_PLAN_RESPONSE_SCHEMA defines valid enums for risk levels and phases", () => {
  const riskEnum = ["low", "moderate", "high", "severe"];
  const props = TRIP_PLAN_RESPONSE_SCHEMA.properties;
  assert.ok(props);
  assert.deepEqual(
    props.trip_summary?.properties?.overall_risk?.enum,
    riskEnum
  );
  assert.deepEqual(
    props.roadmap?.items?.properties?.phase?.enum,
    ["before_trip", "during_trip", "after_trip"]
  );
  assert.deepEqual(
    props.packing_list?.items?.properties?.priority?.enum,
    ["must", "recommended", "optional"]
  );
});
