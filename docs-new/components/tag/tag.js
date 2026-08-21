// ═══════════════════════════════════════════════════════════════════════════
// <ds-tag>
//
// A tag for keyword and category labels.
//
// Slots:
//   (default) — tag label text
//
// Usage:
//   <ds-tag>color</ds-tag>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsTag extends HTMLElement {
  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("tag"));
    this._shadow.innerHTML = "<slot></slot>";
  }
}
