# SystemEntry

A DSDS design system. System-level information and guidance for the design system as a whole.

Source: `entries/system.schema.yaml`

## SystemEntry {#systementry}

A DSDS design system. System-level information and guidance for the design system as a whole.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | ✓ | This entry's unique id in the design system graph. |
| `kind` | `"system"` | ✓ | Marks this entry as a design system. |
| `name` | string | ✓ | The human-readable display name. |
| `description` | string | ✓ | A one-line statement of what this entry is or is for. |
| `purpose` | string |  | Explains the entry's reason for existing. |
| `metadata` | object |  | Facts about the design system as a whole. |
| `related` | [list](common-ref.md#list) |  | Pointers to another entry this one is similar to in usage or purpose. |
| `extends` | [list](common-ref.md#list) |  | Pointers to another entry this one inherits from (rel: extends). |
| `refs` | [list](common-ref.md#list) |  | This entry's other pointers to entries and outside resources, not covered by `related` or `extends`. |
| `sections` | [dispatch](sections-section.md#dispatch)[] |  | Every documentation section for this entry. (Min items: 1) |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data, or for an outside id that doesn't fit this schema's own id pattern. |

**References:** [Entry](entries-entry.md#entry), [EntryMetadata](metadata-entry-metadata.md#entrymetadata), [SystemMetadata](metadata-system-metadata.md#systemmetadata), [list](common-ref.md#list), [dispatch](sections-section.md#dispatch), [Extensions](common-extensions.md#extensions)

## Full schema source

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://designsystemdocspec.org/v0.20.0/entries/system.schema.yaml
title: SystemEntry
description: A DSDS design system. System-level information and guidance for the design system as a whole.
$comment: >-
  Does not contain entries. A system points at its own
  components/tokens/etc with `refs` instead. It can reference other
  systems the same way to state a relationship (sibling, child,
  parent).

allOf:
  - $ref: https://designsystemdocspec.org/v0.20.0/entry.schema.yaml
  - type: object
    properties:
      kind:
        const: system
        description: Marks this entry as a design system.
      metadata:
        description: Facts about the design system as a whole.
        $comment: >-
          Uses the same structure as every other entry's `metadata`
          (entry-metadata.schema.yaml), plus fields that only make
          sense for a whole system: `version`, `organization`, `url`,
          `license`, `platforms` (system-metadata.schema.yaml).
        allOf:
          - $ref: https://designsystemdocspec.org/v0.20.0/metadata/entry-metadata.schema.yaml
          - $ref: https://designsystemdocspec.org/v0.20.0/metadata/system-metadata.schema.yaml
        unevaluatedProperties: false
unevaluatedProperties: false
```
