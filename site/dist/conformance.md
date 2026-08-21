# Conformance — DSDS 0.20.0

This page defines what it means to conform to the Design System Doc Spec {{VERSION}}, how the schema itself is put together, what's stable versus still in flux ahead of 1.0, and indexes every normative statement the spec makes.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** in the DSDS schemas and on this page are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) (as clarified by [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)): they are normative only when they appear in upper case.

## How the schema is organized

This spec is built from a small, fixed set of shapes, reused rather than reinvented per file.

**An entry.** [`entry.schema.yaml`](entries-entry.html) is the open base every entry kind shares: `id`, `kind`, `name`, `description` (required), plus `purpose`, `metadata`, `refs`, `sections`, `$extensions` (optional). The 4 kinds with fields beyond that base (`system`, `component`, `token`, `theme`) each have their own `entries/<kind>.schema.yaml` file extending this base. The 5th kind, the generic `entry`, has no fields beyond it, so there's no dedicated file — an entry of that kind, or a namespaced custom kind (`acme.icon-library`), is checked against `entry.schema.yaml` directly.

**A section.** Every section kind is built the same way: [`sections/section.schema.yaml`](sections-section.html) supplies `kind`, `for`, `title`, `description`, `items`, `metadata`, `$extensions`, and each kind (`definitions`, `guidelines`, `steps`, or the generic `section`) extends it with its own `items` shape. A section's content always lives in `items`, never under a kind-specific key.

**Open-base + closing-leaf.** When a kind-specific file extends a shared base like the two above, it does so via `allOf`, closed with `unevaluatedProperties: false` rather than repeating the base's own fields. This is the one structural pattern every `entries/*` and `sections/*` file follows.

**Heterogeneous items.** When one array can hold genuinely different shapes (like a component's own `traits`, which can be `kind: boolean` or `kind: enum`), the schema discriminates with `anyOf` plus a `kind` tag. When items only differ in which *optional* fields are populated — nothing that could be mistaken for another shape — one flexible object is used instead, with no tag at all (`steps` and `guidelines` both work this way).

**One pointer type.** `common/ref.schema.yaml` is the only way anything points at anything else, internal or external: `to` (this document's own graph) or `href` (outside it), plus a `rel` naming the relationship (`depends-on`, `composes`, `same-as`, `extends`, `source`, `external-link`, and more — see the schema file for the full, open list).

See [Schema architecture on the repo](https://github.com/somerandomdude/design-system-documentation-schema/blob/main/schema/) for the full annotated source — every file's own `$comment` explains the reasoning behind its shape.

## Where the normative text lives

DSDS keeps its normative language inside the schema `description` strings, next to the structures that enforce it. The schema *is* the specification. The index at the bottom of this page is generated from the schemas on every build to avoid drift. Cite statements by their location-based ID (ex: `common/ref§note.1`). An ID only changes when the schema path it points to changes. That signals a citation needs to be checked.

## Conformance classes

DSDS defines four conformance classes. A claim of conformance names the class it applies to.

### Conforming document

A document that validates against the DSDS schema for the version its `schemaVersion` declares, **and** satisfies the semantic rules that JSON Schema alone can't express — the `DSDS-01` through `DSDS-07` catalog below.

Schema validity alone is necessary, but not enough.

### Conforming producer

A tool or person that emits DSDS documents. A conforming producer:

- MUST emit conforming documents
- MUST NOT emit a deprecated form in new output (a deprecated form exists only for reading old documents, never for writing new ones)
- SHOULD record how the documentation was produced, via the `metadata.origin` field

### Conforming consumer

A tool, renderer, or agent that reads DSDS documents. A conforming consumer:

- MUST NOT fail on optional fields it doesn't recognize
- MUST preserve `$extensions` data it doesn't understand
- MUST treat an unresolvable `entryId#itemId` reference as a defect, not silently drop it
- MUST respect RFC 2119 levels on guidance it acts on (a `must-not` guideline is a hard gate for an agent writing code)
- SHOULD index a document's `refs` bidirectionally at load time (e.g. to answer "what depends on X"), rather than expect the document to store the inverse edge — DSDS never stores a derived fact a consumer can compute from the ones it does store

### Conforming validator

A tool that checks documents. A conforming validator MUST enforce both the structural layer (the schema itself, with format assertion enabled) and the semantic layer (the `DSDS-01`–`DSDS-07` rules below). The reference implementation is `scripts/validate.js`. Its negative-fixture suite in `examples/invalid/` pins every guard — `scripts/conformance-test.js` confirms each fixture trips the exact rule id it claims — and doubles as a conformance test suite for independent validators.

## Enforcement tiers

Every normative statement is enforced at one of two tiers, or is explicitly advisory:

| Tier | Mechanism | Failure mode |
|---|---|---|
| Structural | The schema itself (patterns, required, minItems, allOf/oneOf/anyOf, if/then) | Validation error — blocking |
| Semantic | `scripts/validate.js`'s hand-written checks (`DSDS-01`–`DSDS-07`: resolution, uniqueness, platform vocabulary, cycles) | Validation error — blocking |
| Advisory | SHOULD/MAY statements consumed by judgment | None |

## Semantic rule catalog

The catalog of record lives in `schema/conformance-rules.yaml` — this table is generated from it, so it cannot drift from what `scripts/validate.js` actually enforces.

| ID | Rule |
|---|---|
| `DSDS-01` | At most one `sourceFiles` entry per platform. |
| `DSDS-02` | A system entry's `metadata.platforms` closes the platform vocabulary, once declared. |
| `DSDS-03` | A `checkedBy: automated` rule needs somewhere to actually run. |
| `DSDS-04` | Entry and shared ids are unique within a document. |
| `DSDS-05` | An `entryId#itemId` ref must resolve. |
| `DSDS-06` | A `composes` ref chain must not cycle. |
| `DSDS-07` | A `depends-on` ref chain must not cycle. |

`DSDS-06` and `DSDS-07` restore a check the pre-0.20.0 spec had (relationship-graph cycle prohibition) that the schema rewrite initially dropped — added as validator-side rules rather than a schema shape change. A `DSDS-08` (cross-file `href#itemId` resolution, for documents composed via `scripts/compose.js`) is designed but not yet implemented.

## Stability and the road to 1.0

DSDS {{VERSION}} is a **pre-1.0 draft**. Some parts of the schema absorb new vocabulary without a spec change. Other parts are closed, load-bearing structural decisions that need a spec change. This section tells those apart.

### How schema changes get made

Every schema file under `schema/` carries `$comment` fields that explain *why* a shape is the way it is. In several places, they also explain what the shape replaced and why the replacement is better. Reading those comments alongside the schema is the current source of truth for the spec's own change history — there is no separate, versioned changelog yet. See the [`CHANGELOG`](https://github.com/somerandomdude/design-system-documentation-schema/blob/main/CHANGELOG) for the field-by-field mapping from the pre-0.20.0 entity/document-block model.

### Designed to grow without a version bump

A handful of fields are open, pattern-validated strings rather than closed enums, so new values don't require a schema change. Treat these as safe to build tooling around — your validator, generator, or docs site must not hardcode the current set of values for any of them.

- **`entries/token.tokenType`** — A token's category (`color`, `spacing`, `typography`, ...) is validated by pattern, not an enum. A new token category is just a new string.
- **`common/ref.rel`** — The relationship a ref expresses (`depends-on`, `same-as`, `implements`, ...) is open. New well-known values get documented in the schema's own `$comment`, not gated behind a release.
- **`metadata.status`'s status value** — `stable`/`experimental`/`deprecated`/... is open too, for the same reason: this spec doesn't dictate a project's lifecycle vocabulary.
- **`entry.id` and `common/id`** — A lowercase-dash-dot pattern, not a fixed list of segments — accepts whatever hierarchy your system actually has.
- **`$extensions`** — A namespaced escape hatch for vendor or tool data at the entry or section level. A tool integration never has to wait on a spec release to add a field.

### More likely to be load-bearing

A few shapes are closed enums because the number of cases is a structural fact about the spec, not an open vocabulary. If you build a tool that must survive schema evolution, code defensively against this list, not the one above.

- **`entry.kind`** — 5 well-known values (`system`, `component`, `token`, `theme`, `entry`), 4 with their own `entries/<kind>.schema.yaml` file, plus a namespaced custom-kind escape hatch (e.g. `acme.icon-library`) for a document that wants its own recognizable name instead of the generic `entry`. Adding a well-known value changes what "kind of thing" this spec can describe at all, not just a detail within one — that bar stays high.
- **`common/requirement-level`** — 5 values (`must`, `should`, `should-not`, `must-not`, `may`), matching RFC 2119. This is borrowed vocabulary, not this spec's to extend.
- **`sections/*` (the 4 section kinds)** — `guidelines`, `definitions`, `steps`, `section`. Any entry kind can use any of them; there's no per-kind gating. `section` is the generic fallback, the same role `entry` plays for entries. `freeform` is not a section kind at all — it's a field every section kind can carry. This is the part of the schema most likely to still change before 1.0.

### Criteria for declaring 1.0

1.0 is declared when, at minimum:

1. **The section-kind set and entry-kind set stop changing** — across at least one real consolidation pass, with no further merge or split needed.
2. **A second independent consumer exists** — at least one tool the spec authors don't maintain reads or writes DSDS documents in earnest. This tests the spec's assumptions from outside.
3. **The validator's semantic-rule surface is stable** — the checks pure JSON Schema can't express (`scripts/validate.js`), covered above under [Semantic rule catalog](#semantic-rule-catalog). The project doesn't add or rename them release to release.

Until then, the closed enums above are the most stable part of the schema. Everything else can still change between minor versions, including the exact shape of any one `sections/*.schema.yaml` file.

## Normative statements index

{/* dsds:normative-index */}

*Generated from the v{{VERSION}} schemas by `scripts/extract-normative.mjs` — do not edit by hand. 1 statements: 0 MUST, 1 MUST NOT, 0 SHOULD, 0 SHOULD NOT, 0 MAY.*

### metadata

#### metadata/metadata

- **MUST NOT** — MUST NOT contain markup. <small>`metadata/metadata§note.1`</small>

{/* /dsds:normative-index */}
