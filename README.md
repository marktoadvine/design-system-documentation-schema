# Design System Doc Spec (DSDS)

A standard, machine-readable format for design system documentation.

---

## What is DSDS?

DSDS defines a YAML-based format for documenting a design system as a graph of **entries** and **sections**:

- **System** — The design system as a whole: version, organization, url, license, platforms, plus system-wide documentation.
- **Components** — Reusable UI elements, with their own `sourceFiles`/`imports` (pointing at real source instead of hand-typing an interface), `traits` (variants and states, boolean or enum), and `combos` (pairing rules).
- **Tokens** — Documents the purpose, guidelines, and organization of a design token. Values and types live in the DTCG source file a token entry points at, not in DSDS.
- **Themes** — A named set of token overrides, pointing at its own DTCG source file.
- **Entry** — The generic, open kind for anything else: a foundation, a pattern, a guide, or a namespaced custom kind (e.g. `acme.icon-library`) for a document that wants its own recognizable name.

Every entry's structured documentation lives in one **sections** array. Each section is a typed object with a `kind` tag — `definitions`, `guidelines`, `steps`, or the generic `section` — plus `freeform`, headed nestable prose every section kind can carry alongside its own structured `items`. Any entry kind can use any section kind; there's no placement gate. A section also carries a `for` field (`human`, `agent`, or `all`) naming its audience, so a document serves both readers without a separate parallel structure.

The goal is simple: make design system docs structured, portable, and easy for tools to read. The tool can be a docs site, a linter, a code assistant, or a person reading YAML.

## Why?

Design system documentation today is trapped in tools. It lives in Notion, Storybook, Zeroheight, Confluence, or custom-built sites. Each one has its own structure and its own rules, and none of them work together.

DSDS addresses that with a format that is:

| Quality | What it means |
|---|---|
| **Structured** | Every section has a defined shape. Consumers know what to expect. |
| **Machine-readable** | Tools can parse, generate, validate, and transform documentation. |
| **Portable** | Documentation is decoupled from any specific tool or platform. |
| **Extensible** | Vendor metadata can be added without breaking interoperability. |
| **Complementary** | Works alongside the [W3C Design Tokens Format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/), not against it. |

The W3C Design Tokens Community Group defines a format for trading token **values** between tools. DSDS defines a format for the **documentation** around them. The two are built to work together — DSDS never duplicates a value or platform identifier; a token or theme entry's `source` field links back to its DTCG definition.

> [!NOTE]
> **Credit where due:** DSDS's conformance design follows the trail blazed by the [Adobe Spectrum Design Data specification](https://opensource.adobe.com/spectrum-design-data/spec/) — a layered model of structural schema rules plus a semantic-rule catalog with stable IDs. Prior art this good deserves a shoutout.

## Documentation

The authoritative reference for every schema and field is the **documentation site at [designsystemdocspec.org](https://designsystemdocspec.org/)**. Property tables there come straight from the schema files, so they cannot drift from the code.

- **[Overview](https://designsystemdocspec.org/)** — What DSDS is, the entry/section model, design principles, humans & agents, and interoperability with DTCG/CEM/Storybook.
- **[Quick Start](https://designsystemdocspec.org/quickstart.html)** — Document structure, entry kinds, the section system, and minimal examples for every entry kind.
- **[Extending the schema](https://designsystemdocspec.org/extending.html)** — `$extensions`, custom kinds, and profiles: the three ways to go beyond what the spec ships with, and when to reach for each.
- **[What's not here](https://designsystemdocspec.org/gaps.html)** — Prop tables, anatomy diagrams, typed accessibility fields, and other things DSDS deliberately doesn't have, each with what to use instead.
- **[Conformance](https://designsystemdocspec.org/conformance.html)** — How the schema itself is put together, the `DSDS-01`–`DSDS-07` semantic rule catalog, stability guarantees and the criteria for declaring 1.0, and the generated index of every normative statement in the schemas.

Per-schema reference pages sit next to the narrative pages — e.g. [entries/component](https://designsystemdocspec.org/entries-component.html), [sections/guidelines](https://designsystemdocspec.org/sections-guidelines.html), [common/ref](https://designsystemdocspec.org/common-ref.html). You can also build the site locally with `npm run build` and open `site/dist/index.html`.

This README leaves out schema field listings and example payloads on purpose — those live on the documentation site as a single source of truth.

## Repository layout

- **`schema/`** — The split JSON Schema source (`common/`, `metadata/`, `entries/`, `sections/`), plus the auto-generated `dsds.bundled.yaml` and the `DSDS-01`–`DSDS-07` `conformance-rules.yaml` catalog.
- **`examples/`** — Validated example documents: full base documents, standalone entries per kind, quickstart snippets, interop pairs, and one `invalid/` fixture per semantic rule.
- **`test/site-components/`** — A regression corpus documenting this repo's own `site/components/` web components as DSDS entries (dogfooding), checked on every `npm run check`.
- **`scripts/`** — Bundling, validation, composition, and the static site generator.
- **`site/`** — The spec site source (`content/*.mdx`, `templates/`, `components/`) and its generated output in `site/dist/`, including immutable versioned `v<n>/` archives.

## Quick Start

```bash
npm install
npm run check   # bundles the schema, validates every example/fixture/test corpus file
npm run build   # generates the static site into site/dist/
```

To validate just your own file:

```bash
node scripts/validate.js my-system.dsds.yaml
```

If your system is split across files via `rel: file`, cross-file `to:` refs are resolved automatically, bounded to the directory of the file you validate (and its subdirectories — not a parent or cousin directory). An otherwise-unresolved target reports as a warning, not a hard failure — add `--strict` (`npm run validate:strict`) to promote those to failures once your project is clean.

Reference `https://designsystemdocspec.org/v0.20.0/dsds.bundled.yaml` from your DSDS files via the `$schema` keyword for editor autocompletion and inline validation.

For document structure, composing hand-split fragments (`scripts/compose.js`), and authoring narrative pages with schema-driven property tables, see the **[Quick Start docs page](https://designsystemdocspec.org/quickstart.html)** and [Conformance](https://designsystemdocspec.org/conformance.html#how-the-schema-is-organized).

## Cutting a release

There's no single version field — every `schema/**/*.schema.yaml` file's own `$id` independently encodes the version (e.g. `.../v0.20.0/common/ref.schema.yaml`), and everything else (`nav.js`, `compile-mdx.mjs`'s `{{VERSION}}` substitution, the versioned `site/dist/v<n>/` directory) derives the current version by reading it back out of `schema/dsds.bundled.yaml`. MDX content must never hardcode a version — always use `{{VERSION}}`.

`scripts/bump-version.js` automates the mechanical part — every schema file's `$id`, `bundle.js`'s hardcoded `$id`, every example/test fixture's `schemaVersion`, README's one hardcoded URL, and `package.json#version` — then regenerates the bundled schema and syncs `.agents/skills/dsds-*`'s version references:

```bash
# 1. Make schema changes under schema/, add examples/ + examples/invalid/ fixtures as needed.
# 2. Add a CHANGELOG entry.
npm run bump-version 0.20.1     # rewrites every version reference, bundles, syncs skill versions
npm run build                   # publishes a new site/dist/v<new-version>/
npm run check                   # must pass before committing
```

Use `npm run bump-version <version> -- --dry-run` to preview changes first, or `--help` for the rest of the flags.

The versioned dist directories (`site/dist/v<n>/dsds.bundled.schema.{json,yaml}` — the extension depends on which version; see the "Bundle format" note below) are **immutable public contracts** — older `v<n>/` directories must stay untouched. Commit the schema changes, examples, README, CHANGELOG, `package.json`, and the full `site/dist/` tree together.

### Bundle format

`dsds.bundled.yaml` (YAML, matching the hand-authored `schema/**/*.schema.yaml` source it's built from) starting with this version. Versions before this one published `dsds.bundled.schema.json` and keep doing so, frozen, under their own `site/dist/v<n>/` directory — only the *current* version's bundle format changed. "JSON Schema" names the spec both formats conform to (a constraint language for a data model), not a file-syntax requirement — see `scripts/bundle.js`'s own comment.

For a documentation-only edit (no schema/example changes), just run `npm run build` and commit the regenerated HTML — no version bump, no new `/v<n>/` artifact.

## Contributing

This is an early-stage specification (currently DSDS 0.20.0). Feedback is welcome:

- **Open an issue** for questions, suggestions, or problems with the spec.
- **Open a PR** for proposed changes to the spec, schema, or examples.

### Contributors

- [Afyia Smith](https://afyiasmith.co/) — the `owner`/`reviewed` and `origin` metadata schemas.

## License

This project is open source. See [LICENSE](LICENSE) for details.
