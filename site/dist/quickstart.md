# DSDS quick start guide

## What is DSDS?

DSDS (Design System Doc Spec) is a YAML/JSON format for documenting design systems. It puts every piece of docs — components, tokens, themes, and anything else — in a machine-readable shape: a graph of **entries**, each carrying typed **sections**.

<ds-callout title="Key idea:">

DSDS documents the *how and why* of your design system — not the token values themselves. It complements the [W3C Design Tokens Format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) which handles the *what*.

</ds-callout>

### What you get

- **Structured** — every section has a defined shape, no guessing
- **Machine-readable** — tools can parse, generate, validate, and transform it
- **Portable** — not locked to any docs tool or platform
- **Extensible** — add vendor metadata without breaking compatibility
- **Validatable** — the schema catches errors before they reach consumers

---

## Document structure

A DSDS document is a **base**: `schemaVersion`, a `name`, and a list of **entries**.

<ds-example file="quickstart/01-base-document.yaml" label="The bare minimum — not valid on its own yet, since entries is required" />

System-wide facts (version, organization, url, license, platforms) live on this list's own `kind: system` entry, not on the base document directly:

<ds-example file="quickstart/02-base-document-described.yaml" label="A base document with a system entry" />

### Adding more entries

Any entry — a component, a token, a theme, or the generic `entry` kind — can sit alongside the system entry in the same `entries` array:

<ds-example file="quickstart/03-base-document-entries.yaml" label="A system entry plus a component entry" />

### Splitting across files with `refs`

For a larger system, keep each entry in its own file and point at it with `refs` (`rel: file`) instead of inlining everything:

<ds-example file="quickstart/04-base-document-refs.yaml" label="Pointing at a sibling document that owns another entry" />

<ds-callout variant="tip" title="Tip:">

Use a multi-file split for large systems where a different team owns each component. Use one file with everything inlined for smaller systems. `scripts/compose.js` can concatenate many hand-authored fragment files into one document before validation — see the repo's own `examples/base/starter-kit-fragments/`.

</ds-callout>

---

## Entry kinds

Every entry has a `kind` field. There are 5 well-known values, plus an open, namespaced escape hatch for anything else.

| Kind | Description |
|------|-------------|
| `system` | The design system as a whole — version, organization, url, license, platforms, plus system-wide documentation. |
| `component` | A reusable UI element — buttons, inputs, modals. Carries its own `sourceFiles`, `imports`, `traits` (variants and states), and `combos` on top of the shared envelope. |
| `token` | A single design token. Carries `tokenType` and a `source` pointer to the real DTCG value — never the value itself. |
| `theme` | A named set of token overrides — dark mode, high-contrast, a brand variant. Points at its own DTCG source file. |
| `entry` | The generic, open kind for anything else — a foundation, a pattern, a guide. Has no fields beyond the shared envelope. |
| *(namespaced)* | A custom kind like `acme.icon-library`, for a document that wants its own recognizable name instead of the generic `entry`. |

### The shared envelope

Every entry kind shares one open base: `id`, `kind`, `name`, `description` (required), plus `purpose`, `metadata`, `related`, `extends`, `refs`, `sections`, `$extensions` (optional). See [Conformance](conformance.html#how-the-schema-is-organized) for how the schema itself is put together.

### Status

Status lives in `metadata.status`, always as an object — there's no bare-string shorthand:

```yaml
metadata:
  status: {status: stable}
```

Scope a status to one platform when a component ships on more than one:

```yaml
metadata:
  status:
    platform: react
    status: deprecated
    deprecationNotice: Use icon-button instead — this variant never got contrast-tested.
```

---

## The section system

Structured docs live in the `sections` array on each entry. Each section is typed by its `kind` field — `definitions`, `guidelines`, `steps`, or the generic `section`. Any entry kind can use any section kind; there's no placement gate matching an entry's `kind` to which section kinds it may carry.

Every section also carries a `for` field (`human`, `agent`, or `all`) naming its audience — see [Humans and agents on the Overview page](index.html#humans-and-agents).

### Guidelines: rules paired with why they exist

Each guideline item pairs a `statement` with a `level` (an RFC 2119 requirement level) and, optionally, `alternatives`, `evidence`, or a `checkedBy`/`checks` verification pair:

<ds-example file="quickstart/06-button-described.yaml" label="A component with a guidelines section" />

The `level` field's values are lowercase kebab-case, like every DSDS vocabulary: `must`, `should`, `should-not`, `must-not`, `may`. Tools display them as badges: <ds-badge>MUST</ds-badge>, <ds-badge>SHOULD</ds-badge>, <ds-badge>SHOULD NOT</ds-badge>, <ds-badge>MUST NOT</ds-badge>. Agents treat `must`/`must-not` items as hard limits.

A `guidelines` section also carries `context`: `when-to-use` for a fit judgment (is this entry the right choice at all), or `how-to-use` (the default) for an implementation rule once it's chosen.

### Definitions: a glossary, anatomy, or prop list

A `definitions` section pairs a `term` with its `definition` — use it for anatomy parts, naming conventions, or a component's own prop/event list when there's no real source file to extract from:

```yaml
sections:
  - kind: definitions
    for: all
    title: Anatomy
    items:
      - term: Container
        definition: The interactive root element. Receives background, border, radius, and padding.
      - term: Label
        definition: The visible text of the button.
```

### Steps: a procedure or checklist

A `steps` section is an ordered procedure or an unordered checklist (`ordered: false`). Each item can point back at the guideline it verifies via `checks` (`rel: depends-on`):

```yaml
sections:
  - kind: steps
    for: agent
    ordered: false
    title: Self-check before shipping
    items:
      - title: Icon-only buttons have an aria-label
        checks:
          - to: button#aria-label-required
            rel: depends-on
```

### Freeform: narrative prose

Every section kind — including the generic `section` — can also carry `freeform`: headed, nestable prose alongside its own structured `items`:

```yaml
sections:
  - kind: section
    for: all
    title: Overview
    freeform:
      - title: About
        body: Button is the primary interactive primitive in this design system.
```

---

## A component's own top-level fields

Unlike sections, a few facts about a component live directly on the entry, not inside a section — they're facts about the component as a build artifact, not documentation content:

- **`sourceFiles`** — one entry per platform, pointing at the real source file a tool can extract the component's API from. Replaces hand-typed prop tables.
- **`imports`** — one entry per platform, with the install package and the exact import statement.
- **`traits`** — every variant (an enum, like `size: sm | md | lg`) and state (a boolean, like `hover` or `disabled`) the component can be in.
- **`combos`** — pairing rules between traits, tokens, or entries (e.g. "loading and disabled must not both be set").

```yaml
sourceFiles:
  - platform: react
    file: ./src/Button.tsx

traits:
  - id: tone
    kind: enum
    name: Tone
    values:
      - id: default
        description: Neutral. General-purpose actions.
      - id: critical
        description: Destructive or irreversible actions only.
  - id: loading
    kind: boolean
    name: Loading
    description: An async operation triggered by the button is in progress.

combos:
  - subject: loading
    level: should-not
    items: [disabled]
    note: Loading already makes the button non-interactive.
```

---

## Escape hatches

### $extensions

`$extensions` is a namespaced escape hatch for vendor or tool data, at the document, entry, or section level. Keys MUST be namespaced (e.g. `com.figma`) so a tool integration never collides with a future core field:

<ds-example file="quickstart/07-button-custom.yaml" label="Linking a component to its Figma source" />

### Custom kinds

When the generic `entry` kind isn't specific enough, use a namespaced custom kind instead — it validates against the same open `entry.schema.yaml` base the generic kind does:

<ds-example file="quickstart/11-custom-entry.yaml" label="A namespaced custom entry kind" />

---

## Minimal examples

These are close to the smallest valid entry for each kind. Copy one, fill in your content, and add `sections` as your docs grow.

### Component

<ds-example file="quickstart/05-button-entry.yaml" label="A minimal standalone component entry" />

### Token

A token needs `id`, `kind`, `name`, `description`, and (usually) `tokenType`. Use `source` to point back at the DTCG file that holds the real value:

<ds-example file="quickstart/08-token-entry.yaml" label="A minimal standalone token entry" />

A described token adds `metadata.group` (the recommended way to group related tokens — there's no separate token-group kind) and a guideline:

<ds-example file="quickstart/09-token-described.yaml" label="A token with metadata and a guideline" />

### A pattern, using the generic entry kind

<ds-example file="quickstart/10-pattern-entry.yaml" label="A pattern, documented as a generic entry" />

### Shared content

Content that isn't itself a design-system artifact — a cross-cutting accessibility rule stated once and pointed at from every entry it applies to — lives in the base document's `shared` array, addressed via `entryId#itemId` and `rel: same-as`:

<ds-example file="quickstart/12-shared-sections.yaml" label="A shared rule, referenced instead of restated" />

---

## Validate your document

### Using the bundled schema

Add `$schema` to get editor autocompletion and inline validation:

```yaml
$schema: https://designsystemdocspec.org/v{{VERSION}}/dsds.bundled.schema.json
id: my-component
kind: component
name: My Component
description: What this component is and does.
```

### Using the CLI

```bash
# Clone the repo
git clone https://github.com/somerandomdude/design-system-documentation-schema.git
cd design-system-documentation-schema
npm install

# Validate the built-in examples and test corpus
npm run check

# Validate your own file
node scripts/validate.js my-system.dsds.yaml
```

---

## Next steps

You've seen the basics. Here's where to go deeper.

| Resource | Description |
|----------|-------------|
| [Full Spec](index.html) | Complete schema reference for every field and constraint |
| [Schema files](https://github.com/somerandomdude/design-system-documentation-schema/tree/main/schema) | The raw `.schema.yaml` files — use for editor autocompletion |
| [Example files](https://github.com/somerandomdude/design-system-documentation-schema/tree/main/examples) | Complete, valid example documents for every entry and section kind |
| [GitHub Discussions](https://github.com/somerandomdude/design-system-documentation-schema/discussions) | Ask questions, share ideas, propose changes |

<ds-callout variant="tip" title="Getting started recipe:">

1. Copy the [minimal component example](#component) above
2. Replace it with your own design system's first component
3. Add `sections` as your docs grow
4. Validate with `npm run check` to catch schema errors early

</ds-callout>
