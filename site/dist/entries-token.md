# TokenEntry

A single design token, from the Design Tokens Community Group (DTCG) format.

Source: `entries/token.schema.yaml`

## TokenEntry {#tokenentry}

A single design token, from the Design Tokens Community Group (DTCG) format.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | [tokenId](common-id.md#tokenid) | ✓ | This token's unique id. |
| `kind` | `"token"` | ✓ | Marks this entry as a token. |
| `name` | string | ✓ | The human-readable display name. |
| `description` | string | ✓ | A one-line statement of what this entry is or is for. |
| `purpose` | string |  | Explains the entry's reason for existing. |
| `metadata` | object |  |  |
| `related` | [list](common-ref.md#list) |  | Pointers to another entry this one is similar to in usage or purpose. |
| `extends` | [list](common-ref.md#list) |  | Pointers to another entry this one inherits from (rel: extends). |
| `refs` | [list](common-ref.md#list) |  | This entry's other pointers to entries and outside resources, not covered by `related` or `extends`. |
| `sections` | [dispatch](sections-section.md#dispatch)[] |  | Every documentation section for this entry. (Min items: 1) |
| `$extensions` | [Extensions](common-extensions.md#extensions) |  | Escape hatch for tool data, or for an outside id that doesn't fit this schema's own id pattern. |
| `source` | [Ref](common-ref.md#ref) |  | Path to the token's DTCG source file's token reference. |
| `tokenType` | string |  | The token's type, from DTCG. (Pattern: `^[a-z][a-zA-Z0-9]*$`) |
| `combos` | [Combo](common-combo.md#combo)[] |  | Rules about which other tokens this one must or must never be paired with. (Min items: 1) |

**References:** [Entry](entries-entry.md#entry), [EntryMetadata](metadata-entry-metadata.md#entrymetadata), [tokenId](common-id.md#tokenid), [Ref](common-ref.md#ref), [Combo](common-combo.md#combo), [list](common-ref.md#list), [dispatch](sections-section.md#dispatch), [Extensions](common-extensions.md#extensions)

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.20.0/entries/token.schema.yaml",
  "title": "TokenEntry",
  "$comment": "Never stores the token's real value or type. `source` points to the DTCG JSON file which acts as the source of truth. This entry describes what the token is, why is exists, and how to use it.",
  "description": "A single design token, from the Design Tokens Community Group (DTCG) format.",
  "allOf": [
    {
      "$ref": "https://designsystemdocspec.org/v0.20.0/entry.schema.yaml"
    },
    {
      "type": "object",
      "properties": {
        "kind": {
          "const": "token",
          "description": "Marks this entry as a token."
        },
        "metadata": {
          "allOf": [
            {
              "$ref": "https://designsystemdocspec.org/v0.20.0/metadata/entry-metadata.schema.yaml"
            }
          ],
          "unevaluatedProperties": false
        },
        "id": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/id.schema.yaml#/$defs/tokenId",
          "description": "This token's unique id.",
          "$comment": "Looser than the standard id pattern. Allows slash separators too, to fit however a token layer or DTCG source already names things.",
          "example": "color.action.primary"
        },
        "source": {
          "$ref": "https://designsystemdocspec.org/v0.20.0/common/ref.schema.yaml",
          "description": "Path to the token's DTCG source file's token reference.",
          "$comment": "A bare string is a plain file path (shorthand for href). Use the full ref object when role or note matters.",
          "example": "./tokens.dtcg.json"
        },
        "tokenType": {
          "type": "string",
          "pattern": "^[a-z][a-zA-Z0-9]*$",
          "description": "The token's type, from DTCG.",
          "$comment": "Optional - a token can inherit its type from its `metadata.group` instead of stating its own. Left open as a pattern instead of a fixed list. Well-known values as of this writing: color, dimension, fontFamily, fontWeight, duration, cubicBezier, number, shadow.",
          "example": "color"
        },
        "combos": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "https://designsystemdocspec.org/v0.20.0/common/combo.schema.yaml"
          },
          "description": "Rules about which other tokens this one must or must never be paired with.",
          "example": [
            {
              "subject": "{color.action.primary}",
              "level": "must",
              "items": [
                "{color.surface.default}",
                "{color.surface.raised}"
              ]
            }
          ]
        }
      }
    }
  ],
  "unevaluatedProperties": false
}
```
