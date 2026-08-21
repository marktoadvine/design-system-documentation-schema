// ═══════════════════════════════════════════════════════════════════════════
// <ds-heading>
//
// Attributes:
//   level    — 1–6 (default: 2)
//   anchor   — auto-generated anchor id (default: derived from text content)
//
// Slots:
//   (default) — heading text
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, esc, attachStyles, loadCSS } from "../_shared.js";

export class DsHeading extends HTMLElement {
  static get observedAttributes() {
    return ["level", "anchor"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("heading"));
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  _render() {
    const level = Math.min(
      6,
      Math.max(1, parseInt(this.getAttribute("level"), 10) || 2),
    );
    const text = this.textContent.trim();
    const anchor =
      this.getAttribute("anchor") ||
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    // Set id on the host element so document.querySelector and TOC
    // scanning can find this heading by id without reaching into shadow DOM.
    if (anchor) this.id = anchor;

    const tag = `h${level}`;
    this._shadow.innerHTML = `<${tag}><slot></slot> <a href="#${esc(anchor)}">#</a></${tag}>`;
  }
}
