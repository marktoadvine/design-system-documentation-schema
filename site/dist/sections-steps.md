# StepsSection

A series of actions/steps/tasks, like a tutorial, a migration, a pattern's interaction flow, or checklist of things to verify.

Source: `sections/steps.schema.yaml`

## StepsSection {#stepssection}

A series of actions/steps/tasks, like a tutorial, a migration, a pattern's interaction flow, or checklist of things to verify.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `"steps"` | ✓ | Marks this section as a stepped process or checklist. |
| `for` | `"human"` \| `"agent"` \| `"all"` | ✓ | Who or what this section is written for. (Default: `"all"`) |
| `title` | string |  | An optional heading for the section. |
| `description` | string |  | An optional one-line intro for the section. |
| `metadata` | [Metadata](metadata-metadata.md#metadata) |  | Optional information about an element. |
| `items` | object[] |  | The steps or checklist entries, in order. (Min items: 1) |
| `freeform` | `freeformEntry`[] |  | Nestable written content that can include headings. Available on every section kind regardless of `items`' own structure. (Min items: 1) |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data scoped to just this one section, keyed by namespace. |
| `ordered` | boolean |  | Whether entries must be done in order. Set to false for an unordered checklist. (Default: `true`) |

**References:** [Section](sections-section.md#section), [Id](common-id.md#id), [Markdown](common-markdown.md#markdown), [list](common-ref.md#list), [list](common-example.md#list), [Extensions](common-extensions.md#extensions), [Metadata](metadata-metadata.md#metadata), `#/$defs/freeformEntry`

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.20.0/sections/steps.schema.yaml",
  "title": "StepsSection",
  "description": "A series of actions/steps/tasks, like a tutorial, a migration, a pattern's interaction flow, or checklist of things to verify.",
  "$comment": "Useful whenever documenting a multi-phase process of job to be done.",
  "allOf": [
    {
      "$ref": "https://designsystemdocspec.org/v0.20.0/section.schema.yaml"
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "steps",
          "description": "Marks this section as a stepped process or checklist."
        },
        "ordered": {
          "type": "boolean",
          "default": true,
          "description": "Whether entries must be done in order. Set to false for an unordered checklist."
        },
        "items": {
          "type": "array",
          "description": "The steps or checklist entries, in order.",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": [
              "title"
            ],
            "properties": {
              "id": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/id.schema.yaml",
                "description": "An optional stable id, so a ref or a same-as pointer can address this step directly."
              },
              "title": {
                "type": "string",
                "description": "A short heading for this entry, for example 'Install the package' or 'Focus ring is visible'.",
                "example": "Install the package"
              },
              "description": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/markdown.schema.yaml",
                "description": "What to do, what happens, and what success looks like.",
                "example": "Run `npm install @org/ds-react`."
              },
              "checks": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/ref.schema.yaml#/$defs/list",
                "description": "Pointers from this checklist entry to the guideline or rule it verifies (rel: depends-on is the common value here).",
                "example": [
                  {
                    "to": "button#loading-announcement",
                    "rel": "depends-on"
                  }
                ]
              },
              "refs": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/ref.schema.yaml#/$defs/list",
                "description": "Other pointers from this step, for example the components involved in an interaction-flow entry.",
                "example": [
                  {
                    "to": "button",
                    "rel": "depends-on"
                  }
                ]
              },
              "examples": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/example.schema.yaml#/$defs/list",
                "description": "A screenshot, recording, or live URL. For code, point at a file or story through the example's `ref` instead."
              },
              "optional": {
                "type": "boolean",
                "default": false,
                "description": "Whether this entry can be skipped without breaking the procedure or checklist."
              },
              "$extensions": {
                "$ref": "https://designsystemdocspec.org/v0.20.0/common/extensions.schema.yaml",
                "description": "Escape hatch for tool data scoped to just this one step, keyed by namespace."
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
