// Shared helpers for scripts/v0.20/validate.js and conformance-test.js -
// loading files and finding entries, so neither script has to redeclare the
// other's copy. Ported from the dsds-2 prototype's tools/lib.js; adapted to
// this repo's scripts/v0.20/ location (one extra directory level) and this
// repo's schema/examples layout at the repo root.
"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const rootDir = path.join(__dirname, "..");
const schemaDir = path.join(rootDir, "schema");
const exampleDirs = [
  path.join(rootDir, "examples/entries"),
  path.join(rootDir, "examples/base"),
];
// The live site's own content isn't ported to the new schema yet (that's a
// later phase of the v0.20.0 migration) - no docEntryDirs equivalent until
// it is.
const docEntryDirs = [];

// JSON_SCHEMA disables YAML's implicit !!timestamp type, which otherwise
// parses a bare `2026-06-02` into a JS Date instead of the string
// isoDate.schema.yaml requires - a real behavior difference between the
// js-yaml v5 the dsds-2 prototype was built against and the js-yaml v4
// already pinned in this repo's package.json. Scoped to this loader only,
// not a repo-wide js-yaml bump, so it can't change how any other script
// parses YAML.
function loadYaml(file) {
  return yaml.load(fs.readFileSync(file, "utf8"), { schema: yaml.JSON_SCHEMA });
}

// Only matches *.schema.yaml - excludes schema/conformance-rules.yaml,
// which lives alongside the schema files but isn't itself a JSON Schema
// document, so it must never get registered as one.
function walkYamlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkYamlFiles(full);
    return entry.name.endsWith(".schema.yaml") ? [full] : [];
  });
}

function defaultTargets() {
  return [...exampleDirs, ...docEntryDirs].flatMap((dir) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir)
          .filter((f) => f.endsWith(".yaml"))
          .map((f) => path.join(dir, f))
      : []
  );
}

function isBaseDoc(doc) {
  return typeof doc.schemaVersion !== "undefined";
}

// Every entity in a file, whether it's a standalone entry or a base
// document with several inline - so callers don't need to special-case
// either shape. Includes `shared` entries alongside `entries`: both share
// one id/refs/sections addressing space (see common/ref.schema.yaml's
// `to`), even though a shared entry isn't a design-system artifact - a
// caller that only cares about that shared surface (metrics,
// cross-document ref resolution) shouldn't have to special-case the two
// arrays.
function entriesIn(doc) {
  return isBaseDoc(doc) ? [...(doc.entries || []), ...(doc.shared || [])] : [doc];
}

// Finds every {to, rel} shaped object anywhere inside a value, regardless
// of what field it's under - one generic walk instead of a separate case
// for each of the half-dozen places a ref can appear (entry.refs, a
// section's `source`, an item's own `source`/`refs`, a rule's `refs`,
// base.refs). Shared by tools/metrics.js (reference-complexity reporting)
// and tools/validate.js (entryId#itemId resolution). `combos` subjects and
// items (bare strings, not {to, rel} objects) are a deliberately
// different, lighter pointer concept and aren't picked up here.
function findRefs(value, at, out) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => findRefs(item, `${at}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    if (typeof value.to === "string" && typeof value.rel === "string") {
      out.push({ to: value.to, rel: value.rel, at });
    }
    for (const [key, val] of Object.entries(value)) {
      findRefs(val, at ? `${at}.${key}` : key, out);
    }
  }
}

module.exports = {
  rootDir,
  schemaDir,
  exampleDirs,
  docEntryDirs,
  loadYaml,
  walkYamlFiles,
  defaultTargets,
  isBaseDoc,
  entriesIn,
  findRefs,
};
