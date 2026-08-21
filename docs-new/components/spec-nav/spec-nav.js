// ═══════════════════════════════════════════════════════════════════════════
// <ds-spec-nav>
//
// The specification site's top navigation bar. Reads its structure from
// declarative light-DOM children instead of a JSON attribute.
//
// Attributes:
//   title       — title text shown at the left (ex: "DSDS 0.1")
//   title-href  — link for the title (default: "index.html")
//   active      — slug of the currently active top-level page
//
// Content model (light DOM):
//   Top-level <a> elements become primary links (site-level pages) shown
//   in the top row, always visible.
//   <ds-nav-group label="…"> elements become a labeled cluster of in-page
//   anchor links, shown in a second row - "on this page" navigation for
//   whichever page is active. Multiple groups render as adjacent labeled
//   clusters in that same row.
//
//   Every <a> may carry a `slug` attribute used to match against the
//   `active` attribute for highlighting.
//
// Usage:
//   <ds-spec-nav title="DSDS 0.1" title-href="index.html" active="index">
//     <a href="index.html" slug="index">Overview</a>
//     <a href="schema.html" slug="schema">Schema</a>
//     <ds-nav-group label="On this page">
//       <a href="#principles" slug="principles">Principles</a>
//     </ds-nav-group>
//   </ds-spec-nav>
// ═══════════════════════════════════════════════════════════════════════════

import { createShadow, esc, attachStyles, loadCSS } from "../_shared.js";

export class DsSpecNav extends HTMLElement {
  static get observedAttributes() {
    return ["title", "title-href", "active"];
  }

  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("spec-nav"));
  }

  connectedCallback() {
    // Light-DOM children (<a>, <ds-nav-group>) may not be parsed yet when
    // a blocking <script> in <head> registers the element - the parser
    // upgrades the element the instant it sees the opening tag, before it
    // has parsed any children. Wait for DOMContentLoaded to guarantee ALL
    // children have been parsed.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this._render(), {
        once: true,
      });
    } else {
      this._render();
    }
  }

  attributeChangedCallback() {
    if (this._rendered && this.isConnected) this._render();
  }

  _render() {
    this._rendered = true;
    const title = this.getAttribute("title") || "";
    const titleHref = this.getAttribute("title-href") || "index.html";
    const active = this.getAttribute("active") || "";

    const titleHtml = title
      ? `<a class="title" href="${esc(titleHref)}"><ds-logo size="1.5rem"></ds-logo><span>${esc(title)}</span></a>`
      : "";

    const { primary, secondary } = this._buildFromChildren(active);

    this._shadow.innerHTML = `<div class="primary">${titleHtml}<div class="primary-links">${primary}</div></div><div class="secondary">${secondary}</div>`;
  }

  /**
   * Walk the light-DOM children and build the two nav rows.
   *
   * Recognised children:
   *   <a href="…" slug="…">Label</a>           → primary (top-row) link
   *   <ds-nav-group label="…">                  → secondary labeled cluster
   *     <a href="…" slug="…">Label</a>          → in-page anchor link
   *   </ds-nav-group>
   */
  _buildFromChildren(active) {
    const primary = [];
    const secondary = [];

    for (const child of this.children) {
      const tag = child.tagName.toLowerCase();

      if (tag === "a") {
        const slug = child.getAttribute("slug") || "";
        const href = child.getAttribute("href") || "#";
        const label = child.textContent.trim();
        const activeCls = slug && slug === active ? " active" : "";
        primary.push(
          `<a class="link${activeCls}" href="${esc(href)}">${esc(label)}</a>`,
        );
      } else if (tag === "ds-nav-group") {
        secondary.push(this._buildGroup(child));
      }
      // Silently skip unrecognised elements
    }

    return { primary: primary.join("\n"), secondary: secondary.join("\n") };
  }

  /**
   * Build inline HTML for a single <ds-nav-group> - a labeled cluster of
   * in-page anchor links in the secondary row.
   */
  _buildGroup(groupEl) {
    return;
    const label = groupEl.getAttribute("label") || "";
    const childLinks = groupEl.querySelectorAll(":scope > a");

    const childHtml = Array.from(childLinks)
      .map(function (a) {
        const href = a.getAttribute("href") || "#";
        const text = a.textContent.trim();
        return `<a class="link" href="${esc(href)}">${esc(text)}</a>`;
      })
      .join("\n");

    const labelHtml = label ? `<span class="group-label">${esc(label)}</span>` : "";

    return `<div class="group">${labelHtml}${childHtml}</div>`;
  }
}
