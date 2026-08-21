#!/usr/bin/env node
// Validates entry and base document YAML file(s) against the proposed
// structure:
//   - JSON Schema shape: each entry is checked against its own
//     entries/<kind>.schema.yaml, falling back to the generic
//     entry.schema.yaml for a kind with no dedicated file (either a
//     custom kind, or the well-known generic `entry` kind, which has
//     no fields of its own). Each section is checked against its own
//     sections/<kind>.schema.yaml, falling back to the generic
//     section.schema.yaml for a custom kind or the well-known generic
//     `section` kind. Any entry kind may use any section kind - there
//     is no placement gate.
//   - A ref's `to` (see common/ref.schema.yaml) resolves within the
//     document: a bare id names a real entry or shared entry, and
//     entryId#itemId also resolves the item half. Document-wide - only
//     checked for base documents, since a standalone entry file can't see
//     any entry but itself. Doesn't follow `rel: file` to a sibling
//     document - a corpus split across files needs project scope, which
//     this validator doesn't have yet.
// A file with a `schemaVersion` key is a base document (base.schema.yaml);
// its inline `entries` are checked the same way a standalone entry file's
// are - one validator, no special-casing. System-wide facts and
// documentation live on that list's own `kind: system` entry, not on the
// base document directly.
"use strict";

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { rootDir, schemaDir, loadYaml, walkYamlFiles, defaultTargets, findRefs, entriesIn } = require("./lib");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Stable ids for every semantic (hand-written, not pure-schema) check this
// validator enforces - so a bug report, a fixture, or an independent
// validator reimplementation can cite exactly which rule failed instead of
// matching on free-text message wording. Deliberately NOT applied to pure
// JSON Schema errors (from ajv's own `.errors`) - those are already tied to
// the schema itself via instancePath/schemaPath, which is its own stable
// citation. See examples/invalid/ for one fixture per id, and
// tools/conformance-test.js for the runner that checks each fixture
// actually trips the id it claims to.
//
// The catalog itself lives in schema/conformance-rules.yaml, not here -
// that's the single source both this lookup and the Conformance page's
// rule list are generated from, so the two can't drift apart.
const RULES = Object.fromEntries(
  loadYaml(path.join(rootDir, "schema/conformance-rules.yaml")).map((rule) => [rule.name, rule.id])
);

function err(id, message) {
  return `[${id}] ${message}`;
}

// Register every schema file under schema/ by its $id, so $refs
// between common/, sections/, entries/, and base all resolve. Also keep the
// raw parsed schema objects around (schemaById), so discriminator-aware
// validation below can reach into component's own `traits.items.anyOf`
// list instead of only having compiled validate functions to work with.
const schemaById = new Map();
for (const file of walkYamlFiles(schemaDir)) {
  const schema = loadYaml(file);
  ajv.addSchema(schema, schema.$id);
  schemaById.set(schema.$id, schema);
}

function schemaFor(id, fallbackId, profileId) {
  if (profileId) {
    const profileValidate = ajv.getSchema(profileId);
    if (profileValidate) return profileValidate;
  }
  return ajv.getSchema(id) || ajv.getSchema(fallbackId);
}

// Optional local profiles: a project can drop a file at
// profiles/entries/<kind>.schema.yaml or profiles/sections/<kind>.schema.yaml
// that narrows an existing kind (built-in or custom) by $ref-ing its real
// schema.yaml file via allOf and adding `required`/`if`-`then` on top -
// never a new field. See site/content/extending.mdx for the one rule
// (a profile may narrow, must not extend) and why that's what makes this
// safe to build on.
//
// Read here, and only here - profiles/ is a sibling of schema/, not
// nested inside it, so bundle.js's own walk of schema/ never sees it and
// a private profile can never leak into the published schema.
//
// A profile MUST declare its own $id, distinct from the schema it's
// profiling: adding two schemas under the same $id crashes Ajv outright
// (`schema with key or id "..." already exists`), which is exactly the
// failure mode that made profiling a built-in kind look impossible before
// this dispatch-level fix - the schema files themselves already supported
// $ref + allOf narrowing (see B1 in dsds-0.20.0-recommendations.md); only
// wiring a profile in *alongside* the built-in schema instead of *as* it
// was missing.
const PROFILES_DIR = path.join(rootDir, "profiles");
const profileEntryIdByKind = new Map(); // kind -> profile's own $id
const profileSectionIdByKind = new Map();

function loadProfiles(subdir, targetMap) {
  const dir = path.join(PROFILES_DIR, subdir);
  if (!fs.existsSync(dir)) return;
  for (const file of walkYamlFiles(dir)) {
    const schema = loadYaml(file);
    if (!schema.$id) {
      throw new Error(`Profile ${path.relative(rootDir, file)} has no $id of its own.`);
    }
    ajv.addSchema(schema, schema.$id);
    const kind = path.basename(file).replace(/\.schema\.yaml$/, "");
    targetMap.set(kind, schema.$id);
  }
}
loadProfiles("entries", profileEntryIdByKind);
loadProfiles("sections", profileSectionIdByKind);

// ---------------------------------------------------------------------------
// Project discovery: following rel: file across sibling documents
// ---------------------------------------------------------------------------
//
// A large system's documentation is meant to be split across files (see
// base.schema.yaml's own $comment), each pointing at the others via an
// ordinary `refs` entry (rel: file). A validator handed just one of those
// files can't tell a genuinely broken `to:` from one that resolves in a
// sibling it hasn't read - see C1 in notes/recommendations.md. This follows
// that same rel: file link transitively, so resolution can run against the
// whole project instead of just the one file it was handed.
//
// Bounded to ROOT_DIR - an href that resolves outside it is never read.
// That's a real security boundary, not just tidiness: a hosted validator
// fed an attacker-controlled document must not follow an href like
// `../../../etc/passwd` onto the host's own filesystem.
const ROOT_DIR = path.resolve(rootDir);

function resolveHref(href, fromAbsPath) {
  return path.resolve(path.dirname(fromAbsPath), href);
}

function isWithinRoot(absPath) {
  const rel = path.relative(ROOT_DIR, absPath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// Returns every entry/shared entity reachable from entryAbsPath by
// following rel: file transitively, including entryAbsPath's own. A
// sibling that doesn't exist, fails to parse, or resolves outside
// ROOT_DIR is silently skipped - the caller can't tell "doesn't exist"
// from "this validator couldn't check," so an unresolved target after
// this is a warning, never a hard error (see validateItemRefs).
function loadProject(entryAbsPath) {
  const visited = new Map(); // absPath -> doc
  const queue = [entryAbsPath];

  while (queue.length) {
    const absPath = queue.shift();
    if (visited.has(absPath)) continue;
    if (!isWithinRoot(absPath) || !fs.existsSync(absPath)) continue;
    let doc;
    try {
      doc = loadYaml(absPath);
    } catch (e) {
      continue;
    }
    visited.set(absPath, doc);
    for (const fileRef of doc.refs || []) {
      if (fileRef && fileRef.rel === "file" && typeof fileRef.href === "string") {
        queue.push(resolveHref(fileRef.href, absPath));
      }
    }
  }

  return [...visited.values()].flatMap((d) => entriesIn(d));
}

// The current spec version, read back out of any loaded schema's own
// $id (they all encode the same version) rather than hardcoded — so this
// file never needs touching on a version bump. See scripts/bump-version.js,
// which rewrites every schema file's own $id but has no reason to know
// this file exists.
const SPEC_VERSION = (() => {
  for (const id of schemaById.keys()) {
    const m = /\/v([^/]+)\//.exec(id);
    if (m) return m[1];
  }
  throw new Error("Could not determine the spec version from any loaded schema's $id.");
})();

function specUrl(relPath) {
  return `https://designsystemdocspec.org/v${SPEC_VERSION}/${relPath}`;
}

// A branch is either a plain object schema, or one that extends a shared
// base via allOf (a component's own trait branches do) - the discriminator
// field can live on either shape: as a sibling of the branch's own `allOf`
// (the current open-base + closing-leaf pattern - see
// docs-new/content/architecture.mdx #3, unevaluatedProperties needs `properties` there
// too), or inside one of the allOf's own array elements (older shape, kept
// as a fallback so this doesn't silently break again if that ever comes
// back). Returns the set of tag values this branch matches, or null if the
// branch has no such field at all.
function branchDiscriminatorValues(branch, prop) {
  const candidates = [branch, ...(branch.allOf || [])];
  for (const candidate of candidates) {
    const propSchema = candidate.properties && candidate.properties[prop];
    if (!propSchema) continue;
    if (propSchema.const !== undefined) return [propSchema.const];
    if (Array.isArray(propSchema.enum)) return propSchema.enum;
  }
  return null;
}

const branchValidatorCache = new Map();
function compileBranch(branch) {
  let validate = branchValidatorCache.get(branch);
  if (!validate) {
    validate = ajv.compile(branch);
    branchValidatorCache.set(branch, validate);
  }
  return validate;
}

// Brute-forcing all of AJV's anyOf branches on a typo produces one error
// per branch per required/additional-properties check - 20+ irrelevant
// lines for a single missing field. Since every branch already declares
// which tag value it's for (`const`/`enum` on this field), we can read the
// tag first and validate only against the one matching branch instead.
// Generic over where the discriminated array actually lives - a
// component's own `traits` today, a section's `items` in the past - the
// caller passes in the already-resolved branch list.
function validateDiscriminatedItems(items, branches, prop, label, errors) {
  const fallbackBranch = branches.find((b) => branchDiscriminatorValues(b, prop) === null);
  const knownValues = [...new Set(branches.flatMap((b) => branchDiscriminatorValues(b, prop) || []))];

  for (const [i, item] of (items || []).entries()) {
    const itemLabel = `${label}[${i}]`;
    const value = item && item[prop];

    let branch;
    if (value === undefined) {
      branch = fallbackBranch;
      if (!branch) {
        errors.push(`${itemLabel} is missing "${prop}" (expected one of [${knownValues.join(", ")}])`);
        continue;
      }
    } else {
      branch = branches.find((b) => (branchDiscriminatorValues(b, prop) || []).includes(value));
      if (!branch) {
        errors.push(`${itemLabel} has "${prop}": ${JSON.stringify(value)}, which is not one of [${knownValues.join(", ")}]`);
        continue;
      }
    }

    const validateBranch = compileBranch(branch);
    if (!validateBranch(item)) {
      const tag = value !== undefined ? value : "(untagged)";
      for (const err of validateBranch.errors) {
        errors.push(`${itemLabel} (${prop}: ${tag}) schema: ${err.instancePath || "/"} ${err.message}`);
      }
    }
  }
}

function traitsBranches() {
  const schema = schemaById.get(specUrl("entries/component.schema.yaml"));
  return schema.allOf[1].properties.traits.items.anyOf;
}

function validateSections(sections, label, errors) {
  for (const [i, section] of (sections || []).entries()) {
    const sectionSchemaId = specUrl(`sections/${section.kind}.schema.yaml`);
    const validateSection = schemaFor(sectionSchemaId, specUrl("section.schema.yaml"), profileSectionIdByKind.get(section.kind));
    const sectionLabel = `${label} section[${i}] (${section.kind})`;

    if (!validateSection(section)) {
      for (const err of validateSection.errors) {
        errors.push(`${sectionLabel} schema: ${err.instancePath || "/"} ${err.message}`);
      }
    }
  }
}

// `sections` now dispatches per kind too (entry.schema.yaml#/$defs/sections
// -> section.schema.yaml#/$defs/dispatch), so the same-shape whole-entry
// check below already reports a bad section - skip those here, since
// validateSections() below reports the identical problem with a section
// index and kind in the label instead of a bare instancePath.
const NESTED_SECTION_ERROR = /^\/sections\/\d/;

function validateEntry(entry, errors) {
  const entrySchemaId = specUrl(`entries/${entry.kind}.schema.yaml`);
  const validate = schemaFor(entrySchemaId, specUrl("entry.schema.yaml"), profileEntryIdByKind.get(entry.kind));
  const isComponent = entry.kind === "component";

  if (!validate(entry)) {
    for (const err of validate.errors) {
      // Per-trait shape errors are replaced below with discriminator-aware
      // ones; everything else still gets reported straight from AJV.
      if (isComponent && err.instancePath.startsWith("/traits")) continue;
      if (NESTED_SECTION_ERROR.test(err.instancePath)) continue;
      errors.push(`entry "${entry.id}" schema: ${err.instancePath || "/"} ${err.message}`);
    }
    if (isComponent && Array.isArray(entry.traits)) {
      validateDiscriminatedItems(entry.traits, traitsBranches(), "kind", `entry "${entry.id}" traits`, errors);
    }
  }
  validateSections(entry.sections, `entry "${entry.id}"`, errors);
  validateSemanticRules(entry, errors);
}

function validateShared(entry, errors) {
  const validate = ajv.getSchema(specUrl("shared.schema.yaml"));
  if (!validate(entry)) {
    for (const err of validate.errors) {
      if (NESTED_SECTION_ERROR.test(err.instancePath)) continue;
      errors.push(`shared "${entry.id}" schema: ${err.instancePath || "/"} ${err.message}`);
    }
  }
  validateSections(entry.sections, `shared "${entry.id}"`, errors);
  validateSemanticRules(entry, errors);
}

// Checks that can't be expressed as a single item's shape - they need to
// see across an entry's sections (or its own top-level fields) at once.
function validateSemanticRules(entry, errors) {
  const sections = entry.sections || [];

  // A rule claiming checkedBy: automated needs somewhere to actually run -
  // a refs (or the more specific checks) entry pointing at the real
  // test/lint-rule that does it, so "automated" isn't just an unverifiable
  // label. Doesn't require the ref to resolve to a real file
  // (tools/validate.js has no filesystem access to every referenced
  // test), just that a check-shaped pointer exists.
  for (const section of sections) {
    if (section.kind !== "guidelines") continue;
    for (const [i, item] of (section.items || []).entries()) {
      if (item.checkedBy !== "automated") continue;
      const hasCheckRef = [...(item.refs || []), ...(item.checks || [])].some((r) => r.rel === "test" || r.rel === "lint-rule");
      if (!hasCheckRef) {
        errors.push(
          err(RULES.CHECKED_BY_NEEDS_REF, `entry "${entry.id}" ${section.kind} item[${i}] declares checkedBy: automated but has no refs/checks entry (rel: test, lint-rule) pointing at what actually runs the check`)
        );
      }
    }
  }

  // One sourceFiles entry per platform (including "no platform given",
  // which all share the same bucket) - a component can't point a tool at
  // two different source files for the same platform's interface.
  const sourceFilesByPlatform = new Map();
  for (const sourceFile of entry.sourceFiles || []) {
    const key = sourceFile.platform || "(unspecified)";
    sourceFilesByPlatform.set(key, (sourceFilesByPlatform.get(key) || 0) + 1);
  }
  for (const [platform, count] of sourceFilesByPlatform) {
    if (count > 1) {
      errors.push(err(RULES.ONE_API_PER_PLATFORM, `entry "${entry.id}" declares ${count} sourceFiles entries for platform "${platform}" - only one is allowed per platform`));
    }
  }
}

// base.schema.yaml's own `entries`/`shared` items now dispatch per kind
// (see entry.schema.yaml#/$defs/dispatch), the same shape the loop below
// checks in JS - needed so the bundled schema an editor's $schema points
// at is exactly as strict as this CLI (see C2). That means a bad entry or
// shared item shows up in `validate`'s own Ajv errors here too; skip those
// - the per-entry/per-shared loop below reports the identical problem
// with better context (an id, kind-aware messages, discriminated `traits`
// errors). Keep everything else this Ajv pass catches (a bogus top-level
// base document field, an empty `entries`/`shared` array).
const NESTED_ENTRY_OR_SHARED_ERROR = /^\/(entries|shared)\/\d/;

function validateBase(doc, errors, warnings, opts = {}) {
  const validate = ajv.getSchema(specUrl("base.schema.yaml"));
  if (!validate(doc)) {
    for (const err of validate.errors) {
      if (NESTED_ENTRY_OR_SHARED_ERROR.test(err.instancePath)) continue;
      errors.push(`base schema: ${err.instancePath || "/"} ${err.message}`);
    }
  }
  for (const entry of doc.entries || []) {
    validateEntry(entry, errors);
  }
  for (const entry of doc.shared || []) {
    validateShared(entry, errors);
  }

  // entries and shared entries share one id/addressing space (an
  // entryId#itemId ref can't tell which array its entryId half came from),
  // so a collision between the two is exactly as broken as a collision
  // within `entries` alone.
  const seenIds = new Set();
  for (const entity of entriesIn(doc)) {
    if (seenIds.has(entity.id)) {
      errors.push(err(RULES.UNIQUE_ENTRY_ID, `id "${entity.id}" is declared more than once in this document (entries and shared entries share one id space)`));
    }
    seenIds.add(entity.id);
  }

  // When a `kind: system` entry declares `metadata.platforms`, every
  // `platform` value used anywhere in the document must be one of its
  // entries - one declaration, checked everywhere, instead of free
  // strings that can silently drift apart. Platforms aren't a bespoke
  // base-level field; they live on a system entry's own metadata, the
  // same shape every entry's metadata uses.
  const declaredPlatforms = (doc.entries || [])
    .filter((e) => e.kind === "system")
    .flatMap((e) => (e.metadata && e.metadata.platforms) || []);
  if (declaredPlatforms.length) {
    const known = new Set(declaredPlatforms);
    for (const entry of doc.entries || []) {
      for (const [i, sourceFile] of (entry.sourceFiles || []).entries()) {
        if (sourceFile.platform && !known.has(sourceFile.platform)) {
          errors.push(
            err(RULES.PLATFORM_VOCABULARY, `entry "${entry.id}" sourceFiles[${i}] declares platform "${sourceFile.platform}", which is not in the system entry's metadata.platforms [${[...known].join(", ")}]`)
          );
        }
      }
      for (const [i, item] of (entry.imports || []).entries()) {
        if (item.platform && !known.has(item.platform)) {
          errors.push(
            err(RULES.PLATFORM_VOCABULARY, `entry "${entry.id}" imports[${i}] declares platform "${item.platform}", which is not in the system entry's metadata.platforms [${[...known].join(", ")}]`)
          );
        }
      }
      const entryStatus = entry.metadata && entry.metadata.status;
      if (entryStatus && entryStatus.platform && !known.has(entryStatus.platform)) {
        errors.push(
          err(RULES.PLATFORM_VOCABULARY, `entry "${entry.id}" metadata.status declares platform "${entryStatus.platform}", which is not in the system entry's metadata.platforms [${[...known].join(", ")}]`)
        );
      }
    }
  }

  validateItemRefs(doc, errors, warnings, opts);
  validateGraphCycles(doc, errors);
}

// DFS-based cycle detection over a directed adjacency list (Map<string,
// Set<string>>). Standard 3-color (white/gray/black) walk: a gray node
// reached again while still on the current path is the cycle. Returns the
// cycle as an ordered array of ids, or null if the graph is acyclic.
function findCycle(edges) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  const stack = [];
  let cycle = null;

  function visit(node) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of edges.get(node) || []) {
      if (cycle) return;
      const state = color.get(next) || WHITE;
      if (state === WHITE) {
        visit(next);
      } else if (state === GRAY) {
        const start = stack.indexOf(next);
        cycle = stack.slice(start).concat(next);
      }
      if (cycle) return;
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const node of edges.keys()) {
    if (cycle) break;
    if ((color.get(node) || WHITE) === WHITE) visit(node);
  }
  return cycle;
}

// DSDS-06/DSDS-07: a `composes` or `depends-on` ref chain must not lead
// back to an entry already in the chain (see
// notes/2026-08-17-graph-rigor-and-composition-prd.md, Design A). Built
// from every {to, rel} pair anywhere in the document (findRefs already
// walks an entity's full nested shape for DSDS-05's item-ref resolution) -
// only the bare-entry form of `to` forms a graph edge here; an
// `entryId#itemId` ref points at content inside an entry, not at another
// node in the composition/dependency graph. Each rel is checked as its own
// independent graph - a `composes` cycle and a `depends-on` cycle are two
// different rules, not one merged graph, since mixing the two relations
// would report a "cycle" that isn't really one chain of the same kind of
// edge.
function validateGraphCycles(doc, errors) {
  const entities = entriesIn(doc);
  const relsToCheck = [
    { rel: "composes", ruleId: RULES.COMPOSES_CYCLE },
    { rel: "depends-on", ruleId: RULES.DEPENDS_ON_CYCLE },
  ];

  for (const { rel, ruleId } of relsToCheck) {
    const edges = new Map();
    for (const entity of entities) {
      const found = [];
      findRefs(entity, "", found);
      for (const { to, rel: foundRel } of found) {
        if (foundRel !== rel || to.includes("#")) continue;
        if (!edges.has(entity.id)) edges.set(entity.id, new Set());
        edges.get(entity.id).add(to);
      }
    }
    const cycle = findCycle(edges);
    if (cycle) {
      errors.push(err(ruleId, `"${rel}" ref chain forms a cycle: ${cycle.join(" -> ")}`));
    }
  }
}

// Every item id declared anywhere on an entry - the resolution target for
// an entryId#itemId ref (see common/ref.schema.yaml's `to`). Walks into
// any nested array of objects (a component's own trait `values`, a
// freeform entry's own nested `items`), not just a section's top-level
// `items` array, so an id is addressable no matter how deep it sits. Not
// every item shape carries an `id`; this only indexes the ones that do, so
// a ref at an entry that exists but an item that doesn't reports the same
// "unknown item" error a typo would.
function collectItemIds(entry) {
  const ids = new Set();
  function walk(item) {
    if (!item || typeof item !== "object") return;
    if (typeof item.id === "string") ids.add(item.id);
    for (const value of Object.values(item)) {
      if (Array.isArray(value)) {
        for (const child of value) walk(child);
      }
    }
  }
  for (const section of entry.sections || []) {
    for (const item of section.items || []) walk(item);
    for (const item of section.freeform || []) walk(item);
  }
  for (const trait of entry.traits || []) walk(trait);
  return ids;
}

// Resolves a ref's `to` against the document's actual entries/shared
// entries and their items - only meaningful for a base document, since a
// standalone entry file has no other entries to point at. A `same-as` ref
// most often targets a `base.shared` entry (that's the whole point of
// `shared` - one canonical statement, pointed at from many entries), so
// both arrays share this one id space via entriesIn(doc). Skips anything
// that isn't a real internal pointer at all ("://" anywhere in `to` marks
// an ordinary URL fragment, not an id or entryId#itemId).
//
// Two distinct checks:
//   - Bare `to` (DSDS-08): does the named entry/shared entry exist.
//   - `to: entryId#itemId` (DSDS-05): does the entry exist, and does the
//     named item exist somewhere in its sections.
//
// A target found among this document's own entities is always checked -
// that's a space this validator can fully see, whatever else is true.
// When it isn't found here:
//   - A self-contained document (no `rel: file` ref anywhere in its own
//     top-level `refs`) has nowhere else the target could be. Unresolved
//     here means genuinely broken - a hard error.
//   - A document that declares `rel: file` is part of a larger project.
//     loadProject() follows that link (transitively, bounded to
//     ROOT_DIR - see above) and re-checks against the merged result. A
//     target this still can't find is reported, but only as a warning:
//     a sibling that couldn't be read (missing, outside the root) makes
//     the search incomplete, and a validator that can't see the whole
//     project MUST NOT assert a pointer is broken with the same
//     confidence as one it fully resolved. `--strict` promotes these to
//     failures once a project is clean.
function validateItemRefs(doc, errors, warnings, opts = {}) {
  const isSplitAcrossFiles = (doc.refs || []).some((r) => r && r.rel === "file");
  const localEntities = entriesIn(doc);
  const localIds = new Set(localEntities.map((e) => e.id));
  const localItemIdsByEntity = new Map(localEntities.map((e) => [e.id, collectItemIds(e)]));

  // Only touches the filesystem when this document actually declares a
  // rel: file ref - a self-contained document never triggers project
  // discovery at all.
  let projectIds = null;
  let projectItemIdsByEntity = null;
  if (isSplitAcrossFiles && opts.filePath) {
    const projectEntities = loadProject(path.resolve(opts.filePath));
    projectIds = new Set(projectEntities.map((e) => e.id));
    projectItemIdsByEntity = new Map(projectEntities.map((e) => [e.id, collectItemIds(e)]));
  }

  for (const entity of localEntities) {
    const found = [];
    findRefs(entity, "", found);
    for (const { to, rel, at } of found) {
      if (to.includes("://")) continue;
      const label = `"${entity.id}" ref${at ? ` (${at})` : ""} "${to}" (rel: ${rel})`;
      const hashIdx = to.indexOf("#");
      const scopeNote = "(checked this project's rel: file closure)";

      if (hashIdx === -1) {
        if (!to || localIds.has(to)) continue;
        if (!isSplitAcrossFiles) {
          errors.push(err(RULES.ENTRY_REF_RESOLVES, `${label} targets unknown entry/shared "${to}"`));
        } else if (!projectIds || !projectIds.has(to)) {
          warnings.push(err(RULES.ENTRY_REF_RESOLVES, `${label} targets unknown entry/shared "${to}" ${scopeNote}`));
        }
        continue;
      }

      const targetId = to.slice(0, hashIdx);
      const itemId = to.slice(hashIdx + 1);
      if (!targetId || !itemId) continue;

      const localItemIds = localItemIdsByEntity.get(targetId);
      if (localItemIds) {
        if (!localItemIds.has(itemId)) {
          errors.push(err(RULES.ITEM_REF_RESOLVES, `${label} targets unknown item "${itemId}" on "${targetId}"`));
        }
        continue;
      }

      if (!isSplitAcrossFiles) {
        errors.push(err(RULES.ITEM_REF_RESOLVES, `${label} targets unknown entry/shared "${targetId}"`));
        continue;
      }

      const projectItemIds = projectItemIdsByEntity && projectItemIdsByEntity.get(targetId);
      if (!projectItemIds) {
        warnings.push(err(RULES.ITEM_REF_RESOLVES, `${label} targets unknown entry/shared "${targetId}" ${scopeNote}`));
      } else if (!projectItemIds.has(itemId)) {
        warnings.push(err(RULES.ITEM_REF_RESOLVES, `${label} targets unknown item "${itemId}" on "${targetId}" ${scopeNote}`));
      }
    }
  }
}

// The reusable core: given an already-parsed document, returns every
// error (both pure-schema and RULES-tagged semantic ones) and every
// warning (a project-scope finding this validator couldn't confirm with
// full confidence - see validateItemRefs) as strings. No I/O beyond what
// opts.filePath's project discovery does, no process exit -
// tools/conformance-test.js reuses this exact function so a fixture is
// checked against the same logic validate.js's own CLI runs, not a
// second copy of it.
//
// opts.filePath is only needed to resolve a rel: file project - pass it
// whenever the document being validated came from a real file on disk.
function validateDoc(doc, opts = {}) {
  const errors = [];
  const warnings = [];
  const isBase = typeof doc.schemaVersion !== "undefined";
  if (isBase) {
    validateBase(doc, errors, warnings, opts);
  } else {
    validateEntry(doc, errors);
  }
  return { errors, warnings };
}

function validateFile(target, opts = {}) {
  const doc = loadYaml(target);
  const isBase = typeof doc.schemaVersion !== "undefined";
  const { errors, warnings } = validateDoc(doc, { filePath: target });

  const rel = path.relative(rootDir, target);
  if (errors.length) {
    console.error(`✗ ${rel} failed validation:\n`);
    for (const e of errors) console.error(`  - ${e}`);
    if (warnings.length) {
      console.error(`\n  ${warnings.length} warning(s):`);
      for (const w of warnings) console.error(`  - ${w}`);
    }
    return false;
  }

  if (warnings.length && opts.strict) {
    console.error(`✗ ${rel} failed validation in --strict mode:\n`);
    for (const w of warnings) console.error(`  - ${w}`);
    return false;
  }

  console.log(`✓ ${rel}`);
  if (isBase) {
    const sharedCount = (doc.shared || []).length;
    console.log(`  base document  schemaVersion: ${doc.schemaVersion}  ${(doc.entries || []).length} entry(ies)${sharedCount ? `, ${sharedCount} shared` : ""}, ${(doc.refs || []).length} ref(s)`);
  } else {
    console.log(`  ${doc.kind} "${doc.id}"  status: ${JSON.stringify(doc.metadata && doc.metadata.status)}`);
    console.log(`  ${(doc.sections || []).length} section(s), ${(doc.refs || []).length} ref(s)`);
  }
  if (warnings.length) {
    console.log(`  ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  return true;
}

// Only run the CLI when invoked directly - tools/conformance-test.js
// requires this file for validateDoc/RULES and must not trigger a second
// full validate run (with its own process.exit) as a side effect.
if (require.main === module) {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const targets = args.filter((a) => a !== "--strict");
  const resolvedTargets = targets.length ? targets : defaultTargets();

  let ok = true;
  for (const target of resolvedTargets) {
    if (!validateFile(target, { strict })) ok = false;
  }
  process.exit(ok ? 0 : 1);
}

module.exports = { validateDoc, RULES };
