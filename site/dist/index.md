# Design system doc spec 0.20.0

**Draft Specification:**
This is a draft. It can still change. No standards body has endorsed it yet. We welcome feedback and contributions on GitHub.

* **Latest version:** [GitHub repo](https://github.com/somerandomdude/design-system-documentation-schema)
* **Feedback:** [GitHub Issues](https://github.com/somerandomdude/design-system-documentation-schema/issues)

---

## A machine-readable format for design system documentation

This standard puts design system docs in one shared format that any tool can read. A DSDS document is a [**base**](/base): a `schemaVersion`, a `name`, and a list of [**entries**](/entries-entry) — a [system](/entries-system), plus [components](/entries-component), [tokens](/entries-token), [themes](/entries-theme), and the generic `entry` kind for anything else. The goal is one source of truth that feeds your docs, trains your agents, and shows up everywhere your design system does.

---

## Principles

The design principles this spec is held to, and why the schema is shaped the way it is:

1. **Documentation only.** This schema focuses on capturing the how, when, and why of a design system — not the system itself.
2. **Don't copy data that lives somewhere better.** If a better source of truth exists elsewhere, link to it instead of restating it. This schema focuses on the how, when, and why — pointing at other sources rather than duplicating what they already own.
3. **The same shape, every time.** Each part of the schema follows the same structure, so writing one part teaches you how to write the rest.
4. **Simple to start with.** The goal is to keep the barrier to entry low. The schema avoids being overly technical or specific, and you can add more detail later with `$extensions` when you actually need it.
5. **Everything can link to everything else.** A design system is a network of connections, and the documentation should reflect that.
6. **There's always a way out.** The schema has opinions, but it knows those opinions won't fit every situation — so there's always a way to step outside them when you need to.
7. **Built for action.** The schema is structured to help people and agents actually use the system, in as few steps as possible.
8. **One sentence per idea.** Every schema and every field should be explainable in a single, simple sentence. If it takes more than that, it's too complicated.

---

## Flexible and modular

Design systems have different documentation needs. The schema can be as simple or as detailed as you need. DSDS has strong opinions, but it doesn't force them on you.

Every entry's structured docs live in one **sections** array. Each section has a `kind` field naming what kind of section it is. The spec defines 3 section kinds — `guidelines`, `definitions`, and `steps` — plus the generic `section`. Every section, whatever its kind, can also carry `freeform`: headed, nestable prose alongside its own structured `items`. A component also carries `sourceFiles`, `traits`, `combos`, and `imports` as fields of its own, not as sections.

Any entry kind can use any section kind — nothing restricts which section kinds go with which entry kind.

---

## Humans and agents

A DSDS document has two readers: people and AI agents. The same file serves both. Every section carries a `for` field naming its audience:

- **`for: human` or `for: all`** — the default. Everything a person needs to read and act on: definitions, guidelines, steps, freeform narrative. Agents read these too.
- **`for: agent`** — optional, agent-only notes: hard MUST/MUST NOT rules, notes that keep an agent from confusing this entry with a similar one, and checks an agent can run against its own output. Tools never surface these to people.

Write for people by default — that serves agents too. Use `for: agent` only for firm, ready-to-act notes a person wouldn't need, and keep it in sync with the human-facing sections on the same entry: it should extend them, never contradict or repeat them.

---

## Interoperability

No open standard covers the whole of design-system documentation — components, tokens, and guidelines together. The standards that do exist each cover one layer well. DSDS sits in the layer above them: it documents meaning, usage, and intent, and **points at** those formats instead of duplicating what they already own.

| Concern | Source of truth | How DSDS points at it |
|---|---|---|
| Token values and platform mappings | [W3C Design Tokens](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) (DTCG) files | A token or theme entry's `source` |
| Component code API facts | [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) (CEM), a source file, or framework typings | A component's `sourceFiles` — pointing a tool at the real file to extract from, instead of hand-typing an interface |
| Live component demos | Storybook or equivalent | A `refs`/`examples` entry with `rel: storybook` |
| Design artifacts | Design tool files | A `refs` entry with `rel: design`, or `metadata.preview` |
| Source code | The repository | A `refs` entry with `rel: source`, or a component's own `sourceFiles` |

DTCG owns token *values*; DSDS owns the *meaning and usage* around them. A token entry never carries an actual value, so the two files can never disagree with each other. CEM (and similar manifests) own a component's code-level details; DSDS doesn't repeat them, it points `sourceFiles` at the real source instead. Wherever a machine-readable source of truth already exists, DSDS points at it instead of restating it — DSDS is only ever the source of truth for the documentation itself, never for the values or code it's documenting. See `examples/interop/` in the repo for worked examples of both relationships.

---

## Next steps

New to DSDS? Start with the [Quick Start Guide](quickstart.html). It covers document structure, entry kinds, the section system, and minimal examples you can copy.

For the full schema reference and how it's put together, see [Conformance](conformance.html).

See the schema files in `schema/` for the JSON Schema definitions. See the examples in `examples/` for working examples of each entry and section kind.

## Contributors
- [PJ Onori](https://pjonori.com): Current maintainer
- [Afyia Smith](https://afyiasmith.co/): the `owner`/`reviewed` and `origin` metadata schemas.
- [Suleiman Ali Shakir](https://iamsuleiman.com/): Documentation copy-edits.
