# DefinitionsSection

Term definitions. Can describe content labels within components or patterns, define naming conventions, act as a glossary, or be a simple way to outline component props/APIs.

Source: `sections/definitions.schema.yaml`

## DefinitionsSection {#definitionssection}

Term definitions. Can describe content labels within components or patterns, define naming conventions, act as a glossary, or be a simple way to outline component props/APIs.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `"definitions"` | ✓ | Marks this section as term-definition documentation. |
| `for` | `"human"` \| `"agent"` \| `"all"` | ✓ | Who or what this section is written for. (Default: `"all"`) |
| `title` | string |  | An optional heading for the section. |
| `description` | string |  | An optional one-line intro for the section. |
| `metadata` | [Metadata](metadata-metadata.md#metadata) |  | Optional information about an element. |
| `items` | object[] |  | One entry per term. (Min items: 1) |
| `freeform` | `freeformEntry`[] |  | Nestable written content that can include headings. Available on every section kind regardless of `items`' own structure. (Min items: 1) |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data scoped to just this one section, keyed by namespace. |

**References:** [Section](sections-section.md#section), [Id](common-id.md#id), [Markdown](common-markdown.md#markdown), [Metadata](metadata-metadata.md#metadata), `#/$defs/freeformEntry`, [Extensions](common-extensions.md#extensions)

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.20.0/sections/definitions.schema.yaml",
  "title": "DefinitionsSection",
  "description": "Term definitions. Can describe content labels within components or patterns, define naming conventions, act as a glossary, or be a simple way to outline component props/APIs.",
  "$comment": "A `definitions` section on an entry defines that entry's own terms. Distinct from `metadata.tags` or any other classification label.",
  "allOf": [
    {
      "$ref": "https://designsystemdocspec.org/v0.20.0/section.schema.yaml"
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "definitions",
          "description": "Marks this section as term-definition documentation."
        },
        "items": {
          "type": "array",
          "minItems": 1,
          "description": "One entry per term.",
          "items": {
            "type": "object",
            "required": [
              "term",
              "definition"
            ],
            "properties": {
              "id": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/id.schema.yaml",
                "description": "An optional stable id, so a ref or a same-as pointer can address this term directly."
              },
              "term": {
                "type": "string",
                "description": "The subject of the definition.",
                "example": "OK"
              },
              "definition": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/markdown.schema.yaml",
                "description": "What the term means.",
                "example": "To confirm an action."
              },
              "usage": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/markdown.schema.yaml",
                "description": "When and how to use it, with formatting notes.",
                "example": "Use as the confirming action's label in a destructive-action dialog."
              },
              "aliases": {
                "type": "array",
                "minItems": 1,
                "uniqueItems": true,
                "items": {
                  "type": "string",
                  "description": "Related terms often confused with this one.",
                  "example": "Confirm"
                }
              }
            },
            "additionalProperties": false
          }
        }
      }
    }
  ],
  "unevaluatedProperties": false
}
```
