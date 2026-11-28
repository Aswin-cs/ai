import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SOURCE_FONT = "node_modules/material-symbols/material-symbols-outlined.woff2";
const ICON_MANIFEST = "config/icon-names.json";
const OUTPUT_FONT = "app/fonts/material-symbols-subset.woff2";
const MAX_BYTES = 100 * 1024;

function findPython() {
  const candidates = process.env.PYTHON
    ? [process.env.PYTHON]
    : process.platform === "win32"
      ? ["py", "python", "python3"]
      : ["python3", "python"];

  for (const bin of candidates) {
    try {
      execFileSync(bin, ["-c", "import fontTools, brotli"], {
        stdio: "ignore",
        windowsHide: true,
      });
      return bin;
    } catch {
      // Try next Python binary candidate
    }
  }
  throw new Error(
    "Python with fonttools and brotli is required to build the icon font subset. Install with: pip install fonttools brotli"
  );
}

const pyScript = `
import json, os, sys, tempfile
from fontTools import subset
from fontTools.ttLib import TTFont

src_path, manifest_path, out_path, max_bytes = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])

with open(manifest_path, "r", encoding="utf-8") as fh:
    icons = json.load(fh)
icon_set = set(icons)
if not icon_set:
    raise SystemExit("Icon manifest is empty")

font = TTFont(src_path)
cmap = font.getBestCmap() or {}
rev_cmap = {gn: chr(cp) for cp, gn in cmap.items()}

# Prune GSUB ligature tables down to only the exact icon names in config/icon-names.json.
# Without pruning, pyftsubset's GSUB closure pulls all ~3,500 icons that share ASCII [a-z0-9_].
gsub = font["GSUB"].table
for lookup in gsub.LookupList.Lookup:
    for st in lookup.SubTable:
        real_st = getattr(st, "ExtSubTable", st)
        if hasattr(real_st, "ligatures"):
            kept_map = {}
            for first_glyph, lig_list in real_st.ligatures.items():
                first_char = rev_cmap.get(first_glyph)
                if not first_char:
                    continue
                kept = []
                for lig in lig_list:
                    seq = first_char + "".join(rev_cmap.get(g, "") for g in lig.Component)
                    if seq in icon_set:
                        kept.append(lig)
                if kept:
                    kept_map[first_glyph] = kept
            real_st.ligatures = kept_map

os.makedirs(os.path.dirname(out_path), exist_ok=True)
tmp_fd, tmp_ttf = tempfile.mkstemp(suffix=".ttf")
os.close(tmp_fd)
try:
    font.save(tmp_ttf)
    unique_chars = "".join(sorted(set("".join(icon_set))))
    subset.main([
        tmp_ttf,
        "--text=" + unique_chars,
        "--layout-features=liga,rlig,calt",
        "--flavor=woff2",
        "--output-file=" + out_path,
    ])
finally:
    if os.path.exists(tmp_ttf):
        os.remove(tmp_ttf)

# Verify subset font size and confirm every icon name resolves to a GSUB ligature glyph
size_bytes = os.path.getsize(out_path)
if size_bytes >= max_bytes:
    raise SystemExit(f"Subset font too large: {size_bytes} bytes (limit < {max_bytes})")

sub_font = TTFont(out_path)
sub_cmap = sub_font.getBestCmap() or {}
sub_rev = {gn: chr(cp) for cp, gn in sub_cmap.items()}
sub_glyphs = set(sub_font.getGlyphOrder())

resolved = {}
for lookup in sub_font["GSUB"].table.LookupList.Lookup:
    for st in lookup.SubTable:
        real_st = getattr(st, "ExtSubTable", st)
        if hasattr(real_st, "ligatures"):
            for first_glyph, lig_list in real_st.ligatures.items():
                first_char = sub_rev.get(first_glyph)
                if not first_char:
                    continue
                for lig in lig_list:
                    seq = first_char + "".join(sub_rev.get(g, "") for g in lig.Component)
                    if lig.LigGlyph in sub_glyphs:
                        resolved[seq] = lig.LigGlyph

missing = sorted(icon for icon in icon_set if icon not in resolved)
if missing:
    raise SystemExit(f"Missing GSUB ligatures in subset font: {', '.join(missing)}")

axes = [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in sub_font["fvar"].axes] if "fvar" in sub_font else []
print(f"Built {out_path}: {size_bytes} bytes ({len(resolved)}/{len(icon_set)} icons verified, axes={axes})")
`;

const root = process.cwd();
const pyBin = findPython();
const out = execFileSync(
  pyBin,
  [
    "-c",
    pyScript,
    path.join(root, SOURCE_FONT),
    path.join(root, ICON_MANIFEST),
    path.join(root, OUTPUT_FONT),
    String(MAX_BYTES),
  ],
  { encoding: "utf8", windowsHide: true }
);
process.stdout.write(out);

const actualBytes = fs.statSync(path.join(root, OUTPUT_FONT)).size;
if (actualBytes >= MAX_BYTES) {
  throw new Error(`Expected ${OUTPUT_FONT} < ${MAX_BYTES} bytes, got ${actualBytes}`);
}
