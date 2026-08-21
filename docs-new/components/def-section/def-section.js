import { createShadow, esc, escWithCode, attachStyles, loadCSS } from "../_shared.js";

export class DsDefSection extends HTMLElement {
  static get observedAttributes() {
    return ["name", "anchor", "description", "type", "source", "layout"];
  }
  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("def-section"));
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
    // Set id on host for TOC linking
    if (anchor) this.id = anchor;

    var start = `<header>`
    start += `<h2 id="${esc(anchor)}">${esc(name)}</h2>`;
    // type and source share one line, separated by a middle dot, instead
    // of type living here and source living in a separate
    // "References:"-labeled line further down.
    if (type || source) {
      start += "<p>";
      if (type) start += `<span>${esc(type)}</span>`;
      if (type && source) start += " · ";
      if (source) start += `<ds-code inline>${esc(source)}</ds-code>`;
      start += "</p>";
    }
    start += `</header>`
    // Use escWithCode so CommonMark-style `inline code` spans in the
    // description render as <ds-code inline> rather than literal
    // backtick characters.
    if (desc) start += `<p>${escWithCode(desc)}</p>`;
    start += "<slot></slot>";

    var html =
      '<div class="cols">' +
      `<div class="start">${start}</div>` +
      '<div class="end"><slot name="example"></slot></div>' +
      "</div>";
    this._shadow.innerHTML = html;
  }
}
