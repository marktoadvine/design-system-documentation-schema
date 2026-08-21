#!/usr/bin/env node
/**
 * render-doc-entry.mjs — Renders docs-new/*.yaml (DSDS entries) to HTML/markdown
 * for the DSDS spec site.
 *
 * The doc site's own content lives as DSDS entries — the schema validates its
 * own documentation, instead of living only as free-text prose alongside it.
 * This walks a validated entry's `sections` (freeform/guidelines/steps/
 * definitions) and emits the same HTML web components hand-written MDX
 * content already uses (<ds-heading>, <ds-callout>, <ds-badge>, <ds-code>),
 * so a docs-new page and an .mdx page are visually indistinguishable.
 *
 * Pipeline per file:
 *   1. Load + validate against spec/schema/dsds.bundled.schema.json (an
 *      entry that doesn't validate doesn't build - this is the actual
 *      "schema as source of truth" enforcement, not just an aspiration).
 *   2. Walk `sections`, emitting HTML per `section.kind` plus the
 *      universal `freeform` field every kind can carry.
 *   3. Resolve any `rel: file` ref pointing under spec/examples/ into a
 *      real fenced code block, reading the file the same way
 *      compile-mdx.mjs's preprocessExamples() does for <ds-example>.
 *
 * Exports:
 *   compileDocEntryFile(filePath) → { meta, html, markdown }
 *   compileAllDocEntries()        → Array<{ file, meta, html, markdown }>
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { schemaDir, loadYaml, walkYamlFiles } = require("../../scripts/lib.js");
const { esc } = require("./render-prop-table.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const ROOT = path.resolve(__dirname, "..", "..");
const DOC_ENTRIES_DIR = path.join(SITE_ROOT, "content");
const EXAMPLES_DIR = path.join(ROOT, "examples");
const ENTRY_SCHEMA_ID = "https://designsystemdocspec.org/v0.20.0/entry.schema.yaml";

// ---------------------------------------------------------------------------
// Schema validation - registers every spec/schema/**/*.schema.yaml file by
// its own $id, exactly like tools/validate.js does, so a docs-new entry is
// checked against the real, current schema files rather than a possibly
// stale bundled copy.
// ---------------------------------------------------------------------------

let cachedValidator = null;
function getEntryValidator() {
  if (cachedValidator) return cachedValidator;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const file of walkYamlFiles(schemaDir)) {
    ajv.addSchema(loadYaml(file));
  }
  cachedValidator = ajv.getSchema(ENTRY_SCHEMA_ID);
  return cachedValidator;
}

function validateEntry(entry, filePath) {
  const validate = getEntryValidator();
  if (!validate(entry)) {
    const rel = path.relative(ROOT, filePath);
    const msgs = (validate.errors || [])
      .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
      .join("\n");
    throw new Error(`${rel} does not validate against entry.schema.yaml:\n${msgs}`);
  }
}

// ---------------------------------------------------------------------------
// Canonical spec version - same {{VERSION}} token/source compile-mdx.mjs uses.
// ---------------------------------------------------------------------------

let CACHED_VERSION = null;
function readSpecVersion() {
  if (CACHED_VERSION !== null) return CACHED_VERSION;
  try {
    const doc = yaml.load(
      fs.readFileSync(path.join(EXAMPLES_DIR, "base", "starter-kit.dsds.yaml"), "utf-8"),
    );
    CACHED_VERSION = (doc && doc.schemaVersion) || "";
  } catch {
    CACHED_VERSION = "";
  }
  return CACHED_VERSION;
}

function substituteVersion(text) {
  return text.replace(/\{\{\s*VERSION\s*\}\}/g, readSpecVersion());
}

// ---------------------------------------------------------------------------
// Basic markdown → HTML (bold/italic/inline-code/links/lists only - the
// scope common/markdown.schema.yaml documents itself as: no headings,
// tables, code fences, or raw HTML inside a body/statement/definition
// field. Anything richer belongs in a `refs` (rel: file) code example
// instead, resolved separately below.)
// ---------------------------------------------------------------------------

function renderInline(text) {
  // Order matters: code spans first (their content must not be touched by
  // the other patterns), then links, then bold, then italic.
  const parts = String(text).split(/(`[^`\n]+`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return `<ds-code inline>${esc(part.slice(1, -1))}</ds-code>`;
      let s = esc(part);
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => `<a href="${esc(href)}">${label}</a>`);
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
      return s;
    })
    .join("");
}

function renderMarkdown(text) {
  if (!text) return "";
  const blocks = substituteVersion(text).trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim());
      if (lines.every((l) => /^-\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${renderInline(l.replace(/^-\s+/, ""))}</li>`).join("")}</ul>`;
      }
      if (lines.every((l) => /^\d+\.\s+/.test(l))) {
        return `<ol>${lines.map((l) => `<li>${renderInline(l.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
      }
      return `<p>${renderInline(lines.join(" "))}</p>`;
    })
    .join("\n");
}

function renderMarkdownToPlainText(text) {
  // For the .md mirror - basic markdown is already valid CommonMark
  // (bold/italic/links/lists/inline-code all use standard syntax), so the
  // source text itself IS the markdown output, once {{VERSION}} resolves.
  return substituteVersion(text || "").trim();
}

// ---------------------------------------------------------------------------
// Ref resolution - a `rel: file` ref pointing under spec/examples/ becomes
// a real fenced code block, read the same way compile-mdx.mjs's
// preprocessExamples() reads a <ds-example file="..."> file.
// ---------------------------------------------------------------------------

function normalizeRef(ref) {
  return typeof ref === "string" ? { href: ref } : ref;
}

function resolveFileRefs(refs) {
  return (refs || [])
    .map(normalizeRef)
    .filter((r) => r.rel === "file" && r.href && !/^[a-z]+:\/\//.test(r.href));
}

function renderExampleBlocks(refs) {
  return resolveFileRefs(refs)
    .map((ref) => {
      const filePath = path.join(EXAMPLES_DIR, ref.href);
      if (!fs.existsSync(filePath)) {
        console.error(`    ⚠  doc-entry ref not found under spec/examples/: ${ref.href}`);
        return `<!-- Example not found: ${esc(ref.href)} -->`;
      }
      const raw = fs.readFileSync(filePath, "utf-8").trim();
      const labelAttr = ref.role ? ` label="${esc(ref.role)}"` : "";
      return `<ds-code language="yaml"${labelAttr}>${esc(raw)}</ds-code>`;
    })
    .join("\n");
}

function renderExampleBlocksMarkdown(refs) {
  return resolveFileRefs(refs)
    .map((ref) => {
      const filePath = path.join(EXAMPLES_DIR, ref.href);
      if (!fs.existsSync(filePath)) return "";
      const raw = fs.readFileSync(filePath, "utf-8").trim();
      return "```yaml\n" + raw + "\n```";
    })
    .filter(Boolean)
    .join("\n\n");
}

// Non-file refs (external links, rel: see-also, etc.) render as a plain
// "See also" line rather than a code block.
function renderSeeAlso(refs) {
  const links = (refs || [])
    .map(normalizeRef)
    .filter((r) => r.rel !== "file" && (r.href || r.to));
  if (!links.length) return "";
  const items = links
    .map((r) => `<li><a href="${esc(r.href || `#${r.to}`)}">${esc(r.role || r.href || r.to)}</a></li>`)
    .join("");
  return `<p><strong>See also:</strong></p><ul>${items}</ul>`;
}

// ---------------------------------------------------------------------------
// Section-kind renderers
// ---------------------------------------------------------------------------

function renderFreeformEntries(entries, level) {
  return (entries || [])
    .map((fe) => {
      const anchor = fe.id || undefined;
      const anchorAttr = anchor ? ` anchor="${esc(anchor)}"` : "";
      const heading = `<ds-heading level="${level}"${anchorAttr}>${renderInline(fe.title)}</ds-heading>`;
      const body = fe.body ? renderMarkdown(fe.body) : "";
      const examples = renderExampleBlocks(fe.refs);
      const nested = fe.items ? renderFreeformEntries(fe.items, Math.min(level + 1, 6)) : "";
      return heading + body + examples + nested;
    })
    .join("\n");
}

function renderGuidelinesSection(section) {
  const items = (section.items || [])
    .map((item) => {
      const level = item.level ? `<ds-badge>${esc(item.level.toUpperCase().replace(/-/g, " "))}</ds-badge> ` : "";
      const statement = item.statement ? renderMarkdown(item.statement) : "";
      const examples = renderExampleBlocks(item.refs || item.checks);
      return `<li>${level}${statement}${examples}</li>`;
    })
    .join("");
  return items ? `<ul class="ds-doc-guidelines">${items}</ul>` : "";
}

function renderStepsSection(section) {
  const tag = section.ordered === false ? "ul" : "ol";
  const items = (section.items || [])
    .map((item) => {
      const optional = item.optional ? " <em>(optional)</em>" : "";
      const desc = item.description ? renderMarkdown(item.description) : "";
      const examples = renderExampleBlocks(item.refs);
      return `<li><strong>${renderInline(item.title)}</strong>${optional}${desc}${examples}</li>`;
    })
    .join("");
  return items ? `<${tag}>${items}</${tag}>` : "";
}

function renderDefinitionsSection(section) {
  const items = (section.items || [])
    .map((item) => {
      const usage = item.usage ? renderMarkdown(item.usage) : "";
      return `<dt>${renderInline(item.term)}</dt><dd>${renderMarkdown(item.definition)}${usage}</dd>`;
    })
    .join("");
  return items ? `<dl>${items}</dl>` : "";
}

const SECTION_RENDERERS = {
  guidelines: renderGuidelinesSection,
  steps: renderStepsSection,
  definitions: renderDefinitionsSection,
};

function renderSection(section, level) {
  const anchor = section.title ? undefined : undefined;
  const heading = section.title
    ? `<ds-heading level="${level}">${renderInline(section.title)}</ds-heading>`
    : "";
  const description = section.description ? renderMarkdown(section.description) : "";
  const renderer = SECTION_RENDERERS[section.kind];
  const body = renderer ? renderer(section) : "";
  const freeform = renderFreeformEntries(section.freeform, Math.min(level + 1, 6));
  return heading + description + body + freeform;
}

// ---------------------------------------------------------------------------
// Entry-level render
// ---------------------------------------------------------------------------

function renderEntryHtml(entry) {
  const sections = (entry.sections || []).map((s) => renderSection(s, 2)).join("\n");
  const seeAlso = renderSeeAlso(entry.refs);
  return sections + seeAlso;
}

function renderEntryMarkdown(entry) {
  const blocks = [];
  for (const section of entry.sections || []) {
    if (section.title) blocks.push(`## ${section.title}`);
    if (section.description) blocks.push(renderMarkdownToPlainText(section.description));
    if (section.kind === "definitions") {
      for (const item of section.items || []) {
        blocks.push(`**${item.term}** — ${renderMarkdownToPlainText(item.definition)}`);
      }
    } else if (section.kind === "guidelines") {
      for (const item of section.items || []) {
        const level = item.level ? `**${item.level.toUpperCase().replace(/-/g, " ")}:** ` : "";
        if (item.statement) blocks.push(`- ${level}${renderMarkdownToPlainText(item.statement)}`);
      }
    } else if (section.kind === "steps") {
      (section.items || []).forEach((item, i) => {
        const marker = section.ordered === false ? "-" : `${i + 1}.`;
        const desc = item.description ? ` — ${renderMarkdownToPlainText(item.description)}` : "";
        blocks.push(`${marker} **${item.title}**${desc}`);
      });
    }
    for (const fe of section.freeform || []) {
      blocks.push(`### ${fe.title}`);
      if (fe.body) blocks.push(renderMarkdownToPlainText(fe.body));
      const ex = renderExampleBlocksMarkdown(fe.refs);
      if (ex) blocks.push(ex);
    }
  }
  return blocks.join("\n\n");
}

// ---------------------------------------------------------------------------
// Public API - mirrors compile-mdx.mjs's compileMdxFile/compileAllMdx shape
// ---------------------------------------------------------------------------

export function compileDocEntryFile(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absPath, "utf-8");
  const entry = yaml.load(raw);

  validateEntry(entry, absPath);

  const meta = {
    slug: entry.id,
    title: substituteVersion(entry.name || entry.id),
    description: entry.description ? substituteVersion(entry.description) : "",
  };
  const html = renderEntryHtml(entry);
  const markdown = renderEntryMarkdown(entry);

  return { meta, html, markdown };
}

export function compileAllDocEntries() {
  if (!fs.existsSync(DOC_ENTRIES_DIR)) return [];
  const files = fs.readdirSync(DOC_ENTRIES_DIR).filter((f) => f.endsWith(".yaml"));
  return files.map((file) => {
    const { meta, html, markdown } = compileDocEntryFile(path.join(DOC_ENTRIES_DIR, file));
    return { file, meta, html, markdown };
  });
}

// ---------------------------------------------------------------------------
// CLI: node docs/scripts/render-doc-entry.mjs docs-new/stability.yaml
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node render-doc-entry.mjs <path-to-doc-entry.yaml>");
    process.exit(1);
  }
  try {
    const { meta, html, markdown } = compileDocEntryFile(target);
    console.log("=== meta ===");
    console.log(meta);
    console.log("\n=== html ===");
    console.log(html);
    console.log("\n=== markdown ===");
    console.log(markdown);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
