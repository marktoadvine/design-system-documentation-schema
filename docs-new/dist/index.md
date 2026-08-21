# Overview

A machine-readable format for design system documentation. DSDS structures components, tokens, themes, and any other design-system artifact as a single source of truth for humans, parsers, and agents.

## Design System Doc Schema

A machine-readable format for design system documentation. DSDS structures components, tokens, themes, and any other design-system artifact as a single source of truth for humans, parsers, and agents.

## About

### Draft specification

**Draft Specification — 29 July 2026:** This is a draft. It can still change. No standards body has endorsed it yet. We welcome feedback and contributions on GitHub.

### A machine-readable format for design system documentation

This standard puts design system docs in one shared format that any tool can read. A DSDS document is a **base**: `schemaVersion`, a `name`, and a list of **entries** - a system, plus components, tokens, themes, and the generic `entry` kind for anything else. The goal is one source of truth that feeds your docs, trains your agents, and reaches every touchpoint.

### Relationship to DTCG

DSDS complements the [W3C Design Tokens Format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) (DTCG). It does not replace DTCG. DTCG owns token *values*. DSDS owns the *meaning and usage* around them. A token entry points at its DTCG source instead of restating its value.

## Core principles

- **SHOULD:** Information is more valuable when it is portable. Tools change. Needs change. Budgets change. A design system's source of truth must survive a rebuild, a reorganization, or a change in strategy.

- **SHOULD:** Documentation does not have to choose between humans and agents. Humans and agents read the same entries. A section's `for` field names the audience for that content. There is no separate, parallel structure to maintain.

- **SHOULD:** A doc standard must grow with you. Getting started is easy. Fields like `tokenType` and `ref.rel` are open-ended strings, not closed enums, so new vocabulary does not require a spec change.

## Flexible and modular

### Design systems have different needs

Design systems have different documentation needs. The schema can be as simple or as detailed as you need. DSDS has strong opinions, but it does not force them on you.

### One sections array, typed by kind

Every entry's structured docs live in one **sections** array. Each section is a typed object with a `kind` field. The spec defines 3 section kinds: `guidelines`, `definitions`, and `steps`. Every section, regardless of kind, can also carry `freeform` - headed, nestable prose - alongside its own kind-specific `items`. A component also carries `sourceFiles`, `traits`, `combos`, and `imports` as top-level fields of its own, not sections.

### No placement gating

Any entry kind can use any section kind - there is no gating rule matching an entry's `kind` to which section kinds it may carry.

## Next steps

### Start here

If you are new to DSDS, start with the Quick Start Guide. It covers document structure, entry kinds, the section system, and minimal examples you can copy.

### Full reference

For the full schema reference, see the Schema page. It covers document structure, entry properties, section kinds, and all shared models.

### Source files

The schema files in `schema/` hold the JSON Schema definitions. The examples in `examples/` show a working example of each entry and section kind.

## Contributors

### PJ Onori

[PJ Onori](https://pjonori.com) - Current maintainer.

### Afyia Smith

[Afyia Smith](https://afyiasmith.co/) - the `owner`/`reviewed` and `origin` metadata schemas.

### Suleiman Ali Shakir

[Suleiman Ali Shakir](https://iamsuleiman.com/) - Documentation copy-edits.

---

## Principles

The design principles this spec is held to, and why the schema is shaped the way it is.

1. **Solely focused on documentation.** This schema focuses on capturing the how, when, and why of a design system.
2. **Don't replicate data.** If a more relevant source of truth exists, link to it. This schema is focused on the how/when/why - it's designed to reference the source of truth rather than duplicate it.
3. **A modular and consistent profile.** Each schema element follows the same structure to make writing predictable and obvious.
4. **Simple and approachable.** The goal is to have a light footprint and an easy onramp. The schema avoids being overly technical or specific. Additional detail can be added when needed with `$extensions`.
5. **Everything is connectable.** Systems are all about connections. The documentation should reflect that.
6. **Everything has an escape hatch.** The schema is opinionated, but also aware that those opinions will not work for every situation. The schema provides ways to "detach."
7. **Action oriented.** The schema should be tuned for action - structured to help people and agents use the system in the fewest possible steps.
8. **Everything describable in one sentence.** Every schema and property should be describable in a single, simple sentence. Anything more means it's too complicated.

---

## DSDS for humans and agents

A DSDS document serves two readers - people and AI agents. How a section's `for` field splits the work between them.

## Two readers, one array

### Two readers, one document

A DSDS document has two "readers": people and AI agents. The same file serves both. Most of what you write is for people. A small, optional part is only for agents. Write for people by default - that serves agents too. Mark a section `for: agent` only for firm, ready-to-act notes a person would not need. Keep both in sync: agent notes extend the human docs, and never contradict them.

### What each reader looks for

People read docs to learn a component: what it is, when to use it, how it behaves. Agents read docs to build with it correctly. They look for firm rules, ways to avoid confusion, and how to check their own work. Most documentation works for both. A clear usage rule helps a person and an agent alike. Write it once, as a section with `for: all`, and both readers benefit. An earlier design split human and agent content into two separate top-level arrays. This design is different: every section lives in one place, an entry's `sections` array, and each one carries its own `for`.

```yaml
id: button
kind: component
name: Button
description: An interactive element that triggers an action when activated.
metadata:
  status: {status: stable}
  since: 1.4.0
  updated: {date: 2026-06-02}
  tags: [actions, button, cta, form-control]
  aliases: [btn]

refs:
  - to: button-group
    rel: part-of
  - to: icon-button
    rel: alternative-to
  - to: link
    rel: alternative-to
  - to: color.action.primary
    rel: depends-on
  - href: https://github.com/org/ds/react/button
    rel: source
  - href: https://storybook.org/ds/button
    rel: storybook
    role: hosted docs
  - href: ./stories/button.stories.tsx
    rel: storybook
    role: CSF story source
    note: Component Story Format (CSF3) - the source the hosted docs above are built from.
  - href: npm:@org/ds-react
    rel: package

# One field for every way the button varies: configuration the consumer
# chooses (boolean, enum) and conditions that happen at runtime (also
# boolean - `description` says which).
traits:
  - kind: boolean
    id: loading
    description: Shows a spinner in place of the label and blocks interaction while active.
    purpose: Prevents duplicate submissions while an action is in flight.
  - kind: enum
    id: size
    description: Controls the button's overall scale.
    values:
      - id: small
        description: Compact size for dense layouts (e.g. toolbars).
      - id: medium
        description: The default size for most surfaces.
      - id: large
        description: Larger touch target for primary calls-to-action.
  - kind: enum
    id: variant
    description: Which visual style to render.
    values:
      - id: primary
        description: The default, high-emphasis style for the main action on a surface.
      - id: secondary
        description: Lower-emphasis alternative for secondary actions alongside a primary button.
      - id: danger
        description: Destructive actions only (delete, revoke access, etc.).
  - kind: boolean
    id: hover
    description: Background darkens slightly when the pointer is over the button.
  - kind: boolean
    id: disabled
    description: Dimmed and non-interactive; triggered by the `disabled` prop.
combos:
  - subject: loading
    level: must-not
    items: [disabled]
    note: A control can't be simultaneously loading and disabled - loading already blocks interaction, and layering both muddles what the button will do when the work finishes.
  - subject: size.small
    level: must-not
    items: [variant.danger]
    note: Destructive actions need the full-size touch target; a small danger button invites mis-taps on the most costly action.

# A tool extracts the full interface (variant/size/disabled/loading/
# onClick/fullWidth) straight from this file - JSDoc/TSDoc in the code
# itself, not hand-typed here.
sourceFiles:
  - platform: react
    file: ./src/Button.tsx

sections:
  - kind: definitions
    for: all
    items:
      - term: OK
        definition: To confirm an action.
      - term: Cancel
        definition: To cancel an action.

  - kind: steps
    for: agent
    ordered: false
    title: Pre-release checklist
    items:
      - title: Focus ring is visible in both light and dark themes.
      - title: Loading state announces to screen readers.
      - title: Works with a custom icon in the leading-icon slot.
        optional: true

  - kind: guidelines
    for: human
    items:
      - statement: Limit each surface to one primary button.
        level: should
      - statement: Use buttons only for in-page actions, never navigation.
        level: must
      # No statement here - this requirement is owned and tracked in the
      # team's own requirements system, not restated in this document. See
      # guidelines.schema.yaml's own $comment for why external-link
      # exempts statement the same way same-as does.
      - level: must
        refs:
          - href: https://example.atlassian.net/browse/DS-482
            rel: external-link

  - kind: guidelines
    for: agent
    context: when-to-use
    items:
      - statement: Do not use button when the action navigates to a new URL; use the link entry instead.
        level: must-not
        alternatives:
          - to: link
            rel: alternative-to

$extensions:
  com.figma:
    displayName: "Button/Primary"
    nodeId: "12:4045"
```

### for vs. context

The `for` field says *who* a section is written for. The field `context` says *what kind* of guidance it holds - a fitness judgment, not a construction rule.

## for: all vs. for: agent

### for: all - the docs everyone reads

Most sections are `for: all` or `for: human`. This is the default home for everything: guidelines, definitions, steps, and freeform content. Agents read these sections too.

### for: agent - extra notes, for agents only

When a section is meant only for agents, mark it `for: agent`. Tools never surface these sections to people. Any section kind can carry `for: agent`. There is no separate, restricted vocabulary for agent-only content. Use it for guidance that clutters the human docs but helps an agent write correct code.

## What belongs on a for: agent section

- **SHOULD:** Hard rules: `must`/`must-not` guideline items, so an agent treats them as firm limits.

- **SHOULD:** Telling look-alikes apart: notes that keep an agent from confusing this entry with a similar one - for example, "use `link` to navigate, not this `button`."

- **SHOULD:** Checks an agent can run: a `steps` section whose items' `refs` point at specific guideline items (`rel: depends-on`). This makes pass or fail traceable to a real rule.

- **MUST NOT:** Human-facing content people need to understand does not belong on a `for: agent` section. A quick test: does a person reading the docs need this? If yes, use `human` or `all`. Use `agent` only when the content helps LLMs or tools alone.

## How they work together

- **SHOULD:** Agents read every section on an entry: human-and-all sections first for context, then the agent-only notes for enforceable specifics. A `for: agent` section adds to the human docs. It does not replace them.

- **MUST NOT:** Do not move human-facing content onto a `for: agent` section. People never see it.

- **MUST NOT:** Do not repeat the human docs on a `for: agent` section. Agent-only sections must extend the docs, never echo them.

---

## Stability and the road to 1.0

What is settled and what is still in flux in the pre-1.0 DSDS schema, and what changes without a spec bump versus what does not.

## Overview

### Pre-1.0 draft

DSDS 0.20.0 is a **pre-1.0 draft**. Some parts of the schema absorb new vocabulary without a spec change. Other parts are closed, load-bearing structural decisions that need a spec change. This page tells those apart.

### How schema changes get made

Every schema file under `schema/` carries `$comment` fields that explain *why* a shape is the way it is. In several places, they also explain what the shape replaced and why the replacement is better. Reading those comments alongside the schema is the current source of truth for the spec's own change history. There is no separate, versioned changelog yet.

## Designed to grow without a version bump

A handful of fields are open, pattern-validated strings rather than closed enums, so that new values do not require a schema change.

**entries/token.tokenType** — A token's category (`color`, `spacing`, `typography`, ...) is validated by pattern, not an enum. A new token category is just a new string.

**common/ref.rel** — The relationship a ref expresses (`depends-on`, `same-as`, `implements`, ...) is open. New well-known values get documented in the schema's own `$comment`, not gated behind a release.

**metadata.status's status value** — `stable`/`experimental`/`deprecated`/... is open too, for the same reason: this spec does not dictate a project's lifecycle vocabulary.

**entry.id and common/id** — A lowercase-dash-dot pattern, not a fixed list of segments - accepts whatever hierarchy your system actually has.

**$extensions** — A namespaced escape hatch for vendor or tool data at the entry or section level. A tool integration never has to wait on a spec release to add a field.

### Building tools against this list

Treat these as safe to build tooling around. Your validator, generator, or docs site must not hardcode the current set of values for any of them.

## More likely to be load-bearing

A few shapes are closed enums because the number of cases is a structural fact about the spec, not an open vocabulary.

**entry.kind** — 5 well-known values (`system`, `component`, `token`, `theme`, `entry`), 4 with their own `entries/<kind>.schema.yaml` file, plus a namespaced custom-kind escape hatch (e.g. `acme.icon-library`) for a document that wants its own recognizable name instead of the generic `entry`. Adding a well-known value changes what "kind of thing" this spec can describe at all, not just a detail within one - that bar stays high.

**common/requirement-level** — 5 values (`must`, `should`, `should-not`, `must-not`, `may`), matching RFC 2119. This is borrowed vocabulary, not this spec's to extend.

**sections/* (the 4 section kinds)** — `guidelines`, `definitions`, `steps`, `section`. Any entry kind can use any of them; there is no per-kind gating. `section` is the generic fallback, the same role `entry` plays for entries. `freeform` is not a section kind at all - it's a field every section kind can carry. This is the part of the schema most likely to still change before 1.0.

### Which list to code against

If you build a tool that must survive schema evolution, code defensively against the second list, not the first.

## Criteria for declaring 1.0

1.0 is declared when, at minimum:

1. **The section-kind set and entry-kind set stop changing** — Across at least one real consolidation pass, with no further merge or split needed.

2. **A second independent consumer exists** — At least one tool that the spec authors do not maintain reads or writes DSDS documents in earnest. This tests the spec's assumptions from outside.

3. **The validator's semantic-rule surface is stable** — These are the checks that pure JSON Schema cannot express (`tools/validate.js`). The project does not add or rename them release to release.

### Until 1.0

Until then, the closed enums above are the most stable part of the schema. Everything else can still change between minor versions, including the exact shape of any one sections/*.schema.yaml file.

---

## Migration

How this schema's vocabulary changes, and how to keep documents forward-compatible while it does.

## Reading why a shape changed

### No versioned changelog yet

DSDS is still pre-1.0. The project is still consolidating its vocabulary. There is no versioned migration history yet, so this page is not a changelog. It explains how to read the schema's own change history, and how to write documents that absorb future changes without a rewrite.

### $comment fields carry the change history

Every schema file under `schema/` carries a `$comment` field. Each field explains the reasoning behind the file's current shape, including, in many cases, what an earlier draft looked like and why the project consolidated it. For example, `sections/section.schema.yaml` documents an entire pass of section-kind merges in its header comment, with the reasoning for each merge:

- Old `checklist` and `interactions` merged into `steps`.
- Old `variants`, `states`, and the `traits` section merged into a component's own top-level `traits` field.
- Old `use-cases`, `localization`, and `content` merged into `guidelines`.
- Old `api` and `imports` sections merged into a component's own top-level `sourceFiles` and `imports` fields.

### Two smaller, more recent examples

`sections/guidelines.schema.yaml` gained an optional `context` field (`when-to-use` or `how-to-use`). Before this field existed, only a free-text section `title` held this distinction, and nothing structural told a "when to use" judgment apart from a construction rule. One small property closed this gap, instead of a new section kind.

`entry.kind` briefly carried an eighth value, `shared`, for content that entries point at instead of restate. But `kind` means "what kind of *thing in the design system* is this," and a content-reuse mechanism is not a thing in the design system. So `shared` moved into its own `base.shared` registry instead of stretching the enum.

### Where to look when in doubt

If you wonder why a field has its current shape, read the relevant `.schema.yaml` file's `$comment` first. The same applies if you wonder whether an older shape you saw elsewhere still applies. Right now, this comment is the closest thing this spec has to a changelog.

## Writing forward-compatible documents

A few schema design choices exist so that a document written today keeps validating as the vocabulary grows.

- **SHOULD:** Use the open, pattern-validated fields (`tokenType`, `common/ref.rel`, `metadata.status`'s status value) instead of a new `$extensions` field, when one of them fits. A new token category or relationship type is only a new string, not a breaking change.

- **SHOULD:** Use `$extensions` for tool-specific data only, namespaced by reverse domain (`com.figma`, `com.storybook`). This never collides with a future core field, because core fields do not live under `$extensions`.

## Validating against the current schema

After you pull a schema update, run both commands to confirm your documents still validate.

1. **Regenerate the bundled schema** — `node tools/bundle.js` regenerates `schema/dsds.bundled.schema.json` from the hand-authored files under `schema/`.

2. **Validate your documents** — `npm run validate` checks every example in `examples/` (or specific files you pass it) against the bundled schema plus the semantic rules in `tools/validate.js`.

---

## Architecture

The small, fixed set of shapes this spec is built from - the patterns to follow when adding a new section kind, common shape, or field.

This spec is built from a small, fixed set of shapes, reused rather than
reinvented per file. If you're adding a new section kind, a new common
shape, or a new field, find the pattern below that matches what you're
doing and follow it - don't design a new one without a real reason. See
`glossary.md` for what individual terms mean; this doc is about the
*shapes* those terms get assembled into.

## 1. An entry

`entry.schema.yaml` is the open base every entry kind shares: `id`,
`kind`, `name`, `description` (required), plus `purpose`, `metadata`,
`refs`, `sections`, `$extensions` (optional). 4 of the 5 kinds
(`system`, `component`, `token`, `theme`) have their own
`entries/<kind>.schema.yaml` file, which extends this base via `allOf`
and closes the combined shape - the same open-base + closing-leaf
pattern described in full under pattern 3 below. A fact only meaningful
for one kind (a token's `tokenType`/`combos`/`source`, a theme's
`colorScheme`/`source`, a system's own `metadata`/`sections`) lives on
that kind's own file, narrowing `kind` itself to a `const`, never as a
conditionally-narrowed field on the shared base. The 5th kind, the
generic `entry`, has no fields beyond the base, so there is no
dedicated file for it - an entry of that kind is checked against
`entry.schema.yaml` directly, the same fallback a custom kind gets.
(`element`, `pattern`, and `manual` briefly lived here as three
separate fileless values; consolidated into the one generic `entry`,
since all three were checked identically.)

This used to be one file, `node.schema.yaml`, covering all kinds
directly, with kind-specific fields narrowed by `if`/`then` on `kind`
instead of a per-kind file - reversed once there were real,
kind-specific fields (and a whole node kind, `token-group`) worth
removing per-kind rather than narrowing conditionally. `node` itself was
later renamed to `entry`, once a `kind: system` entry took over the
root-level facts (version, organization, url, license, platforms) an
earlier draft kept on the root document directly - "entry" better fits
something that can now include the system itself, not just individual
artifacts. There is no `token-group` kind: a group of related tokens is
not an artifact of its own, so it isn't a `entries/token-group.schema.yaml`
file either - it's a `metadata.group` fact on the tokens in it (see
metadata.schema.yaml).

An entry with a custom kind (a namespaced value like `acme.icon-library`,
for a document that wants its own recognizable name instead of the
generic `entry`) has no `entries/<kind>.schema.yaml` to dispatch to, so
it's checked against `entry.schema.yaml`'s own open base directly - the
same fallback `entry` itself gets, and the same fallback
`sections/section.schema.yaml` gives `section` and a custom section
kind (see pattern 4 below).

## 2. A section

Every section kind is `allOf: [section.schema.yaml, {kind: const,
...own fields...}]`. `sections/section.schema.yaml` supplies `kind`,
`for`, `title`, `description`, `items`, `metadata`, `$extensions` - a
section never invents its own version of any of these. A section's
actual content always lives in `items`, never under a kind-specific key
(`parts`, `steps`, `properties`, etc.) - that's the one rule every
section kind is not allowed to break.

## 3. Extending a shared item shape (open-base + closing-leaf)

When more than one section's items are "the same shape plus a bit more"
(a guideline and an accessibility rule both being a `rule`), the shared
part becomes its own `common/*.schema.yaml` file, left deliberately
**open** (no `additionalProperties`/`unevaluatedProperties`) - so every
extension of it stays possible. This only pays for itself with more than
one real consumer - `structure` and `traits` once shared a `design-entry`
base this way, until `structure` stopped needing one of its fields; with
one consumer left, the shared file was dissolved in favor of each
declaring its own shape directly (see the consumer list below).

Each consumer then does the same thing:

```yaml
items:
  allOf:
    - $ref: https://.../common/<base>.schema.yaml
  required: [<own new required fields>]
  properties:
    <own new field>: { type: ..., description: ... }
    <base field, only if overriding its description>: { description: ... }
  unevaluatedProperties: false
```

**`unevaluatedProperties` MUST be a sibling of `allOf` itself, never
nested inside one of `allOf`'s own array elements.** This is easy to get
wrong by analogy with the old `additionalProperties` version (which
nested naturally inside the second `allOf` branch, alongside that
branch's own `type`/`required`/`properties`) - but `unevaluatedProperties`
only sees what's evaluated by keywords in its *own* schema object; nested
one level inside an `allOf` array element, it can only see that one
element's own `properties`, not what the sibling `$ref` branch evaluated.
Verified directly against this repo's own ajv setup (`ajv/dist/2020`)
while making this switch - putting it one level too deep validates in a
way that looks identical on a passing document, then silently rejects
every field the base declares once you try to actually use one.

`properties`/`required` move up to be `allOf`'s own siblings too, for the
same reason - there's no second `type: object` branch to nest them in
anymore.

Close with `unevaluatedProperties: false`, not `additionalProperties:
false`. This used to be `additionalProperties: false` plus re-listing
every one of the base's own fields here as empty stubs (`<base field>:
{}`) - because `additionalProperties` only looks at this schema's own
`properties`, not the base's, so every field the base declares had to be
restated just to avoid being rejected. `unevaluatedProperties` was built
for exactly this gap: it also considers a property "evaluated" when an
`allOf` sibling's `$ref` already covers it, so the closing leaf only
needs to declare fields that are genuinely new or whose description is
worth overriding - nothing gets restated just to keep it from being
rejected.

Current consumers of this pattern: the 4 `entries/<kind>.schema.yaml`
files (each extends `entry.schema.yaml`, closing with its own `kind`
const plus whatever fields are only meaningful for that kind); the
per-kind metadata extensions (`entry-metadata.schema.yaml` and
`system-metadata.schema.yaml` both extend the base `metadata.schema.yaml`
- `entry-metadata` adds `status`/`since`/`group`/`aliases`/`preview`;
`system-metadata` adds the 5 system-wide-only fields
`version`/`organization`/`url`/`license`/`platforms`).
`structure` pieces and both `traits` branches used to extend a shared
`design-entry` base too, until `structure` stopped needing
`design-entry`'s own `tokens` field (its `specs` covers that job, and
does more). With one consumer left, `design-entry` was dissolved -
`traits` now declares its own shape directly. `guidelines` used to
extend a shared `common/rule.schema.yaml` base the same way, alongside
`accessibility` - once `accessibility` was cut and `guidelines` became
the only consumer, `rule` was dissolved too, the same way `design-entry`
was: `guidelines` now declares the rule shape directly as its own item
schema, not as an extension of an open base. `imports` used to extend
`example` the same way, before it was cut down to a flat
`platform`/`code`/`package` shape with no shared base at all - a smaller,
more specific shape than the general-purpose one it started from. If you
add another, follow the same shape - don't hand-redeclare the base's
fields as if they were new (that's real duplication, not a workaround),
and don't skip the closing leaf. An unclosed extension silently accepts
typos - a mistake this spec has made and fixed *four* times now:
`traits`' own `enum` branch's `values` array items (a bare, unclosed
`$ref` to `design-entry` one level down - the pattern applies at every
level an open base gets extended, not just the outermost one), `imports`'
item shape (no closing leaf at all, plus a stray full redeclaration of
`ref` instead of an override), and the old `accessibility`'s bare rule
branch (a bare `$ref` to the since-dissolved `common/rule.schema.yaml`
with no wrapper whatsoever). All four are why this spec switched from
`additionalProperties` to `unevaluatedProperties` for this pattern -
`unevaluatedProperties` doesn't remove the need to remember to close a
leaf, but it removes the much larger surface area (every base field, at
every level) where that could go quietly wrong.

Leaf-only common shapes - `ref`, `status`, `combo`,
`showcase`, `example` (extended once, by `imports`, but otherwise used
bare) - close themselves directly. There's no structural marker beyond
each file's own header comment for which kind a given `common/` file is;
when in doubt, check whether anything `allOf`s it elsewhere in
`schema/`.

## 4. A heterogeneous `items`/array

When one array can hold genuinely different shapes with different
*required* fields, discriminate with `anyOf` plus a `kind` field naming
which shape an entry is - a component's own `traits` does this (`kind:
boolean` or `kind: enum`). Item-level `kind` plays the same role for an
item that a section's or entry's own `kind` plays one level up. This
isn't limited to a section's `items` array specifically - `traits` lives
directly on `entries/component.schema.yaml`, not inside a section, and
the pattern applies there identically.

When the variants differ only in which *optional* fields happen to be
populated - nothing about the shapes actually conflicts or could be
mistaken for another - skip the tag entirely and use one flexible object.
`steps` does this (a plain step, a checklist entry, and an
interaction-flow entry are all just optional fields on one shape); so
does `guidelines`' own item shape (a `statement`-bearing rule and a
same-as/external-link-only pointer are both just optional fields on one
shape, disambiguated by `anyOf`'s `required` alone, not a tag).

Don't add an item-level `kind` "for consistency" to a shape that doesn't need one -
a tag some items never set isn't earning its keep (this is exactly why
`content`, and later `use-cases`, got un-merged rather than kept
discriminated: check real usage before assuming two shapes need telling
apart).

### `anyOf` vs. `if`/`then`

Both show up throughout this spec, for two different jobs - don't reach
for one where the other is meant:

- **`anyOf`** picks between *whole alternative shapes* - "this item is
  one of N genuinely different things." Used for the heterogeneous-items
  case above.
- **`if`/`then`** *narrows a single, already-selected shape* with an
  extra conditional constraint - "given the shape I already have, this
  one field's rules tighten under this condition." Used for: a theme
  entry's `colorScheme` enum narrowing; `metadata.status`'s
  `deprecationNotice` becoming required when `status` is `deprecated`.

If you're picking between two totally different sets of fields, that's
`anyOf`. If you're tightening one field's constraint based on another
field's value within a shape that's otherwise fixed, that's `if`/`then`.

## 5. Cross-cutting fields

These mean the same thing and take the same shape everywhere they
appear - don't introduce a synonym for one of them:

| Field | Shape | Appears on |
|---|---|---|
| `id` | `common/id.schema.yaml` | entry, a component's own `traits` items, guidelines items, section items |
| `kind` | enum const | entry, every section, a component's own `traits` items |
| `platform` | `common/id.schema.yaml` | a status entry, a component's own `sourceFiles`/`imports` entries |
| `refs` | array of `common/ref.schema.yaml`, `minItems: 1` | base, entry, guidelines, steps, a component's own `traits` items, a section's own `freeform` entries |
| `name` | plain string, the display counterpart to a sibling `id` | base document, entry, a `shared` entry, a component's own `traits` items |
| `title` | plain string, a heading over content that isn't itself an identified artifact | section, a section's own `freeform` entries, steps entry, `common/example` |
| `description` | plain string (entry, section) **or** `common/markdown.schema.yaml` (everything else - a component's own `traits` items, steps, definitions) | see note below |
| `note` | plain string, never markdown | `common/ref`, `common/showcase`, `common/combo`, metadata's `reviewed`/`updated`/`origin` |
| `$comment` | JSON Schema annotation keyword, at the file level and (where there's real guidance to give) the property level | every schema file; many individual properties |
| `purpose` | `common/markdown.schema.yaml` | a component's own `traits` items |
| `since` | `common/since.schema.yaml` | metadata, a component's own `traits` items |
| `status` | a single object (`entry-metadata.schema.yaml`'s own inline shape) | metadata, on every entry kind |

`description`'s split is deliberate, not an inconsistency: at the
top level (an entry, a section) it's a one-line summary field on
purpose - the "only place to say what this is," kept short so it can't
turn into a place to bury real documentation. Everywhere else it's the
actual explanatory content, so it's markdown. If you're adding a
top-level summary-style field, keep it a plain string; if you're adding
explanatory content inside an item, use markdown.

`description` and `note` answer different questions, and the field name
should always match which one applies: `description` says what the
parent thing *is* - a component's own `traits` item, a step, a
definition, an entry, a section. `note` is a supplementary record or
annotation *about* the parent - it was never meant to define what the
parent is (that's already fully said by the parent's other required
fields), only to add context, rationale, or a status update on top. A
`common/combo` rule's `note` (why the pairing rule holds) is the clearest
case: `subject`/`level`/`items` already say what the rule is in full: `note`
only explains why it exists. A section's own `freeform` entries use
`body` for their actual content instead of either name, since a
freeform entry is closer to a small document than a one-line
description or a note.

`name` and `title` answer different questions too: `name` is the
human-readable counterpart to a sibling `id` - it identifies the thing
it's on (an entry, a `shared` entry, a `traits` item, the base
document's own design system). `title` is a heading over content that
isn't itself an identified artifact - a section, a `freeform` entry, a
`steps` entry, a `common/example`. `common/example`'s own field used to
be `name`; renamed to `title` once it became clear an example is
content with a heading, not an artifact with an identity.

Every property's `description` says what it represents, concisely. A
property gets its own `$comment` alongside it only when there's real
guidance beyond the obvious - how or when to use it, a rule that
governs it, a cross-reference to a related field. Most properties don't
need one. This is the same what/how split every schema file's own
top-level `description`/`$comment` pair already makes, applied one
level down to individual properties.

`platform` used to be `common/id.schema.yaml` on a `status` entry but a
bare, unconstrained `type: string` on `api`/`imports` - the same
identifier, validated in one place and not the other two. All three now
share the constraint.

The same gap once existed one level down, between two fields naming a
technical attribute in different vocabularies (a spec entry's visual
`property`, an accessibility criterion's ARIA `attribute`) - fixed by
giving both the same `common/id.schema.yaml` shape, even though they
didn't share a field name. Both fields' section kinds have since been
cut; the lesson still applies if you add a new field that names some
other technical attribute (a data attribute, a CSS custom property
beyond what `part`'s pattern narrowing already covers) - check whether it
needs the same shape.

## 6. Every array is non-empty or absent

If an array field is present at all, it must have at least one item -
`minItems: 1`. An empty array and an omitted field mean the same thing in
practice, but only one of them is honest about it; letting `[]` validate
is a silent way to write a section, a piece, or a set of refs that
documents nothing. Arrays of *distinct* scalar values (an enum's
`values`, a set of `tags` or `aliases`) additionally get `uniqueItems:
true` - a duplicate in a value set is always a mistake, never a
meaningful fact.

This was inconsistently applied until an audit found it missing in
several places - fixed, but worth stating as a standing rule so it
doesn't drift again: `anatomy` and `accessibility`'s own `items` were the
only 2 of 10 section kinds missing `minItems: 1` on `items` itself;
`design-entry`, `labels`, `localization`, and `api` items were missing it
on their nested `examples`; `root`/`node` were missing it on `refs`;
`root.groups`, `root.sections`, `node.sections`, `node.extraSections`
were missing it entirely; `api.values` and `labels.alternatives` were
missing both `minItems` and `uniqueItems`; `ref.modifications` was
missing `minItems`. If you add a new array field, give it `minItems: 1`
by default and only omit it with a real reason (e.g. a field that's
legitimately fine as an empty collection - none currently exist in this
spec).

## 7. Same word, different concept, kept apart on purpose

Not every repeated word is the same concept just because English reuses
it. These are deliberately **not** unified - don't try to merge them:

`status` was briefly a candidate for this list - an entry's own
`metadata.status` vs. a would-be `root.platforms`'s per-entry status
looked like the same word covering two different scopes (an entry's own
readiness vs. a platform's organization-wide integration maturity).
Resolved by unification instead of separation: `platforms` is a bare
registry of platform names on `metadata.platforms`, meaningful only on
a `kind: system` entry, with no status of its own, and a platform's
maturity is just an ordinary `metadata.status` entry scoped to that
`platform` - the same mechanism any entry already uses for its own
status, applied to the system entry instead of invented a second time.
One shape, one field, two subjects (an entry, or the system as a whole)
- not two concepts sharing a name. `status` itself also used to be a
required top-level field on `node.schema.yaml`, promoted out of
`metadata` on the theory that it was too load-bearing to live in the
optional bucket - reversed once upstream's own schema turned out to
never require it or promote it either (it sits inside `entityMetadata`,
which has no required fields at all); nothing else in this spec
actually depends on `status` being present to resolve, so the
"load-bearing" argument didn't hold up against real evidence.

If you're tempted to "fix" one of these by renaming it, don't - check
this list first. The fix for an accidental collision is a rename (see
`facet` → `part`, `label` → `title`, `links` → `refs`); the fix for one
of these is nothing, because there was never a real collision, just a
shared English word.

## 8. A stated default is a real `default:`, not just prose

If a field's description says "defaults to X," the schema must also
declare `default: X` - the keyword, not just the sentence. Tooling that
generates forms, docs, or fixtures from the schema reads the `default`
keyword; a description that promises a default the schema itself doesn't
declare is a promise only a human reader can see. The old
`structure.mustRender`, an old accessibility part's `required`, and
`common/ref.schema.yaml`'s old `mustResolve` all said "defaults to
false" (or, for `mustResolve`, implied it by never mentioning an
alternative) without the keyword - fixed to match `steps.ordered` and
`steps.optional`, which always had both. Both fields, and both section
kinds that carried them, have since been cut, but the rule still
applies: `sections/guidelines.schema.yaml`'s own `context` field
(`default: how-to-use`) is a current example that gets this right.

## 9. Enum values: lowercase-dash, unless mirroring an external standard verbatim

Every enum this spec invents itself uses lowercase, dash-separated
values - `component`/`token`, `must`/`should-not`, `depends-on`,
`css-custom-property`, `ai-assisted`, `internal`/`external`, and so on,
with no exceptions among this spec's own vocabularies.

There is exactly one enum that breaks this, on purpose: a token entry's
`tokenType`'s
values (`fontFamily`, `fontWeight`, `cubicBezier`, etc.) are DTCG's own
real type names, in DTCG's own camelCase. It exists specifically to
describe a fact from an external standard this spec defers to rather
than redefines (see `common/token-data`'s former role) - forcing it into lowercase-dash would mean inventing a
notation DTCG doesn't actually use, the opposite of pointing at the real
thing. If you add a field whose values are copied from some other named
standard, keep that standard's real casing; if you're inventing the
vocabulary yourself, it's lowercase-dash.

## Non-goals

Not every field belongs everywhere. `tags` only lives on `metadata`. That's
fine - "same concept, same shape, wherever it appears" doesn't mean
"every field appears everywhere." Add a field to a shared shape when a
real, current need shows up in more than one place (see `since`'s
addition to a component's own `traits` items for the model to follow),
not speculatively.

## Assessment: how uniform can this actually get?

**Historical note:** the "one place full uniformity was deliberately not
pursued" analysis below, and the CEM comparison after it, both describe
the old `api` section's per-item `deprecated`/`deprecationNotice`/`type`
fields. That whole per-item structure was later removed in favor of a
component's own `sourceFiles`, which points a tool at the real source
file instead of hand-typing each member's facts - there is no longer an
`api` item shape for any of this analysis to apply to. Kept below as a
record of the reasoning that led here, not as a description of the
current schema.

Structurally, yes, close to entirely - patterns 1-9 above are now applied
without exception across every entry, every section, and every common
shape in this spec. This is the third audit pass looking specifically for
counterexamples, and each pass has found and closed real gaps rather than
confirming there were none: the first found the missing
`additionalProperties: false` closures and a hand-redeclared shape; the
second found `minItems`/`uniqueItems` missing in roughly fifteen places
plus the `platform` type gap; this one found the `attribute`/`property`
gap, three undeclared `default`s, and confirmed the enum-casing
convention was already being followed correctly (rather than finding it
broken) with exactly two, both deliberate, exceptions. That the gaps keep
getting smaller and more narrowly cosmetic each pass - not larger or more
structural - is itself evidence the underlying rule set is sound; there
isn't a fourth category of drift waiting to be found, just smaller
instances of the same handful of categories above. A contributor who's
read this page can predict the shape of a schema file they haven't
opened yet, which is the actual goal - not that every field looks
identical everywhere, but that a fixed, small number of decisions (which
of the 4 shape patterns, which cross-cutting field names, when to tag
with `part`, when to use `minItems`, lowercase-dash unless mirroring an
external standard) covers every case.

The one place full uniformity was deliberately *not* pursued: `api`
items model deprecation as a bare `deprecated: boolean` +
conditionally-required `deprecationNotice`, instead of reusing the
richer `status` array (`experimental`/`stable`/`deprecated`/`beta`/
`planned`, optionally scoped per platform) that `metadata.status` uses
- on a node, or on the root document for the system as a whole - for the
same underlying idea: "this thing's lifecycle state, with a required
explanation when it's going away."

This is a real fork, not an oversight, for two reasons:

1. **Source-of-truth mismatch.** `api` items exist specifically to be
   sourced from real code - a Custom Elements Manifest, a `.d.ts` file,
   a JSDoc `@deprecated` tag. None of those represent deprecation as a
   multi-value lifecycle enum. Forcing the richer shape here would mean
   this spec's schema no longer matches the shape of the real data it's
   meant to point at and reflect - the opposite of this spec's own
   stated philosophy.
2. **The richness `status` adds has no referent here.** `status`'s array
   shape exists to let one entry apply generally and others override it
   per platform. An `api` *section* is already scoped to exactly one
   platform (its own `platform` field) - there's no second axis left for
   a per-item status array to vary along. Adopting the full shape would
   add a wrapper, a `platform` key that could only ever restate the
   section's own, and an enum with three values (`experimental`/`beta`/
   `planned`) nothing currently sources - complexity with no fit-for-
   purpose gain.

If either of those stops being true - if a real manifest format starts
expressing richer lifecycle states, or if `api` items ever need to vary
by something `platform` doesn't already cover - that's the signal to
revisit this, not before.

Re-checked on this pass specifically for a second fork to pair with it -
none found. `api.deprecated`/`deprecationNotice` remains the one
deliberately non-uniform spot in the entire spec; everything else this
audit turned up (the `attribute` gap, the missing `default`s, the array
minimality gaps) was a completeness bug with an unambiguous fix, not a
second case of two legitimate shapes for the same concept.

### Checked against Custom Elements Manifest and DTCG specifically

Every other comparator used above (Kubernetes, Backstage, JSON:API,
OpenAPI, CloudEvents) is a *similarly-shaped* spec - useful for pattern
comparison, but none of them is a file this spec actually points at.
Custom Elements Manifest (CEM) and the W3C Design Tokens format (DTCG)
are different in kind: they're the literal external sources of truth
`api.source` and a token's `refs` (rel: file) are meant to resolve to.
Where this spec's shape doesn't match theirs, that's not a stylistic
difference - it's a place a real manifest can't be losslessly pointed at
without an impedance mismatch. Checking against them specifically
turned up three real findings, one of which corrects a claim made
earlier in this same document:

1. **The "simple boolean" claim above was imprecise.** CEM's own
   `deprecated` field isn't a plain boolean - it's typed `boolean |
   string`, where a string value doubles as both the flag and the
   deprecation message. That's more information-dense than this spec's
   current two-field `deprecated` + `deprecationNotice` pair, and it's
   the literal shape of the real data `api.source` points at. The
   two-field split isn't wrong, exactly, but it's a self-invented
   structure standing in for a fact CEM already expresses more simply.
   Collapsing `deprecated` to `oneOf: [boolean, string]` (dropping
   `deprecationNotice` as a separate name) would make this spec's shape
   match CEM's real shape exactly, not just approximately - the same
   standard this doc has been holding every other field to.
2. **CEM types carry references; this spec's `type` doesn't.** A CEM
   member's type is `{text, references?}` - the raw signature, plus an
   optional array of pointers to where a referenced type (an exported
   union, an interface) is actually declared. This spec's `api` items
   have a bare `type: string` and no way to point anywhere at all - no
   `refs` field exists on an api item, unlike almost everywhere else in
   this spec. Adding one (reusing the same `common/ref.schema.yaml` this
   spec already uses everywhere) would model CEM's `type.references`
   with a concept this spec already has, instead of leaving api items as
   the one shape with no pointer capability.
3. **CEM's CSS custom properties carry a `syntax` descriptor this spec
   has nowhere to put.** A CEM `cssProperties` entry includes the
   `@property` syntax string (e.g. `"<color>"`) alongside `name`/
   `description`/`default` - a real, commonly-populated fact this spec's
   `css-custom-property` items currently have no field for, hand-authored
   or sourced.
4. **`tokenType`'s enum is a closed list of an open vocabulary.** DTCG's
   own token type vocabulary has grown since this spec's `tokenType`
   enum was written (composite types - `border`, `gradient`,
   `transition`, `typography` - exist in later DTCG drafts and aren't in
   this spec's current 8-value enum). This spec doesn't own that
   vocabulary and has already said so explicitly (`common/token-data`'s
   former header: "no resolved value ever lives here... the DTCG file is
   the source of truth") - but a *closed* enum still makes this spec the
   bottleneck for a fact DTCG is supposed to own. `common/status.schema.yaml`
   already solved exactly this problem for lifecycle values (`statusValue`:
   pattern-validated, "open-ended by design, new values don't require a
   spec change") - `tokenType` should get the same treatment instead of
   a fixed list that goes stale every time DTCG adds a type.

One place DTCG was checked and found *not* to need a change: whether
this spec should track per-token deprecation or composite-value
internals (DTCG's newer drafts explore both). It shouldn't - the
DTCG file itself is the one place those facts belong, and `refs`
(rel: file) already points at it. Adding fields here to shadow what the
real file already says would be exactly the duplication this spec has
spent this whole redesign removing.

---

## Glossary

Terms this spec uses with a specific, load-bearing meaning - not generic JSON Schema vocabulary.

## Terms

**Combo** — The shared rule shape for "these things do or don't go together": a `subject`, a `level` saying whether `items` is the permitted set or the forbidden set, and `items` (bare target strings). Used on a component's own top-level `combos` and a token's own top-level `combos`.

**$comment** — The JSON Schema annotation keyword this spec uses, at the property level, for *how, when, or why* to use a property - never validated, never shown to an end reader. Paired with `description`, which says what the property *is*.

**$extensions** — The escape hatch for tool-specific data, present on `entry`, `section`, and the base document. Keyed by a reverse-DNS-style namespace (e.g. `com.figma`), freeform underneath.

**Definitions** — A section kind holding term definitions - what a term means, how and when to use it, and related terms it's often confused with.

**Description** — The field name for text that says what its parent thing *is*, always. Kept distinct from `note`, which is a record *about* the parent, not what defines it.

**Entry** — One thing in the design system graph - a system, component, token, theme, or the generic `entry` kind for anything else.

**Entry kinds** — The five values an entry's `kind` can take: `system`, `component`, `token`, `theme`, `entry`. Four have their own dedicated schema file; `entry` is the explicit generic kind, checked against the open base directly.

**For** — `human`, `agent`, or `all`. A required field on every section, saying who it's written for.

**Freeform** — An optional array of headed, arbitrarily-nested sub-content available on every section kind, alongside that kind's own structured `items`.

**Group** — `metadata.group`, a group name an entry belongs to (for example `color.action` on a set of related tokens). The recommended way to group tokens.

**Guidelines** — A section kind holding rules for an entry - how to build it, or (when the section's own `context` is `when-to-use`) when it's the right choice at all. Every item pairs a `statement` with a `level`.

**Id** — The one identifier shape in this spec, lowercase-dash segments optionally dot-chained (e.g. `color.action.primary`). Used both for an entry's own globally-unique `id` and for flat, locally-scoped ids on section items.

**Item** — The one universal box a section's content lives in. Every section kind has an `items` array and puts everything there, never under a kind-specific key.

**Kind** — The one discriminator field name used at every level of this spec, on every entry and every section, naming which shape applies.

**Metadata** — Minor/optional facts about an entry that aren't documentation and aren't pointers to other entries - `tags`, `owner`, `reviewed`, `context`, `updated`, `origin`, plus per-kind additions like `status`/`since` or (for a system entry) `version`/`organization`/`platforms`.

**Name** — The field name for a thing's human-readable identifier, always paired with a machine-readable `id` (an entry's own `name`, a `shared` entry's `name`, a component's own `traits` item `name`). The display counterpart to `id`, not a heading - use `title` for a heading over content that isn't itself an identified artifact.

**Note** — The field name for a supplementary record or annotation *about* its parent, never what defines the parent (that's `description`). Always a plain string, never markdown. Appears on `common/ref`, `common/showcase`, `common/combo`, and metadata's `reviewed`/`updated`/`origin`.

**Origin** — `metadata.origin`, how an entry's documentation came to exist and who or what wrote it: `method` and `author`.

**Owner** — `metadata.owner`, the team, role, or person accountable for an entry, as a plain mailbox-style string.

**Part** — A per-item discriminator inside an array that can hold more than one distinct shape (used in a component's own `traits`). Plays the same role one level down that a section's own `kind` plays for the section itself.

**Platform** — An id naming a target platform/framework (`react`, `ios`, etc.), used on a status entry, a component's own `sourceFiles`/`imports` entries. A `kind: system` entry's `metadata.platforms` is the full registry.

**Purpose** — Why something exists or holds, on a component's own `traits` item.

**Ref** — The one pointer type in this spec: `{rel, to|href, ...}`. `to` addresses something inside this document's own graph; `href` addresses something outside it. `rel` says what kind of pointer it is.

**Rel** — The field on a `ref` naming the relationship (`depends-on`, `composes`, `part-of`, `alternative-to`, `extends`, and others, or a namespaced custom value).

**Reviewed** — `metadata.reviewed`, a list of independent confirmations that an entry's documentation is accurate, each with a `date`, a `by` (who or what confirmed it, human:<id>/<producer>/<version>/process:<id>), and a `note`.

**Base document** — A file with a top-level `schemaVersion` key. Holds `entries` (always an array, even for one), optional `shared` content, and its own `refs`/`$extensions`.

**Section** — One piece of an entry's documentation - a typed container tagged by who it's `for`, whose content always lives in `items` and/or `freeform`.

**Statement** — The actual claim text on a guideline item (or, informally, wherever a field holds "the rule/scenario in words").

**Status** — A lifecycle value (`stable`, `deprecated`, `beta`, etc.), optionally scoped to one platform. Lives in `metadata.status`, always a single object.

**System** — The entry kind for the design system as a whole. Carries system-wide `metadata` (`version`, `organization`, `url`, `license`, `platforms`) and system-wide `sections`.

**Tags** — Freeform classification keywords on `metadata`, for grouping/search/filtering.

**Title** — The one word this spec uses for a short heading describing a subject - a section's own optional `title`, a `freeform` entry's required `title`, a `steps` entry's required `title`, and a `common/example`'s own optional `title`. Always a plain string, not markdown. Distinct from `name`, the human-readable counterpart to an `id` - a different pairing, not a heading.

**Token overrides** — A map of purpose-name to token reference (e.g. `{background: "{color.action.primary}"}`), used inside a component's own `traits` entries to say which token fills which visual role.

**Traits** — A component-only field for every way it can vary - an on/off dimension (`boolean`) or a set of named options (`enum`), tagged per entry by `kind`.

### Full rename history

This is a reader-facing summary. For the etymology behind each term - what it used to be called and why it changed - see `docs-new/glossary.md`.
