// ═══════════════════════════════════════════════════════════════════════════
// <ds-logo>
//
// The DSDS mark, fetched from site/assets/dsds.svg and inlined so its fill
// can be recolored at runtime. Edit site/assets/dsds.svg directly to change
// the mark — this component just loads and colors whatever's there.
//
// Attributes:
//   size       — width/height, any CSS length (default: 40px)
//   background — host background color (default: transparent)
//   fill       — SVG fill color (default: currentColor)
//   label      — accessible label (unused in the current markup)
//
// Usage:
//   <ds-logo></ds-logo>
//   <ds-logo size="24px" fill="#fff" background="#0055b3"></ds-logo>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, loadIcon, attachStyles, loadCSS } from "../_shared.js";

export class DsLogo extends HTMLElement {
  static get observedAttributes() {
    return ["size", "background", "fill", "label"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("logo"));
    loadIcon("logo").then((svg) => {
      this._shadow.innerHTML = svg;
    });
  }

  connectedCallback() {
    this._sync();
  }

  attributeChangedCallback(name) {
    if (name === "label") return;
    if (this.isConnected) this._sync();
  }

  _sync() {
    const size = this.getAttribute("size");
    const background = this.getAttribute("background");
    const fill = this.getAttribute("fill");

    if (size) this.style.setProperty("--logo-size", size);
    else this.style.removeProperty("--logo-size");

    if (background) this.style.setProperty("--logo-bg", background);
    else this.style.removeProperty("--logo-bg");

    if (fill) this.style.setProperty("--logo-fill", fill);
    else this.style.removeProperty("--logo-fill");
  }
}
