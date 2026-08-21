# Section

A logical documentation section. Every section uses the same structure (`items`), no matter its kind, and is tagged with who it is for (human, agent, or all). Each sections/<kind>.schema.yaml file adds its own `kind` value and its own structure for `items`.

Source: `sections/section.schema.yaml`

**3 definitions** in this file: `Section`, `dispatch`, `freeformEntry`

## Section {#section}

A logical documentation section. Every section uses the same structure (`items`), no matter its kind, and is tagged with who it is for (human, agent, or all). Each sections/<kind>.schema.yaml file adds its own `kind` value and its own structure for `items`.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `"definitions"` \| `"guidelines"` \| `"steps"` \| `"section"` \| [namespaced](common-id.md#namespaced) | ✓ | What kind of content section this is. |
| `for` | `"human"` \| `"agent"` \| `"all"` | ✓ | Who or what this section is written for. (Default: `"all"`) |
| `items` | object[] | at least 1 | The one universal list for this section kind's own structured content. |
| `freeform` | `freeformEntry`[] | at least 1 | Nestable written content that can include headings. Available on every section kind regardless of `items`' own structure. (Min items: 1) |
| `title` | string |  | An optional heading for the section. |
| `description` | string |  | An optional one-line intro for the section. |
| `metadata` | [Metadata](metadata-metadata.md#metadata) |  | Optional information about an element. |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data scoped to just this one section, keyed by namespace. |

**Constraint:** At least one of `items`, `freeform` must be present.

**References:** [namespaced](common-id.md#namespaced), [Metadata](metadata-metadata.md#metadata), `#/$defs/freeformEntry`, [Extensions](common-extensions.md#extensions), [DefinitionsSection](sections-definitions.md#definitionssection), [GuidelinesSection](sections-guidelines.md#guidelinessection), [StepsSection](sections-steps.md#stepssection), [Section](sections-section.md#section), [Id](common-id.md#id), [Markdown](common-markdown.md#markdown), [list](common-example.md#list), [list](common-ref.md#list)

## dispatch {#dispatch}

**References:** [DefinitionsSection](sections-definitions.md#definitionssection), [GuidelinesSection](sections-guidelines.md#guidelinessection), [StepsSection](sections-steps.md#stepssection), [Section](sections-section.md#section)

## freeformEntry {#freeformentry}

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | string | ✓ | The entry's heading, for example 'Installation'. |
| `id` | [Id](common-id.md#id) |  | A stable id for linking to this entry directly, unique within the section. |
| `body` | [Markdown](common-markdown.md#markdown) |  | The entry's content. |
| `examples` | [list](common-example.md#list) |  |  |
| `refs` | [list](common-ref.md#list) |  | "See also" pointers for this entry. To point at another entry, use the entry's own top-level `refs` instead. |
| `items` | `freeformEntry`[] |  | Sub-entries nested beneath this one, to any depth. (Min items: 1) |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data scoped to just this one freeform entry, keyed by namespace. |

**References:** [Id](common-id.md#id), [Markdown](common-markdown.md#markdown), [list](common-example.md#list), [list](common-ref.md#list), `#/$defs/freeformEntry`, [Extensions](common-extensions.md#extensions)

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.20.0/section.schema.yaml",
  "title": "Section",
  "type": "object",
  "description": "A logical documentation section. Every section uses the same structure (`items`), no matter its kind, and is tagged with who it is for (human, agent, or all). Each sections/<kind>.schema.yaml file adds its own `kind` value and its own structure for `items`.",
  "$comment": "`freeform` lives here on the base so every kind can carry nested, headed content alongside its own structured `items`. A `guidelines` section can pair its rules with background reading, a `steps` section can pair its checklist with extra context, and so on. A section should use either `items` or `freeform`.A section that's only `freeform` content (this used to be its own `kind: freeform`) picks whichever kind fits it best.  If nothing fits, use the generic `kind: section` instead.\nThis file doesn't close its own list of properties. Each sections/<kind>.schema.yaml file adds its own extra fields on top (steps' `ordered`, definitions' term/definition items), and closes the combined structure itself, at the item level.",
  "required": [
    "kind",
    "for"
  ],
  "anyOf": [
    {
      "required": [
        "items"
      ]
    },
    {
      "required": [
        "freeform"
      ]
    }
  ],
  "properties": {
    "kind": {
      "description": "What kind of content section this is.",
      "$comment": "One of the 3 specific content patterns, the generic `section`, or a namespaced custom kind, like \"acme.custom-section\".",
      "oneOf": [
        {
          "type": "string",
          "enum": [
            "definitions",
            "guidelines",
            "steps",
            "section"
          ],
          "default": "section"
        },
        {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/id.schema.yaml#/$defs/namespaced",
          "description": "A namespaced custom kind.",
          "example": "acme.custom-section"
        }
      ]
    },
    "for": {
      "type": "string",
      "enum": [
        "human",
        "agent",
        "all"
      ],
      "default": "all",
      "description": "Who or what this section is written for."
    },
    "title": {
      "type": "string",
      "description": "An optional heading for the section.",
      "example": "When to use"
    },
    "description": {
      "type": "string",
      "description": "An optional one-line intro for the section.",
      "example": "Rules for using this component correctly."
    },
    "metadata": {
      "$ref": "https://designsystemdocspec.org/v0.20.0/metadata.schema.yaml"
    },
    "items": {
      "type": "array",
      "description": "The one universal list for this section kind's own structured content.",
      "$comment": "Never under a kind-specific key like parts, steps, or properties.",
      "items": {
        "type": "object"
      }
    },
    "freeform": {
      "type": "array",
      "minItems": 1,
      "description": "Nestable written content that can include headings. Available on every section kind regardless of `items`' own structure.",
      "$comment": "See this file's own $comment above for why this lives on the base instead of its own section kind.",
      "items": {
        "$ref": "#/$defs/freeformEntry"
      },
      "example": [
        {
          "title": "Install",
          "body": "Add the package and its peer dependencies."
        }
      ]
    },
    "$extensions": {
      "$ref": "https://designsystemdocspec.org/v0.20.0/common/extensions.schema.yaml",
      "description": "Escape hatch for tool data scoped to just this one section, keyed by namespace.",
      "$comment": "A tool that only cares about one section, like an api section, can stash its data here instead of using the whole entry's escape hatch."
    }
  },
  "$defs": {
    "dispatch": {
      "$comment": "Routes a section to its own sections/<kind>.schema.yaml by `kind`, falling back to this file (the open base) for the generic `section` kind or a namespaced custom kind with no dedicated file. Used anywhere a section is embedded (an entry's or a shared item's own `sections`) instead of a bare $ref to this file, so the bundled schema enforces the same per-kind shape scripts/validate.js does in JS.",
      "if": {
        "required": [
          "kind"
        ],
        "properties": {
          "kind": {
            "const": "definitions"
          }
        }
      },
      "then": {
        "$ref": "https://designsystemdocspec.org/v0.20.0/sections/definitions.schema.yaml"
      },
      "else": {
        "if": {
          "required": [
            "kind"
          ],
          "properties": {
            "kind": {
              "const": "guidelines"
            }
          }
        },
        "then": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/sections/guidelines.schema.yaml"
        },
        "else": {
          "if": {
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "const": "steps"
              }
            }
          },
          "then": {
            "$ref": "https://designsystemdocspec.org/v0.20.0/sections/steps.schema.yaml"
          },
          "else": {
            "$ref": "https://designsystemdocspec.org/v0.20.0/section.schema.yaml"
          }
        }
      }
    },
    "freeformEntry": {
      "type": "object",
      "required": [
        "title"
      ],
      "properties": {
        "id": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/id.schema.yaml",
          "description": "A stable id for linking to this entry directly, unique within the section.",
          "$comment": "Tools MAY derive one from the title when this is left out.",
          "example": "install"
        },
        "title": {
          "type": "string",
          "description": "The entry's heading, for example 'Installation'.",
          "example": "Installation"
        },
        "body": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/markdown.schema.yaml",
          "description": "The entry's content.",
          "$comment": "Can be left out when the entry only groups sub-entries.",
          "example": "Add the package and its peer dependencies."
        },
        "examples": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/example.schema.yaml#/$defs/list"
        },
        "refs": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/ref.schema.yaml#/$defs/list",
          "description": "\"See also\" pointers for this entry. To point at another entry, use the entry's own top-level `refs` instead.",
          "example": [
            {
              "to": "button",
              "rel": "relates-to"
            }
          ]
        },
        "items": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/freeformEntry"
          },
          "description": "Sub-entries nested beneath this one, to any depth."
        },
        "$extensions": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/extensions.schema.yaml",
          "description": "Escape hatch for tool data scoped to just this one freeform entry, keyed by namespace."
        }
      },
      "additionalProperties": false
    }
  }
}
```
