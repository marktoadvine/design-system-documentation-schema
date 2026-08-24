# Example

A single example, illustrating something in context.

Source: `common/example.schema.yaml`

**2 definitions** in this file: `Example`, `list`

## Example {#example}

A single example, illustrating something in context.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | string | at least 1 | A short heading for the example. |
| `description` | string | at least 1 | Describes the example in detail. |
| `showcase` | [Showcase](common-showcase.md#showcase) | at least 1 | A visual sample of this example. |
| `ref` | [Ref](common-ref.md#ref) | at least 1 | Where this example lives in code. |

**Constraint:** At least one of `title`, `description`, `showcase`, `ref` must be present.

**References:** [Showcase](common-showcase.md#showcase), [Ref](common-ref.md#ref), [Example](common-example.md#example)

## list {#list}

**References:** [Example](common-example.md#example)

## Full schema source

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://designsystemdocspec.org/v0.20.0/common/example.schema.yaml
title: Example
type: object
description: A single example, illustrating something in context.
$comment: At least one of `title`, `description`, `showcase`, or `ref` must be given.

properties:
  title:
    type: string
    description: A short heading for the example.
    example: Loading state has an accessible announcement
  description:
    type: string
    description: Describes the example in detail.
    example: Renders with aria-live="polite" so the loading state is announced.
  showcase:
    $ref: https://designsystemdocspec.org/v0.20.0/common/showcase.schema.yaml
    description: A visual sample of this example.
    $comment: This property is used only when a visual example exists. Sometimes the example is only code or a file reference. Use `ref` in those cases.
  ref:
    $ref: https://designsystemdocspec.org/v0.20.0/common/ref.schema.yaml
    description: Where this example lives in code.
    $comment: "Use `rel: file` for a source file, or `rel: storybook`/`rel: external-link` for a live story."
anyOf:
  - required: [title]
  - required: [description]
  - required: [showcase]
  - required: [ref]
$defs:
  list:
    type: array
    minItems: 1
    $comment: Every consumer expects an array of examples. Pulled out here so call sites don't have to redefine it.
    items:
      $ref: https://designsystemdocspec.org/v0.20.0/common/example.schema.yaml
```
