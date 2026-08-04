---
name: dsds-add
description: Author a new Design System Doc Spec (DSDS) spec from component implementation, Figma design, or written requirements. Triggers on "add spec", "create spec", "new spec", "author spec", "spec from component", "spec from Figma".
metadata:
  version: 0.15.2
---

# Add a DSDS Spec

Create a new `.dsds.json` entity file in `packages/specs/`.

## Procedure

1. Determine entity kind: `component`, `token-group`, `theme`, `foundation`, `pattern`, or `guide`.
2. Gather inputs — read the source (component source code, Figma frame, requirements doc).
3. Create `{directory}/{identifier}.dsds.json` using the template below.
4. Add a `$ref` entry in `index.dsds.json` under the correct entity group.
5. Run `npm run validate -w packages/specs` — fix errors until it passes.
6. Run `npm run build -w packages/specs` to regenerate the index.

## File Placement

| Kind                | Directory      |
| ------------------- | -------------- |
| component           | `components/`  |
| token-group / token | `tokens/`      |
| theme               | `themes/`      |
| foundation          | `foundations/` |
| pattern             | `patterns/`    |
| guide               | `guides/`      |

## Template (Component)

```json
{
  "$schema": "https://designsystemdocspec.org/v0.15.2/dsds.bundled.schema.json",
  "dsdsVersion": "0.15.2",
  "entity": {
    "kind": "component",
    "identifier": "<filename-without-extension>",
    "name": "<PascalCase>",
    "description": "<one-sentence summary>",
    "metadata": {
      "status": { "overall": "draft" },
      "since": "<version>",
      "category": "<action|feedback|form|disclosure|overlay|navigation|layout>",
      "tags": [],
      "summary": "<short phrase>"
    },
    "documentBlocks": []
  }
}
```

## Required Document Blocks (Components)

Include at minimum: `imports`, `anatomy`, `api`, `accessibility`, `guidelines`.

Add when applicable: `use-cases`, `variants`, `states`, `agentDocumentBlocks`.

## Extraction Guidelines

- **From code**: Map props → `api.properties`, CSS class anatomy → `anatomy.parts`, data attributes → `dataAttributes`.
- **From Figma**: Map layers → `anatomy.parts`, component properties → `api.properties` or `variants`, variable bindings → token references.
- **From requirements**: Map acceptance criteria → `guidelines`, interaction requirements → `accessibility.keyboardInteractions`.

## Schema References

When unsure about field shapes or required properties, consult:

- **Bundled schema** (in-repo): `packages/specs/schema/dsds.bundled.schema.json`
- **Entity docs**: `https://designsystemdocspec.org/entities-{kind}` (e.g. `/entities-component`)
- **Block docs**: `https://designsystemdocspec.org/document-blocks-{kind}` (e.g. `/document-blocks-api`)
- **Quick start examples**: https://designsystemdocspec.org/quickstart#minimal-examples

## Gotchas

- `entity.identifier` must match the filename (e.g. `checkbox` → `checkbox.dsds.json`).
- Always sort `documentBlocks` in this order: imports, use-cases, anatomy, api, variants, states, accessibility, guidelines.
- Use RFC 2119 levels in guidelines: `must`, `should`, `should-not`, `must-not`.
