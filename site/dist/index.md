# Design system doc spec 0.20.0

**Draft Specification:**
This is a draft. It can still change. No standards body has endorsed it yet. We welcome feedback and contributions on GitHub.

* **Latest version:** [GitHub repo](https://github.com/somerandomdude/design-system-documentation-schema)
* **Feedback:** [GitHub Issues](https://github.com/somerandomdude/design-system-documentation-schema/issues)

---

## A machine-readable format for design system documentation

This standard puts design system docs in one shared format that any tool can read. A DSDS document is a [**base**](schema.html#base): a `schemaVersion`, a `name`, and a list of [**entries**](schema.html#entries-entry) — a [system](schema.html#entries-system), plus [components](schema.html#entries-component), [tokens](schema.html#entries-token), [themes](schema.html#entries-theme), and the generic `entry` kind for anything else. The goal is one source of truth that feeds your docs, trains your agents, and shows up everywhere your design system does.

---

## Principles

The design principles this spec is held to, and why the schema is shaped the way it is:

1. **Documentation only.** This schema focuses on capturing the how, when, and why of a design system — not the system itself.
2. **Don't copy data that lives somewhere better.** If a better source of truth exists elsewhere, link to it instead of restating it. This schema focuses on the how, when, and why — pointing at other sources rather than duplicating what they already own.
3. **The same shape, every time.** Each part of the schema follows the same structure, so writing one part teaches you how to write the rest.
4. **Simple to start with.** The goal is to keep the barrier to entry low. The schema avoids being overly technical or specific, and you can add more detail later with `$extensions` when you actually need it.
5. **Everything can link to everything else.** A design system is a network of connections, and the documentation should reflect that.
6. **There's always a way out.** The schema has opinions, but it knows those opinions won't fit every situation — so there's always a way to step outside them when you need to.
7. **Built for action.** The schema is structured to help people and agents actually use the system, in as few steps as possible.
8. **One sentence per idea.** Every schema and every field should be explainable in a single, simple sentence. If it takes more than that, it's too complicated.

---

## Flexible and modular

Design systems have different documentation needs. The schema can be as simple or as detailed as you need. DSDS has strong opinions, but it doesn't force them on you.

Every entry's structured docs live in one **sections** array. Each section has a `kind` field naming what kind of section it is. The spec defines 3 section kinds — `guidelines`, `definitions`, and `steps` — plus the generic `section`. Every section, whatever its kind, can also carry `freeform`: headed, nestable prose alongside its own structured `items`. A component also carries `sourceFiles`, `traits`, `combos`, and `imports` as fields of its own, not as sections.

Any entry kind can use any section kind — nothing restricts which section kinds go with which entry kind.

---

## Humans and agents

A DSDS document has two readers: people and AI agents. The same file serves both. Every section carries a `for` field naming its audience:

- **`for: human` or `for: all`** — the default. Everything a person needs to read and act on: definitions, guidelines, steps, freeform narrative. Agents read these too.
- **`for: agent`** — optional, agent-only notes: hard MUST/MUST NOT rules, notes that keep an agent from confusing this entry with a similar one, and checks an agent can run against its own output. Tools never surface these to people.

Write for people by default — that serves agents too. Use `for: agent` only for firm, ready-to-act notes a person wouldn't need, and keep it in sync with the human-facing sections on the same entry: it should extend them, never contradict or repeat them.

---

## Interoperability

No open standard covers the whole of design-system documentation — components, tokens, and guidelines together. The standards that do exist each cover one layer well. DSDS sits in the layer above them: it documents meaning, usage, and intent, and **points at** those formats instead of duplicating what they already own.

| Concern | Source of truth | How DSDS points at it |
|---|---|---|
| Token values and platform mappings | [W3C Design Tokens](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) (DTCG) files | A token or theme entry's `source` |
| Component source code, per platform | A source file or framework typings | A component's `sourceFiles` — pointing a tool at the real file to extract from, instead of hand-typing an interface |
| Component API contract, already generated | [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) (CEM), or another standard contract format | A component's `specs` — pointing at the generated document itself, not re-deriving it from source |
| Live component demos | Storybook or equivalent | A `refs`/`examples` entry with `rel: storybook` |
| Design artifacts | Design tool files | A `refs` entry with `rel: design`, or `metadata.preview` |
| Source code | The repository | A `refs` entry with `rel: source`, or a component's own `sourceFiles` |

DTCG owns token *values*; DSDS owns the *meaning and usage* around them. A token entry never carries an actual value, so the two files can never disagree with each other. CEM (and similar manifests) own a component's generated code-level details; DSDS doesn't repeat them, it points `specs` at the generated manifest instead — `sourceFiles` is for the raw source a manifest-generating tool reads *from*, one step earlier in the same pipeline; a component can point at either, both, or neither, depending on what a project's own tooling already produces. Wherever a machine-readable source of truth already exists, DSDS points at it instead of restating it — DSDS is only ever the source of truth for the documentation itself, never for the values or code it's documenting. See `examples/interop/` in the repo for worked examples of both relationships.

---

## Conformance

What it means for a document to follow the DSDS {{VERSION}} spec: how the schema itself is organized, what might still change before version 1.0, what it deliberately doesn't cover, and every rule the spec enforces.

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** have a specific meaning in this section and inside the DSDS schema files, as defined by [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) (updated by [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)). They only carry that meaning when written in capital letters.

### How the schema is organized

This spec is built from a small, fixed set of shapes, reused instead of reinvented per file.

**Entries.** [`entry.schema.yaml`](schema.html#entries-entry) defines the fields every entry shares: `id`, `kind`, `name`, `description` (required), plus `purpose`, `metadata`, `refs`, `sections`, and `$extensions` (optional). Four kinds need fields on top of that — `system`, `component`, `token`, and `theme` — so each gets its own `entries/<kind>.schema.yaml` file. The fifth kind, the generic `entry`, needs nothing extra, so there's no separate file for it. An `entry`, or a custom kind like `acme.icon-library`, is checked against `entry.schema.yaml` directly.

**Sections.** Every section kind works the same way: [`sections/section.schema.yaml`](schema.html#sections-section) supplies the shared fields — `kind`, `for`, `title`, `description`, `items`, `metadata`, `$extensions` — and each kind (`definitions`, `guidelines`, `steps`, or the generic `section`) adds its own shape for `items`. A section's content always lives in `items`, never under a field named after the kind.

**One shared base per kind.** A kind-specific file doesn't repeat the base's fields — it links back to the shared file (`allOf`) and adds only what's new, then closes the combined shape so no stray fields sneak in (`unevaluatedProperties: false`). Every `entries/*` and `sections/*` file follows this same pattern.

**Lists that mix different shapes.** Sometimes one list needs to hold genuinely different kinds of items — a component's `traits` list can hold a `kind: boolean` item or a `kind: enum` item, for example. The schema tells them apart using a `kind` field (`anyOf` plus a tag). When items only differ in which *optional* fields happen to be filled in — never enough to confuse one shape for another — the schema just uses one flexible shape with no tag at all. `steps` and `guidelines` both work this way.

**One way to point at things.** `common/ref.schema.yaml` is the only way anything in DSDS points at anything else, whether inside the same document or outside it: `to` points inside the document, `href` points outside it, and `rel` names the relationship (`depends-on`, `composes`, `same-as`, `extends`, `source`, `external-link`, and more — see the schema file for the full list).

See the [schema files on GitHub](https://github.com/somerandomdude/design-system-documentation-schema/blob/main/schema/) for the full source, with comments explaining the reasoning behind each one.

### Where the rules live

DSDS keeps its rules inside the schema's own `description` text, right next to the field they apply to. The schema *is* the spec — there's no separate rulebook to keep in sync. The index at the bottom of this section is regenerated from the schema on every build, so it can't drift out of date. Each rule has an ID based on where it lives in the schema (for example, `common/ref§note.1`) — if that ID changes, it means the schema moved and the rule should be double-checked wherever it's cited.

### Conformance classes

DSDS defines four ways something can "follow the spec" — a document, the tool that creates it, the tool that reads it, and the tool that checks it. When something claims to follow DSDS, it should say which of these four it means.

#### Conforming document

A document that passes schema validation for the version named in its `schemaVersion` field, **and** passes the extra rules listed below (`DSDS-01` through `DSDS-10`) that a schema file alone can't check.

Passing schema validation isn't enough on its own.

#### Conforming producer

A tool or person that creates DSDS documents. A conforming producer:

- MUST only create documents that follow the spec
- MUST NOT use an outdated field or shape in new documents (old shapes are kept around only so existing documents still work, never for writing new ones)
- SHOULD note how the document was created, using the `metadata.origin` field

#### Conforming consumer

A tool, renderer, or AI agent that reads DSDS documents. A conforming consumer:

- MUST NOT fail just because it sees an optional field it doesn't recognize
- MUST keep `$extensions` data intact even if it doesn't understand it
- MUST treat a reference that can't be resolved (an `entryId#itemId` pointing nowhere) as an error, not silently ignore it
- MUST take MUST/SHOULD-style guidance as seriously as the spec says to — a `must-not` guideline is a hard stop for an agent writing code, not a suggestion
- SHOULD build its own "what points to what" index when it loads a document (to answer "what depends on this?", say), rather than expect the document to store that answer directly — DSDS never stores information a reader can work out for itself from what's already there
- MUST be able to address every section item, whether or not it was written with an `id` — when one is missing, derive it from the item's own text (lowercase, non-alphanumeric runs collapsed to a single dash) the same way every other conforming tool does, so the same content gets the same id everywhere. See [common/id](schema.html#common-id).

#### Conforming validator

A tool that checks documents. A conforming validator MUST enforce both layers: the schema itself (with format checks turned on) and the extra rules below (`DSDS-01`–`DSDS-10`). `scripts/validate.js` is the reference implementation. Its `examples/invalid/` folder holds one broken example per rule, and `scripts/conformance-test.js` confirms each one fails for the exact reason it's supposed to — together they double as a test suite anyone building their own validator can check against.

### Enforcement tiers

Every rule is enforced in one of two ways, or is explicitly advisory (a suggestion, not something checked automatically):

| Tier | How it's checked | What happens if it fails |
|---|---|---|
| Structural | Directly by the schema file (required fields, patterns, and similar built-in checks) | Blocks — validation fails |
| Semantic | By `scripts/validate.js`'s own code (`DSDS-01`–`DSDS-10`: do references resolve, are ids unique, and so on) | Blocks — validation fails |
| Advisory | Nothing automatic — SHOULD/MAY guidance is a judgment call | Nothing — it's a suggestion |

`DSDS-05`, `DSDS-08`, and `DSDS-09` are the one exception: if a reference still can't be resolved after checking every linked file the validator could reach, that's reported as a warning, not a blocking error — unless the validator is run with `--strict`. Every other rule always blocks. See the [rule catalog](#rule-catalog) below for details.

### Rule catalog

The full list lives in `schema/conformance-rules.yaml`. This table is kept in sync with it by hand, but `scripts/conformance-test.js` (run on every `npm run check`) would catch it if the two ever drifted apart.

| ID | Rule |
|---|---|
| `DSDS-01` | At most one `sourceFiles` entry per platform. |
| `DSDS-02` | A system entry's `metadata.platforms` closes the platform vocabulary, once declared. |
| `DSDS-03` | A `checkedBy: automated` rule needs somewhere to actually run. |
| `DSDS-04` | Entry and shared ids are unique within a document. |
| `DSDS-05` | An `entryId#itemId` ref must resolve. |
| `DSDS-06` | A `composes` ref chain must not cycle. |
| `DSDS-07` | A `depends-on` ref chain must not cycle. |
| `DSDS-08` | A bare `to:` ref must resolve to a real entry or shared entry. |
| `DSDS-09` | A `combo`'s `subject`/`items` must resolve to a real trait, token, or entry. |
| `DSDS-10` | A `same-as` item's `level` must match its target's. |

`DSDS-06` and `DSDS-07` bring back a check the spec had before version 0.20.0 — nothing should point back at itself through a chain of `composes` or `depends-on` links. The 0.20.0 rewrite dropped it by accident; it's now enforced by the validator's own code instead of the schema shape.

`DSDS-05`, `DSDS-08`, and `DSDS-09` don't just check the one document they're given — they check the whole **project**. If a document links to another file with `rel: file` (the way the spec recommends splitting up a large system), the validator follows that link and any others it leads to, then checks references against everything it finds. Every file passed to the validator in one run counts too, even without a `rel: file` link between them — the way a standalone entry file (which has no field of its own to declare "these are my siblings") still resolves a reference to a component listed alongside it. A reference that resolves this way, in a file the validator was never directly pointed at, counts exactly the same as one that resolves locally.

This search only looks inside the folder that holds the file being validated (and its subfolders) — it will never read a file outside that folder. This is deliberately narrow: a linked file that lives in a *parent* folder, or a folder next to it, won't be found. We considered widening the search to the nearest `.git` folder or `package.json` file instead, but rejected it — in a large monorepo, those often sit far above the actual design-system docs, which would let the search read much more of the repo than intended. That matters most for a CI job or hosted service checking a document it doesn't fully trust. Staying inside the target file's own folder is safer and gives the same result every time, at the cost of not reaching a more spread-out file layout. If you need it to look further, that's what a future `--root` option would be for — nobody's needed one yet.

A reference that truly can't be found is reported — but only as a **warning**, not a failure, and only in this cross-file case. A validator that hasn't seen the whole project can't be as sure a reference is actually broken as it can for a document that's entirely self-contained, where an unresolved reference is still a hard failure, unchanged — with one exception: a standalone entry file is never held to that same certainty, even when nothing else was available to check it against, since a lone entry file can never assert "this is definitely everything" the way a base document's own `entries`/`shared` arrays can. The warning message says plainly whether it actually found and checked another file, or found nothing to check at all — it never claims to have searched when it didn't. Run with `--strict` to turn these warnings into failures once your project is clean.

Whether a `to:` value even *looks like* a valid id is checked separately, directly by the schema: `common/ref.schema.yaml`'s `to` field only accepts id-shaped values, so something like a display name or a value with a space in it fails before `DSDS-05`, `DSDS-08`, or `DSDS-09` ever run. See [common/ref](schema.html#common-ref).

Two related checks remain deliberately unbuilt. A relative `href`, a component's `sourceFiles[].file`, or a token/theme's `source` — whether any of these actually point at a file that exists on disk — isn't checked at all. This is out of scope for the CLI's default run on purpose: it would mean reading files this validator has no other reason to open, which only makes sense as an explicit, opt-in step (`DSDS-11`, not yet implemented), the same way project-scope resolution is bounded to a folder rather than reading the whole filesystem. And the search boundary itself — currently fixed to the folder holding the file being validated — has no way to widen for a project that's genuinely spread across a deeper folder structure; that's what a future `--root` flag would be for, not built because nothing has needed it yet.

### Open conventions

The schema deliberately leaves some questions unanswered — not oversights, but places where a fixed rule would fit some teams and not others. This is the registry of those questions, the answer we recommend, and why it's a convention rather than a rule the validator enforces.

- **Where does a guideline item's pointer go — `refs`, or one of the named fields?** `alternatives`, `evidence`, `related`, and `checks` each exist for one specific `rel`: `alternative-to`, an external standard, `refines`, and `test`/`lint-rule`. A pointer using any other `rel` — including `extends`, `depends-on`, `composes`, `part-of`, `replaces`, `implements`, `relates-to`, `pairs-with`, `excludes`, or `see-also` — goes in the general-purpose `refs` field instead, alongside `same-as` and `external-link`. See [sections/guidelines](schema.html#sections-guidelines).
- **Where does an entry's primary source file go?** `refs` with `rel: source` — covered in [common/ref](schema.html#common-ref)'s own comments, not repeated here.
- **What does `tags[0]` mean?** The first tag, by convention, is the entry's main category. Covered in [metadata](schema.html#metadata-metadata)'s own description, not repeated here.
- **How does a token's `source` point at one key inside a shared DTCG file, not just the whole file?** By convention, a token's own `id` doubles as its path in the DTCG token tree — `color.action.primary` names the same token in both places, which is why `entries/token.id` allows slash separators DSDS ids otherwise don't, to fit however a DTCG source already nests things. When a project's DTCG paths don't line up with its DSDS ids one-to-one, point `source`'s `href` at the file plus a JSON Pointer fragment instead (`./tokens.dtcg.json#/color/action/primary`) — ordinary URI syntax, no schema change needed. Either way, the validator doesn't check that the path actually resolves inside the file (see `DSDS-11`, above).

### Passing isn't the same as good

A document with zero errors and zero warnings can still be bad documentation — the schema checks structure, not judgment. `examples/anti-patterns/` collects a few small documents that validate cleanly and are still worth avoiding: a definition that only restates its own term, a `checkedBy: manual` claim too vague for a reviewer to actually check, and guideline prose that names a concept (a "token-group" entry) the spec doesn't have. Each file's own leading comment says what's wrong with it and why the schema can't catch it. They're deliberately not part of the default `npm run check` sweep's example corpus — they're not meant to be copied.

### Stability and the road to 1.0

DSDS {{VERSION}} is a **pre-1.0 draft**. Some parts of the schema can grow to cover new cases without a spec change. Other parts are locked in — changing them would need a new spec version. This section tells you which is which.

#### How schema changes get made

Every schema file under `schema/` has comments explaining *why* it's shaped the way it is, and in many places, what it replaced and why. Reading those comments alongside the schema is currently the best way to understand how the spec has changed over time — there's no separate changelog built into the site yet. See the [`CHANGELOG`](https://github.com/somerandomdude/design-system-documentation-schema/blob/main/CHANGELOG) file for exactly how each old field maps to its new one.

#### Designed to grow without a version bump

A handful of fields accept any string that matches a pattern, instead of a fixed list of allowed values — so adding a new value never needs a schema change. It's safe to build tooling around these fields, but don't hardcode today's set of values as if it were the complete list.

- **`entries/token.tokenType`** — A token's category (`color`, `spacing`, `typography`, ...) is checked by pattern, not a fixed list. A new token category is just a new string.
- **`common/ref.rel`** — The relationship a reference expresses (`depends-on`, `same-as`, `implements`, ...) is open-ended. New common values just get documented in the schema's own comments — no release needed.
- **`metadata.status`'s status value** — `stable`, `experimental`, `deprecated`, and so on are open too, for the same reason: this spec doesn't dictate the words your team uses for a component's lifecycle.
- **`entry.id` and `common/id`** — Ids follow a lowercase-dash-dot pattern, not a fixed list of parts, so they fit whatever hierarchy your own system actually uses.
- **`$extensions`** — A place for vendor or tool-specific data, grouped by namespace, at the entry or section level. A tool integration can add a field of its own any time, without waiting on a spec release.

#### More likely to require a spec change

A few fields are locked to a fixed list of values, because the number of possible cases is a fact about how the spec itself works, not an open-ended vocabulary. If you're building a tool that needs to survive future spec changes, be defensive about this list — not the one above.

- **`entry.kind`** — 5 well-known values (`system`, `component`, `token`, `theme`, `entry`), 4 with their own `entries/<kind>.schema.yaml` file, plus the option to use a custom, dot-separated kind name (e.g. `acme.icon-library`) for a document that wants its own recognizable name instead of the generic `entry`. Adding a well-known value changes what "kind of thing" this spec can describe at all, not just a detail within one — so that bar stays high.
- **`common/requirement-level`** — 5 values (`must`, `should`, `should-not`, `must-not`, `may`), taken directly from RFC 2119. This vocabulary belongs to that standard, not to DSDS, so DSDS won't extend it.
- **`sections/*` (the 4 section kinds)** — `guidelines`, `definitions`, `steps`, `section`. Any entry kind can use any of these; nothing restricts which section kinds go with which entry kinds. `section` is the generic fallback, the same role `entry` plays for entries. `freeform` is not a section kind at all — it's a field every section kind can carry. This is the part of the schema most likely to still change before 1.0.

#### Criteria for declaring 1.0

1.0 is declared when, at minimum:

1. **The section-kind and entry-kind lists stop changing** — across at least one real pass of merging or splitting them, with no further changes needed.
2. **A second independent tool exists** — at least one tool the spec authors don't maintain reads or writes DSDS documents for real. This tests the spec's assumptions from outside.
3. **The validator's extra rules stop changing** — the checks a schema file alone can't express (`scripts/validate.js`), covered above under [Rule catalog](#rule-catalog). The project stops adding or renaming them from release to release.

Until then, the fixed lists above are the most stable part of the schema. Everything else can still change between minor versions, including the exact shape of any one `sections/*.schema.yaml` file.

### Index of every rule

{/* dsds:normative-index */}

*Generated from the v{{VERSION}} schemas by `scripts/extract-normative.mjs` — do not edit by hand. 1 statements: 0 MUST, 1 MUST NOT, 0 SHOULD, 0 SHOULD NOT, 0 MAY.*

### metadata

#### metadata/metadata

- **MUST NOT** — MUST NOT contain markup. <small>`metadata/metadata§note.1`</small>

{/* /dsds:normative-index */}

---

## What the schema doesn't have

An absence is the hardest thing for a schema to document, because there's no field to hang a description on. It's also the thing most likely to get misread as a gap rather than a decision — training data is full of design system documentation with prop tables and anatomy diagrams, so the natural instinct, human or agent, is to look for the DSDS equivalent and conclude it's missing by accident.

This section is that missing field. Each row is something DSDS used to have, or something a reader might expect it to have, stated as an absence — what would be here, why it isn't, and what to use instead.

| Not here | Why | Use this instead |
|---|---|---|
| A prop table | A hand-typed copy of the code goes stale the moment the code changes | A component's `sourceFiles` field, pointing a tool at the real source to extract from |
| An anatomy diagram or block | Anatomy is prose describing parts, which is exactly what `definitions` already does | A `definitions` section with `context: anatomy` |
| A `token-group` kind | A group is a fact about its members, not a fourth thing needing its own shape | `metadata.group` on each token that belongs to it |
| Typed accessibility fields (`wcagLevel`, ARIA facts) | Accessibility guidance is ordinary guidance — treating it as ordinary guidelines is a better model than a bespoke shape nothing else shares | A `guidelines` item with `evidence` pointing at the WCAG success criterion, and `checks` pointing at the ACT rule or test that verifies it |
| A rationale or failure-mode field on a guideline | Adding one would open every `guidelines` item's shape for everyone, for content only some projects want | `$extensions` on the item itself (see [Extending the schema](extending.html)) |
| Separate relationship/link/reference types | Every one of them was "A points to B, here's what kind of pointer" — three shapes for one idea | `common/ref` — the one pointer type, `to` or `href` plus `rel` |
| A migration guide or version-history page | The reasoning already lives where the shape does, which can't drift from it the way a separate page can | Each schema file's own `$comment`, plus the [`CHANGELOG`](https://github.com/somerandomdude/design-system-documentation-schema/blob/main/CHANGELOG) for the field-by-field mapping |

### The pattern behind all of these

Every row above follows the same shape: something that looks like a missing field is actually data that already has a better home, or a job an existing shape already does. Before concluding DSDS can't express something, check whether it already can under a different name — [Extending the schema](extending.html) covers the three ways to add something DSDS genuinely doesn't have yet, once you've ruled out that it already does.

---

## Next steps

New to DSDS? Start with the [Quick Start Guide](quickstart.html). It covers document structure, entry kinds, the section system, and minimal examples you can copy.

For the full schema reference — every definition, on one page — see [Schema](schema.html).

See the schema files in `schema/` for the JSON Schema definitions. See the examples in `examples/` for working examples of each entry and section kind.

## Contributors
- [PJ Onori](https://pjonori.com): Current maintainer
- [Afyia Smith](https://afyiasmith.co/): the `owner`/`reviewed` and `origin` metadata schemas.
- [Suleiman Ali Shakir](https://iamsuleiman.com/): Documentation copy-edits.
