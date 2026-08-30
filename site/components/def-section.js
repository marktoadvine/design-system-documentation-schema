import { createShadow, esc, escWithCode, BASE_RESET, FONT } from "./_shared.js";

const DEF_SECTION_CSS = `
  ${BASE_RESET}
  /* Padding, not margin - an outer margin would open a gap back to the
     page background between one section and the next, breaking the
     right-hand column's continuous white panel (layout="split" sections
     zero this out entirely below, since .start/.end carry their own
     padding instead - this rule only actually spaces out plain,
     non-split sections, which have no such inner wrapper of their own). */
  :host {
    display: block;
    padding-block: 96px;
  }
  :host(:first-of-type) {
    padding-block-start: 0;
  }
  /* Sticks to the top of the viewport (just under the fixed nav bar)
     while you scroll through this section's own content - property
     tables can run long, so the title stays in view instead of
     scrolling away with the first few lines. Works the same whether
     this is a layout="split" section or not: the containing block is
     always this section's own :host, so the title releases once this
     section's content has fully scrolled past, same as any sticky
     header. A solid background keeps scrolled-past text from showing
     through while it's stuck; z-index just needs to clear ordinary
     content, not the nav bar itself (--ds-z-nav, higher). Sized and
     weighted large/light on purpose - one definition per screenful of
     scrolling reads better as a real heading than a small subhead
     repeated 36 times down one page. */
  h2 {
    position: sticky;
    top: var(--ds-height-nav, 64px);
    z-index: 1;
    background: var(--ds-color-bg);
    font-family: ${FONT.mono};
    font-size: 3em;
    font-weight: 300;
    color: var(--ds-color-text);
    margin: 0 0 var(--ds-space-2);
    padding-block: var(--ds-space-2);
  }
  .desc {
    color: var(--ds-color-text);
    font-family: ${FONT.body};
    font-size: var(--ds-font-size-base);
    line-height: var(--ds-line-height-loose);
    margin: 0 0 var(--ds-space-4);
    max-width: 65ch;
  }
  /* Plain text, not a badge/pill - "type" and "source" are facts about
     this definition, not a tag someone would filter or click on, so
     they don't get tag-shaped treatment. */
  .type-line {
    font-size: var(--ds-font-size-sm);
    margin: 0 0 var(--ds-space-4);
  }
  .type-line .type {
    font-family: ${FONT.body};
  }

  /* .cols/.start apply to every section, split or not - not just the
     ones with a worked example. A def with no example still needs its
     content (and in particular its own sticky <h2>, below) confined to
     the left half: without this, a plain section's <h2> spans the
     section's full width, and while it's stuck under the nav bar its own
     opaque background (needed so scrolled-past text doesn't show through
     it) paints straight across the right-hand column too, breaking the
     white panel every time a no-example definition's title comes to
     rest. Reserving the right-hand grid track here - even when nothing
     ever renders into it - is what keeps that track clear for
     content__inner's own background (see style.css) to show through. */
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--ds-space-8);
    align-items: start;
  }
  .cols .start,
  .cols .end {
    min-width: 0;
  }

  /* ── layout="split": def content and its worked example side by side ──
     Only the Schema page uses this (one page, every definition, each with
     a real example next to it - see build-site.js's renderDefinition()).
     .end (the example) is the one that stays sticky, not .start (the
     name/description/props) - .start is usually the taller, more-you-
     scroll-the-more-there-is column (a long property table), so pinning
     the shorter example lets it stay in view while you read past it,
     instead of the other way around. align-self: start (not the grid's
     default stretch) keeps .end sized to its own content - height: auto,
     not stretched to match .start's height, which is what sticky
     positioning needs room to stick within in the first place. */
  /* No :host-level padding for split sections - .start/.end below carry
     their own vertical padding instead, so consecutive definitions'
     .end panels touch with zero gap between them (see .end's own
     comment for why that's what makes the right side read as one
     continuous panel instead of a stack of separate boxes). */
  :host([layout="split"]) {
    padding-block: 0;
  }
  :host([layout="split"]) .cols .start,
  :host([layout="split"]) .cols .end {
    height: 100%;
  }
  :host([layout="split"]) .start {
    padding-block: var(--ds-space-16);
  }
  /* Adjacent .end panels sit flush against each other (:host's own
     margin is zeroed above) - each one's background paints all the way
     through its own padding, so the seam between one definition's
     example and the next is just padding, not an actual gap back to the
     page background. That's what makes the whole right-hand column read
     as one continuous panel while still being one <ds-def-section> per
     definition, not a single page-wide element. .end itself doesn't need
     position: sticky - it's already stretched to match .start's height
     (height: 100%, above), leaving no room within its own box to stick
     within. The sticky pin now happens one level deeper, on the <pre>
     inside the slotted <ds-code> (see code.js) - which is why the slot
     below is stretched too: <pre>'s sticky "room to move" comes from its
     containing block being as tall as .end, not from .end itself. */
  :host([layout="split"]) .end {
    background: var(--ds-color-bg-inverse);
    padding: var(--ds-space-16) var(--ds-space-4);
  }
  :host([layout="split"]) ::slotted(ds-code[slot="example"]) {
    display: block;
    height: 100%;
  }

  @media (max-width: 900px) {
    .cols {
      grid-template-columns: 1fr;
    }
    :host([layout="split"]) {
      padding-block: 96px;
    }
    :host([layout="split"]) .end {
      margin-top: var(--ds-space-4);
    }
  }
`;

export class DsDefSection extends HTMLElement {
  static get observedAttributes() {
    return ["name", "anchor", "description", "type", "source", "layout"];
  }
  constructor() {
    super();
    this._shadow = createShadow(this, DEF_SECTION_CSS);
  }
  connectedCallback() {
    this._render();
  }
  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }
  _render() {
    var name = this.getAttribute("name") || "";
    var anchor =
      this.getAttribute("anchor") ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    var desc = this.getAttribute("description") || "";
    var type = this.getAttribute("type") || "";
    var source = this.getAttribute("source") || "";
    var layout = this.getAttribute("layout") || "";
    // Set id on host for TOC linking
    if (anchor) this.id = anchor;

    var start = '<h2 id="' + esc(anchor) + '">' + esc(name) + "</h2>";
    // type and source share one line, separated by a middle dot, instead of
    // type living here and source living in a separate "References:"-labeled
    // line further down.
    if (type || source) {
      start += '<p class="type-line">';
      if (type) start += '<span class="type">' + esc(type) + "</span>";
      if (type && source) start += " · ";
      if (source) start += "<ds-code inline>" + esc(source) + "</ds-code>";
      start += "</p>";
    }
    // Use escWithCode so CommonMark-style `inline code` spans in the
    // description render as <ds-code inline> rather than literal
    // backtick characters.
    if (desc) start += '<p class="desc">' + escWithCode(desc) + "</p>";
    start += "<slot></slot>";

    // .cols/.start wrap every section, not just layout="split" ones - see
    // .cols's own CSS comment for why a def with no example still needs
    // its content (in particular its sticky <h2>) confined to the left
    // half instead of spanning the full width.
    var html =
      '<div class="cols">' +
      '<div class="start">' +
      start +
      "</div>" +
      (layout === "split"
        ? '<div class="end"><slot name="example"></slot></div>'
        : "") +
      "</div>";
    this._shadow.innerHTML = html;
  }
}
