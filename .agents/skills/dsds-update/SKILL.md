---
name: dsds-update
description: Update an existing DSDS spec based on implementation changes, Figma updates, or written instructions. Triggers on "update spec", "modify spec", "add prop to spec", "sync spec", "spec drift".
metadata:
  version: 0.15.2
---

# Update a DSDS Spec

Modify an existing `.dsds.json` file in `packages/specs/`.

## Procedure

1. Read the existing spec file.
2. Identify what changed — compare against the source (code diff, Figma update, user instructions).
3. Apply edits to the spec, preserving structure and existing content.
4. Run `npm run validate -w packages/specs` — fix errors until it passes.
5. Run `npm run build -w packages/specs` to regenerate the index.

## Common Updates

| Change                        | Location in spec                               |
| ----------------------------- | ---------------------------------------------- |
| New prop                      | `documentBlocks[kind=api].properties`          |
| New variant value             | `documentBlocks[kind=variants].items[].values` |
| New state                     | `documentBlocks[kind=states].items`            |
| Anatomy change                | `documentBlocks[kind=anatomy].parts`           |
| New accessibility requirement | `documentBlocks[kind=accessibility]`           |
| Status change                 | `entity.metadata.status`                       |
| New agent rule                | `agentDocumentBlocks[kind=guidelines].items`   |

## Rules

- Never remove existing content unless explicitly instructed — specs are additive by default.
- Preserve alphabetical ordering of properties within `api.properties`.
- When adding variant values, place them in logical order (not necessarily alphabetical).
- Update `metadata.status` if the change constitutes a breaking API modification.
- If adding a new relationship, use `{ "relation": "<depends-on|extends|related-to>", "target": "<identifier>", "role": "<description>" }`.

## Schema References

When adding new blocks or fields, verify the exact shape:

- **Bundled schema** (in-repo): `packages/specs/schema/dsds.bundled.schema.json`
- **Block reference**: `https://designsystemdocspec.org/document-blocks-{kind}`
- **Entity reference**: `https://designsystemdocspec.org/entities-{kind}`
- **Full architecture**: https://designsystemdocspec.org/schema-architecture

## Gotchas

- Modifying `entity.identifier` or `entity.kind` is a breaking change — confirm with the user.
- Adding a required prop (`"required": true`) is a breaking change for consumers.
- Token references must match identifiers in the `tokens/` specs.
