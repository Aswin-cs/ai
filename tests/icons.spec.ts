import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractUsedIcons } from "../scripts/collect-icons.mjs";
import { extractWoff2Ligatures } from "../scripts/icon-font-utils.mjs";

const MAX_CI_BYTES = 150 * 1024;
const TARGET_BYTES = 100 * 1024;

describe("Self-hosted Material Symbols subset font", () => {
  it("keeps config/icon-names.json synced with all static and dynamic icon usages", () => {
    const root = process.cwd();
    const manifestPath = path.join(root, "config", "icon-names.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as string[];
    const usedIcons = extractUsedIcons(root);

    expect(manifest).toEqual([...new Set(manifest)].sort());
    const missingFromManifest = usedIcons.filter((name: string) => !manifest.includes(name));
    expect(missingFromManifest).toEqual([]);
  });

  it("includes every used icon as a GSUB ligature in app/fonts/material-symbols-subset.woff2 within size budget", () => {
    const root = process.cwd();
    const fontPath = path.join(root, "app", "fonts", "material-symbols-subset.woff2");
    expect(fs.existsSync(fontPath)).toBe(true);

    const fontBuffer = fs.readFileSync(fontPath);
    expect(fontBuffer.byteLength).toBeGreaterThan(0);
    expect(fontBuffer.byteLength).toBeLessThan(TARGET_BYTES);
    expect(fontBuffer.byteLength).toBeLessThanOrEqual(MAX_CI_BYTES);

    const ligatures = extractWoff2Ligatures(fontBuffer);
    const usedIcons = extractUsedIcons(root);
    const missingGlyphs = usedIcons.filter((name: string) => !ligatures.has(name));
    expect(missingGlyphs).toEqual([]);
  });

  it("wires the subset font cleanly in globals.css without loading the 4 MB package CSS", () => {
    const root = process.cwd();
    const globalsCss = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8");
    const layoutTsx = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");

    expect(globalsCss).toContain('url("./fonts/material-symbols-subset.woff2")');
    expect(globalsCss).toContain("font-display: block");
    expect(layoutTsx).not.toContain("material-symbols/outlined.css");
  });
});
