#!/usr/bin/env node
/**
 * build-site.js — Schema-driven site generator for the DSDS specification.
 *
 * The site is exactly two pages:
 *   - index.html  ("Overview")  — everything that isn't schema reference:
 *     overview, principles, humans & agents, stability, migration,
 *     architecture, glossary. Each piece is its own docs-new/content/*
 *     file (a real DSDS entry, or plain markdown), rendered in a fixed
 *     order and merged into one long page, one <ds-def-section> per piece.
 *   - schema.html ("Schema")    — every definition in
 *     schema/dsds.bundled.schema.json's own $defs, one <ds-def-section>
 *     per def, grouped Core/Entries/Metadata/Common/Sections.
 *
 * Both pages are navigated by hash links to each section - see
 * scripts/nav.js for the top-nav bar that lists them. There is
 * deliberately no third, per-topic page: this file used to emit one HTML
 * page per guide and one per schema def (30 pages total); consolidating
 * onto two pages is what makes an in-page "on this page" nav bar make
 * sense instead of a sidebar tree.
 *
 * Usage:
 *   node docs-new/scripts/build-site.js
 *
 * Output:
 *   docs-new/dist/  — The generated static site
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const {
  buildSpecNav,
  buildSchemaGroups,
  buildOverviewGroups,
  discoverSchemaDefs,
  readSpecVersion,
  defGroup,
  defLabel,
  defNameToSlug,
  OVERVIEW_SECTIONS,
} = require("./nav");
const { renderTemplate } = require("./render-template");
const {
  esc,
  linkToRef,
  escWithCode,
  flattenAllOf,
  describeType: describeTypeShared,
  renderPropertyTable: renderPropertyTableShared,
  renderPropertyTableMarkdown: renderPropertyTableMarkdownShared,
} = require("./render-prop-table");

// MDX compiler (ESM) — loaded dynamically in build()
let compileMdxModule = null;
async function loadMdxCompiler() {
  if (!compileMdxModule) {
    compileMdxModule = await import("./compile-mdx.mjs");
  }
  return compileMdxModule;
}

// docs-new/ doc-entry compiler (ESM) — loaded dynamically in build(). Doc
// pages that are themselves valid DSDS entries (docs-new/*.yaml), rendered
// by walking their `sections` instead of compiling hand-written MDX prose.
let compileDocEntryModule = null;
async function loadDocEntryCompiler() {
  if (!compileDocEntryModule) {
    compileDocEntryModule = await import("./render-doc-entry.mjs");
  }
  return compileDocEntryModule;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SITE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const SITE_URL = "https://designsystemdocspec.org";
const DEFAULT_DESCRIPTION =
  "A machine-readable format for design system documentation. DSDS structures components, tokens, themes, and any other design-system artifact as a single source of truth for humans, parsers, and agents.";
const SCHEMA_DIR = path.join(REPO_ROOT, "schema");
const BUNDLED_SCHEMA_PATH = path.join(SCHEMA_DIR, "dsds.bundled.schema.json");
const CONTENT_DIR = path.join(SITE_ROOT, "content");
const DIST_DIR = path.join(SITE_ROOT, "dist");
const EXAMPLES_DIR = path.join(REPO_ROOT, "examples");
const TEMPLATES_DIR = path.join(SITE_ROOT, "templates");
const PAGE_TEMPLATE_PATH = path.join(TEMPLATES_DIR, "page.template.html");
const SUBTEMPLATES_DIR = path.join(TEMPLATES_DIR, "subtemplates");

function renderSub(name, vars) {
  return renderTemplate(
    path.join(SUBTEMPLATES_DIR, `${name}.template.html`),
    vars,
  ).trim();
}

// ---------------------------------------------------------------------------
// No-JS fallback content (see components/header.js, def-section.js — both
// render from attributes inside a shadow root; the {%fallback%} block is
// plain light-DOM content that only shows up when JS never attached the
// shadow root, so it never duplicates the JS-rendered text).
// ---------------------------------------------------------------------------

function renderHeaderFallback(title, description) {
  let html = `<h1 slot="_fallback">${esc(title)}</h1>`;
  if (description) {
    html += `<p slot="_fallback">${escWithCode(description)}</p>`;
  }
  return html;
}

function renderDefSectionFallback(anchor, name, type, description, source) {
  let html = `<h2 slot="_fallback" id="${esc(anchor)}">${esc(name)}</h2>`;
  if (type || source) {
    html += `<p slot="_fallback">`;
    if (type) html += `<ds-badge variant="kind">${esc(type)}</ds-badge>`;
    if (type && source) html += " · ";
    if (source) html += `<ds-code inline>${esc(source)}</ds-code>`;
    html += `</p>`;
  }
  if (description) {
    html += `<p slot="_fallback">${escWithCode(description)}</p>`;
  }
  return html;
}

/** Wrap arbitrary content HTML in a <ds-def-section> - the one heading +
 * description + body container reused for both an Overview piece and a
 * schema def, so the two pages share the same visual rhythm. */
function renderContentSection(name, anchor, description, contentHtml) {
  return renderSub("def-section", {
    name: esc(name),
    anchor: esc(anchor),
    description_attr: description ? ` description="${esc(description)}"` : "",
    type_attr: "",
    source_attr: "",
    layout_attr: "",
    content: contentHtml,
    fallback: renderDefSectionFallback(anchor, name, "", description),
  });
}

/**
 * Bump every <ds-heading level="N"> in `html` by `delta` (capped at 6).
 * Embedded content (an Overview piece, a doc-entry's own sections) is
 * authored assuming it's the top of its own page - once it's nested one
 * level deeper inside this piece's own <ds-def-section> (which already
 * renders an H2), its own headings need to shift down to match.
 */
function bumpHeadingLevels(html, delta) {
  return html.replace(
    /(<ds-heading\b[^>]*\blevel=")(\d+)(")/g,
    (m, pre, level, post) => `${pre}${Math.min(6, parseInt(level, 10) + delta)}${post}`,
  );
}

// ---------------------------------------------------------------------------
// Schema loading + example discovery
// ---------------------------------------------------------------------------

function readBundledSchema() {
  return JSON.parse(fs.readFileSync(BUNDLED_SCHEMA_PATH, "utf-8"));
}

function readYamlFile(p) {
  return yaml.load(fs.readFileSync(p, "utf-8"));
}

/**
 * Build a lookup of real example content to attach to generated pages:
 *   - one real entry document per entry `kind` (examples/entries/*.yaml)
 *   - the one real base document (starter-kit.dsds.yaml)
 *   - one real section instance per section `kind`, found by scanning
 *     every entry example's own `sections` array
 *
 * Deliberately narrow: common/* leaf shapes aren't auto-matched to an
 * example here (there's no reliable, generic way to find "an instance of
 * common/status" inside an arbitrary entry document without guessing) —
 * their usage is already visible in the property tables of whatever def
 * references them.
 */
function buildExampleIndex() {
  const entriesByKind = {};
  const sectionsByKind = {};
  let baseExample = null;

  const entriesDir = path.join(EXAMPLES_DIR, "entries");
  if (fs.existsSync(entriesDir)) {
    for (const file of fs.readdirSync(entriesDir).filter((f) => f.endsWith(".yaml")).sort()) {
      let doc;
      try {
        doc = readYamlFile(path.join(entriesDir, file));
      } catch {
        continue;
      }
      if (!doc || !doc.kind) continue;
      if (!entriesByKind[doc.kind]) entriesByKind[doc.kind] = doc;
      for (const section of doc.sections || []) {
        if (section && section.kind && !sectionsByKind[section.kind]) {
          sectionsByKind[section.kind] = section;
        }
      }
    }
  }

  const baseDir = path.join(EXAMPLES_DIR, "base");
  const starterKitPath = path.join(baseDir, "starter-kit.dsds.yaml");
  if (fs.existsSync(starterKitPath)) {
    try {
      baseExample = readYamlFile(starterKitPath);
      for (const entry of baseExample.entries || []) {
        for (const section of entry.sections || []) {
          if (section && section.kind && !sectionsByKind[section.kind]) {
            sectionsByKind[section.kind] = section;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return { entriesByKind, sectionsByKind, baseExample };
}

/**
 * Synthesize a representative example value for a schema fragment, used
 * as a fallback for defs that have no real example document in
 * examples/ to point at (mainly common/* and metadata/*). Prefers, in
 * order: the fragment's own `example` annotation (every leaf/property in
 * the schema carries one, see schema/**\/*.schema.yaml's `example` fields);
 * a $ref's target def, resolved and recursed into; an object built from
 * each property's own synthesized example; a single-item array for
 * `items`; the first `enum`/`const` value; a bare type-appropriate
 * placeholder as a last resort.
 *
 * `seen` guards against a $ref cycle (none exist today, but a future
 * schema change shouldn't be able to hang the build).
 */
function synthesizeExample(schemaNode, defs, seen = new Set()) {
  if (!schemaNode || typeof schemaNode !== "object") return null;

  if (schemaNode.$ref) {
    const defName = linkToRef(schemaNode.$ref);
    if (defName && !seen.has(defName) && defs[defName]) {
      return synthesizeExample(defs[defName], defs, new Set(seen).add(defName));
    }
    return null;
  }

  if (Array.isArray(schemaNode.allOf)) {
    return synthesizeExample(flattenAllOf(schemaNode), defs, seen);
  }

  if (schemaNode.example !== undefined) return schemaNode.example;
  if (schemaNode.const !== undefined) return schemaNode.const;
  if (schemaNode.enum) return schemaNode.enum[0];

  // `properties` takes priority over oneOf/anyOf: a def like
  // sections/section carries real `properties` alongside an `anyOf` that's
  // just an "at least one of items/freeform" validation constraint, not a
  // discriminated shape alternative — build from the properties it
  // actually has rather than that constraint's own (property-less)
  // branches.
  if (schemaNode.properties) {
    const obj = {};
    for (const [key, propSchema] of Object.entries(schemaNode.properties)) {
      const val = synthesizeExample(propSchema, defs, seen);
      if (val !== null) obj[key] = val;
    }
    return obj;
  }

  if (schemaNode.oneOf) return synthesizeExample(schemaNode.oneOf[0], defs, seen);
  if (schemaNode.anyOf) return synthesizeExample(schemaNode.anyOf[0], defs, seen);

  if (schemaNode.type === "array") {
    const item = synthesizeExample(schemaNode.items || {}, defs, seen);
    return item === null ? [] : [item];
  }

  if (schemaNode.type === "object") return {};

  switch (schemaNode.type) {
    case "string":
      return "";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return true;
    default:
      return null;
  }
}

/**
 * Auto-discover every schema def as a section descriptor for schema.html.
 * Returns an array of { slug, title, group, groupLabel, defName, data, example }.
 */
function discoverSchemaSections(exampleIndex) {
  const schema = readBundledSchema();
  const sections = [];

  for (const [defName, defSchema] of Object.entries(schema.$defs || {})) {
    const group = defGroup(defName);
    const groupLabel = { core: "Core", common: "Common", sections: "Sections", entries: "Entries", metadata: "Metadata" }[group] || group;
    let example = null;
    if (defName === "base") {
      example = exampleIndex.baseExample;
    } else if (defName.startsWith("sections/")) {
      example = exampleIndex.sectionsByKind[defLabel(defName)] || null;
    } else if (defName.startsWith("entries/")) {
      example = exampleIndex.entriesByKind[defLabel(defName)] || null;
    }

    // Every def gets an example, real or synthesized — see
    // synthesizeExample() above.
    if (example === null || example === undefined) {
      example = synthesizeExample(defSchema, schema.$defs);
    }

    sections.push({
      slug: defNameToSlug(defName),
      title: defSchema.title || defLabel(defName),
      group,
      groupLabel,
      defName,
      data: defSchema,
      example,
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

/** Every def lives on schema.html now - the index just needs each def's
 * anchor (for cross-refs) and description (for a `$ref`'s inherited
 * description when a property gives none of its own). */
function buildDefIndex(sections) {
  const index = {};
  for (const section of sections) {
    index[section.defName] = {
      pageSlug: "schema",
      anchor: section.slug,
      description: section.data.description || "",
    };
  }
  return index;
}

let DEF_INDEX = {};

function describeType(prop) {
  return describeTypeShared(prop, DEF_INDEX);
}

function renderPropertyTable(defSchema, opts) {
  return renderPropertyTableShared(defSchema, DEF_INDEX, opts);
}

function renderPropertyTableMarkdown(defSchema, opts) {
  return renderPropertyTableMarkdownShared(defSchema, DEF_INDEX, opts);
}

// ---------------------------------------------------------------------------
// Definition rendering — one <ds-def-section> per bundled-schema $def
// ---------------------------------------------------------------------------

/**
 * Collect every cross-def $ref target referenced anywhere inside a def
 * (nested arbitrarily deep — e.g. a `part`-tagged anyOf branch three
 * levels inside `items`).
 */
function collectRefs(obj, seen = new Set()) {
  if (Array.isArray(obj)) {
    for (const item of obj) collectRefs(item, seen);
  } else if (obj !== null && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      if (key === "$ref" && typeof value === "string") {
        const name = linkToRef(value);
        if (name) seen.add(name);
      } else {
        collectRefs(value, seen);
      }
    }
  }
  return [...seen];
}

function renderDefinition(defName, rawSchema, exampleData) {
  const hid = defNameToSlug(defName);
  const content = [];
  const defSchema = flattenAllOf(rawSchema);

  // Bare oneOf at the def's own top level (only common/showcase today).
  if (rawSchema.oneOf && !rawSchema.allOf) {
    const items = rawSchema.oneOf.map((alt) => {
      if (alt.type === "object") {
        return `<li><strong>object</strong>${alt.description ? ` — ${esc(alt.description)}` : ""}` +
          (alt.properties ? renderPropertyTable(alt) : "") + "</li>";
      }
      return `<li>${describeType(alt)}</li>`;
    });
    content.push(renderSub("oneof-alternatives", { items: items.join("\n") }));
  }

  // Bare leaf type (a string with a pattern/enum/format, no properties —
  // common/id, common/markdown, common/since, common/requirement-level).
  if (defSchema.type === "string" && !defSchema.properties) {
    if (defSchema.enum) {
      const items = defSchema.enum
        .map((val) => `<li><ds-code inline>${esc(String(val))}</ds-code></li>`)
        .join("\n");
      content.push(renderSub("enum-values", { items }));
    }
    if (defSchema.pattern) {
      content.push(
        renderSub("callout-warning", {
          label: "Pattern",
          message: `Values must match <ds-code inline>${esc(defSchema.pattern)}</ds-code>.`,
        }),
      );
    }
  }

  // Property table
  if (defSchema.properties) {
    content.push(renderPropertyTable(defSchema));
  }

  // additionalProperties with no properties — a def whose whole top-level
  // shape is an open map, rather than a fixed set of named properties.
  if (
    !defSchema.properties &&
    defSchema.additionalProperties &&
    typeof defSchema.additionalProperties === "object"
  ) {
    content.push(
      renderSub("additional-properties", {
        value_type: esc(defSchema.additionalProperties.type || "any"),
      }),
    );
  }

  // Example — render the matching real example if one was provided
  if (exampleData !== undefined && exampleData !== null) {
    content.push(
      renderSub("example", { json: esc(JSON.stringify(exampleData, null, 2)) }),
    );
  }

  const relPath = `schema/${defName}.schema.yaml`;

  return renderSub("def-section", {
    name: esc(defLabel(defName)),
    anchor: hid,
    description_attr: rawSchema.description
      ? ` description="${esc(rawSchema.description)}"`
      : "",
    type_attr: defSchema.type ? ` type="${esc(defSchema.type)}"` : "",
    source_attr: ` source="${esc(relPath)}"`,
    layout_attr: ' layout="split"',
    content: content.join("\n"),
    fallback: renderDefSectionFallback(hid, defLabel(defName), defSchema.type, rawSchema.description, relPath),
  });
}

// ---------------------------------------------------------------------------
// Markdown mirrors
// ---------------------------------------------------------------------------

function buildSchemaDefMarkdown(section) {
  const relPath = `schema/${section.defName}.schema.yaml`;
  const flat = flattenAllOf(section.data);
  const lines = [`## ${section.defName}`, ""];
  if (section.data.description) lines.push(section.data.description, "");
  lines.push(`Source: \`${relPath}\``, "");

  if (flat.type === "string" && !flat.properties) {
    if (flat.enum) {
      lines.push("Allowed values:", "");
      for (const val of flat.enum) lines.push(`- \`${val}\``);
      lines.push("");
    }
    if (flat.pattern) {
      lines.push(`Pattern: \`${flat.pattern}\``, "");
    }
  }

  if (flat.properties) {
    const table = renderPropertyTableMarkdown(flat);
    if (table) lines.push(table, "");
  }

  const refs = collectRefs(section.data);
  if (refs.length > 0) {
    const refLinks = refs.map((refName) => {
      const target = DEF_INDEX[refName];
      return target ? `[${refName}](${target.pageSlug}.md#${target.anchor})` : `\`${refName}\``;
    });
    lines.push(`**References:** ${refLinks.join(", ")}`, "");
  }

  if (section.example !== undefined && section.example !== null) {
    lines.push("**Example:**", "", "```yaml", yaml.dump(section.example).trimEnd(), "```", "");
  }

  // Full schema JSON, compact (no pretty-print indentation) — this is what
  // actually guarantees every nested $defs name and field name (a local
  // "#/$defs/x" ref's own shape, never expanded into its own property
  // table above) shows up as text for a non-JS reader, not just what's
  // reachable through this def's own top-level properties.
  lines.push("**Full schema:**", "", "```json", JSON.stringify(section.data), "```", "");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// <link rel="alternate"> + JSON-LD
// ---------------------------------------------------------------------------

function buildAlternateLinks(activeSlug, pageType, version) {
  const links = [
    `  <link rel="alternate" type="text/markdown" href="${esc(activeSlug)}.md">`,
  ];
  if (pageType === "schema") {
    links.push(
      `  <link rel="alternate" type="application/schema+json" href="${SITE_URL}/v${esc(version)}/dsds.bundled.schema.json">`,
    );
  }
  return links.join("\n");
}

function buildJsonLd({ name, description, url, version, pageType, activeSlug, defNames }) {
  const data = {
    "@context": "https://schema.org",
    "@type": pageType === "schema" ? "APIReference" : "TechArticle",
    name,
    description,
    url,
    version,
    isPartOf: {
      "@type": "WebSite",
      name: "Design System Doc Schema",
      url: `${SITE_URL}/`,
    },
    sameAs: `${SITE_URL}/${activeSlug}.md`,
  };
  if (pageType === "schema") {
    data.subjectOf = `${SITE_URL}/v${version}/dsds.bundled.schema.json`;
  }
  if (defNames && defNames.length) {
    data.hasPart = defNames.map((defName) => ({
      "@type": "DefinedTerm",
      name: defName,
      url: `${url}#${defNameToSlug(defName)}`,
    }));
  }
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `  <script type="application/ld+json">${json}</script>`;
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

function pageHtml(
  title,
  activeSlug,
  headerHtml,
  contentHtml,
  navGroups,
  layout,
  version,
  description,
  pageType = "guide",
  defNames,
) {
  const layoutCls = layout === "full" ? " content--full" : "";
  const contentCls = "content" + layoutCls;

  const v = version || readSpecVersion() || "";
  const titleHasVersion = v && title.includes(v);
  const titleSuffix = v && !titleHasVersion ? ` — DSDS ${v}` : "";

  const pageUrl =
    activeSlug === "index" ? `${SITE_URL}/` : `${SITE_URL}/${activeSlug}`;
  const desc = description || DEFAULT_DESCRIPTION;
  const fullTitle = `${title}${titleSuffix}`;

  const head = renderSub("head", {
    title: esc(fullTitle),
    description: esc(desc),
    canonical: pageUrl,
    version: esc(v),
    alternates: buildAlternateLinks(activeSlug, pageType, v),
    jsonld: buildJsonLd({
      name: fullTitle,
      description: desc,
      url: pageUrl,
      version: v,
      pageType,
      activeSlug,
      defNames,
    }),
  });
  const main = renderSub("main", {
    content_class: contentCls,
    header: headerHtml,
    content: contentHtml,
    back_to_top: renderSub("back-to-top", {}),
  });

  return renderTemplate(PAGE_TEMPLATE_PATH, {
    head,
    nav: buildSpecNav(activeSlug, navGroups, v),
    main,
  });
}

// ---------------------------------------------------------------------------
// Agent/crawler-facing indexes
// ---------------------------------------------------------------------------

function buildSitemapXml(entries) {
  const urls = entries
    .map((e) => {
      let lastmod = "";
      if (e.sourcePath && fs.existsSync(e.sourcePath)) {
        lastmod = `<lastmod>${fs.statSync(e.sourcePath).mtime.toISOString().slice(0, 10)}</lastmod>`;
      }
      const loc = e.slug === "index" ? `${SITE_URL}/` : `${SITE_URL}/${e.slug}`;
      return `  <url><loc>${loc}</loc>${lastmod}</url>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
}

function buildLlmsTxt({ overviewParts, schemaGroups }, version) {
  const lines = [];
  lines.push(`# Design System Doc Schema (DSDS)`, "");
  lines.push(`> ${DEFAULT_DESCRIPTION}`, "");
  lines.push(
    "This site is two pages: Overview (/, everything that isn't schema " +
      "reference) and Schema (/schema, every definition). Each has a " +
      "plain-markdown mirror at the same path with a `.md` extension " +
      "(/index.md, /schema.md) — the full content as text, no HTML/JS to " +
      "parse. Both list their own sections below with `#anchor` links " +
      "straight to that part of the page. The bundled schema JSON is the " +
      "single-file version of everything on the Schema page.",
  );
  lines.push("");
  lines.push("## Machine-readable schema", "");
  lines.push(
    `- [manifest.json](${SITE_URL}/manifest.json): the typed machine index — every entry kind, the section kinds it accepts, and links to its page/markdown/schema/example. Start here.`,
  );
  lines.push(`- [Bundled schema, v${version}](${SITE_URL}/v${version}/dsds.bundled.schema.json): every definition in one JSON file`);
  lines.push(`- [llms-full.txt](${SITE_URL}/llms-full.txt): both pages' full text plus the bundled schema, in one file for one-request ingestion`);
  lines.push(`- [sitemap.xml](${SITE_URL}/sitemap.xml): every page on this site`);
  lines.push("");
  lines.push(`## Overview (${SITE_URL}/, markdown: ${SITE_URL}/index.md)`, "");
  for (const part of overviewParts) {
    lines.push(`- [${part.title}](${SITE_URL}/#${part.slug}): ${part.description}`);
  }
  lines.push("");
  lines.push(`## Schema (${SITE_URL}/schema, markdown: ${SITE_URL}/schema.md)`, "");
  for (const group of schemaGroups) {
    lines.push(`### ${group.label}`, "");
    for (const item of group.items) {
      lines.push(`- [${item.label}](${SITE_URL}/schema#${item.slug})`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function buildLlmsFullTxt({ overviewMarkdown, schemaMarkdown }, bundledSchema, version) {
  const lines = [`# Design System Doc Schema (DSDS) — full text`, ""];
  lines.push(`> ${DEFAULT_DESCRIPTION}`, "");
  lines.push(
    "Everything needed to understand DSDS in one file: the Overview page, " +
      "then the Schema page (every entry, section, and shared definition), " +
      "then the complete bundled JSON Schema.",
    "",
  );
  lines.push("## Overview", "", overviewMarkdown.trim(), "", "---", "");
  lines.push("## Schema", "", schemaMarkdown.trim(), "", "---", "");
  lines.push(`## Bundled schema (v${version})`, "", "```json", JSON.stringify(bundledSchema, null, 2), "```", "");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/**
 * manifest.json — the typed machine index; the first file an agent should
 * fetch. Entry kinds come from entry.schema.yaml's own `kind` enum; every
 * kind accepts every section kind (there is no placement gate — see
 * section.schema.yaml's own $comment) — the same fact tools/validate.js's
 * dispatch relies on, so this can't drift from real validation behavior.
 */
function buildManifest(version) {
  const schema = readBundledSchema();
  const entryKinds = (schema.$defs["entries/entry"].properties.kind.oneOf?.[0]?.enum || []).slice();

  const sectionDefs = Object.entries(schema.$defs).filter(([name]) => name.startsWith("sections/"));
  const allSectionKinds = sectionDefs.map(([, def]) => def.allOf?.[1]?.properties?.kind?.const).filter(Boolean).sort();

  const entryDefs = new Set(
    Object.keys(schema.$defs)
      .filter((name) => name.startsWith("entries/") && name !== "entries/entry")
      .map((name) => defLabel(name)),
  );

  const entries = entryKinds.sort().map((kind) => {
    const hasOwnDef = entryDefs.has(kind);
    const anchor = hasOwnDef ? `entries-${kind}` : "entries-entry";
    return {
      kind,
      page: `${SITE_URL}/schema#${anchor}`,
      markdown: `${SITE_URL}/schema.md#${anchor}`,
      schema: `${SITE_URL}/v${version}/dsds.bundled.schema.json`,
      acceptsSections: allSectionKinds,
    };
  });

  const manifest = {
    schemaVersion: version,
    bundledSchema: `${SITE_URL}/v${version}/dsds.bundled.schema.json`,
    indexes: {
      llms: `${SITE_URL}/llms.txt`,
      llmsFull: `${SITE_URL}/llms-full.txt`,
      sitemap: `${SITE_URL}/sitemap.xml`,
    },
    sectionKinds: allSectionKinds,
    entryKinds: entries,
  };

  return JSON.stringify(manifest, null, 2) + "\n";
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------

async function build() {
  console.log("Building DSDS specification site (schema-driven)...\n");

  if (fs.existsSync(DIST_DIR)) {
    for (const entry of fs.readdirSync(DIST_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && /^v\d/.test(entry.name)) continue;
      fs.rmSync(path.join(DIST_DIR, entry.name), { recursive: true, force: true });
    }
  } else {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const exampleIndex = buildExampleIndex();
  const schemaSections = discoverSchemaSections(exampleIndex);
  console.log(`  Discovered ${schemaSections.length} schema definitions.\n`);

  DEF_INDEX = buildDefIndex(schemaSections);
  console.log(`  Indexed ${Object.keys(DEF_INDEX).length} definitions for cross-referencing.\n`);

  fs.copyFileSync(path.join(SITE_ROOT, "tokens.css"), path.join(DIST_DIR, "tokens.css"));
  fs.copyFileSync(path.join(SITE_ROOT, "favicon.svg"), path.join(DIST_DIR, "favicon.svg"));
  if (fs.existsSync(path.join(SITE_ROOT, "style.css"))) {
    fs.copyFileSync(path.join(SITE_ROOT, "style.css"), path.join(DIST_DIR, "style.css"));
  }
  fs.cpSync(path.join(SITE_ROOT, "assets"), path.join(DIST_DIR, "assets"), { recursive: true });
  fs.cpSync(path.join(SITE_ROOT, "fonts"), path.join(DIST_DIR, "fonts"), { recursive: true });
  if (fs.existsSync(path.join(SITE_ROOT, "robots.txt"))) {
    fs.copyFileSync(path.join(SITE_ROOT, "robots.txt"), path.join(DIST_DIR, "robots.txt"));
  }

  // Real example documents, exposed at /examples/*.yaml.
  fs.mkdirSync(path.join(DIST_DIR, "examples"), { recursive: true });
  fs.cpSync(EXAMPLES_DIR, path.join(DIST_DIR, "examples"), { recursive: true });

  bundleComponents(SITE_ROOT, DIST_DIR);

  const version = readSpecVersion() || "";

  // ── Overview page: merge every docs-new/content/* piece, in order ──────
  console.log("  Compiling Overview page…");
  const { compileMdxFile } = await loadMdxCompiler();
  const { compileDocEntryFile } = await loadDocEntryCompiler();

  const overviewContent = [];
  const overviewMarkdownParts = [];
  const overviewParts = [];

  for (const piece of OVERVIEW_SECTIONS) {
    const filePath = path.join(CONTENT_DIR, piece.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠  Overview piece not found: ${piece.file}`);
      continue;
    }

    let title, description, bodyHtml, mdBody;

    if (piece.file.endsWith(".mdx")) {
      const { meta, html } = await compileMdxFile(filePath);
      title = meta.title || piece.label;
      description = meta.description || "";
      bodyHtml = html.replace(
        /^\s*<ds-heading\b[^>]*\blevel="1"[^>]*>[\s\S]*?<\/ds-heading>\s*/,
        "",
      );
      const rawMdx = fs.readFileSync(filePath, "utf-8");
      mdBody = rawMdx
        .replace(/^---\n[\s\S]*?\n---\n/, "")
        .trimStart()
        .replace(/^#[ \t]+[^\n]*\n\s*/, "");
    } else {
      const { meta, html, markdown } = compileDocEntryFile(filePath);
      title = meta.title || piece.label;
      description = meta.description || "";
      bodyHtml = html;
      mdBody = markdown;
    }

    // Embedded content is authored as if it were its own page (headings
    // start at level 2) - bump by 1 now that it's nested one level deeper
    // inside this piece's own <ds-def-section> (which renders an H2 for
    // `title` itself).
    bodyHtml = bumpHeadingLevels(bodyHtml, 1);

    overviewContent.push(renderContentSection(title, piece.slug, description, bodyHtml));
    overviewMarkdownParts.push(`## ${title}\n\n${description ? description + "\n\n" : ""}${mdBody}`.trimEnd());
    overviewParts.push({ slug: piece.slug, title, description: description || DEFAULT_DESCRIPTION, sourcePath: filePath });
  }
  console.log(`  ${overviewContent.length} Overview piece(s) compiled.\n`);

  const overviewHeader = renderSub("header", {
    title: "Overview",
    description_attr: ` description="${esc(DEFAULT_DESCRIPTION)}"`,
    source_attr: "",
    badge: "",
    fallback: renderHeaderFallback("Overview", DEFAULT_DESCRIPTION),
  });
  const overviewHtml = pageHtml(
    "Overview",
    "index",
    overviewHeader,
    overviewContent.join("\n"),
    buildOverviewGroups(),
    null,
    version,
    DEFAULT_DESCRIPTION,
    "guide",
    [],
  );
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), overviewHtml, "utf-8");
  const overviewMarkdown = `# Overview\n\n${DEFAULT_DESCRIPTION}\n\n${overviewMarkdownParts.join("\n\n---\n\n")}\n`;
  fs.writeFileSync(path.join(DIST_DIR, "index.md"), overviewMarkdown, "utf-8");
  console.log(`  ✓  docs-new/dist/index.html  ← docs-new/content/{${OVERVIEW_SECTIONS.map((s) => s.file).join(", ")}}\n`);

  // ── Schema page: every def, grouped, on one page ────────────────────────
  console.log("  Compiling Schema page…");
  const schemaContent = [];
  const schemaMarkdownParts = [];
  for (const section of schemaSections) {
    schemaContent.push(renderDefinition(section.defName, section.data, section.example));
    schemaMarkdownParts.push(buildSchemaDefMarkdown(section));
  }
  console.log(`  ${schemaContent.length} schema definition(s) compiled.\n`);

  const schemaDescription = "Every DSDS schema definition, on one page: the base document, every entry kind, every section kind, and every shared common shape.";
  const schemaHeader = renderSub("header", {
    title: "Schema",
    description_attr: ` description="${esc(schemaDescription)}"`,
    source_attr: ` source="schema/"`,
    badge: "",
    fallback: renderHeaderFallback("Schema", schemaDescription),
  });
  const schemaDefNames = schemaSections.map((s) => s.defName);
  const schemaHtml = pageHtml(
    "Schema",
    "schema",
    schemaHeader,
    schemaContent.join("\n"),
    buildSchemaGroups(discoverSchemaDefs()),
    "full",
    version,
    schemaDescription,
    "schema",
    schemaDefNames,
  );
  fs.writeFileSync(path.join(DIST_DIR, "schema.html"), schemaHtml, "utf-8");
  const schemaMarkdown = `# Schema\n\n${schemaDescription}\n\n${schemaMarkdownParts.join("\n---\n\n")}\n`;
  fs.writeFileSync(path.join(DIST_DIR, "schema.md"), schemaMarkdown, "utf-8");
  console.log(`  ✓  docs-new/dist/schema.html  ← schema/**/*.schema.yaml (${schemaSections.length} defs)\n`);

  // ── Versioned bundled schema ──────────────────────────────────────
  if (fs.existsSync(BUNDLED_SCHEMA_PATH) && version) {
    const versionDir = path.join(DIST_DIR, `v${version}`);
    fs.mkdirSync(versionDir, { recursive: true });
    fs.copyFileSync(BUNDLED_SCHEMA_PATH, path.join(versionDir, "dsds.bundled.schema.json"));
    console.log(`  ✓  docs-new/dist/v${version}/dsds.bundled.schema.json  ← schema/dsds.bundled.schema.json\n`);
  }

  // ── Agent/crawler indexes ──────────────────────────────────────────
  const sitemapEntries = [
    { slug: "index", sourcePath: null },
    { slug: "schema", sourcePath: null },
  ];
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), buildSitemapXml(sitemapEntries), "utf-8");

  const schemaGroupsForLlms = buildSchemaGroups(discoverSchemaDefs());
  fs.writeFileSync(
    path.join(DIST_DIR, "llms.txt"),
    buildLlmsTxt({ overviewParts, schemaGroups: schemaGroupsForLlms }, version),
    "utf-8",
  );

  const bundledSchemaForFullTxt = fs.existsSync(BUNDLED_SCHEMA_PATH) ? readBundledSchemaSafe() : {};
  fs.writeFileSync(
    path.join(DIST_DIR, "llms-full.txt"),
    buildLlmsFullTxt({ overviewMarkdown, schemaMarkdown }, bundledSchemaForFullTxt, version),
    "utf-8",
  );

  fs.writeFileSync(path.join(DIST_DIR, "manifest.json"), buildManifest(version), "utf-8");

  console.log(
    `  ✓  docs-new/dist/sitemap.xml, docs-new/dist/llms.txt, docs-new/dist/llms-full.txt, ` +
      `docs-new/dist/manifest.json  ← 2 pages indexed\n`,
  );

  console.log(`\nDone. 2 pages built to docs-new/dist/\n`);
}

function readBundledSchemaSafe() {
  try {
    return readBundledSchema();
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Component bundler
// ---------------------------------------------------------------------------

function bundleComponents(siteDir, distDir) {
  const componentsDir = path.join(siteDir, "components");
  const indexSrc = fs.readFileSync(path.join(componentsDir, "index.js"), "utf-8");

  const importRe = /from\s+["']\.\/([^"']+)["']/g;
  const fileOrder = ["_shared.js"];
  const seen = new Set(["_shared.js"]);
  let m;
  while ((m = importRe.exec(indexSrc)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      fileOrder.push(m[1]);
    }
  }

  const registryMatch = indexSrc.match(
    /const registry = \[[\s\S]*?\];\s*\n\s*for \([\s\S]*?\{[\s\S]*?\}\s*\}/,
  );
  const registrationCode = registryMatch ? registryMatch[0] : "";

  const parts = [];
  parts.push("(function () {");
  parts.push('  "use strict";');
  parts.push("");

  for (const file of fileOrder) {
    const filePath = path.join(componentsDir, file);
    if (!fs.existsSync(filePath)) continue;

    let code = fs.readFileSync(filePath, "utf-8");
    code = code.replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];\s*$/gm, "");
    code = code.replace(/^export\s+(class|function|const|let|var)\s/gm, "$1 ");
    code = code.replace(/\n{3,}/g, "\n\n");

    parts.push(`  // ── ${file} ──`);
    const indented = code
      .trim()
      .split("\n")
      .map((line) => (line ? "  " + line : ""))
      .join("\n");
    parts.push(indented);
    parts.push("");

    if (file === "_shared.js") {
      const ICON_FILES = {
        menu: "icon-menu.svg",
        close: "icon-close.svg",
        info: "icon-info.svg",
        flask: "icon-flask.svg",
        dot: "icon-dot.svg",
        lightbulb: "icon-lightbulb.svg",
        warning: "icon-warning.svg",
        brackets: "icon-brackets.svg",
        logo: "dsds.svg",
      };
      const assetsDir = path.join(siteDir, "assets");
      const seeded = {};
      for (const [name, iconFile] of Object.entries(ICON_FILES)) {
        const iconPath = path.join(assetsDir, iconFile);
        if (fs.existsSync(iconPath)) {
          seeded[name] = fs.readFileSync(iconPath, "utf-8");
        }
      }
      parts.push("  // ── inlined icon assets (build-time, see above) ──");
      parts.push(`  seedIcons(${JSON.stringify(seeded)});`);
      parts.push("");

      const seededCss = {};
      for (const componentFile of fileOrder) {
        if (componentFile === "_shared.js") continue;
        const dirName = path.dirname(componentFile);
        const cssPath = path.join(componentsDir, dirName, `${dirName}.css`);
        if (fs.existsSync(cssPath)) {
          seededCss[dirName] = fs.readFileSync(cssPath, "utf-8");
        }
      }
      parts.push("  // ── inlined component CSS (build-time, see above) ──");
      parts.push(`  seedCSS(${JSON.stringify(seededCss)});`);
      parts.push("");
    }
  }

  if (registrationCode) {
    parts.push("  // ── Registration ──");
    const indented = registrationCode
      .trim()
      .split("\n")
      .map((line) => (line ? "  " + line : ""))
      .join("\n");
    parts.push(indented);
  }

  parts.push("})();");

  const bundle = parts.join("\n") + "\n";
  fs.writeFileSync(path.join(distDir, "components.js"), bundle, "utf-8");

  const kb = (Buffer.byteLength(bundle, "utf-8") / 1024).toFixed(1);
  console.log(`  Bundled ${fileOrder.length} component files → components.js (${kb} KB)`);
}

build().catch((err) => {
  console.error("\n✗ Build failed:", err.stack || err.message);
  process.exit(1);
});
