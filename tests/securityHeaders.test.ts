import "./testAlias";
import test from "node:test";
import assert from "node:assert/strict";
import nextConfig, { buildContentSecurityPolicy } from "../next.config";

test("next.config.ts configures Content-Security-Policy and baseline security headers", async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(typeof nextConfig.headers, "function");

  const rules = await nextConfig.headers!();
  assert.ok(rules.length > 0);
  const catchAll = rules.find((r) => r.source === "/(.*)");
  assert.ok(catchAll);

  const headerMap = new Map(catchAll.headers.map((h) => [h.key, h.value]));

  const requiredHeaders = [
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Permitted-Cross-Domain-Policies",
    "X-DNS-Prefetch-Control",
    "Content-Security-Policy",
  ];
  for (const key of requiredHeaders) {
    assert.ok(headerMap.get(key), `Expected security header ${key} to be set`);
  }

  assert.equal(headerMap.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headerMap.get("X-Frame-Options"), "SAMEORIGIN");

  const prodCsp = buildContentSecurityPolicy(false);
  assert.ok(prodCsp.includes("default-src 'self'"));
  assert.ok(prodCsp.includes("base-uri 'self'"));
  assert.ok(prodCsp.includes("object-src 'none'"));
  assert.ok(prodCsp.includes("frame-ancestors 'self'"));
  assert.ok(prodCsp.includes("form-action 'self'"));
  assert.ok(prodCsp.includes("https://lh3.googleusercontent.com"));
  assert.ok(prodCsp.includes("https://tile.openstreetmap.org"));
  assert.ok(prodCsp.includes("https://*.tile.openstreetmap.org"));
  assert.ok(prodCsp.includes("https://nominatim.openstreetmap.org"));
  assert.ok(prodCsp.includes("https://air-quality-api.open-meteo.com"));
  assert.ok(!prodCsp.includes("'unsafe-eval'"), "Production CSP must not allow unsafe-eval");

  const devCsp = buildContentSecurityPolicy(true);
  assert.ok(devCsp.includes("'unsafe-eval'"), "Dev CSP includes unsafe-eval for React dev stacktraces");
});
