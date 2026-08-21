import { createShadow, esc, attachStyles, loadCSS } from "../_shared.js";

export class DsBackToTop extends HTMLElement {
  static get observedAttributes() {
    return ["label", "href"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("back-to-top"));
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    var label = this.getAttribute("label") || "\u2191 Back to top";
    var href = this.getAttribute("href") || "#";
    this._shadow.innerHTML = `<a href="${esc(href)}">${esc(label)}</a>`;
  }
}
