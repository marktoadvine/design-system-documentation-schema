import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsDefIndex extends HTMLElement {
  static get observedAttributes() {
    return ["title"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("def-index"));
    this._shadow.innerHTML = `<span class="title"></span><slot></slot>`;
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const title = this.getAttribute("title") || "";
    const titleEl = this._shadow.querySelector(".title");
    if (titleEl) titleEl.textContent = title;
  }
}
