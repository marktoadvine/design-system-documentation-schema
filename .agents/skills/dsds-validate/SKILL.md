---
name: dsds-validate
description: Validate DSDS specs against the bundled schema and check for consistency issues. Triggers on "validate specs", "check specs", "spec errors", "run validation".
metadata:
  version: 0.15.2
---

# Validate DSDS Specs

Run schema and consistency validation on spec files in `packages/specs/`.

## Quick Command

```bash
npm run validate -w packages/specs
```

This runs all `*.dsds.json` files against the DSDS v0.15.2 bundled schema using Ajv2020.

## Full Validation (with tests)

```bash
npm test -w packages/specs
```

Checks:

1. Schema compliance (all files validate against `schema/dsds.bundled.schema.json`)
2. Filename/identifier consistency (`entity.identifier` matches filename)

## Interpreting Failures

| Error pattern                 | Fix                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| `must have required property` | Add the missing field to the entity or block                        |
| `must match "oneOf"`          | Entity is missing either `entity` or `entityGroups` at root         |
| Identifier mismatch           | Rename `entity.identifier` to match filename (without `.dsds.json`) |

## Validation Loop

1. Run `npm run validate -w packages/specs`
2. If errors, fix the first reported file
3. Re-run validation
4. Repeat until all pass

## Schema Sources

The validation schema comes from the [DSDS project](https://github.com/somerandomdude/design-system-documentation-schema):

- **Bundled schema** (used by `npm run validate`): `packages/specs/schema/dsds.bundled.schema.json`
- This is a single-file version with all `$ref`s inlined from the split schema

If validation fails on a field you're unsure about, consult the relevant docs page:

- https://designsystemdocspec.org/schema-architecture (full field reference)
- `https://designsystemdocspec.org/document-blocks-{kind}` (per-block constraints)
- `https://designsystemdocspec.org/entities-{kind}` (per-entity constraints)

## When to Validate

- After creating or modifying any `.dsds.json` file
- Before committing changes
