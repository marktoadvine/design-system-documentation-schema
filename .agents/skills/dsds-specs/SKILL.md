---
name: dsds-specs
description: Everything about Design System Doc Spec (DSDS) — entity kinds, document blocks, schema structure, and how it fits into the ecosystem. Use when authoring, reviewing, or reasoning about DSDS specs and `*.dsds.json` files.
metadata:
  version: 0.15.2
---

# Design System Doc Spec (DSDS)

[DSDS](https://designsystemdocspec.org/) is a machine-readable JSON format for documenting design systems. DSDS specs are the **single source of truth** — everything else (React components, Figma, docs, AI catalogs) derives from them.

## Schema Sources

When you need precise field-level details beyond this skill, consult these in order:

1. **Bundled schema** (in-repo): `packages/specs/schema/dsds.bundled.schema.json`
2. **Schema architecture reference**: https://designsystemdocspec.org/schema-architecture
3. **Quick start with examples**: https://designsystemdocspec.org/quickstart
4. **GitHub source** (split schemas + examples): https://github.com/somerandomdude/design-system-documentation-schema/tree/main/spec

Key pages for block-level detail:

- Entity docs: https://designsystemdocspec.org/entities-component, `/entities-token`, `/entities-theme`, `/entities-foundation`, `/entities-pattern`, `/entities-guide`
- Block docs: https://designsystemdocspec.org/document-blocks-api, `/document-blocks-anatomy`, `/document-blocks-variants`, `/document-blocks-states`, `/document-blocks-accessibility`, `/document-blocks-guidelines`

## Entity Kinds

| Kind          | Purpose                                        | Directory      |
| ------------- | ---------------------------------------------- | -------------- |
| `component`   | Component API, anatomy, variants, states, a11y | `components/`  |
| `token`       | Single design token                            | `tokens/`      |
| `token-group` | Group of related tokens                        | `tokens/`      |
| `theme`       | Named token override set                       | `themes/`      |
| `foundation`  | Principles and scales (color, spacing, type)   | `foundations/` |
| `pattern`     | Multi-component UX flows                       | `patterns/`    |
| `guide`       | Narrative documentation                        | `guides/`      |
| `chunk`       | Pre-composed code patterns                     | `chunks/`      |

## Document Structure

Every `.dsds.json` file has:

```json
{
  "$schema": "https://designsystemdocspec.org/v0.15.2/dsds.bundled.schema.json",
  "dsdsVersion": "0.15.2",
  "entity": { "kind": "...", "identifier": "...", ... }
}
```

The root index (`index.dsds.json`) uses `entityGroups` with `$ref` links instead of `entity`.

## Component Document Blocks

Blocks inside `entity.documentBlocks`:

- **imports** — platform-specific import statements
- **use-cases** — recommended/discouraged usage with alternatives
- **anatomy** — named parts with token references
- **api** — properties, events, data attributes (per platform)
- **variants** — enum and flag variant definitions with tokens
- **states** — interactive states with token overrides
- **accessibility** — keyboard interactions, ARIA, focus behaviors
- **guidelines** — usage rules with RFC 2119 conformance levels

## Agent Document Blocks

`entity.agentDocumentBlocks` — same block kinds but targeted at AI consumers. Use for hard rules agents must follow (e.g. "must-not generate icon-only Button").

## Schema Validation

The bundled schema is at `packages/specs/schema/dsds.bundled.schema.json`. Uses JSON Schema draft 2020-12. Validate with:

```bash
npm run validate -w packages/specs
```

## Deep-Dive References

Fetch these pages when authoring specific block types:

| Block         | Reference                                                             |
| ------------- | --------------------------------------------------------------------- |
| API           | https://designsystemdocspec.org/document-blocks-api                   |
| Anatomy       | https://designsystemdocspec.org/document-blocks-anatomy               |
| Variants      | https://designsystemdocspec.org/document-blocks-variants              |
| States        | https://designsystemdocspec.org/document-blocks-states                |
| Accessibility | https://designsystemdocspec.org/document-blocks-accessibility         |
| Guidelines    | https://designsystemdocspec.org/document-blocks-guidelines            |
| Imports       | https://designsystemdocspec.org/document-blocks-imports               |
| Design specs  | https://designsystemdocspec.org/document-blocks-design-specifications |

## Gotchas

- Root object must have either `entity` (single-entity files) or `entityGroups` (index files), never both.
- `entity.identifier` must match the filename without `.dsds.json`.
- Conformance levels: `must`, `should`, `should-not`, `must-not` (lowercase, hyphenated).
- `metadata.status` can be a string (`"stable"`) or an object with `overall` and `platforms`.
