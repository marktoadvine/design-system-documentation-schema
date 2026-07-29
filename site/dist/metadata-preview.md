# Preview metadata field

A visual or interactive preview of the entity.

Source: `metadata/preview.schema.json`

## preview {#preview}

A visual or interactive preview of the entity (ex: image, video, code snippet, or URL). The value is a presentation object; its `kind` tag selects the media type. This is the single media surface for an entity — how big to show it (a small thumbnail, a large preview) is the consumer's call, so a renderer scales this one source to whatever a slot needs rather than the doc carrying the same asset twice.

One of:

- [presentationImage](common-presentation.md#presentationimage)
- [presentationVideo](common-presentation.md#presentationvideo)
- [presentationCode](common-presentation.md#presentationcode)
- [presentationUrl](common-presentation.md#presentationurl)

**References:** [presentationImage](common-presentation.md#presentationimage), [presentationVideo](common-presentation.md#presentationvideo), [presentationCode](common-presentation.md#presentationcode), [presentationUrl](common-presentation.md#presentationurl)

**Example:**

```json
[
  {
    "kind": "url",
    "url": "https://storybook.acme.com/?path=/story/components-button--primary"
  },
  {
    "kind": "image",
    "url": "https://design.acme.com/assets/previews/button-variants.png",
    "alt": "All Button variants shown side by side: primary, secondary, and ghost."
  }
]
```

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.16.0/metadata/preview.schema.json",
  "title": "Preview metadata field",
  "description": "A visual or interactive preview of the entity.",
  "$defs": {
    "preview": {
      "description": "A visual or interactive preview of the entity (ex: image, video, code snippet, or URL). The value is a presentation object; its `kind` tag selects the media type. This is the single media surface for an entity — how big to show it (a small thumbnail, a large preview) is the consumer's call, so a renderer scales this one source to whatever a slot needs rather than the doc carrying the same asset twice.",
      "oneOf": [
        {
          "$ref": "../common/presentation.schema.json#/$defs/presentationImage"
        },
        {
          "$ref": "../common/presentation.schema.json#/$defs/presentationVideo"
        },
        {
          "$ref": "../common/presentation.schema.json#/$defs/presentationCode"
        },
        {
          "$ref": "../common/presentation.schema.json#/$defs/presentationUrl"
        }
      ]
    }
  }
}
```
