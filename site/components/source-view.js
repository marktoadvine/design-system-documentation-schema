// ═══════════════════════════════════════════════════════════════════════════
// <ds-source-view>
//
// A "View source" toggle for spec definition pages: a fixed floating
// button in the bottom-right corner. Closed, it shows a curly-braces icon;
// clicking it opens a full-viewport overlay (above the nav and content)
// showing the page's own schema file, verbatim, in a <ds-code> block, and
// the same button swaps to a close icon to return to the documentation view.
//
// Named for what it shows (the source file), not a text format - the
// schema is authored in YAML, so that's what renders here (see
// scripts/build-site.js's own call site). A component named after one
// format is exactly the kind of stale claim this one used to make itself
// (as <ds-json-view>, back when the schema really was JSON) - naming it
// for the concept instead means it can't drift out of sync with the
// schema's format again.
//
// Attributes:
//   label — the source file path, used only for the overlay's accessible
//           name (e.g. "Source: common/criterion.schema.yaml")
//
// Slots:
//   (default) — the source content, typically a single <ds-code language="yaml">
//
// Usage:
//   <ds-source-view label="common/criterion.schema.yaml">
//     <ds-code language="yaml">...</ds-code>
//   </ds-source-view>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, esc, BASE_RESET, loadIcon } from "./_shared.js";

const SOURCE_VIEW_CSS = `
  ${BASE_RESET}
  :host {
    display: block;
    position: fixed;
    inset-inline-end: var(--ds-space-4);
    bottom: var(--ds-space-4);
    z-index: calc(var(--ds-z-overlay, 200) + 1);
  }

  /* Positioned + given a higher z-index than the overlay below — without
     this, the button is a plain static-flow box, and a fixed+z-indexed
     sibling (the overlay) paints above static content regardless of DOM
     order, so the button would vanish behind the overlay once it's open. */
  .source-view__btn {
    position: relative;
    z-index: calc(var(--ds-z-overlay, 200) + 1);
  }

  .source-view__icon svg {
    display: block;
  }

  /* Sits above everything else on the page — including the fixed nav —
     while open. Hidden entirely (not just visually) when closed so its
     content isn't reachable by keyboard/AT. */
  .source-view__overlay {
    /*display: none;*/
    height: 0;
    position: fixed;
    inset: 0;
    z-index: var(--ds-z-overlay, 200);
    background: var(--ds-color-bg-inverse);
    overflow-y: auto;
    padding: 0 var(--ds-space-4) 0;
    transition: .3s var(--ds-ease-standard);
    margin-top: 100vh;
  }

  .source-view__overlay--open {
    /*display: none;*/
    height: 100vh;
    padding: var(--ds-space-8) var(--ds-space-4) var(--ds-space-4);
    margin: 0;
  }

  ::slotted(ds-code) {
    display: block;
  }
`;

export class DsSourceView extends HTMLElement {
  static get observedAttributes() {
    return ["label"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this, SOURCE_VIEW_CSS);
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
    const label = this.getAttribute("label") || "";
    const dialogLabel = label ? `Source: ${label}` : "Source";

    this._shadow.innerHTML =
      '<ds-icon-button class="source-view__btn" part="button" label="View source">' +
      '<span class="source-view__icon" part="icon"></span>' +
      "</ds-icon-button>" +
      '<div class="source-view__overlay" part="overlay" role="dialog" aria-modal="true" tabindex="-1" aria-label="' +
      esc(dialogLabel) +
      '">' +
      '<div class="source-view__body" part="body"><slot></slot></div>' +
      "</div>";

    const btn = this._shadow.querySelector(".source-view__btn");
    if (btn) btn.addEventListener("click", () => this._setOpen(!this._open));

    this._updateIcon();
  }

  _setOpen(open) {
    this._open = open;
    const overlay = this._shadow.querySelector(".source-view__overlay");
    if (overlay) {
      overlay.classList.toggle("source-view__overlay--open", open);
      if (open) overlay.focus();
    }
    this._updateIcon();
  }

  _updateIcon() {
    const btn = this._shadow.querySelector(".source-view__btn");
    const icon = this._shadow.querySelector(".source-view__icon");
    if (btn) btn.setAttribute("label", this._open ? "Close source view" : "View source");
    loadIcon(this._open ? "close" : "brackets").then((svg) => {
      if (icon) icon.innerHTML = svg;
    });
  }

  _onKeydown(e) {
    if (e.key === "Escape" && this._open) this._setOpen(false);
  }
}
