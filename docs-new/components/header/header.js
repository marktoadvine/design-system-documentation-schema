// ═══════════════════════════════════════════════════════════════════════════
// <ds-header>
//
// The page header block, used at the top of every page: a title, an optional
// description, and an optional source path (for schema-reference pages).
//
// Attributes:
//   title       — page title (rendered as the h1)
//   description — optional lead paragraph (supports inline `code`)
//   source      — optional source path shown as "Source: <code>" (schema pages)
//
// Slots:
//   (default) — extra inline content next to the title (ex: a status badge)
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, esc, escWithCode, attachStyles, loadCSS } from "../_shared.js";

export class DsHeader extends HTMLElement {
  static get observedAttributes() {
    return ["title", "description", "source"];
  }
  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("header"));
  }
  connectedCallback() {
    this._render();
  }
  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }
  _render() {
    var t = this.getAttribute("title") || "";
    var d = this.getAttribute("description") || "";
    var s = this.getAttribute("source") || "";
    var html = `<h1>${esc(t)}<slot></slot></h1>`;
    //if (s) html += `<p>Source: <ds-code inline>${esc(s)}</ds-code></p>`;
    // Use escWithCode so backtick inline-code spans in the description
    // render as <ds-code inline> rather than literal `backticks`.
    if (d) html += `<p>${escWithCode(d)}</p>`;

    this._shadow.innerHTML = html;
  }
}
