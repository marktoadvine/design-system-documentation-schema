// ═══════════════════════════════════════════════════════════════════════════
// <ds-callout>
//
// Attributes:
//   variant — "info" | "tip" | "warning" (default: "info")
//   title   — bold lead-in text shown above the content (ex: "Tip:").
//             Omit for no title.
//
// Slots:
//   (default) — callout content (may include links, lists, etc.)
//
// Usage:
//   <ds-callout title="Key idea:">
//     Some important information here.
//   </ds-callout>
//
//   <ds-callout variant="tip" title="Tip:">
//     A helpful suggestion.
//   </ds-callout>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsCallout extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "title"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("callout"));
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
