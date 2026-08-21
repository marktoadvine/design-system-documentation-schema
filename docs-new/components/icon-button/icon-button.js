// ═══════════════════════════════════════════════════════════════════════════
// <ds-icon-button>
//
// A minimal icon-only button: a slotted icon plus a label attribute.
//
// Attributes:
//   label — accessible name (this button has no visible text)
//
// Slots:
//   (default) — icon markup (ex: an inline <svg>)
//
// Usage:
//   <ds-icon-button label="Toggle JSON view">
//     <svg>...</svg>
//   </ds-icon-button>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsIconButton extends HTMLElement {
  static get observedAttributes() {
    return ["label"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("icon-button"));
    this._shadow.innerHTML = '<button type="button"><slot></slot></button>';
  }
}
