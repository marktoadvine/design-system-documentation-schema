// ═══════════════════════════════════════════════════════════════════════════
// <ds-code>
//
// Attributes:
//   language — optional language label (ex: "json", "bash")
//   label   — optional label shown in top-right corner
//   no-label — boolean, suppresses the label entirely, even when `label`
//             or `language` is set
//   inline  — boolean, renders as inline <code> instead of block
//   wrap    — boolean, wraps long lines (white-space: pre-wrap) instead of
//             the default horizontal-scrolling single-line-per-line layout
//
// Content:
//   Text content inside the element is rendered as code.
//   For JSON content, set language="json" for syntax highlighting.
//
// Syntax highlighting uses the CSS Custom Highlight API
// (https://www.bram.us/2024/02/18/custom-highlight-api-for-syntax-highlighting/)
// instead of wrapping tokens in <span>s: the code text stays a single,
// untouched Text node, and highlighted ranges are registered separately via
// CSS.highlights + styled with ::highlight() in code.css. This sidesteps the
// escape-order bug the old span-wrapping approach was prone to (there's no
// HTML to escape at all - textContent handles that), at the cost of only
// working in browsers that support the API (Chrome 105+, Safari 17.2+,
// Firefox 140+ as of this writing). Unsupported browsers just render plain,
// unhighlighted code - see SUPPORTS_HIGHLIGHT_API below.
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, esc, attachStyles, loadCSS } from "../_shared.js";

const JSON_TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

// Tokenizes a JSON string into {start, end, cls} character-offset ranges,
// for the Custom Highlight API to paint - no HTML, no escaping, since the
// source text itself is never touched. A quoted token followed by `:` is a
// key; otherwise a string value. The colon itself is never part of a
// token's range, matching how the old span-based version left it unstyled.
function tokenizeJson(raw) {
  const tokens = [];
  JSON_TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = JSON_TOKEN_RE.exec(raw))) {
    const [full, str, colon] = match;
    if (str !== undefined) {
      const start = match.index;
      tokens.push({ start, end: start + str.length, cls: colon ? "hl-k" : "hl-s" });
    } else {
      const cls = full === "true" || full === "false" || full === "null" ? "hl-b" : "hl-n";
      tokens.push({ start: match.index, end: match.index + full.length, cls });
    }
  }
  return tokens;
}

const HIGHLIGHT_NAMES = ["hl-k", "hl-s", "hl-n", "hl-b"];

export const SUPPORTS_HIGHLIGHT_API =
  typeof Highlight !== "undefined" && typeof CSS !== "undefined" && !!CSS.highlights;

// One shared Highlight per token class, reused by every <ds-code> instance
// on the page. CSS.highlights is a single global registry, not scoped per
// shadow root, so a second instance calling CSS.highlights.set('hl-k', ...)
// would silently replace the first instance's highlight instead of adding
// to it. Each instance instead adds its own Ranges into these shared
// objects, and removes exactly those Ranges again on re-render or
// disconnect (see DsCode._clearRanges below). ::highlight() matching is
// itself scoped per shadow tree, so this sharing is safe: a rule defined in
// one <ds-code>'s shadow root only paints Ranges whose nodes live inside
// that same tree, even though the Highlight object backing it is shared.
const sharedHighlights = SUPPORTS_HIGHLIGHT_API
  ? Object.fromEntries(
      HIGHLIGHT_NAMES.map((name) => {
        const highlight = new Highlight();
        CSS.highlights.set(name, highlight);
        return [name, highlight];
      }),
    )
  : {};

export class DsCode extends HTMLElement {
  static get observedAttributes() {
    return ["language", "label", "no-label", "inline", "wrap"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("code"));
    this._ranges = [];
  }

  connectedCallback() {
    // Defer render to ensure the browser has finished parsing the
    // element's inner text content. When the custom element is
    // defined synchronously, connectedCallback fires as soon as the
    // opening tag is parsed — before child text nodes exist. A single
    // requestAnimationFrame tick isn't a reliable guarantee of that (see
    // the equivalent note in spec-nav.js), so wait for DOMContentLoaded
    // when the document is still loading.
    var self = this;
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          self._render();
        },
        { once: true },
      );
    } else {
      this._render();
    }
  }

  disconnectedCallback() {
    // Ranges hold live references to this instance's own text node. Once
    // this element is gone, leaving them in the shared Highlight objects
    // would both leak memory and paint stale, detached-node ranges if a
    // future document position ever coincided with their old offsets.
    this._clearRanges();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  // Removes exactly the Ranges this instance previously added, from
  // whichever shared Highlight objects they belong to - never touches
  // another instance's ranges.
  _clearRanges() {
    for (const { cls, range } of this._ranges) {
      sharedHighlights[cls].delete(range);
    }
    this._ranges = [];
  }

  _render() {
    this._clearRanges();

    // ── Inline mode: render as a styled <code> span ──────────
    if (this.hasAttribute("inline")) {
      var raw = this.textContent || "";
      this._shadow.innerHTML = `<code>${esc(raw)}</code>`;
      return;
    }

    // ── Block mode: render as <pre><code> with syntax highlighting ──
    const label = this.hasAttribute("no-label")
      ? ""
      : this.getAttribute("label") || this.getAttribute("language") || "";
    const lang = this.getAttribute("language") || "";
    const rawBlock = (this.textContent || "").trim();

    const labelHtml = label ? `<span class="label">${esc(label)}</span>` : "";
    this._shadow.innerHTML = `${labelHtml}<pre><code></code></pre>`;

    // Plain text, not innerHTML - the code stays one untouched Text node
    // so Range offsets below line up exactly with `rawBlock`'s own indices.
    const codeEl = this._shadow.querySelector("code");
    codeEl.textContent = rawBlock;

    if (SUPPORTS_HIGHLIGHT_API && lang === "json" && codeEl.firstChild) {
      for (const { start, end, cls } of tokenizeJson(rawBlock)) {
        const range = new Range();
        range.setStart(codeEl.firstChild, start);
        range.setEnd(codeEl.firstChild, end);
        sharedHighlights[cls].add(range);
        this._ranges.push({ cls, range });
      }
    }
  }
}
