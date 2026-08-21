/**
 * render-prop-table.js — Shared schema-to-HTML rendering primitives.
 *
 * Both build-site.js (per-def docs pages) and compile-mdx.mjs (MDX
 * <ds-prop-table def="..." /> shortcode) emit property tables. This module
 * owns the conversion from a bundled-schema `$defs` entry to the
 * <ds-prop-table>/<ds-prop> HTML fragment the docs site renders. By
 * sharing this logic, both call sites stay 1:1 with the schema — there is
 * no second source of truth for field names, types, descriptions, or
 * requiredness.
 *
 * Reads spec/schema/dsds.bundled.schema.json directly rather than
 * crawling per-concept files: every def already lives in that one file,
 * keyed by its path relative to spec/schema/ (e.g. "common/ref",
 * "sections/api", or bare "entry"/"base"/"section"/"metadata").
 *
 * `$ref` values in this schema are full `$id` URLs (tools/bundle.js
 * deliberately does not rewrite them to "#/$defs/name" — see its own
 * header) and def keys contain slashes, so `linkToRef` has to parse a URL
 * like ".../common/ref.schema.yaml#/$defs/list" into the def name
 * "common/ref" — a bare "#/$defs/..." fragment is a *local* reference
 * inside the current def's own nested $defs, not a cross-def link, and
 * resolves to no page.
 *
 * Exports:
 *   esc                     — HTML escape (also used by callers for other tags)
 *   slug                    — text → URL-safe slug
 *   linkToRef               — extract a $defs name from a $ref string
 *   describeType            — schema fragment → human-readable type string
 *   renderPropertyTable     — defSchema → <ds-prop-table> HTML
 *   buildDefIndex           — read bundled schema → { defName: {pageSlug, group} }
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA_DIR = path.join(REPO_ROOT, "schema");
const BUNDLED_SCHEMA_PATH = path.join(SCHEMA_DIR, "dsds.bundled.schema.json");

// The base fields every entry kind shares (entry.schema.yaml's own
// properties - see spec/schema/entries/*.schema.yaml, each of which
// extends this base via allOf). A `delta` prop table omits these so a
// page can show only what's actually distinctive about the shape being
// documented, without re-listing the shared envelope already covered on
// the entry page itself.
const ENTRY_ENVELOPE = [
  "id",
  "kind",
  "name",
  "description",
  "metadata",
  "refs",
  "sections",
  "$extensions",
];

// ---------------------------------------------------------------------------
// HTML escaping & slug helpers
// ---------------------------------------------------------------------------

function esc(text) {
  if (typeof text !== "string") return String(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML-escape `s`, but also convert CommonMark-style backtick inline-code
 * spans (`like-this`) into <ds-code inline> elements. Mirrors
 * `escWithCode` in docs/components/_shared.js so prop-table descriptions
 * (built into HTML here, at build time) and def-section / schema-header
 * descriptions (rendered at runtime by the web components) render the
 * same way.
 *
 * Closing backticks must appear on the same line as the opening one; an
 * unmatched ` falls through as a literal character.
 */
function escWithCode(s) {
  if (s == null) return "";
  const parts = String(s).split(/(`[^`\n]+`)/g);
  return parts
    .map((p) => {
      if (p.length >= 2 && p.startsWith("`") && p.endsWith("`")) {
        return `<ds-code inline>${esc(p.slice(1, -1))}</ds-code>`;
      }
      return esc(p);
    })
    .join("");
}

function slug(text) {
  return String(text)
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .toLowerCase();
}

/** "common/ref" -> "common-ref"; "entry" -> "entry". */
function defNameToSlug(defName) {
  return defName.replace(/\//g, "-");
}

/**
 * Extract the cross-def $defs name a $ref points at, or null when the ref
 * is local to the current def (a bare "#/$defs/x" fragment — the current
 * def's own nested $defs, not another page).
 */
function linkToRef(ref) {
  if (!ref || typeof ref !== "string") return null;
  if (ref.startsWith("#/")) return null; // local nested ref, no cross-page link
  const m = ref.match(/\/proposed\/(.+?)\.schema\.yaml/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Schema discovery → definition index
// ---------------------------------------------------------------------------

function readBundledSchema(schemaDir = SCHEMA_DIR) {
  const p = path.join(schemaDir, "dsds.bundled.schema.json");
  if (!fs.existsSync(p)) return { $defs: {} };
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return { $defs: {} };
  }
}

/**
 * Build an index mapping each bundled-schema $defs name to the anchor that
 * addresses it on the single combined schema page (see module header).
 *
 * Output shape:
 *   { [defName]: { pageSlug, anchor, group, description } }
 */
function buildDefIndex({ schemaDir = SCHEMA_DIR } = {}) {
  const schema = readBundledSchema(schemaDir);
  const index = {};
  for (const [defName, def] of Object.entries(schema.$defs || {})) {
    const slashAt = defName.indexOf("/");
    index[defName] = {
      pageSlug: "schema",
      anchor: defNameToSlug(defName),
      group: slashAt === -1 ? "core" : defName.slice(0, slashAt),
      description: def.description || "",
    };
  }
  return index;
}

// ---------------------------------------------------------------------------
// Type description rendering
// ---------------------------------------------------------------------------

/**
 * Produce a human-readable type string from a property schema fragment.
 * The optional `defIndex` enables cross-reference links via <ds-type-ref>.
 * When omitted, $refs render as plain inline code instead.
 */
function describeType(prop, defIndex = {}) {
  if (!prop || typeof prop !== "object") return "any";

  // $ref
  if (prop.$ref) {
    const defName = linkToRef(prop.$ref);
    if (defName) {
      const target = defIndex[defName];
      if (target) {
        return `<ds-type-ref href="${target.pageSlug}.html#${target.anchor}">${esc(defName)}</ds-type-ref>`;
      }
      return `<ds-code inline>${esc(defName)}</ds-code>`;
    }
    return `<ds-code inline>$ref</ds-code>`;
  }

  // allOf — schema-wide, this pattern extends a shared base (rule,
  // metadata, ref) and closes it at its own leaf. Describe it as the
  // base type, since that's the shape a reader recognizes.
  if (prop.allOf) {
    const withRef = prop.allOf.find((alt) => alt.$ref);
    if (withRef) return describeType(withRef, defIndex);
    return prop.allOf.map((alt) => describeType(alt, defIndex)).join(" & ");
  }

  // oneOf
  if (prop.oneOf) {
    const parts = prop.oneOf.map((alt) => describeType(alt, defIndex));
    return parts.join(" | ");
  }

  // anyOf
  if (prop.anyOf) {
    const parts = prop.anyOf.map((alt) => describeType(alt, defIndex));
    return parts.join(" | ");
  }

  // array
  if (prop.type === "array") {
    if (prop.items) {
      const itemType = describeType(prop.items, defIndex);
      return `${itemType}[]`;
    }
    return "array";
  }

  // object with additionalProperties
  if (prop.type === "object" && prop.additionalProperties) {
    if (typeof prop.additionalProperties === "object") {
      const valType = describeType(prop.additionalProperties, defIndex);
      return `map&lt;string, ${valType}&gt;`;
    }
    return "object (open)";
  }

  // object with properties (inline sub-object) — surface its field names so a
  // reader sees the shape (ex: `object {to, rel}`) rather than a bare
  // "object". Falls back to "object" for wide objects.
  if (prop.type === "object" && prop.properties) {
    const keys = Object.keys(prop.properties);
    return keys.length && keys.length <= 4
      ? `object {${keys.join(", ")}}`
      : "object";
  }

  // const
  if (prop.const !== undefined) {
    return `<ds-code inline>"${esc(String(prop.const))}"</ds-code>`;
  }

  // enum
  if (prop.enum) {
    return prop.enum
      .map((v) => `<ds-code inline>"${esc(String(v))}"</ds-code>`)
      .join(" | ");
  }

  // string with format
  if (prop.type === "string" && prop.format) {
    return `string (${esc(prop.format)})`;
  }

  // simple type
  if (prop.type) {
    return esc(prop.type);
  }

  // description-only (no type constraint, ex: api's "defaultValue", which
  // accepts any JSON in its native type)
  if (prop.description) {
    return "any";
  }

  return "any";
}

// ---------------------------------------------------------------------------
// Property table rendering
// ---------------------------------------------------------------------------

/**
 * A def is often `allOf: [base-or-section-ref, {type: object, properties, required}]`
 * (the open-base + closing-leaf pattern this schema uses throughout — see
 * spec/architecture.md §3). Flatten that down to one merged
 * {properties, required, anyOf} so property-table rendering doesn't need
 * to know about the wrapper. Properties from a later allOf entry win over
 * an earlier one (the closing leaf's own type/description, if any, is
 * more specific than the base's).
 */
function flattenAllOf(defSchema) {
  if (!defSchema || !Array.isArray(defSchema.allOf)) return defSchema;
  const merged = { properties: {}, required: [] };
  for (const branch of defSchema.allOf) {
    if (!branch || typeof branch !== "object") continue;
    if (branch.properties) Object.assign(merged.properties, branch.properties);
    if (Array.isArray(branch.required)) {
      merged.required = [...new Set([...merged.required, ...branch.required])];
    }
    if (branch.anyOf) merged.anyOf = branch.anyOf;
  }
  return merged;
}

/**
 * Walk a definition's `properties` map and produce one plain-data row per
 * field — the single source of truth both `renderPropertyTable()` (HTML) and
 * `renderPropertyTableMarkdown()` (the agent-facing .md mirror) render from,
 * so the two outputs can never drift out of sync with each other or with the
 * schema.
 *
 * @param {object} defSchema  A schema fragment with a `properties` map (or
 *                            an allOf wrapping one — see flattenAllOf).
 * @param {object} [defIndex] Optional cross-reference index for $ref links.
 * @returns {Array<{name, type, status, description, notes}>}
 *   `type` is an HTML fragment (may embed <ds-type-ref>/<ds-code> tags — see
 *   describeType). `status` is "required" | "conditional" | "optional".
 *   `description` is the raw (un-escaped) schema description text. `notes`
 *   is a list of `{ kind, value }` supplementary facts (pattern, default,
 *   enum values, etc.) in the same order the HTML table has always shown
 *   them.
 */
function propTableRows(defSchema, defIndex = {}, opts = {}) {
  const flat = flattenAllOf(defSchema);
  if (!flat || typeof flat !== "object") return [];
  const properties = flat.properties;
  if (!properties || Object.keys(properties).length === 0) return [];

  const omit = new Set(opts.omit || []);
  const required = new Set(flat.required || []);

  // Collect anyOf/required constraints to identify "at least one" groups
  const anyOfGroups = [];
  if (flat.anyOf) {
    for (const alt of flat.anyOf) {
      if (alt.required && Array.isArray(alt.required)) {
        anyOfGroups.push(alt.required);
      }
    }
  }
  const anyOfProps = new Set();
  for (const group of anyOfGroups) {
    for (const name of group) {
      anyOfProps.add(name);
    }
  }

  const rows = [];
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (omit.has(propName)) continue;
    // Empty {} stubs (the "re-listed purely so additionalProperties:false
    // doesn't reject the base's own fields" pattern — see architecture.md
    // §3) carry no type/description of their own; skip them here, since
    // the base def's own page already documents the real field.
    if (
      propSchema &&
      typeof propSchema === "object" &&
      Object.keys(propSchema).length === 0
    ) {
      continue;
    }
    const isRequired = required.has(propName);
    const isAnyOf = anyOfProps.has(propName);
    const type = describeType(propSchema, defIndex);

    const notes = [];
    if (propSchema.enum && propSchema.enum.length > 8) {
      notes.push({ kind: "values", value: propSchema.enum.map(String) });
    }
    if (propSchema.pattern) {
      notes.push({ kind: "pattern", value: propSchema.pattern });
    }
    if (propSchema.minItems) {
      notes.push({ kind: "minItems", value: propSchema.minItems });
    }
    if (propSchema.default !== undefined) {
      notes.push({
        kind: "default",
        value: propSchema.default,
        isString: typeof propSchema.default === "string",
      });
    }
    if (
      propSchema.type === "array" &&
      propSchema.items &&
      propSchema.items.format
    ) {
      notes.push({ kind: "format", value: propSchema.items.format });
    }

    let status;
    let sortOrder;
    if (isRequired) {
      status = "required";
      sortOrder = 0;
    } else if (isAnyOf) {
      status = "conditional";
      sortOrder = 1;
    } else {
      status = "optional";
      sortOrder = 2;
    }

    // A bare `{ "$ref": "..." }` property (no local description) inherits
    // the referenced def's description, so docs don't render an empty cell
    // just because the description lives on the $ref target instead.
    let description = propSchema.description || "";
    if (!description && propSchema.$ref) {
      const refName = linkToRef(propSchema.$ref);
      const refTarget = refName && defIndex[refName];
      if (refTarget && refTarget.description) {
        description = refTarget.description;
      }
    }

    rows.push({
      sortOrder,
      name: propName,
      type,
      status,
      description,
      notes,
    });
  }

  // Stable sort: required → conditional → optional, preserving original order
  rows.sort((a, b) => a.sortOrder - b.sortOrder);
  return rows;
}

/**
 * Render one row's notes array as the `<br><small>...</small>` HTML suffix
 * that's always followed the description text in the HTML table.
 */
function notesToHtml(notes) {
  return notes
    .map((note) => {
      switch (note.kind) {
        case "values":
          return `<br><small>Values: ${note.value.map((v) => `<ds-code inline>${esc(v)}</ds-code>`).join(", ")}</small>`;
        case "pattern":
          return `<br><small>Pattern: <ds-code inline>${esc(note.value)}</ds-code></small>`;
        case "minItems":
          return `<br><small>Min items: ${note.value}</small>`;
        case "default": {
          const v = note.isString ? `"${esc(note.value)}"` : String(note.value);
          return `<br><small>Default: <ds-code inline>${v}</ds-code></small>`;
        }
        case "format":
          return `<br><small>Format: ${esc(note.value)}</small>`;
        default:
          return "";
      }
    })
    .join("");
}

/**
 * Render one row's notes array as a plain-text suffix for the markdown
 * table — no HTML, since the whole point of the .md mirror is to be
 * readable without a browser.
 */
function notesToMarkdown(notes) {
  return notes
    .map((note) => {
      switch (note.kind) {
        case "values":
          return `Values: ${note.value.map((v) => `\`${v}\``).join(", ")}`;
        case "pattern":
          return `Pattern: \`${note.value}\``;
        case "minItems":
          return `Min items: ${note.value}`;
        case "default": {
          const v = note.isString ? `"${note.value}"` : String(note.value);
          return `Default: \`${v}\``;
        }
        case "format":
          return `Format: ${note.value}`;
        default:
          return "";
      }
    })
    .join("; ");
}

/**
 * Convert a describeType() HTML fragment into markdown. describeType only
 * ever emits a small, fixed set of tags (<ds-type-ref>, <ds-code inline>)
 * joined with " | ", "[]", etc., so a targeted regex pass is simpler and
 * safer than a parallel markdown-emitting describeType — there's no schema
 * shape this can silently get wrong that describeType itself didn't already
 * fix in one place.
 */
function typeToMarkdown(typeHtml) {
  return typeHtml
    .replace(
      /<ds-type-ref href="([^"]+)\.html#([^"]+)">([^<]*)<\/ds-type-ref>/g,
      (m, pageSlug, anchor, label) => `[${label}](${pageSlug}.md#${anchor})`,
    )
    .replace(/<ds-code inline>([^<]*)<\/ds-code>/g, (m, code) => `\`${code}\``)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/**
 * Escape a value for embedding in a GFM table cell: pipes would otherwise
 * split the row, and a literal newline would break it entirely.
 */
function escTableCell(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * Render a property table for a definition's `properties` map.
 *
 * @param {object} defSchema  A schema fragment with a `properties` map.
 *                            Optional `required` (string[]) and `anyOf`
 *                            (with `required` arrays) shape the badges.
 * @param {object} [defIndex] Optional cross-reference index for $ref links.
 * @returns {string}          HTML fragment (`<ds-prop-table>...</ds-prop-table>`)
 *                            or the empty string when there are no properties.
 */
function renderPropertyTable(defSchema, defIndex = {}, opts = {}) {
  const rows = propTableRows(defSchema, defIndex, opts);
  if (rows.length === 0) return "";

  const statusAttr = { required: " required", conditional: " conditional", optional: "" };

  return (
    `<ds-prop-table>\n` +
    rows
      .map((row) => {
        const descHtml = escWithCode(row.description) + notesToHtml(row.notes);
        return (
          `  <ds-prop name="${esc(row.name)}" type="${esc(row.type)}"${statusAttr[row.status]}>` +
          descHtml +
          `</ds-prop>`
        );
      })
      .join("\n") +
    `\n</ds-prop-table>`
  );
}

/**
 * Render a property table for a definition's `properties` map as a GFM
 * markdown table — the .md mirror's equivalent of renderPropertyTable(),
 * built from the same propTableRows() so field names/types/requiredness can
 * never differ between the two.
 *
 * @returns {string} A markdown table, or "" when there are no properties.
 */
function renderPropertyTableMarkdown(defSchema, defIndex = {}, opts = {}) {
  const rows = propTableRows(defSchema, defIndex, opts);
  if (rows.length === 0) return "";

  const requiredLabel = { required: "✓", conditional: "at least 1", optional: "" };

  const lines = [
    "| Property | Type | Required | Description |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    const notes = notesToMarkdown(row.notes);
    const description =
      escTableCell(row.description) + (notes ? ` (${escTableCell(notes)})` : "");
    lines.push(
      `| \`${escTableCell(row.name)}\` | ${escTableCell(typeToMarkdown(row.type))} | ${requiredLabel[row.status]} | ${description} |`,
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Convenience: resolve a def name into a property table
// ---------------------------------------------------------------------------

/**
 * Render the property table for one bundled-schema $defs entry by name
 * (ex: "sections/api", "entry", "common/ref"). Pass `"$root"` to render
 * the bundled schema's own top-level properties (unused today — every
 * real def lives under $defs — kept for parity with the MDX shortcode's
 * existing call convention).
 *
 * @param {string} defName
 * @param {object} [opts]
 * @param {string} [opts.schemaDir]  Override the schema root (for tests).
 * @param {object} [opts.defIndex]   Pre-built cross-reference index.
 * @returns {string}  HTML fragment, or `<!-- ... -->` comment on failure.
 */
function renderPropertyTableForRef(defName, opts = {}) {
  const schemaDir = opts.schemaDir || SCHEMA_DIR;
  const schema = readBundledSchema(schemaDir);

  const target = defName === "$root" ? schema : (schema.$defs || {})[defName];
  if (!target) {
    return `<!-- ds-prop-table: def "${defName}" not found -->`;
  }

  let node = target;
  // `path` navigates into a nested inline sub-schema (ex: "items" steps
  // into an array's item schema) so sub-objects that aren't their own
  // $def can still be rendered schema-driven.
  if (opts.path) {
    const flat = flattenAllOf(node);
    let cur = flat;
    for (const seg of String(opts.path).split(".")) {
      if (!cur || typeof cur !== "object") {
        cur = null;
        break;
      }
      cur = seg === "items" ? cur.items : (cur.properties || {})[seg];
    }
    if (!cur) {
      return `<!-- ds-prop-table: path "${opts.path}" not found in "${defName}" -->`;
    }
    node = cur;
  }

  const defIndex = opts.defIndex || buildDefIndex({ schemaDir });
  // `delta: true` omits the shared node envelope; an explicit `omit` array
  // takes precedence when provided.
  const omit = opts.omit || (opts.delta ? ENTRY_ENVELOPE : []);
  return renderPropertyTable(node, defIndex, { omit });
}

module.exports = {
  esc,
  escWithCode,
  slug,
  defNameToSlug,
  linkToRef,
  describeType,
  flattenAllOf,
  propTableRows,
  typeToMarkdown,
  renderPropertyTable,
  renderPropertyTableMarkdown,
  renderPropertyTableForRef,
  buildDefIndex,
  readBundledSchema,
  ENTRY_ENVELOPE,
};
