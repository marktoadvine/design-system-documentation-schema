# Variants document block

Every way a component can be configured — a toggle (flag variant, like 'disabled') or a set of options (enum variant, like size: sm | md | lg). Each can explain why it exists.

Source: `document-blocks/variants.schema.json`

**7 definitions** in this file: `variants`, `variantExclusion`, `variantRequirement`, `flagVariant`, `enumVariant`, `variantSelection`, `variantValue`

## variants {#variants}

Every way a component or pattern can be configured — a toggle or a set of options. Multiple items combine independently. A variant is a choice the consumer makes up front (ex: 'size', 'full-width'); a condition entered at runtime (hover, disabled, loading) is a state — document that in `states` instead.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `"variants"` | ✓ | Identifies this block as a variants spec. |
| `items` | object {kind}[] | ✓ | The variant dimensions, in order. Tools SHOULD keep this order. (Min items: 1) |
| `exclusions` | [variantExclusion](document-blocks-variants.md#variantexclusion)[] |  | Combinations that must not be used together (ex: 'icon-only' + 'full-width'). Each entry lists the conflicting selections and how hard the ban is. (Min items: 1) |
| `requirements` | [variantRequirement](document-blocks-variants.md#variantrequirement)[] |  | Combinations that must hold (ex: a 'danger' button must show an icon). Each entry says which selection triggers the requirement and what it then requires. (Min items: 1) |
| `$extensions` | [extensions](common-extensions.md#extensions) |  | All vendor-specific extensions . Keys MUST use a namespace of at least two dot-separated segments (reverse domain recommended), Example: 'com.figma', 'acme.tooling'; the pattern is case-tolerant. Tools that don't recognize an extension MUST keep it. Extension data SHOULD NOT duplicate core schema fields. |

**References:** [variantExclusion](document-blocks-variants.md#variantexclusion), [variantRequirement](document-blocks-variants.md#variantrequirement), [flagVariant](document-blocks-variants.md#flagvariant), [enumVariant](document-blocks-variants.md#enumvariant), [extensions](common-extensions.md#extensions)

**Example:**

```json
{
  "kind": "variants",
  "items": [
    {
      "kind": "enum",
      "identifier": "emphasis",
      "name": "Emphasis",
      "description": "Controls the visual weight of the button to establish a visual hierarchy among actions on a surface.",
      "values": [
        {
          "identifier": "primary",
          "description": "High-emphasis — the main action on the surface."
        },
        {
          "identifier": "secondary",
          "description": "Medium-emphasis — important but not primary."
        },
        {
          "identifier": "ghost",
          "description": "Low-emphasis — tertiary actions and dense layouts."
        },
        {
          "identifier": "danger",
          "description": "Signals a destructive or irreversible action."
        }
      ]
    },
    {
      "kind": "enum",
      "identifier": "size",
      "name": "Size",
      "description": "Controls the physical dimensions and internal padding of the button.",
      "values": [
        {
          "identifier": "sm",
          "name": "Small",
          "description": "Compact size for toolbars, table rows, and dense layouts. 32px height."
        },
        {
          "identifier": "md",
          "name": "Medium",
          "description": "Default size for most contexts. 40px height."
        },
        {
          "identifier": "lg",
          "name": "Large",
          "description": "Touch-optimized size for mobile-first surfaces. 48px height."
        }
      ]
    },
    {
      "kind": "flag",
      "identifier": "full-width",
      "name": "Full Width",
      "description": "The button stretches to fill the full width of its parent container."
    },
    {
      "kind": "flag",
      "identifier": "icon-only",
      "name": "Icon Only",
      "description": "The button renders a single icon with no visible label. An aria-label is required."
    },
    {
      "kind": "flag",
      "identifier": "with-icon",
      "name": "With Icon",
      "description": "The button shows a leading icon alongside its label."
    }
  ],
  "exclusions": [
    {
      "when": [
        {
          "variant": "icon-only"
        }
      ],
      "excludes": [
        {
          "variant": "full-width"
        }
      ],
      "level": "must-not",
      "description": "An icon-only button is sized to its icon; stretching it full-width contradicts that."
    }
  ],
  "requirements": [
    {
      "when": [
        {
          "variant": "emphasis",
          "value": "danger"
        }
      ],
      "requires": [
        {
          "variant": "with-icon"
        }
      ],
      "level": "must",
      "description": "A danger button must show an icon so its destructive intent is not carried by color alone."
    }
  ]
}
```

## variantExclusion {#variantexclusion}

A constraint that says: when the `when` selections are active, the `excludes` selections must not also be active (ex: when 'icon-only' is on, 'full-width' is excluded). Both `when` and `excludes` are arrays so you can express multi-part triggers and exclude more than one thing at once.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `when` | [variantSelection](document-blocks-variants.md#variantselection)[] | ✓ | The triggering selection(s). When all of these are active, the `excludes` rule applies. (Min items: 1) |
| `excludes` | [variantSelection](document-blocks-variants.md#variantselection)[] | ✓ | The selection(s) that must not be active when `when` holds. (Min items: 1) |
| `level` | [conformanceLevel](common-criterion.md#conformancelevel) | ✓ | How hard the ban is: 'must-not' (the combination is invalid) or 'should-not' (allowed but discouraged). Use the negative levels here. |
| `description` | [richText](common-rich-text.md#richtext) |  | Why the combination is disallowed. |

**References:** [variantSelection](document-blocks-variants.md#variantselection), [conformanceLevel](common-criterion.md#conformancelevel), [richText](common-rich-text.md#richtext)

**Example:**

```json
{
  "when": [
    {
      "variant": "icon-only"
    }
  ],
  "excludes": [
    {
      "variant": "full-width"
    }
  ],
  "level": "must-not",
  "description": "An icon-only button is sized to its icon; stretching it full-width contradicts that."
}
```

## variantRequirement {#variantrequirement}

A combination that must hold: when one selection is active, another is required (ex: a 'danger' button must show an icon). The opposite of an exclusion.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `when` | [variantSelection](document-blocks-variants.md#variantselection)[] | ✓ | The triggering selection(s). When all of these are active, `requires` applies. (Min items: 1) |
| `requires` | [variantSelection](document-blocks-variants.md#variantselection)[] | ✓ | The selection(s) that must also be active whenever `when` holds. (Min items: 1) |
| `level` | [conformanceLevel](common-criterion.md#conformancelevel) | ✓ | How hard the requirement is: 'must' (required) or 'should' (recommended). Use the positive levels here. |
| `description` | [richText](common-rich-text.md#richtext) |  | Why the requirement exists. |

**References:** [variantSelection](document-blocks-variants.md#variantselection), [conformanceLevel](common-criterion.md#conformancelevel), [richText](common-rich-text.md#richtext)

**Example:**

```json
{
  "when": [
    {
      "variant": "emphasis",
      "value": "danger"
    }
  ],
  "requires": [
    {
      "variant": "with-icon"
    }
  ],
  "level": "must",
  "description": "A danger button must show an icon so its destructive intent is not carried by color alone."
}
```

## flagVariant {#flagvariant}

A toggle — on or off. Use it for binary capabilities like 'disabled' or 'full-width'. No `values` array; it's simply active or not.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `"flag"` | ✓ | Identifies this variant as a boolean flag. |
| `identifier` | string | ✓ | Machine-readable identifier of the flag (ex: 'disabled', 'full-width', 'icon-only', 'loading'). |
| `description` | [richText](common-rich-text.md#richtext) | ✓ | What this flag controls and how it affects the component's appearance or behavior when active. |
| `name` | string |  | Human-readable name of the flag (ex: 'Disabled', 'Full Width', 'Icon Only', 'Loading'). |
| `rationale` | [richText](common-rich-text.md#richtext) |  | Why this flag exists (ex: 'Prevents interaction during submission to avoid duplicate requests'). |
| `examples` | [example](common-example.md#example)[] |  | Examples showing the component with this flag active. (Min items: 1) |
| `tokens` | [tokenOverrides](common-token-overrides.md#tokenoverrides) |  | Token overrides applied when this flag is active. |

**References:** [richText](common-rich-text.md#richtext), [example](common-example.md#example), [tokenOverrides](common-token-overrides.md#tokenoverrides)

**Example:**

```json
[
  {
    "kind": "flag",
    "identifier": "full-width",
    "name": "Full Width",
    "description": "When active, the button stretches to fill the full width of its parent container. Label text is centered.",
    "rationale": "- Use when: When the button is the sole action in a narrow container such as a mobile sheet, a card footer, or a single-column form.\n- Avoid when: When multiple buttons appear side by side in a button group or dialog footer. Use `default width` instead — Full-width buttons in a horizontal group force a stacked layout, which breaks the expected left-to-right reading order for action groups."
  },
  {
    "kind": "flag",
    "identifier": "icon-only",
    "name": "Icon Only",
    "description": "When active, the button renders a single icon with no visible label. An aria-label is required."
  }
]
```

## enumVariant {#enumvariant}

A set of options where you pick one, like 'size' (sm | md | lg) or 'emphasis' (primary | secondary | ghost).

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `"enum"` | ✓ | Identifies this variant as an enumerated set of values. |
| `identifier` | string | ✓ | Machine-readable name for this dimension (ex: 'size', 'emphasis') — the axis, not one of its values. |
| `description` | [richText](common-rich-text.md#richtext) | ✓ | What this dimension of variation controls and how its values affect the component's appearance or behavior. |
| `values` | [variantValue](document-blocks-variants.md#variantvalue)[] | ✓ | The possible values. A single value is fine — dimensions often start with just one while more are added over time. Tools SHOULD keep this order. (Min items: 1) |
| `name` | string |  | Human-readable name of the variant dimension (ex: 'Size', 'Emphasis', 'Shape'). |

**References:** [richText](common-rich-text.md#richtext), [variantValue](document-blocks-variants.md#variantvalue)

**Example:**

```json
[
  {
    "kind": "enum",
    "identifier": "emphasis",
    "name": "Emphasis",
    "description": "Controls the visual weight of the button. Determines background fill, border treatment, and text color to establish a visual hierarchy among actions on a surface.",
    "values": [
      {
        "identifier": "primary",
        "description": "High-emphasis — the main action on the surface."
      },
      {
        "identifier": "secondary",
        "description": "Medium-emphasis — important but not primary."
      },
      {
        "identifier": "ghost",
        "description": "Low-emphasis — tertiary actions and dense layouts."
      },
      {
        "identifier": "danger",
        "description": "Signals a destructive or irreversible action."
      }
    ]
  },
  {
    "kind": "enum",
    "identifier": "size",
    "name": "Size",
    "description": "Controls the physical dimensions and internal padding of the button. All sizes maintain a minimum 44×44 CSS pixel tap target.",
    "values": [
      {
        "identifier": "small",
        "description": "Compact size for toolbars, table rows, and dense layouts."
      },
      {
        "identifier": "medium",
        "description": "The default size. Suitable for most contexts including forms, dialogs, and page-level actions."
      },
      {
        "identifier": "large",
        "description": "Touch-optimized size for mobile-first surfaces and marketing pages."
      }
    ]
  }
]
```

## variantSelection {#variantselection}

A pointer to one variant being active: a flag by its identifier, or an enum dimension with a chosen value. The `variant` MUST match an item in the same block's `items`.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `variant` | string | ✓ | Identifier of the flag or enum dimension this points at (ex: 'icon-only', 'emphasis'). MUST match one of this block's `items`. |
| `value` | string |  | For an enum dimension, the selected value's identifier (ex: 'danger'). MUST be one of that dimension's values. Omit for a flag — naming the flag already means it is on. |

**Example:**

```json
{
  "variant": "emphasis",
  "value": "danger"
}
```

## variantValue {#variantvalue}

A single option within an enum variant dimension.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `identifier` | string | ✓ | Machine-readable value identifier (ex: 'sm', 'md', 'lg', 'primary', 'secondary'). |
| `description` | [richText](common-rich-text.md#richtext) | ✓ | What this value looks like, when to use it, and how it differs from other values in this dimension. |
| `name` | string |  | Human-readable name (ex: 'Small', 'Medium', 'Large', 'Primary', 'Secondary'). |
| `rationale` | [richText](common-rich-text.md#richtext) |  | Why this value exists (ex: 'High emphasis directs users to the one key action'). For guidance comparing values, use `use-cases` instead. |
| `examples` | [example](common-example.md#example)[] |  | Examples showing this variant value in isolation or in context. (Min items: 1) |
| `tokens` | [tokenOverrides](common-token-overrides.md#tokenoverrides) |  | Token overrides applied when this value is selected. |

**References:** [richText](common-rich-text.md#richtext), [example](common-example.md#example), [tokenOverrides](common-token-overrides.md#tokenoverrides)

**Example:**

```json
[
  {
    "identifier": "primary",
    "name": "Primary",
    "description": "High-emphasis — the main action on the surface. Uses a solid, filled background. Limit to one primary button per surface.",
    "rationale": "- Use when: When the action is the most important on the surface — the one the user is most likely to take (ex: Save, Submit, Confirm).\n- Avoid when: When a surface already has a primary button. Adding a second dilutes visual hierarchy. Use `secondary` instead — Secondary emphasis maintains importance without competing with the existing primary action."
  },
  {
    "identifier": "secondary",
    "name": "Secondary",
    "description": "Medium-emphasis — important but not the primary action. Uses a visible border and transparent background."
  },
  {
    "identifier": "ghost",
    "name": "Ghost",
    "description": "Low-emphasis — for tertiary actions, toolbar actions, or dense layouts where visual weight must be minimized."
  },
  {
    "identifier": "danger",
    "name": "Danger",
    "description": "Signals a destructive or irreversible action. Use for delete, remove, or disconnect actions.",
    "rationale": "- Use when: When the action is destructive or irreversible — deleting a record, revoking access, removing a team member.\n- Avoid when: When the action is not destructive, even if it feels important or urgent. Use `primary` instead — The danger color is a strong signal reserved for destruction. Using it for non-destructive actions dilutes its meaning."
  }
]
```

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.16.0/document-blocks/variants.schema.json",
  "title": "Variants document block",
  "description": "Every way a component can be configured — a toggle (flag variant, like 'disabled') or a set of options (enum variant, like size: sm | md | lg). Each can explain why it exists.",
  "$defs": {
    "variantSelection": {
      "type": "object",
      "description": "A pointer to one variant being active: a flag by its identifier, or an enum dimension with a chosen value. The `variant` MUST match an item in the same block's `items`.",
      "required": [
        "variant"
      ],
      "properties": {
        "variant": {
          "type": "string",
          "description": "Identifier of the flag or enum dimension this points at (ex: 'icon-only', 'emphasis'). MUST match one of this block's `items`."
        },
        "value": {
          "type": "string",
          "description": "For an enum dimension, the selected value's identifier (ex: 'danger'). MUST be one of that dimension's values. Omit for a flag — naming the flag already means it is on."
        }
      },
      "additionalProperties": false
    },
    "variantExclusion": {
      "type": "object",
      "description": "A constraint that says: when the `when` selections are active, the `excludes` selections must not also be active (ex: when 'icon-only' is on, 'full-width' is excluded). Both `when` and `excludes` are arrays so you can express multi-part triggers and exclude more than one thing at once.",
      "required": [
        "when",
        "excludes",
        "level"
      ],
      "properties": {
        "when": {
          "type": "array",
          "description": "The triggering selection(s). When all of these are active, the `excludes` rule applies.",
          "items": {
            "$ref": "#/$defs/variantSelection"
          },
          "minItems": 1
        },
        "excludes": {
          "type": "array",
          "description": "The selection(s) that must not be active when `when` holds.",
          "items": {
            "$ref": "#/$defs/variantSelection"
          },
          "minItems": 1
        },
        "level": {
          "$ref": "../common/criterion.schema.json#/$defs/conformanceLevel",
          "description": "How hard the ban is: 'must-not' (the combination is invalid) or 'should-not' (allowed but discouraged). Use the negative levels here."
        },
        "description": {
          "$ref": "../common/rich-text.schema.json#/$defs/richText",
          "description": "Why the combination is disallowed."
        }
      },
      "additionalProperties": false
    },
    "variantRequirement": {
      "type": "object",
      "description": "A combination that must hold: when one selection is active, another is required (ex: a 'danger' button must show an icon). The opposite of an exclusion.",
      "required": [
        "when",
        "requires",
        "level"
      ],
      "properties": {
        "when": {
          "type": "array",
          "description": "The triggering selection(s). When all of these are active, `requires` applies.",
          "items": {
            "$ref": "#/$defs/variantSelection"
          },
          "minItems": 1
        },
        "requires": {
          "type": "array",
          "description": "The selection(s) that must also be active whenever `when` holds.",
          "items": {
            "$ref": "#/$defs/variantSelection"
          },
          "minItems": 1
        },
        "level": {
          "$ref": "../common/criterion.schema.json#/$defs/conformanceLevel",
          "description": "How hard the requirement is: 'must' (required) or 'should' (recommended). Use the positive levels here."
        },
        "description": {
          "$ref": "../common/rich-text.schema.json#/$defs/richText",
          "description": "Why the requirement exists."
        }
      },
      "additionalProperties": false
    },
    "variantValue": {
      "type": "object",
      "description": "A single option within an enum variant dimension.",
      "required": [
        "identifier",
        "description"
      ],
      "properties": {
        "identifier": {
          "type": "string",
          "description": "Machine-readable value identifier (ex: 'sm', 'md', 'lg', 'primary', 'secondary')."
        },
        "name": {
          "type": "string",
          "description": "Human-readable name (ex: 'Small', 'Medium', 'Large', 'Primary', 'Secondary')."
        },
        "description": {
          "$ref": "../common/rich-text.schema.json#/$defs/richText",
          "description": "What this value looks like, when to use it, and how it differs from other values in this dimension."
        },
        "rationale": {
          "$ref": "../common/rich-text.schema.json#/$defs/richText",
          "description": "Why this value exists (ex: 'High emphasis directs users to the one key action'). For guidance comparing values, use `use-cases` instead."
        },
        "examples": {
          "type": "array",
          "description": "Examples showing this variant value in isolation or in context.",
          "items": {
            "$ref": "../common/example.schema.json#/$defs/example"
          },
          "minItems": 1
        },
        "tokens": {
          "$ref": "../common/token-overrides.schema.json#/$defs/tokenOverrides",
          "description": "Token overrides applied when this value is selected."
        }
      },
      "additionalProperties": false
    },
    "flagVariant": {
      "type": "object",
      "description": "A toggle — on or off. Use it for binary capabilities like 'disabled' or 'full-width'. No `values` array; it's simply active or not.",
      "required": [
        "kind",
        "identifier",
        "description"
      ],
      "properties": {
        "kind": {
          "type": "string",
          "const": "flag",
          "description": "Identifies this variant as a boolean flag."
        },
        "identifier": {
          "type": "string",
          "description": "Machine-readable identifier of the flag (ex: 'disabled', 'full-width', 'icon-only', 'loading')."
        },
        "name": {
          "type": "string",
          "description": "Human-readable name of the flag (ex: 'Disabled', 'Full Width', 'Icon Only', 'Loading')."
        },
        "description": {
          "$ref": "../common/rich-text.schema.json#/$defs/richText",
          "description": "What this flag controls and how it affects the component's appearance or behavior when active."
        },
        "rationale": {
          "$ref": "../common/rich-text.schema.json#/$defs/richText",
          "description": "Why this flag exists (ex: 'Prevents interaction during submission to avoid duplicate requests')."
        },
        "examples": {
          "type": "array",
          "description": "Examples showing the component with this flag active.",
          "items": {
            "$ref": "../common/example.schema.json#/$defs/example"
          },
          "minItems": 1
        },
        "tokens": {
          "$ref": "../common/token-overrides.schema.json#/$defs/tokenOverrides",
          "description": "Token overrides applied when this flag is active."
        }
      },
      "additionalProperties": false
    },
    "enumVariant": {
      "type": "object",
      "description": "A set of options where you pick one, like 'size' (sm | md | lg) or 'emphasis' (primary | secondary | ghost).",
      "required": [
        "kind",
        "identifier",
        "description",
        "values"
      ],
      "properties": {
        "kind": {
          "type": "string",
          "const": "enum",
          "description": "Identifies this variant as an enumerated set of values."
        },
        "identifier": {
          "type": "string",
          "description": "Machine-readable name for this dimension (ex: 'size', 'emphasis') — the axis, not one of its values."
        },
        "name": {
          "type": "string",
          "description": "Human-readable name of the variant dimension (ex: 'Size', 'Emphasis', 'Shape')."
        },
        "description": {
          "$ref": "../common/rich-text.schema.json#/$defs/richText",
          "description": "What this dimension of variation controls and how its values affect the component's appearance or behavior."
        },
        "values": {
          "type": "array",
          "description": "The possible values. A single value is fine — dimensions often start with just one while more are added over time. Tools SHOULD keep this order.",
          "items": {
            "$ref": "#/$defs/variantValue"
          },
          "minItems": 1
        }
      },
      "additionalProperties": false
    },
    "variants": {
      "type": "object",
      "description": "Every way a component or pattern can be configured — a toggle or a set of options. Multiple items combine independently. A variant is a choice the consumer makes up front (ex: 'size', 'full-width'); a condition entered at runtime (hover, disabled, loading) is a state — document that in `states` instead.",
      "required": [
        "kind",
        "items"
      ],
      "properties": {
        "kind": {
          "type": "string",
          "const": "variants",
          "description": "Identifies this block as a variants spec."
        },
        "exclusions": {
          "type": "array",
          "description": "Combinations that must not be used together (ex: 'icon-only' + 'full-width'). Each entry lists the conflicting selections and how hard the ban is.",
          "items": {
            "$ref": "#/$defs/variantExclusion"
          },
          "minItems": 1
        },
        "requirements": {
          "type": "array",
          "description": "Combinations that must hold (ex: a 'danger' button must show an icon). Each entry says which selection triggers the requirement and what it then requires.",
          "items": {
            "$ref": "#/$defs/variantRequirement"
          },
          "minItems": 1
        },
        "items": {
          "type": "array",
          "description": "The variant dimensions, in order. Tools SHOULD keep this order.",
          "items": {
            "type": "object",
            "description": "One variant dimension. `kind: 'flag'` makes it a toggle; `kind: 'enum'` makes it a set of options. We use `if`/`then` instead of `oneOf` so an invalid entry gives one clear error instead of many.",
            "required": [
              "kind"
            ],
            "properties": {
              "kind": {
                "enum": [
                  "flag",
                  "enum"
                ]
              }
            },
            "allOf": [
              {
                "if": {
                  "required": [
                    "kind"
                  ],
                  "properties": {
                    "kind": {
                      "const": "flag"
                    }
                  }
                },
                "then": {
                  "$ref": "#/$defs/flagVariant"
                }
              },
              {
                "if": {
                  "required": [
                    "kind"
                  ],
                  "properties": {
                    "kind": {
                      "const": "enum"
                    }
                  }
                },
                "then": {
                  "$ref": "#/$defs/enumVariant"
                }
              }
            ]
          },
          "minItems": 1
        },
        "$extensions": {
          "$ref": "../common/extensions.schema.json#/$defs/extensions"
        }
      },
      "additionalProperties": false
    }
  }
}
```
