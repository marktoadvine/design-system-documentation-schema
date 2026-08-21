// ═══════════════════════════════════════════════════════════════════════════
// <ds-json-view>
//
// A "View as JSON" toggle for spec definition pages: a button that opens an
// overlay showing the page's raw schema JSON in a <ds-code> block.
//
// Attributes:
//   label — the source file path, used only for the overlay's accessible
//           name (ex: "Raw JSON: common/criterion.schema.json")
//
// Slots:
//   (default) — the JSON content, typically a single <ds-code language="json">
//
// Usage:
//   <ds-json-view label="common/criterion.schema.json">
//     <ds-code language="json">{ ... }</ds-code>
//   </ds-json-view>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, loadIcon, attachStyles, loadCSS } from "../_shared.js";

export class DsJsonView extends HTMLElement {
  static get observedAttributes() {
    return ["label"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("json-view"));
    this._open = false;
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() {
    document.addEventListener("keydown", this._onKeydown);
    this._render();
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown);
  }

  _render() {
    this._shadow.innerHTML = `<ds-icon-button class="btn" label="View as JSON"><span class="icon"></span></ds-icon-button><div class="overlay"><slot></slot></div>`;

    const btn = this._shadow.querySelector(".btn");
    if (btn) btn.addEventListener("click", () => this._setOpen(!this._open));

    this._updateIcon();
  }

  _setOpen(open) {
    this._open = open;
    const overlay = this._shadow.querySelector(".overlay");
    if (overlay) overlay.classList.toggle("overlay--open", open);
    this._updateIcon();
  }

  _updateIcon() {
    const btn = this._shadow.querySelector(".btn");
    const icon = this._shadow.querySelector(".icon");
    if (btn) btn.setAttribute("label", this._open ? "Close JSON view" : "View as JSON");
    loadIcon(this._open ? "close" : "brackets").then((svg) => {
      if (icon) icon.innerHTML = svg;
    });
  }

  _onKeydown(e) {
    if (e.key === "Escape" && this._open) this._setOpen(false);
  }
}
