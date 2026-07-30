# System info definition

The identity of the design system. Includes name, version, organization, URL, and license. Separate from the per-entity `metadata`.

Source: `common/system-info.schema.json`

**2 definitions** in this file: `systemInfo`, `platform`

## systemInfo {#systeminfo}

Identity of the design system.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | ✓ | Human-readable name of the design system (ex: 'Acme Design System'). Not a package name — those belong in `extends.system` or platform imports. |
| `version` | string |  | Version this documentation describes (ex: '2.3.0'). SHOULD follow semver so tools can compare it against `extends.version` and `reviewedAgainst`. |
| `organization` | string |  | The organization that maintains the system. |
| `url` | string (uri) |  | URL to the system's documentation site. |
| `license` | string |  | License as an SPDX identifier (ex: 'MIT', 'Apache-2.0') or a URL to the license text. |
| `hasTokenLayer` | boolean |  | Whether this design system has design token. Define here to avoid tools guessing whether token entities appear in the file (tokens often live in an external DTCG file). When true, a design value that points at a token MUST be written as a DTCG alias in braces (ex: '{color.action.primary}'). |
| `platforms` | [platform](common-system-info.md#platform)[] |  | The platforms this system documents (ex: React, Swift UI, web components). Declare them once here so the rest of the document can point at the same set instead of repeatedly defining within each block. When present, an `api` block's `platform`, an `imports` entry's `platform`, and per-platform `status` keys SHOULD each match one of these identifiers. (Min items: 1) |

**References:** [platform](common-system-info.md#platform)

**Example:**

```json
{
  "organization": "Acme Corp",
  "url": "https://design.acme.com",
  "license": "MIT",
  "name": "Acme Design System",
  "version": "2.4.0",
  "platforms": [
    {
      "identifier": "react",
      "name": "React"
    },
    {
      "identifier": "web-component",
      "name": "Web Component"
    }
  ]
}
```

## platform {#platform}

One platform the system documents. `identifier` is the name everything else references; `name` is an optional friendly label.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `identifier` | string | ✓ | The platform's identifier, unique within this list (ex: 'react', 'web-component', 'swift-ui'). MUST be lowercase kebab-case. This is the value `api`, `imports`, and per-platform `status` point at. (Pattern: `^[a-z][a-z0-9-]*$`) |
| `name` | string |  | Optional friendly label for the platform (ex: 'React', 'Web Component', 'Swift UI'). |

**Example:**

```json
{
  "identifier": "react",
  "name": "React"
}
```

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.16.0/common/system-info.schema.json",
  "title": "System info definition",
  "description": "The identity of the design system. Includes name, version, organization, URL, and license. Separate from the per-entity `metadata`.",
  "$defs": {
    "systemInfo": {
      "type": "object",
      "description": "Identity of the design system.",
      "required": [
        "name"
      ],
      "properties": {
        "name": {
          "type": "string",
          "description": "Human-readable name of the design system (ex: 'Acme Design System'). Not a package name — those belong in `extends.system` or platform imports."
        },
        "version": {
          "type": "string",
          "description": "Version this documentation describes (ex: '2.3.0'). SHOULD follow semver so tools can compare it against `extends.version` and `reviewedAgainst`."
        },
        "organization": {
          "type": "string",
          "description": "The organization that maintains the system."
        },
        "url": {
          "type": "string",
          "format": "uri",
          "description": "URL to the system's documentation site."
        },
        "license": {
          "type": "string",
          "description": "License as an SPDX identifier (ex: 'MIT', 'Apache-2.0') or a URL to the license text."
        },
        "hasTokenLayer": {
          "type": "boolean",
          "description": "Whether this design system has design token. Define here to avoid tools guessing whether token entities appear in the file (tokens often live in an external DTCG file). When true, a design value that points at a token MUST be written as a DTCG alias in braces (ex: '{color.action.primary}')."
        },
        "platforms": {
          "type": "array",
          "description": "The platforms this system documents (ex: React, Swift UI, web components). Declare them once here so the rest of the document can point at the same set instead of repeatedly defining within each block. When present, an `api` block's `platform`, an `imports` entry's `platform`, and per-platform `status` keys SHOULD each match one of these identifiers.",
          "items": {
            "$ref": "#/$defs/platform"
          },
          "minItems": 1
        }
      },
      "additionalProperties": false
    },
    "platform": {
      "type": "object",
      "description": "One platform the system documents. `identifier` is the name everything else references; `name` is an optional friendly label.",
      "required": [
        "identifier"
      ],
      "properties": {
        "identifier": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]*$",
          "description": "The platform's identifier, unique within this list (ex: 'react', 'web-component', 'swift-ui'). MUST be lowercase kebab-case. This is the value `api`, `imports`, and per-platform `status` point at."
        },
        "name": {
          "type": "string",
          "description": "Optional friendly label for the platform (ex: 'React', 'Web Component', 'Swift UI')."
        }
      },
      "additionalProperties": false
    }
  }
}
```
