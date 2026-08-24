# SystemMetadata

Information about the design system as a whole, on top of the fields every metadata object shares.

Source: `metadata/system-metadata.schema.yaml`

## SystemMetadata {#systemmetadata}

Information about the design system as a whole, on top of the fields every metadata object shares.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `tags` | string[] |  | Keywords for grouping, search, and filtering. By convention, the first tag, if any, is the main category. (Min items: 1) |
| `owner` | string |  | The owning team, role, or group. |
| `reviewed` | object {date, by, note}[] |  | Independent reviews confirming this item's documentation, each recording who confirmed it and when. (Min items: 1) |
| `context` | string |  | Why this entry was created, and how and why to use it. |
| `updated` | object {date, note} |  | When this item's documentation last changed. |
| `origin` | object {method, author, note} |  | How this entry's documentation came to exist, and who or what wrote it. |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data scoped to just this entry's metadata, keyed by namespace. |
| `version` | [Since](common-since.md#since) |  | The current version of the design system. |
| `organization` | string |  | The team or company that owns the design system. |
| `url` | string (uri) |  | The main home page or repository for the design system. |
| `license` | string |  | The license this design system is published under. |
| `platforms` | [Id](common-id.md#id)[] |  | The platforms this system ships on, for example "react" or "web-component". (Min items: 1) |

**References:** [Metadata](metadata-metadata.md#metadata), [Since](common-since.md#since), [Id](common-id.md#id), `#/$defs/isoDate`, [Extensions](common-extensions.md#extensions)

## Full schema source

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://designsystemdocspec.org/v0.20.0/metadata/system-metadata.schema.yaml
title: SystemMetadata
description: Information about the design system as a whole, on top of the fields every metadata object shares.
$comment: Adds fields specifically for the system. See metadata/entry-metadata.schema.yaml for the per-entry equivalent.

allOf:
  - $ref: https://designsystemdocspec.org/v0.20.0/metadata.schema.yaml
  - type: object
    properties:
      version:
        $ref: https://designsystemdocspec.org/v0.20.0/common/since.schema.yaml
        description: The current version of the design system.
      organization:
        type: string
        description: The team or company that owns the design system.
        example: Acme Inc.
      url:
        type: string
        format: uri
        description: The main home page or repository for the design system.
        example: https://github.com/acme/design-system
      license:
        type: string
        description: The license this design system is published under.
        example: MIT
      platforms:
        type: array
        description: The platforms this system ships on, for example "react" or "web-component".
        $comment: When this list is present, every other `platform` value used anywhere in the document MUST match one of these.
        minItems: 1
        uniqueItems: true
        items:
          $ref: https://designsystemdocspec.org/v0.20.0/common/id.schema.yaml
        example: [react, web-component, ios]
```
