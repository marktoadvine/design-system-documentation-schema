# Entity metadata

The metadata object every entity type accepts. Each field has its own schema file in this directory (status, since, last-updated, category, tags, aliases, summary, preview, links, governance, doc-origin); `extends` points at the shared entityExtends definition. Every field is optional, and each can appear only once. Simple fields are either a value or array ('since': '1.0.0', 'tags': [...]); status, lastUpdated, and docOrigin take a short string for the common case or an object for more detail.

Source: `metadata/metadata.schema.json`

## entityMetadata {#entitymetadata}

Optional metadata for an entity. Include only needed: lifecycle (status, since, lastUpdated), classification (category, tags, aliases), display (summary, preview), inheritance (extends), links (links), and who's accountable plus how the docs were made (governance, docOrigin).

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | [status](metadata-status.md#status) |  | Lifecycle status of the entity. A bare string sets the overall status (ex: 'stable', 'beta') and covers the common case. Use the object form to add per-platform readiness, an explanatory note, or a deprecation notice. A deprecated entity MUST use the object form, because deprecation needs a deprecationNotice that says what to use instead. |
| `since` | [since](metadata-since.md#since) |  | The design system version in which this entity was introduced (ex:, '1.0.0', '2.3.0'). |
| `lastUpdated` | [lastUpdated](metadata-last-updated.md#lastupdated) |  | When this entity's documentation last changed. A bare ISO 8601 date string ('2026-05-28') covers the common case. Use the object form to add a note describing what changed. This date is also the entity's version handle: documentation can change without the design system's version moving, so tools SHOULD treat `lastUpdated` as the cache key for an entity's docs — pin to it and re-fetch when it advances. Bump it on every documentation change, even one that doesn't track a system release. |
| `category` | [category](metadata-category.md#category) |  | Where this entity fits in the design system's taxonomy (ex: 'action', 'navigation', 'feedback', 'base', 'semantic'). MUST be lowercase kebab-case. |
| `tags` | [tags](metadata-tags.md#tags) |  | Freeform keywords for grouping, search, and cross-referencing. |
| `aliases` | [aliases](metadata-aliases.md#aliases) |  | Alternative names for this entity across teams, tools, or legacy systems. Used to assist with search, migration, and cross-referencing. |
| `summary` | [summary](metadata-summary.md#summary) |  | One-line plain-text summary for compact display contexts (ex: list views, search results, hover cards). MUST NOT contain markup. |
| `preview` | [preview](metadata-preview.md#preview) |  | A visual or interactive preview of the entity (ex: image, video, code snippet, or URL). The value is a presentation object; its `kind` tag selects the media type. This is the single media surface for an entity — how big to show it (a small thumbnail, a large preview) is the consumer's call, so a renderer scales this one source to whatever a slot needs rather than the doc carrying the same asset twice. |
| `extends` | [entityExtends](common-extends.md#entityextends) |  | Declares that this entity inherits from a parent entity in a parent system. The parent entity supplies the core definition (anatomy, API, variants, states, guidelines); this entity adds or overrides on top. |
| `links` | [links](metadata-links.md#links) |  | Links to external resources (ex: source code, design files, docs pages, packages). Links cannot express how entities relate.  Use `relationships` array for inter-entity references. |
| `governance` | [governance](metadata-governance.md#governance) |  | Who's accountable for this entity's docs, and their review state. `owner` is required. Without one, this field is useless. `lastReviewed` is optional but SHOULD be set once you have a review process. The object records who reviewed it and which version, so a tool can answer 'is this verified, against what, and who vouches for it.' |
| `docOrigin` | [docOrigin](metadata-doc-origin.md#docorigin) |  | How this entity's documentation came to exist. A bare string (ex: 'extracted') covers the common case. Use the object form when origins are mixed (ex: a prop table extracted from code inside otherwise hand-written guidance) or when it needs explaining. This field only descirbes how the entity is product and cannot measure how good/bad it is. |

**References:** [status](metadata-status.md#status), [since](metadata-since.md#since), [lastUpdated](metadata-last-updated.md#lastupdated), [category](metadata-category.md#category), [tags](metadata-tags.md#tags), [aliases](metadata-aliases.md#aliases), [summary](metadata-summary.md#summary), [preview](metadata-preview.md#preview), [entityExtends](common-extends.md#entityextends), [links](metadata-links.md#links), [governance](metadata-governance.md#governance), [docOrigin](metadata-doc-origin.md#docorigin)

**Example:**

```json
[
  {
    "status": "stable",
    "since": "1.0.0",
    "lastUpdated": "2026-05-28",
    "category": "action",
    "tags": [
      "action",
      "interactive",
      "form",
      "cta",
      "submit"
    ],
    "summary": "Triggers an action or submits a form. The primary interactive element of the Acme Design System."
  },
  {
    "status": {
      "overall": "stable",
      "platforms": {
        "react": {
          "status": "stable",
          "since": "1.0.0"
        },
        "android": {
          "status": "experimental",
          "since": "3.0.0",
          "note": "Compose implementation available in preview. API may change before v4."
        },
        "figma": {
          "status": "stable",
          "since": "1.0.0"
        }
      }
    },
    "since": "1.0.0",
    "lastUpdated": {
      "date": "2026-05-28",
      "note": "Added focus-visible guidance and refreshed contrast requirements for inverse surfaces."
    },
    "aliases": [
      "btn",
      "cta",
      "action-button"
    ],
    "preview": {
      "kind": "url",
      "url": "https://storybook.acme.com/?path=/story/components-button--primary"
    },
    "links": [
      {
        "kind": "source",
        "url": "https://code.acme.com/design-system/src/components/button/button.tsx",
        "label": "React component source"
      },
      {
        "kind": "design",
        "url": "https://design-tool.acme.com/file/abc123?node-id=1234:5678",
        "label": "Design file — Button variants"
      }
    ],
    "governance": {
      "owner": {
        "name": "@acme/design-system",
        "contact": "design-system@acme.com"
      },
      "lastReviewed": {
        "date": "2026-06-12",
        "reviewedAgainst": "@acme/ui@3.1.0"
      }
    },
    "docOrigin": {
      "overall": "authored",
      "authorship": "ai-assisted",
      "blocks": {
        "api": "generated"
      }
    }
  },
  {
    "status": {
      "overall": "deprecated",
      "deprecationNotice": "The legacy Button is deprecated as of 3.0.0. Use Button from @acme/components instead. See the migration guide at https://design.acme.com/migrations/button-v3."
    }
  }
]
```

## Full schema JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://designsystemdocspec.org/v0.16.0/metadata/metadata.schema.json",
  "title": "Entity metadata",
  "description": "The metadata object every entity type accepts. Each field has its own schema file in this directory (status, since, last-updated, category, tags, aliases, summary, preview, links, governance, doc-origin); `extends` points at the shared entityExtends definition. Every field is optional, and each can appear only once. Simple fields are either a value or array ('since': '1.0.0', 'tags': [...]); status, lastUpdated, and docOrigin take a short string for the common case or an object for more detail.",
  "$defs": {
    "entityMetadata": {
      "type": "object",
      "description": "Optional metadata for an entity. Include only needed: lifecycle (status, since, lastUpdated), classification (category, tags, aliases), display (summary, preview), inheritance (extends), links (links), and who's accountable plus how the docs were made (governance, docOrigin).",
      "properties": {
        "status": {
          "$ref": "status.schema.json#/$defs/status"
        },
        "since": {
          "$ref": "since.schema.json#/$defs/since"
        },
        "lastUpdated": {
          "$ref": "last-updated.schema.json#/$defs/lastUpdated"
        },
        "category": {
          "$ref": "category.schema.json#/$defs/category"
        },
        "tags": {
          "$ref": "tags.schema.json#/$defs/tags"
        },
        "aliases": {
          "$ref": "aliases.schema.json#/$defs/aliases"
        },
        "summary": {
          "$ref": "summary.schema.json#/$defs/summary"
        },
        "preview": {
          "$ref": "preview.schema.json#/$defs/preview"
        },
        "extends": {
          "$ref": "../common/extends.schema.json#/$defs/entityExtends"
        },
        "links": {
          "$ref": "links.schema.json#/$defs/links"
        },
        "governance": {
          "$ref": "governance.schema.json#/$defs/governance"
        },
        "docOrigin": {
          "$ref": "doc-origin.schema.json#/$defs/docOrigin"
        }
      },
      "additionalProperties": false,
      "minProperties": 1
    }
  }
}
```
