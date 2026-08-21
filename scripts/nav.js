/**
 * Shared navigation builder for the DSDS spec site.
 *
 * Discovers schema pages from schema/ and produces the light-DOM
 * children markup expected by <ds-spec-nav>.
 *
 * Usage:
 *   const { buildSpecNav } = require("./nav");
 *   const navHtml = buildSpecNav("index");
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "schema");

// Root-level schema files (schema/base.schema.yaml, schema/shared.schema.yaml)
// that aren't inside one of DIR_GROUPS's subdirectories — they get their own
// "Base" nav group, the same role `documentation`/dsds.schema.json played
// for the old spec/schema/'s root file.
const ROOT_FILES = ["base.schema.yaml", "shared.schema.yaml"];

// Subdirectories of schema/ that become nav groups. `primary`, when set, is
// the group's own open-base file (e.g. entry.schema.yaml, the base every
// kind in entries/ extends) — pinned first in that group's nav list ahead
// of the rest, which stay alphabetical.
const DIR_GROUPS = [
  { dir: "common", label: "Common" },
  { dir: "metadata", label: "Metadata", primary: "metadata" },
  { dir: "entries", label: "Entries", primary: "entry" },
  { dir: "sections", label: "Sections", primary: "section" },
];

// Top-level (non-schema-driven) links that always appear first.
const TOP_LINKS = [
  { label: "Overview", href: "index.html", slug: "index" },
  { label: "Quick start", href: "quickstart.html", slug: "quickstart" },
  { label: "Conformance", href: "conformance.html", slug: "conformance" },
];

function esc(text) {
  if (typeof text !== "string") return String(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Scan schema/ and return a lightweight list of page descriptors
 * sufficient for building the nav: { slug, group, groupLabel, filename }.
 */
function discoverNavPages() {
  const pages = [];

  // Root-level files (base, shared) go into the "Base" group.
  for (const filename of ROOT_FILES) {
    const filePath = path.join(SCHEMA_DIR, filename);
    if (!fs.existsSync(filePath)) continue;
    const baseName = filename.replace(".schema.yaml", "");
    pages.push({
      slug: baseName,
      group: "root",
      groupLabel: "Base",
      filename,
    });
  }

  for (const group of DIR_GROUPS) {
    const dirPath = path.join(SCHEMA_DIR, group.dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".schema.yaml"))
      .sort();

    if (group.primary) {
      const primaryFile = `${group.primary}.schema.yaml`;
      const idx = files.indexOf(primaryFile);
      if (idx > 0) {
        files.splice(idx, 1);
        files.unshift(primaryFile);
      }
    }

    for (const filename of files) {
      const baseName = filename.replace(".schema.yaml", "");
      pages.push({
        slug: `${group.dir}-${baseName}`,
        group: group.dir,
        groupLabel: group.label,
        filename,
      });
    }
  }

  return pages;
}

/**
 * Build the light-DOM children for <ds-spec-nav>.
 *
 * @param {string} activeSlug  — slug of the current page (for active highlight)
 * @param {Array}  [pages]     — page descriptors; auto-discovered when omitted
 * @returns {string} HTML string of <a> and <ds-nav-group> elements
 */
function buildNavChildren(activeSlug, pages) {
  if (!pages) pages = discoverNavPages();

  const lines = [];

  for (const link of TOP_LINKS) {
    lines.push(
      `    <a href="${esc(link.href)}" slug="${esc(link.slug)}">${esc(link.label)}</a>`,
    );
  }

  // Group pages by directory
  const groups = new Map();
  for (const page of pages) {
    if (!page.group) continue;
    if (!groups.has(page.group)) {
      groups.set(page.group, { label: page.groupLabel, pages: [] });
    }
    groups.get(page.group).pages.push(page);
  }

  for (const [, group] of groups) {
    lines.push(`    <ds-nav-group label="${esc(group.label)}">`);
    for (const page of group.pages) {
      const label = page.navLabel || page.filename.replace(".schema.yaml", "");
      lines.push(
        `      <a href="${esc(page.slug)}.html" slug="${esc(page.slug)}">${esc(label)}</a>`,
      );
    }
    lines.push(`    </ds-nav-group>`);
  }

  return lines.join("\n");
}

/**
 * Read the current spec version from `schema/dsds.bundled.schema.json`'s own
 * `$id` (ex: "https://designsystemdocspec.org/v0.20.0/dsds.bundled.schema.json")
 * so the nav title, page <title> tags, and footer text always reflect what
 * the working tree says is current. This is the single source of truth for
 * "what version is the site at" — scripts/bundle.js writes that same `$id`.
 */
function readSpecVersion() {
  try {
    const bundledPath = path.join(SCHEMA_DIR, "dsds.bundled.schema.json");
    const bundled = JSON.parse(fs.readFileSync(bundledPath, "utf-8"));
    const match = /\/v([^/]+)\/dsds\.bundled\.schema\.json$/.exec(bundled.$id || "");
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Return the complete <ds-spec-nav> block ready to drop into a page <body>.
 * The mobile menu toggle is built into <ds-spec-nav> itself, not a
 * separate element.
 *
 * @param {string} activeSlug
 * @param {Array}  [pages]
 * @param {string} [version]  Override the spec version. When omitted,
 *                            derived from dsds.schema.json.
 * @returns {string}
 */
function buildSpecNav(activeSlug, pages, version) {
  const children = buildNavChildren(activeSlug, pages);
  const v = version || readSpecVersion() || "";
  const navTitle = v
    ? `Design System Doc Spec ${v}`
    : "Design System Doc Spec";

  return (
    `  <ds-spec-nav title="${esc(navTitle)}" title-href="index.html" active="${esc(activeSlug)}">\n` +
    children +
    `\n  </ds-spec-nav>`
  );
}

module.exports = {
  discoverNavPages,
  buildNavChildren,
  buildSpecNav,
  readSpecVersion,
  TOP_LINKS,
  DIR_GROUPS,
};
