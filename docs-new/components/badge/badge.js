// ═══════════════════════════════════════════════════════════════════════════
// <ds-badge>
//
// Attributes:
//   variant — "kind" | "experimental" | (default: neutral)
//
// Content:
//   Text label inside the element.
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsBadge extends HTMLElement {
  static get observedAttributes() {
    return ["variant"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("badge"));
    this._shadow.innerHTML = `<slot></slot>`;
  }
}
