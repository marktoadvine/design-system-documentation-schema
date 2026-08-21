# ThemeEntry

A defined system theme.

Source: `entries/theme.schema.yaml`

## ThemeEntry {#themeentry}

A defined system theme.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | ✓ | This entry's unique id in the design system graph. |
| `kind` | `"theme"` | ✓ | Marks this entry as a theme. |
| `name` | string | ✓ | The human-readable display name. |
| `description` | string | ✓ | A one-line statement of what this entry is or is for. |
| `purpose` | string |  | Explains the entry's reason for existing. |
| `metadata` | object |  |  |
| `related` | [list](common-ref.md#list) |  | Pointers to another entry this one is similar to in usage or purpose. |
| `extends` | [list](common-ref.md#list) |  | Pointers to another entry this one inherits from (rel: extends). |
| `refs` | [list](common-ref.md#list) |  | This entry's other pointers to entries and outside resources, not covered by `related` or `extends`. |
| `sections` | [Section](sections-section.md#section)[] |  | Every documentation section for this entry. (Min items: 1) |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data, or for an outside id that doesn't fit this schema's own id pattern. |
| `source` | [Ref](common-ref.md#ref) |  | Path to the theme's DTCG source file. |
| `colorScheme` | `"light"` \| `"dark"` |  | Which native color-scheme setting this theme matches. (Default: `"light"`) |

**References:** [Entry](entries-entry.md#entry), [EntryMetadata](metadata-entry-metadata.md#entrymetadata), [Ref](common-ref.md#ref), [list](common-ref.md#list), [Section](sections-section.md#section), [Extensions](common-extensions.md#extensions)

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.20.0/entries/theme.schema.yaml",
  "title": "ThemeEntry",
  "description": "A defined system theme.",
  "$comment": "This entry doesn't list which tokens the theme overrides. `source` points to the DTCG JSON file which acts as the source of truth.",
  "allOf": [
    {
      "$ref": "https://designsystemdocspec.org/v0.20.0/entry.schema.yaml"
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "theme",
          "description": "Marks this entry as a theme."
        },
        "metadata": {
          "allOf": [
            {
              "$ref": "https://designsystemdocspec.org/v0.20.0/metadata/entry-metadata.schema.yaml"
            }
          ],
          "unevaluatedProperties": false
        },
        "source": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/ref.schema.yaml",
          "description": "Path to the theme's DTCG source file.",
          "$comment": "A bare string is a plain file path (shorthand for href); use the full ref object when role or note matters.",
          "example": "tokens/dark.tokens.json"
        },
        "colorScheme": {
          "type": "string",
          "enum": [
            "light",
            "dark"
          ],
          "default": "light",
          "description": "Which native color-scheme setting this theme matches."
        }
      }
    }
  ],
  "unevaluatedProperties": false
}
```
