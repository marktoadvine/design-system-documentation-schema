/**
 * Shared navigation builder for the DSDS spec site.
 *
 * The site is exactly two pages - index.html (Overview: everything that
 * isn't schema reference) and schema.html (every schema definition, on
 * one page, navigated by hash links) - so there is no per-page routing
 * to discover anymore. This module builds:
 *   - PRIMARY_LINKS: the two site-level links, always shown.
 *   - the "on this page" anchor groups for whichever page is active,
 *     built from the bundled schema's own $defs for schema.html, or a
 *     fixed list for index.html (see OVERVIEW_SECTIONS below).
 *
 * Usage:
 *   const { buildSpecNav } = require("./nav");
 *   const navHtml = buildSpecNav("schema", schemaGroups);
 */

const fs = require("fs");
const path = require("path");

// docs-new/scripts/nav.js -> docs-new/ is the site root; the repo root
// (where schema/ actually lives) is one level further up.
const SITE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA_DIR = path.join(REPO_ROOT, "schema");
const BUNDLED_SCHEMA_PATH = path.join(SCHEMA_DIR, "dsds.bundled.schema.json");
const EXAMPLES_DIR = path.join(REPO_ROOT, "examples");

// Every def key in the bundled schema is either bare (base, shared) or
// "<group>/<name>" (common/ref, sections/guidelines, entries/component,
// metadata/entry-metadata, ...). Group labels for the resulting nav
// clusters on schema.html.
const GROUP_LABELS = {
  core: "Core",
  common: "Common",
  sections: "Sections",
  entries: "Entries",
  metadata: "Metadata",
};

// Stable display order for the "Core" group specifically - base (the
// document itself) before shared (reusable content pointed at from
// entries, structurally separate from the entry graph).
const CORE_ORDER = ["base", "shared"];

// The two site-level pages. Order here is display order in the primary
// nav row.
const PRIMARY_LINKS = [
  { label: "Overview", href: "index.html", slug: "index" },
  { label: "Schema", href: "schema.html", slug: "schema" },
];

// Every piece merged onto the Overview page, in display order - each
// becomes one <ds-def-section> and one "on this page" anchor link.
// Sourced from docs-new/content/*.mdx (plain markdown) and
// docs-new/content/*.yaml (DSDS entries, rendered by walking `sections`).
const OVERVIEW_SECTIONS = [
  { file: "overview.yaml", slug: "overview", label: "Overview" },
  { file: "principles.mdx", slug: "principles", label: "Principles" },
  { file: "humans-and-agents.yaml", slug: "humans-and-agents", label: "Humans & agents" },
  { file: "stability.yaml", slug: "stability", label: "Stability & 1.0" },
  { file: "migration.yaml", slug: "migration", label: "Migration" },
  { file: "architecture.mdx", slug: "architecture", label: "Architecture" },
  { file: "glossary.yaml", slug: "glossary", label: "Glossary" },
];

function esc(text) {
  if (typeof text !== "string") return String(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "common/ref" -> "common-ref"; "node" -> "node" (bare defs need no prefix). */
function defNameToSlug(defName) {
  return defName.replace(/\//g, "-");
}

/** "common/ref" -> "common"; "sections/api" -> "sections"; "node" -> "core". */
function defGroup(defName) {
  const slash = defName.indexOf("/");
  return slash === -1 ? "core" : defName.slice(0, slash);
}

/** "common/ref" -> "ref"; "sections/api" -> "api"; "node" -> "node". */
function defLabel(defName) {
  const slash = defName.indexOf("/");
  return slash === -1 ? defName : defName.slice(slash + 1);
}

function readBundledSchema() {
  if (!fs.existsSync(BUNDLED_SCHEMA_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BUNDLED_SCHEMA_PATH, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Scan the bundled schema's $defs and return a lightweight list of page
 * descriptors sufficient for building schema.html and its nav:
 * { slug, group, groupLabel, defName }.
 */
function discoverSchemaDefs() {
  const schema = readBundledSchema();
  if (!schema) return [];
  const defNames = Object.keys(schema.$defs || {});

  const defs = defNames.map((defName) => ({
    slug: defNameToSlug(defName),
    defName,
    group: defGroup(defName),
    groupLabel: GROUP_LABELS[defGroup(defName)] || defGroup(defName),
  }));

  defs.sort((a, b) => {
    if (a.group === "core" && b.group === "core") {
      return CORE_ORDER.indexOf(a.defName) - CORE_ORDER.indexOf(b.defName);
    }
    return defLabel(a.defName).localeCompare(defLabel(b.defName));
  });

  return defs;
}

/**
 * Group discovered schema defs into the { label, items: [{slug,label}] }
 * shape buildSpecNav's secondary row expects, in the same Core / Entries
 * / Metadata / Common / Sections order the old sidebar used.
 */
function buildSchemaGroups(defs) {
  if (!defs) defs = discoverSchemaDefs();

  const groupOrder = ["core", "entries", "metadata", "common", "sections"];
  const groups = new Map();
  for (const def of defs) {
    if (!groups.has(def.group)) {
      groups.set(def.group, { label: def.groupLabel, items: [] });
    }
    groups.get(def.group).items.push({ slug: def.slug, label: defLabel(def.defName) });
  }

  const orderedKeys = [
    ...groupOrder.filter((g) => groups.has(g)),
    ...[...groups.keys()].filter((g) => !groupOrder.includes(g)),
  ];

  return orderedKeys.map((key) => groups.get(key));
}

/** The Overview page's own "on this page" group - one flat cluster, no sub-grouping. */
function buildOverviewGroups() {
  return [
    {
      label: "On this page",
      items: OVERVIEW_SECTIONS.map((s) => ({ slug: s.slug, label: s.label })),
    },
  ];
}

/**
 * Build the light-DOM children for <ds-spec-nav>: the two primary links,
 * plus the given secondary groups (an array of { label, items }, each
 * item { slug, label }) rendered as anchor links (#slug).
 *
 * @param {string} activeSlug  — "index" or "schema", for primary-link highlight
 * @param {Array}  groups      — secondary "on this page" groups (optional)
 * @returns {string} HTML string of <a> and <ds-nav-group> elements
 */
function buildNavChildren(activeSlug, groups) {
  const lines = [];

  for (const link of PRIMARY_LINKS) {
    lines.push(
      `    <a href="${esc(link.href)}" slug="${esc(link.slug)}">${esc(link.label)}</a>`,
    );
  }

  for (const group of groups || []) {
    lines.push(`    <ds-nav-group label="${esc(group.label)}">`);
    for (const item of group.items) {
      lines.push(`      <a href="#${esc(item.slug)}" slug="${esc(item.slug)}">${esc(item.label)}</a>`);
    }
    lines.push(`    </ds-nav-group>`);
  }

  return lines.join("\n");
}

/**
 * Read the current spec version. The schema itself doesn't pin one
 * (`base.schemaVersion` is just `type: string`, not a `const` — a document
 * declares which version it targets, the schema doesn't dictate a single
 * one), so the single source of truth here is the real example base
 * documents, which all currently target the same in-development version.
 */
function readSpecVersion() {
  try {
    const starterKitPath = path.join(
      EXAMPLES_DIR,
      "base",
      "starter-kit.dsds.yaml",
    );
    const yaml = require("js-yaml");
    const doc = yaml.load(fs.readFileSync(starterKitPath, "utf-8"));
    return doc && doc.schemaVersion ? String(doc.schemaVersion) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Return the complete <ds-spec-nav> block ready to drop into a page <body>.
 *
 * @param {string} activeSlug   — "index" or "schema"
 * @param {Array}  [groups]     — secondary "on this page" groups for this page
 * @param {string} [version]    Override the spec version. When omitted,
 *                               derived from a real example base document.
 * @returns {string}
 */
function buildSpecNav(activeSlug, groups, version) {
  const children = buildNavChildren(activeSlug, groups);
  const v = version || readSpecVersion() || "";
  const navTitle = v
    ? `Design System Doc Schema ${v}`
    : "Design System Doc Schema";

  return (
    `  <ds-spec-nav title="${esc(navTitle)}" title-href="index.html" active="${esc(activeSlug)}">\n` +
    children +
    `\n  </ds-spec-nav>`
  );
}

module.exports = {
  discoverSchemaDefs,
  buildSchemaGroups,
  buildOverviewGroups,
  buildNavChildren,
  buildSpecNav,
  readSpecVersion,
  defNameToSlug,
  defGroup,
  defLabel,
  readBundledSchema,
  PRIMARY_LINKS,
  OVERVIEW_SECTIONS,
  GROUP_LABELS,
  SITE_ROOT,
  REPO_ROOT,
  SCHEMA_DIR,
  BUNDLED_SCHEMA_PATH,
  EXAMPLES_DIR,
};
