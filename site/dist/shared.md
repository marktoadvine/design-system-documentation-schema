# Shared

Reusable content other entries point at instead of restating. Not a design-system artifact in its own right.

Source: `shared.schema.yaml`

## Shared {#shared}

Reusable content other entries point at instead of restating. Not a design-system artifact in its own right.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | [Id](common-id.md#id) | ✓ | This entry's unique id. |
| `name` | string | ✓ | The human-readable display name. |
| `description` | string | ✓ | A one-line statement of what this shared entry is for. |
| `metadata` | object |  |  |
| `refs` | [list](common-ref.md#list) |  | Pointers from this entry to other things. |
| `sections` | [dispatch](sections-section.md#dispatch)[] |  | The reusable content itself, in the same section structure an entry uses. (Min items: 1) |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data or an outside id, the same structure as an entry's own $extensions. |

**References:** [Id](common-id.md#id), [Metadata](metadata-metadata.md#metadata), [list](common-ref.md#list), [dispatch](sections-section.md#dispatch), [Extensions](common-extensions.md#extensions)

## Full schema source

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://designsystemdocspec.org/v0.20.0/shared.schema.yaml
title: Shared
description: >-
  Reusable content other entries point at instead of restating. Not a
  design-system artifact in its own right.
$comment: >-
  Declares its own structure rather than extending `entry.schema.yaml` via
  `allOf`, even though the fields look similar. A shared item
  deliberately has no `kind`, `purpose`, `extends`, or `related`.
type: object
required: [id, name, description]
properties:
  id:
    $ref: https://designsystemdocspec.org/v0.20.0/common/id.schema.yaml
    description: This entry's unique id.
    $comment: A ref addresses it by this id, either directly or as the entryId half of an entryId#itemId address.
    example: shared-a11y
  name:
    type: string
    description: The human-readable display name.
    $comment: Kept separate from `id`, which is machine-readable.
    example: Shared accessibility rules
  description:
    type: string
    description: A one-line statement of what this shared entry is for.
    example: Accessibility rules that apply broadly across components.
  metadata:
    allOf:
      - $ref: https://designsystemdocspec.org/v0.20.0/metadata.schema.yaml
    unevaluatedProperties: false
  refs:
    $ref: https://designsystemdocspec.org/v0.20.0/common/ref.schema.yaml#/$defs/list
    description: Pointers from this entry to other things.
    example:
      - href: https://www.w3.org/WAI/WCAG21/quickref/
        rel: external-link
  sections:
    type: array
    minItems: 1
    description: The reusable content itself, in the same section structure an entry uses.
    items:
      $ref: https://designsystemdocspec.org/v0.20.0/section.schema.yaml#/$defs/dispatch
  $extensions:
    $ref: https://designsystemdocspec.org/v0.20.0/common/extensions.schema.yaml
    description: Escape hatch for tool data or an outside id, the same structure as an entry's own $extensions.
additionalProperties: false
```
