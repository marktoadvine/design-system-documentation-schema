// ═══════════════════════════════════════════════════════════════════════════
// <ds-spec-nav>
//
// The specification site's top bar navigation. Reads its structure from
// declarative light-DOM children instead of a JSON attribute.
//
// A flat top bar, not a sidebar: with every schema definition living on one
// Schema page instead of its own, there's nothing left to group into
// collapsible sections — just a handful of top-level pages, so a horizontal
// bar fits, and frees the sidebar's reserved column width for pages (like
// Schema) that want the full viewport width.
//
// Attributes:
//   title       — title text shown at the left of the bar (e.g. "DSDS 0.1")
//   title-href  — link for the title (default: "index.html")
//   active      — slug of the currently active page
//   open        — boolean, whether the mobile links dropdown is expanded
//
// Content model (light DOM):
//   <a> elements become nav links. Every <a> may carry a `slug` attribute
//   used to match against the `active` attribute for highlighting.
//
// Mobile behavior:
//   The bar itself never hides — at ≤900px the links row (.nav__items)
//   collapses to 0 height by default, and the logo in the title area is
//   replaced by a menu button in the same spot. Clicking it (or setting the
//   `open` attribute) drops the links down as a full-width panel below the
//   title row.
//
// Usage:
//   <ds-spec-nav title="DSDS 0.1" title-href="index.html" active="index">
//     <a href="index.html" slug="index">Overview</a>
//     <a href="quickstart.html" slug="quickstart">Quick start</a>
//   </ds-spec-nav>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, esc, BASE_RESET, FONT, loadIcon } from "./_shared.js";

const SPEC_NAV_CSS = `
  ${BASE_RESET}
  :host {
    display: block;
    position: fixed;
    inset-block-start: 0;
    inset-inline: 0;
    z-index: var(--ds-z-nav, 100);
  }

  .nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    color: var(--ds-color-text);
    background: var(--ds-color-bg-inverse);
    font-family: var(--ds-font-body);
    width: 100%;
    min-height: var(--ds-height-nav, 64px);
    padding-inline: var(--ds-space-4);
  }

  /* ── Title ──────────────────────────────────────────── */
  .nav__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--ds-font-size-base);
    font-weight: var(--ds-font-weight-bold);
    letter-spacing: 0;
    text-transform: none;
    flex-shrink: 0;
  }

  .nav__title a {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    color: inherit;
    text-decoration: none;
    line-height: 1.2;
  }

  .nav__logo {
    flex-shrink: 0;
  }

  /* Menu toggle — takes over the logo's spot at mobile widths. */
  .nav__menu-btn {
    display: none;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .nav__menu-icon {
    display: flex;
  }

  .nav__menu-icon svg {
    display: block;
  }

  /* ── Links row ──────────────────────────────────────── */
  .nav__items {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
  }

  .nav__link {
    display: block;
    padding: 6px calc(var(--ds-space-4) - 4px);
    color: var(--ds-color-text);
    text-decoration: none;
    font-size: var(--ds-font-size-base);
    font-weight: 500;
    line-height: var(--ds-line-height-normal);
    border-block-end: var(--ds-border-width) solid transparent;
    transition: background-color var(--ds-duration-base) var(--ds-ease-standard),
      color var(--ds-duration-base) var(--ds-ease-standard),
      border-color var(--ds-duration-base) var(--ds-ease-standard);
  }

  .nav__link:hover {
    background: #1a1a1a;
    color: #fff;
  }

  .nav__link--active {
    background: #1a1a1a;
    color: #fff;
    border-block-end-color: var(--ds-color-accent);
  }

  /* ── Mobile: bar stays put; only the links row collapses ────────────── */
  @media (max-width: 900px) {

    .nav__menu-btn {
      display: flex;
    }

    .nav__logo {
      display: none;
    }

    .nav {
      min-height: 64px;
    }

    .nav__items {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      max-height: 0;
      overflow: hidden;
      padding: 0;
      transition: max-height var(--ds-duration-base) var(--ds-ease-standard);
    }

    :host([open]) .nav__items {
      max-height: 60vh;
      overflow-y: auto;
      padding: var(--ds-space-4) 0;
    }

    .nav__link {
      border-block-end: none;
      border-inline-start: var(--ds-border-width) solid transparent;
    }

    .nav__link--active {
      border-block-end-color: transparent;
      border-inline-start-color: var(--ds-color-accent);
    }
  }

  /* ── Print: hide nav ────────────────────────────────── */
  @media print {
    :host {
      display: none;
    }
  }
`;

export class DsSpecNav extends HTMLElement {
  static get observedAttributes() {
    return ["title", "title-href", "active", "open"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this, SPEC_NAV_CSS);
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() {
    document.addEventListener("keydown", this._onKeydown);

    // Light-DOM children (<a>) may not be parsed yet when a blocking
    // <script> in <head> registers the element — the parser upgrades the
    // element the instant it sees the opening tag, before it has parsed any
    // children.
    //
    // We must wait for DOMContentLoaded to guarantee ALL children have
    // been parsed. A MutationObserver fires too early (after the first
    // child, before the rest are added).
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this._render(), {
        once: true,
      });
    } else {
      // Document already parsed (dynamic insertion, deferred script, etc.)
      this._render();
    }
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown);
  }

  attributeChangedCallback(name) {
    if (name === "open") {
      this._syncMenuButton();
      return;
    }
    // Only re-render after the initial render has happened.
    if (this._rendered && this.isConnected) this._render();
  }

  get open() {
    return this.hasAttribute("open");
  }

  set open(val) {
    if (val) {
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
  }

  _render() {
    this._rendered = true;
    const title = this.getAttribute("title") || "";
    const titleHref = this.getAttribute("title-href") || "index.html";
    const active = this.getAttribute("active") || "";
    const isOpen = this.open;

    const titleHtml = title
      ? '<div class="nav__title">' +
        '<button class="nav__menu-btn" part="menu-btn" type="button" aria-label="Toggle navigation" aria-expanded="' +
        (isOpen ? "true" : "false") +
        // The button's aria-label already names the control; its icon is
        // decorative and filled in async once loadIcon() resolves below.
        '"><span class="nav__menu-icon" aria-hidden="true"></span></button>' +
        '<a href="' +
        esc(titleHref) +
        '"><ds-logo class="nav__logo" size="2rem" fill="#000" aria-hidden="true"></ds-logo><span>' +
        esc(title) +
        "</span></a>" +
        "</div>"
      : "";

    const itemsHtml = this._buildFromChildren(active);

    this._shadow.innerHTML =
      '<nav class="nav" role="navigation" aria-label="Specification navigation" part="nav">' +
      titleHtml +
      '<div class="nav__items" part="items">' +
      itemsHtml +
      "</div>" +
      "</nav>";

    const btn = this._shadow.querySelector(".nav__menu-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        this.open = !this.open;
      });
    }

    this._updateMenuIcon(isOpen);
  }

  _syncMenuButton() {
    const isOpen = this.open;
    const btn = this._shadow.querySelector(".nav__menu-btn");
    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    this._updateMenuIcon(isOpen);
  }

  _updateMenuIcon(isOpen) {
    const icon = this._shadow.querySelector(".nav__menu-icon");
    loadIcon(isOpen ? "close" : "menu").then((svg) => {
      if (icon) icon.innerHTML = svg;
    });
  }

  _onKeydown(e) {
    if (e.key === "Escape" && this.open) {
      this.open = false;
      const btn = this._shadow.querySelector(".nav__menu-btn");
      if (btn) btn.focus();
    }
  }

  /**
   * Walk the light-DOM children and build shadow-DOM navigation HTML.
   *
   * Recognised children:
   *   <a href="…" slug="…">Label</a> → a nav link
   */
  _buildFromChildren(active) {
    const parts = [];

    for (const child of this.children) {
      if (child.tagName.toLowerCase() !== "a") continue; // silently skip unrecognised elements
      const slug = child.getAttribute("slug") || "";
      const href = child.getAttribute("href") || "#";
      const label = child.textContent.trim();
      const activeCls = slug && slug === active ? " nav__link--active" : "";
      parts.push(
        '<a class="nav__link' +
          activeCls +
          '" href="' +
          esc(href) +
          '">' +
          esc(label) +
          "</a>",
      );
    }

    return parts.join("\n");
  }
}
