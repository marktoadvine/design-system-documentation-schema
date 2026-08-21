#!/usr/bin/env node
/**
 * check-markdown-mirrors.mjs — Regression guard for the agent-facing
 * markdown mirrors (site/dist/*.md).
 *
 * The `<ds-*>` web components render their real content (title, definition
 * names/descriptions, field names/types) into shadow DOM from attributes —
 * a non-JS fetch of the HTML page sees none of it. The `.md` mirror next to
 * every page exists to carry that data as plain text instead. This script
 * is the backstop: for every schema page, it asserts the generated `.md`
 * actually contains every top-level property name and every def name +
 * field name — the exact data that's otherwise trapped in attributes. If a
 * markdown generator regresses or drifts from the schema, this fails loudly
 * instead of silently shipping an incomplete mirror.
 *
 * Page discovery and def resolution (allOf flattening, `$ref` lookups)
 * reuse the same helpers build-site.js itself calls, so this can't drift
 * into checking a different notion of "every schema page" than what
 * actually gets built.
 *
 * Run via `npm run check:markdown-mirrors`.
 *
 * Exits non-zero if any page is missing its .md mirror or any expected name.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSchemaYaml,
  resolveSchema,
  buildDefIndex,
  ROOT_FILES,
  DEFAULT_SCHEMA_GROUPS,
} from "./render-prop-table.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "schema");
const DIST_DIR = path.join(ROOT, "site", "dist");

function collectSchemaPages() {
  const { schemaById } = buildDefIndex({ schemaDir: SCHEMA_DIR });
  const pages = [];

  function addPage(group, filePath, filename) {
    const raw = loadSchemaYaml(filePath);
    const baseName = filename.replace(/\.schema\.yaml$/, "");
    const slug = group === "root" ? baseName : `${group}-${baseName}`;
    const title = raw.title || baseName;

    // Same shape build-site.js's own discoverPages()/makePage() produces:
    // one "def" per page — the file's own resolved top-level shape, keyed
    // by its title — plus every local $defs entry alongside it.
    const defs = { [title]: resolveSchema(raw, schemaById) };
    for (const [defName, def] of Object.entries(raw.$defs || {})) {
      defs[defName] = def;
    }
    pages.push({ slug, defs });
  }

  for (const filename of ROOT_FILES) {
    const filePath = path.join(SCHEMA_DIR, filename);
    if (fs.existsSync(filePath)) addPage("root", filePath, filename);
  }

  for (const group of DEFAULT_SCHEMA_GROUPS) {
    const dirPath = path.join(SCHEMA_DIR, group);
    if (!fs.existsSync(dirPath)) continue;
    for (const filename of fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".schema.yaml"))
      .sort()) {
      addPage(group, path.join(dirPath, filename), filename);
    }
  }

  return pages;
}

const missingMirror = [];
const missingNames = []; // { slug, kind, name }

const pages = collectSchemaPages();

for (const page of pages) {
  const mdPath = path.join(DIST_DIR, `${page.slug}.md`);
  if (!fs.existsSync(mdPath)) {
    missingMirror.push(page.slug);
    continue;
  }
  const md = fs.readFileSync(mdPath, "utf-8");

  // Every def name (the page's own top-level shape, plus each local
  // $defs entry), and every field name nested inside each.
  for (const [defName, defSchema] of Object.entries(page.defs)) {
    if (!md.includes(defName)) {
      missingNames.push({ slug: page.slug, kind: "def", name: defName });
    }
    for (const fieldName of Object.keys(defSchema.properties || {})) {
      if (!md.includes(fieldName)) {
        missingNames.push({
          slug: page.slug,
          kind: "field",
          name: `${defName}.${fieldName}`,
        });
      }
    }
  }
}

if (missingMirror.length || missingNames.length) {
  if (missingMirror.length) {
    console.error(`\n  ✗ ${missingMirror.length} schema page(s) missing a .md mirror:`);
    for (const s of missingMirror) console.error(`      ${s}.md`);
  }
  if (missingNames.length) {
    console.error(`\n  ✗ ${missingNames.length} name(s) missing from their .md mirror:`);
    for (const m of missingNames) {
      console.error(`      ${m.slug}.md — ${m.kind} "${m.name}"`);
    }
  }
  console.error(
    "\n  This means an agent fetching the page without executing JS would " +
      "not see this data as text — check buildSchemaMarkdown()/" +
      "renderDefinitionMarkdown() in scripts/build-site.js.\n",
  );
  process.exit(1);
}

console.log(`\n  ✓ All ${pages.length} schema page(s) have a .md mirror.`);
console.log("  ✓ Every top-level property, def name, and field name appears in its mirror.\n");
