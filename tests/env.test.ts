import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validateProductionEnv } from "../lib/env";

test("validateProductionEnv reports missing production variables and passes when all are present", () => {
  const devResult = validateProductionEnv({ env: { NODE_ENV: "development" } });
  assert.equal(devResult.ok, true);
  assert.deepEqual(devResult.missing, []);

  const buildResult = validateProductionEnv({
    env: { NODE_ENV: "production", NEXT_PHASE: "phase-production-build" },
  });
  assert.equal(buildResult.ok, true);

  const missingProd = validateProductionEnv({ env: { NODE_ENV: "production" } });
  assert.equal(missingProd.ok, false);
  assert.deepEqual(missingProd.missing, [
    "NEXTAUTH_SECRET",
    "MONGODB_URI",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GEMINI_API_KEY (or GOOGLE_API_KEY)",
  ]);

  assert.throws(
    () => validateProductionEnv({ env: { NODE_ENV: "production" }, throwOnMissing: true }),
    /Missing required production environment variable/
  );

  const validWithGoogleKey = validateProductionEnv({
    env: {
      NODE_ENV: "production",
      NEXTAUTH_SECRET: "secret",
      MONGODB_URI: "mongodb://localhost/test",
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "sec",
      GOOGLE_API_KEY: "gemini",
    },
  });
  assert.equal(validWithGoogleKey.ok, true);
  assert.deepEqual(validWithGoogleKey.missing, []);
});

test(".env.example documents every required placeholder without leaking real credentials", () => {
  const envExamplePath = path.resolve(process.cwd(), ".env.example");
  const content = fs.readFileSync(envExamplePath, "utf8");
  for (const key of [
    "MONGODB_URI=",
    "NEXTAUTH_URL=",
    "NEXTAUTH_SECRET=",
    "GOOGLE_CLIENT_ID=",
    "GOOGLE_CLIENT_SECRET=",
    "GEMINI_API_KEY=",
    "CRON_SECRET=",
    "DATA_GOV_API_KEY=",
  ]) {
    assert.ok(content.includes(key), `Missing ${key} in .env.example`);
  }
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}/.test(content), ".env.example must not contain real API keys");
});
