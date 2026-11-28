import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICON_NAME_RE = /^[a-z][a-z0-9_]*$/;
const SOURCE_DIRS = ["app", "components", "hooks", "lib"];

function walkSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(fullPath, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(fullPath);
    }
  }
  return out;
}

/**
 * Extracts all static and dynamic Material Symbols Outlined icon names referenced
 * under app/, components/, hooks/, and lib/.
 */
export function extractUsedIcons(rootDir = process.cwd()) {
  const icons = new Set();
  const files = SOURCE_DIRS.flatMap((dir) => walkSourceFiles(path.join(rootDir, dir)));

  // Matches elements with className containing "material-symbols-outlined" (double-quoted or template string)
  const elementRe =
    /<([A-Za-z][A-Za-z0-9]*)\b[^>]*className=(?:"[^"]*material-symbols-outlined[^"]*"|\{`[^`]*material-symbols-outlined[^`]*`\})[^>]*>([\s\S]*?)<\/\1>/g;

  // Matches object fields or JSX props like `icon: "today"` or `icon="today"`
  const iconPropRe = /\b(?:icon|iconName)\s*[:=]\s*["']([a-z][a-z0-9_]*)["']/g;

  // Matches quoted string literals inside JSX `{...}` expressions
  const quotedLiteralRe = /["']([a-z][a-z0-9_]*)["']/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");

    let elMatch;
    while ((elMatch = elementRe.exec(content)) !== null) {
      const inner = elMatch[2].trim();
      if (!inner) continue;

      if (!inner.includes("{")) {
        const candidate = inner.replace(/\s+/g, " ").trim();
        if (ICON_NAME_RE.test(candidate)) {
          icons.add(candidate);
        }
      } else {
        // Extract any bare text segments outside braces and all string literals inside braces
        const bareText = inner.replace(/\{[\s\S]*?\}/g, " ").trim();
        if (bareText && ICON_NAME_RE.test(bareText)) {
          icons.add(bareText);
        }
        let litMatch;
        while ((litMatch = quotedLiteralRe.exec(inner)) !== null) {
          if (ICON_NAME_RE.test(litMatch[1])) {
            icons.add(litMatch[1]);
          }
        }
      }
    }

    let propMatch;
    while ((propMatch = iconPropRe.exec(content)) !== null) {
      if (ICON_NAME_RE.test(propMatch[1])) {
        icons.add(propMatch[1]);
      }
    }
  }

  return Array.from(icons).sort();
}

export function writeIconManifest(rootDir = process.cwd()) {
  const icons = extractUsedIcons(rootDir);
  const outDir = path.join(rootDir, "config");
  const outPath = path.join(outDir, "icon-names.json");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(icons, null, 2)}\n`, "utf8");
  return { icons, outPath };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { icons, outPath } = writeIconManifest(process.cwd());
  console.log(`Collected ${icons.length} icons -> ${path.relative(process.cwd(), outPath)}:`);
  console.log(icons.join(", "));
}
