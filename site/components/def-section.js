import { createShadow, esc, escWithCode, BASE_RESET, FONT } from "./_shared.js";

const DEF_SECTION_CSS = `
  ${BASE_RESET}
  :host {
    display: block;
    margin: 64px 0 64px;
  }
  :host(:first-of-type) {
    margin-top: 0;
  }
  h2 {
    font-family: ${FONT.mono};
    font-size: var(--ds-font-size-lg);
    font-weight: var(--ds-font-weight-bold);
    color: var(--ds-color-text);
    margin: 0 0 var(--ds-space-2);
  }
  .desc {
    color: var(--ds-color-text);
    font-family: ${FONT.body};
    font-size: var(--ds-font-size-base);
    line-height: var(--ds-line-height-loose);
    margin: 0 0 var(--ds-space-4);
  }
  .type-line { margin: 0 0 var(--ds-space-4); }

  /* ── layout="split": def content and its worked example side by side ──
     Only the Schema page uses this (one page, every definition, each with
     a real example next to it - see build-site.js's renderDefinition()).
     .start stays sticky while .end (usually the taller of the two, a full
     example document) scrolls past it - align-items stays at .cols's
     default (stretch) so .start is exactly as tall as .end, giving
     position: sticky room to stick within. */
  :host([layout="split"]) .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--ds-space-8);
  }
  :host([layout="split"]) .cols .start,
  :host([layout="split"]) .cols .end {
    min-width: 0;
  }
  :host([layout="split"]) .start {
    position: sticky;
    top: calc(var(--ds-height-nav, 64px) + var(--ds-space-4));
    align-self: start;
  }
  :host([layout="split"]) .end {
    background: var(--ds-color-bg-raised);
    padding: var(--ds-space-4);
  }
  :host([layout="split"]) ::slotted(ds-code[slot="example"]) {
    display: block;
  }

  @media (max-width: 900px) {
    :host([layout="split"]) .cols {
      grid-template-columns: 1fr;
    }
    :host([layout="split"]) .start {
      position: static;
    }
    :host([layout="split"]) .end {
      margin-top: var(--ds-space-4);
    }
  }
`;

export class DsDefSection extends HTMLElement {
  static get observedAttributes() {
    return ["name", "anchor", "description", "type", "source", "layout"];
  }
  constructor() {
    super();
    this._shadow = createShadow(this, DEF_SECTION_CSS);
  }
  connectedCallback() {
    this._render();
  }
  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }
  _render() {
    var name = this.getAttribute("name") || "";
    var anchor =
      this.getAttribute("anchor") ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    var desc = this.getAttribute("description") || "";
    var type = this.getAttribute("type") || "";
    var source = this.getAttribute("source") || "";
    var layout = this.getAttribute("layout") || "";
    // Set id on host for TOC linking
    if (anchor) this.id = anchor;

    var start = '<h2 id="' + esc(anchor) + '">' + esc(name) + "</h2>";
    // type and source share one line, separated by a middle dot, instead of
    // type living here and source living in a separate "References:"-labeled
    // line further down.
    if (type || source) {
      start += '<p class="type-line">';
      if (type)
        start +=
          '<ds-badge variant="kind" size="sm">' + esc(type) + "</ds-badge>";
      if (type && source) start += " · ";
      if (source) start += "<ds-code inline>" + esc(source) + "</ds-code>";
      start += "</p>";
    }
    // Use escWithCode so CommonMark-style `inline code` spans in the
    // description render as <ds-code inline> rather than literal
    // backtick characters.
    if (desc) start += '<p class="desc">' + escWithCode(desc) + "</p>";
    start += "<slot></slot>";

    var html;
    if (layout === "split") {
      html =
        '<div class="cols">' +
        '<div class="start">' +
        start +
        "</div>" +
        '<div class="end"><slot name="example"></slot></div>' +
        "</div>";
    } else {
      html = start;
    }
    this._shadow.innerHTML = html;
  }
}
