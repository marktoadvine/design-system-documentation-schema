// ═══════════════════════════════════════════════════════════════════════════
// <ds-code>
//
// Attributes:
//   language — optional language label (e.g. "json", "bash")
//   label   — optional label shown in top-right corner
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
// untouched Text node (set via textContent, never innerHTML), and
// highlighted ranges are registered separately via CSS.highlights and
// painted with ::highlight() in CODE_CSS below. This sidesteps a whole
// class of escape-order bug the previous span-wrapping approach was prone
// to (there's no HTML to mis-escape at all — textContent handles safety
// for every token, not just the ones this file's regex anticipates), at
// the cost of only working in browsers that support the API (Chrome 105+,
// Safari 17.2+, Firefox 140+ as of this writing). Unsupported browsers
// just render plain, unhighlighted code — see SUPPORTS_HIGHLIGHT_API below.
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, esc, BASE_RESET, FONT } from "./_shared.js";

const JSON_TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

// Tokenizes a JSON string into {start, end, cls} character-offset ranges,
// for the Custom Highlight API to paint — no HTML, no escaping, since the
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

const CODE_CSS = `
  ${BASE_RESET}
  :host { display: block; }
  :host([inline]) { display: inline; }

  /* ── Block mode ──────────────────────────────────────── */
  .wrapper {
    position: relative;
    overflow: hidden;
    background: var(--ds-color-bg-raised);
    inset: calc(var(--ds-space-4) * -1);
    top: 0;
    width: calc(100% + (var(--ds-space-4) * 2));
  }
  .wrapper pre { color: var(--ds-color-text); }

  /* JSON syntax highlighting, painted via the CSS Custom Highlight API
     (registered in CSS.highlights by tokenizeJson()/_render() below).
     ::highlight() can't be nested under .wrapper the way the old
     span-based .wrapper .hl-k selectors were - it's a tree-scoped
     pseudo-element, not a descendant combinator target - but scoping still
     holds: only Ranges whose nodes live inside this shadow root paint here,
     even though the underlying Highlight objects are shared across every
     ds-code instance on the page. Ignored outright in browsers without
     the API - the code just renders unhighlighted. Note: no backticks in
     this comment - it lives inside CODE_CSS's own template literal, and a
     literal backtick here would terminate that string early. */
  ::highlight(hl-k) { color: var(--ds-syntax-light-key); }
  ::highlight(hl-s) { color: var(--ds-syntax-light-string); }
  ::highlight(hl-n) { color: var(--ds-syntax-light-number); }
  ::highlight(hl-b) { color: var(--ds-syntax-light-bool); }

  /* Styled like <ds-callout>'s .callout__title — a solid, bold tab, not a
     pill — instead of a <ds-badge>. */
  .code__label {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    font-family: ${FONT.body};
    font-weight: 520;
    font-size: var(--ds-font-size-sm);
    background: var(--ds-color-text);
    color: var(--ds-color-text-inverse);
    padding: var(--ds-space-2) var(--ds-space-4);
  }

  pre {
    margin: 0;
    padding: var(--ds-space-4) var(--ds-space-4);
    font-family: ${FONT.mono};
    font-size: var(--ds-font-size-base);
    line-height: var(--ds-line-height-loose);
    overflow-x: auto;
    white-space: pre;
  }

  :host([wrap]) pre {
    white-space: pre-wrap;
    overflow-wrap: break-word;
    overflow-x: visible;
  }

  code {
    font-family: inherit;
    font-size: inherit;
    background: none;
    padding: 0;
  }

  /* ── Inline mode ─────────────────────────────────────── */
  .inline-code {
    font-family: ${FONT.mono};
    font-size: 0.875em;
    background: var(--ds-color-bg-raised);
    color: var(--ds-color-text);
    padding: 1px 5px;
  }
`;

export class DsCode extends HTMLElement {
  static get observedAttributes() {
    return ["language", "label", "inline", "wrap"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this, CODE_CSS);
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
  // whichever shared Highlight objects they belong to — never touches
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
      this._shadow.innerHTML =
        '<code class="inline-code" part="code">' + esc(raw) + "</code>";
      return;
    }

    // ── Block mode: render as <pre><code> with syntax highlighting ──
    const label =
      this.getAttribute("label") || this.getAttribute("language") || "";
    const lang = this.getAttribute("language") || "";
    const rawBlock = (this.textContent || "").trim();

    const labelHtml = label
      ? `<span class="code__label" part="label">${esc(label)}</span>`
      : "";

    // tabindex lets keyboard users reach and scroll this block — `pre`
    // scrolls horizontally (overflow-x: auto) but sits outside the
    // natural tab order otherwise. No role/aria-label here: that would
    // make every instance an identically-named landmark region.
    this._shadow.innerHTML = `
      <div class="wrapper" part="wrapper">
        ${labelHtml}
        <pre part="pre" tabindex="0"><code part="code"></code></pre>
      </div>
    `;

    // Plain text, not innerHTML — the code stays one untouched Text node,
    // so Range offsets below line up exactly with `rawBlock`'s own indices,
    // and non-JSON content needs no escaping at all (textContent is always
    // HTML-safe).
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
