#!/usr/bin/env node
/**
 * check-markdown-mirrors.mjs — Regression guard for the agent-facing
 * markdown mirror (docs-new/dist/schema.md).
 *
 * The `<ds-*>` web components render their real content (title, definition
 * names/descriptions, field names/types) into shadow DOM from attributes —
 * a non-JS fetch of the HTML page sees none of it. schema.md exists to
 * carry that data as plain text instead. Every def in the bundled schema
 * now lives on this one combined page (see nav.js's defNameToSlug), so
 * this script asserts schema.md, as a whole, contains every def's
 * top-level property name and every nested `$defs` name + field name —
 * the exact data that's otherwise trapped in attributes. If a markdown
 * generator regresses or drifts from the schema, this fails loudly
 * instead of silently shipping an incomplete mirror.
 *
 * Exits non-zero if schema.md is missing, or missing any expected name.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "..", "schema");
const DIST_DIR = path.join(ROOT, "dist");

function collectSchemaDefs() {
  const bundlePath = path.join(SCHEMA_DIR, "dsds.bundled.schema.json");
  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
  return Object.entries(bundle.$defs || {}).map(([defName, data]) => ({
    defName,
    data,
  }));
}

const defs = collectSchemaDefs();
const schemaMdPath = path.join(DIST_DIR, "schema.md");

if (!fs.existsSync(schemaMdPath)) {
  console.error(`\n  ✗ docs-new/dist/schema.md is missing entirely.\n`);
  process.exit(1);
}

const md = fs.readFileSync(schemaMdPath, "utf-8");
const missingNames = []; // { defName, kind, name }

for (const def of defs) {
  if (!md.includes(def.defName)) {
    missingNames.push({ defName: def.defName, kind: "def", name: def.defName });
  }

  // Every top-level property name (base schema, or a def-less schema file).
  for (const propName of Object.keys(def.data.properties || {})) {
    if (!md.includes(propName)) {
      missingNames.push({ defName: def.defName, kind: "property", name: propName });
    }
  }

  // Every nested $defs name, and every field name inside it.
  for (const [nestedDefName, nestedSchema] of Object.entries(def.data.$defs || {})) {
    if (!md.includes(nestedDefName)) {
      missingNames.push({ defName: def.defName, kind: "nested def", name: nestedDefName });
    }
    for (const fieldName of Object.keys(nestedSchema.properties || {})) {
      if (!md.includes(fieldName)) {
        missingNames.push({
          defName: def.defName,
          kind: "field",
          name: `${nestedDefName}.${fieldName}`,
        });
      }
    }
  }
}

const indexMdPath = path.join(DIST_DIR, "index.md");
const indexMissing = !fs.existsSync(indexMdPath);

if (indexMissing || missingNames.length) {
  if (indexMissing) {
    console.error(`\n  ✗ docs-new/dist/index.md is missing entirely.`);
  }
  if (missingNames.length) {
    console.error(`\n  ✗ ${missingNames.length} name(s) missing from schema.md:`);
    for (const m of missingNames) {
      console.error(`      ${m.defName} — ${m.kind} "${m.name}"`);
    }
  }
  console.error(
    "\n  This means an agent fetching the page without executing JS would " +
      "not see this data as text — check buildSchemaDefMarkdown() in " +
      "scripts/build-site.js.\n",
  );
  process.exit(1);
}

console.log(`\n  ✓ index.md and schema.md both exist.`);
console.log(`  ✓ schema.md contains every one of ${defs.length} definitions' property, $defs, and field names.\n`);
