(function () {
  "use strict";

  // ── _shared.js ──
  function createShadow(el, mode) {
    return el.attachShadow({ mode: mode || "open" });
  }

  /**
   * Adopt a stylesheet into `shadow`, filled in once `cssPromise` resolves.
   * CSS now arrives asynchronously (see loadCSS() below), so shadow-root
   * creation and stylesheet application are separate steps: createShadow()
   * returns immediately (so _render() etc. can run right away), while the
   * actual CSS text streams in and is applied whenever it's ready.
   */
  function attachStyles(shadow, cssPromise) {
    const sheet = new CSSStyleSheet();
    shadow.adoptedStyleSheets = [sheet];
    cssPromise.then((css) => {
      if (css) sheet.replaceSync(css);
    });
    return sheet;
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * HTML-escape `s`, but also convert CommonMark-style backtick inline-code
   * spans (`like-this`) into <ds-code inline> elements. The full markdown
   * grammar is out of scope; we only handle the one construct that
   * appears in DSDS schema descriptions, where contributors refer to
   * field names and code fragments inline.
   *
   * Closing backticks must appear on the same line as the opening one; an
   * unmatched ` falls through as a literal character.
   */
  function escWithCode(s) {
    if (s == null) return "";
    const parts = String(s).split(/(`[^`\n]+`)/g);
    return parts
      .map((p) => {
        if (p.length >= 2 && p.startsWith("`") && p.endsWith("`")) {
          return `<ds-code inline>${esc(p.slice(1, -1))}</ds-code>`;
        }
        return esc(p);
      })
      .join("");
  }

  const BASE_RESET = `:host([hidden]) { display: none !important; }`;

  const _cssCache = new Map();

  /**
   * Fetch (and cache) a component's CSS from its own directory,
   * components/<name>/<name>.css. Returns a Promise<string> — always
   * resolves, with "" on failure so a missing/renamed file degrades to no
   * styling rather than a thrown error.
   *
   * In the built site, scripts/build-site.js's bundler inlines every
   * component's CSS file at build time via seedCSS() below, so this fetch
   * never actually runs there — only in dev mode (served, never file://),
   * where a live fetch means editing a .css file under components/<name>/
   * shows up on refresh with no rebuild needed. The build-time inlining
   * exists because fetch() of a same-directory file is blocked outright
   * under file:// (opening dist/*.html directly, no server), which the
   * bundle otherwise supports.
   */
  function loadCSS(name) {
    if (_cssCache.has(name)) return _cssCache.get(name);
    const promise = fetch(`components/${name}/${name}.css`)
      .then((res) => (res.ok ? res.text() : ""))
      .catch(() => "");
    _cssCache.set(name, promise);
    return promise;
  }

  /**
   * Pre-populate the CSS cache with already-known text, so loadCSS()
   * resolves instantly without a network request. Called once by the
   * bundled components.js (injected by scripts/build-site.js) with every
   * component's .css file contents read at build time.
   */
  function seedCSS(map) {
    for (const name of Object.keys(map)) {
      _cssCache.set(name, Promise.resolve(map[name]));
    }
  }

  // Icons live as real .svg files in site/assets/ (edit them directly there)
  // instead of inline markup, so ICON_NAMES is just the name → file map.
  // loadIcon() fetches + caches each file's markup on first use; every icon
  // is monoline with stroke/fill="currentColor" so the containing element's
  // `color` recolors it once inlined into the DOM.
  const ICON_FILES = {
    menu: "icon-menu.svg",
    close: "icon-close.svg",
    info: "icon-info.svg",
    flask: "icon-flask.svg",
    dot: "icon-dot.svg",
    lightbulb: "icon-lightbulb.svg",
    warning: "icon-warning.svg",
    brackets: "icon-brackets.svg",
    logo: "dsds.svg",
  };

  const _iconCache = new Map();

  /**
   * Fetch (and cache) the raw markup of a named icon from site/assets/.
   * Returns a Promise<string> — always resolves, with "" on failure so a
   * missing/renamed file degrades to no icon rather than a thrown error.
   *
   * In the built site, scripts/build-site.js's bundler inlines every icon
   * file's contents at build time via seedIcons() below, so this fetch never
   * actually runs there — only in dev mode (served, never file://), where a
   * live fetch means editing an .svg under site/assets/ shows up on refresh
   * with no rebuild needed. The build-time inlining exists because fetch()
   * of a same-directory file is blocked outright under file:// (opening
   * site/dist/*.html directly, no server), which the bundle otherwise
   * supports.
   */
  function loadIcon(name) {
    if (_iconCache.has(name)) return _iconCache.get(name);
    const file = ICON_FILES[name];
    const promise = file
      ? fetch(`assets/${file}`)
          .then((res) => (res.ok ? res.text() : ""))
          .catch(() => "")
      : Promise.resolve("");
    _iconCache.set(name, promise);
    return promise;
  }

  /**
   * Pre-populate the icon cache with already-known markup, so loadIcon()
   * resolves instantly without a network request. Called once by the
   * bundled components.js (injected by scripts/build-site.js) with every
   * icon file's contents read at build time.
   */
  function seedIcons(map) {
    for (const name of Object.keys(map)) {
      _iconCache.set(name, Promise.resolve(map[name]));
    }
  }

  // ── inlined icon assets (build-time, see above) ──
  seedIcons({"menu":"<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/>\n  <line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"/>\n  <line x1=\"3\" y1=\"18\" x2=\"21\" y2=\"18\"/>\n</svg>\n","close":"<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"5\" y1=\"5\" x2=\"19\" y2=\"19\"/>\n  <line x1=\"19\" y1=\"5\" x2=\"5\" y2=\"19\"/>\n</svg>\n","info":"<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\">\n  <circle cx=\"12\" cy=\"12\" r=\"9\"/>\n  <line x1=\"12\" y1=\"11\" x2=\"12\" y2=\"16\"/>\n  <circle cx=\"12\" cy=\"7.5\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/>\n</svg>\n","flask":"<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\">\n  <path d=\"M9 3h6\"/>\n  <path d=\"M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3\"/>\n  <line x1=\"6.5\" y1=\"15\" x2=\"17.5\" y2=\"15\"/>\n</svg>\n","dot":"<svg viewBox=\"0 0 24 24\" width=\"8\" height=\"8\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\">\n  <circle cx=\"12\" cy=\"12\" r=\"10\"/>\n</svg>\n","lightbulb":"<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\">\n  <path d=\"M9 18h6\"/>\n  <path d=\"M10 22h4\"/>\n  <path d=\"M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.05V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-.25c0-.85.4-1.55 1-2.05A7 7 0 0 0 12 2z\"/>\n</svg>\n","warning":"<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\">\n  <path d=\"M12 2 1 21h22L12 2z\"/>\n  <line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"14\"/>\n  <circle cx=\"12\" cy=\"17.5\" r=\"0.7\" fill=\"currentColor\" stroke=\"none\"/>\n</svg>\n","brackets":"<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\">\n  <path d=\"M8 5c-1.5 0-2 .8-2 2v3c0 1.4-.6 2-2 2 1.4 0 2 .6 2 2v3c0 1.2.5 2 2 2\"/>\n  <path d=\"M16 5c1.5 0 2 .8 2 2v3c0 1.4.6 2 2 2-1.4 0-2 .6-2 2v3c0 1.2-.5 2-2 2\"/>\n</svg>\n","logo":"<svg width=\"1550\" height=\"1550\" viewBox=\"0 0 1550 1550\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M0 0H1550V1550H0V0ZM75 75V1475H1475V75H75Z\" fill=\"black\"/>\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M575 300H300V650H575C616.421 650 650 616.421 650 575V375C650 333.579 616.421 300 575 300ZM225 225V725H575C657.843 725 725 657.843 725 575V375C725 292.157 657.843 225 575 225H225Z\" fill=\"black\"/>\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M825 368.75C825 289.359 889.359 225 968.75 225H1181.25C1260.64 225 1325 289.359 1325 368.75H1250C1250 330.78 1219.22 300 1181.25 300H968.75C930.78 300 900 330.78 900 368.75C900 406.72 930.78 437.5 968.75 437.5H1181.25C1260.64 437.5 1325 501.859 1325 581.25C1325 660.641 1260.64 725 1181.25 725H968.75C889.359 725 825 660.641 825 581.25H900C900 619.22 930.78 650 968.75 650H1181.25C1219.22 650 1250 619.22 1250 581.25C1250 543.28 1219.22 512.5 1181.25 512.5H968.75C889.359 512.5 825 448.141 825 368.75Z\" fill=\"black\"/>\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M575 900H300V1250H575C616.421 1250 650 1216.42 650 1175V975C650 933.579 616.421 900 575 900ZM225 825V1325H575C657.843 1325 725 1257.84 725 1175V975C725 892.157 657.843 825 575 825H225Z\" fill=\"black\"/>\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M825 968.75C825 889.359 889.359 825 968.75 825H1181.25C1260.64 825 1325 889.359 1325 968.75H1250C1250 930.78 1219.22 900 1181.25 900H968.75C930.78 900 900 930.78 900 968.75C900 1006.72 930.78 1037.5 968.75 1037.5H1181.25C1260.64 1037.5 1325 1101.86 1325 1181.25C1325 1260.64 1260.64 1325 1181.25 1325H968.75C889.359 1325 825 1260.64 825 1181.25H900C900 1219.22 930.78 1250 968.75 1250H1181.25C1219.22 1250 1250 1219.22 1250 1181.25C1250 1143.28 1219.22 1112.5 1181.25 1112.5H968.75C889.359 1112.5 825 1048.14 825 968.75Z\" fill=\"black\"/>\n</svg>\n"});

  // ── inlined component CSS (build-time, see above) ──
  seedCSS({"code":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n  :host([inline]) { display: inline; }\n\n  pre {\n    margin: 0;\n    overflow-x: auto;\n    white-space: pre;\n    background: #212121;\n  }\n\n  :host([wrap]) pre {\n    white-space: pre-wrap;\n    overflow-wrap: break-word;\n    overflow-x: visible;\n  }\n\n  /* JSON syntax highlighting, painted via the CSS Custom Highlight API\n     (code.js registers these names' Ranges in CSS.highlights). Scoped to\n     this shadow root: only highlights whose Ranges live in here paint,\n     even though the underlying Highlight objects are shared across every\n     <ds-code> instance on the page. Ignored outright in browsers without\n     the API - the code just renders unhighlighted. */\n  ::highlight(hl-k) { color: #9cdcfe; }\n  ::highlight(hl-s) { color: #ce9178; }\n  ::highlight(hl-n) { color: #b5cea8; }\n  ::highlight(hl-b) { color: #569cd6; }\n","badge":"  :host([hidden]) { display: none !important; }\n  :host { display: inline-block; }\n","table":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n","heading":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n","back-to-top":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n","header":"  :host([hidden]) { display: none !important; }\n  :host {\n      display: block;\n      background: #0936C7;\n      padding: 4em 2em 1em;\n      height: 75vh;\n      min-height: 300px;\n      display: flex;\n      flex-direction: column;\n      justify-content: end;\n  }\n\n  h1 {\n      font-weight: 300;\n      font-size: 5em;\n      margin: 0;\n      color: #fff;\n  }\n\n  p {\n      max-width: 65ch;\n  }\n","def-section":"  :host([hidden]) { display: none !important; }\n  :host {\n      display: block;\n      /*min-height: 100vh;*/\n      /*\n      background-image: linear-gradient(to right, #1a1a1a 0%, #1a1a1a 50%, #212121 50%, #212121 100%);\n      */\n  }\n\n  :host([layout=\"split\"]) .cols {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n  }\n\n  /* Grid items default to min-width: auto, i.e. they refuse to shrink\n     below their content's intrinsic width (a long unbroken example JSON\n     line, for instance) - that's what was pushing .end past its 1fr\n     share. <ds-code>'s own `overflow-x: auto` still handles any line\n     wider than the column. */\n  :host([layout=\"split\"]) .cols .start,\n  :host([layout=\"split\"]) .cols .end {\n    min-width: 0;\n  }\n\nheader {\n    margin-bottom: 2em;\n}\n\nheader h2 {\n    font-weight: 300;\n    font-size: 3em;\n    margin: 0;\n    color: #fff;\n}\n\nheader p {\n    margin: 0;\n    font-size: 12px;\n}\n\n/* align-items stays at .cols's default (stretch) so .start is as tall\n   as .end, giving position: sticky room to stick within as you scroll\n   past the (usually taller) example on the right. */\n.start {\n    position: sticky;\n    top: 48px;\n    align-self: start;\n   /* padding-inline-start: 3em;*/\n   padding: 6em 2em;\n}\n\n.end {\n    background-color: #212121;\n    padding: 8em 2em 6em;\n}\n\np {\n    max-width: 65ch;\n}\n","type-ref":"  :host([hidden]) { display: none !important; }\n  :host { display: inline; }\n\n  a {\n      color: #fff;\n  }\n","cross-refs":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n","def-index":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n","def-example":"  :host([hidden]) { display: none !important; }\n  :host {\n      display: block;\n\n\n      height: 100%;\n\n      align-content: center;\n  }\n","prop-table":"  :host([hidden]) { display: none !important; }\n  :host { display: block;}\n\n  a {\n      color: #fff;\n  }\n\n  table {\n      border-collapse: separate;\n      border-spacing: 0;\n      inset: -1em;\n      top: 0;\n      bottom: 0;\n      position: relative;\n  }\n\n  th {\n      text-align: left;\n      font-weight: 500;\n      color: #fff;\n  }\n\n  th, td {\n      padding: .75em 1em;\n      vertical-align: top;\n  }\n\n  th {\n      padding-bottom: 1em;\n      border-bottom: 1px solid #333;\n  }\n\n  tr:first-child td {\n      padding-top: 1em;\n  }\n\n  td strong {\n      background-color: var(--color-positive);\n      color: var(--color-negative);\n      outline: 1px solid var(--color-positive);\n      font-weight: 800;\n  }\n\n  /*\n  th:first-child, td:first-child {\n      padding-left: 0;\n  }\n\n  th:last-child, td:last-child {\n      padding-right: 0;\n  }\n  */\n","spec-nav":":host([hidden]) { display: none !important; }\n:host {\n    display: block;\n    position: fixed;\n    z-index: 100;\n    top: 1em;\n    left: 1em;\n    /*\n    width: 100vw;\n    */\n\n}\n\na {\n    color: var(--color-positive);\n}\n\n.primary {\n    display: flex;\n    gap: 2em;\n    padding: 1em;\n    background: rgba(255,255,255,0.1);\n    backdrop-filter: blur(20px);\n}\n\n.title {\n    text-decoration: none;\n    font-weight: 500;\n    display: flex;\n    gap: .75em;\n    align-items: center;\n}\n\n.title span {\n    width: 20ch;\n    display: inline-block;\n    font-size: 12px;\n}\n\n.primary-links {\n    display: flex;\n    gap: .75em;\n    align-items: center;\n}\n\n.primary-links a {\n    display: flex;\n    height: 1.5rem;\n    font-size: 14px;\n    justify-content: center;\n    align-items: center;\n    padding: 0 1rem;\n    box-sizing: border-box;\n    text-decoration: none;\n}\n\n.primary-links a.active {\n    background: var(--color-positive);\n    color: var(--color-negative);\n}\n","callout":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n","tag":"  :host([hidden]) { display: none !important; }\n  :host { display: inline-block; }\n","logo":"  :host([hidden]) { display: none !important; }\n  :host {\n    display: inline-block;\n    width: var(--logo-size, 40px);\n    height: var(--logo-size, 40px);\n    background: var(--logo-bg, transparent);\n  }\n\n  svg {\n    display: block;\n    width: 100%;\n    height: 100%;\n  }\n\n  svg path {\n    fill: var(--logo-fill, currentColor);\n  }\n","icon-button":"  :host([hidden]) { display: none !important; }\n  :host { display: inline-block; }\n","json-view":"  :host([hidden]) { display: none !important; }\n  :host { display: block; }\n"});

  // ── code/code.js ──
  // ═══════════════════════════════════════════════════════════════════════════
  // <ds-code>
  //
  // Attributes:
  //   language — optional language label (ex: "json", "bash")
  //   label   — optional label shown in top-right corner
  //   no-label — boolean, suppresses the label entirely, even when `label`
  //             or `language` is set
  //   inline  — boolean, renders as inline <code> instead of block
  //   wrap    — boolean, wraps long lines (white-space: pre-wrap) instead of
  //             the default horizontal-scrolling single-line-per-line layout
  //
  // Content:
  //   Text content inside the element is rendered as code.
  //   For JSON content, set language="json" for syntax highlighting.
  //
  // Syntax highlighting uses the CSS Custom Highlight API
  // (https://www.bram.us/2024/02/18/custom-highlight-api-for-syntax-highlighting/)
  // instead of wrapping tokens in <span>s: the code text stays a single,
  // untouched Text node, and highlighted ranges are registered separately via
  // CSS.highlights + styled with ::highlight() in code.css. This sidesteps the
  // escape-order bug the old span-wrapping approach was prone to (there's no
  // HTML to escape at all - textContent handles that), at the cost of only
  // working in browsers that support the API (Chrome 105+, Safari 17.2+,
  // Firefox 140+ as of this writing). Unsupported browsers just render plain,
  // unhighlighted code - see SUPPORTS_HIGHLIGHT_API below.
  // ═══════════════════════════════════════════════════════════════════════════

  const JSON_TOKEN_RE =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

  // Tokenizes a JSON string into {start, end, cls} character-offset ranges,
  // for the Custom Highlight API to paint - no HTML, no escaping, since the
  // source text itself is never touched. A quoted token followed by `:` is a
  // key; otherwise a string value. The colon itself is never part of a
  // token's range, matching how the old span-based version left it unstyled.
  function tokenizeJson(raw) {
    const tokens = [];
    JSON_TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = JSON_TOKEN_RE.exec(raw))) {
      const [full, str, colon] = match;
      if (str !== undefined) {
        const start = match.index;
        tokens.push({ start, end: start + str.length, cls: colon ? "hl-k" : "hl-s" });
      } else {
        const cls = full === "true" || full === "false" || full === "null" ? "hl-b" : "hl-n";
        tokens.push({ start: match.index, end: match.index + full.length, cls });
      }
    }
    return tokens;
  }

  const HIGHLIGHT_NAMES = ["hl-k", "hl-s", "hl-n", "hl-b"];

  const SUPPORTS_HIGHLIGHT_API =
    typeof Highlight !== "undefined" && typeof CSS !== "undefined" && !!CSS.highlights;

  // One shared Highlight per token class, reused by every <ds-code> instance
  // on the page. CSS.highlights is a single global registry, not scoped per
  // shadow root, so a second instance calling CSS.highlights.set('hl-k', ...)
  // would silently replace the first instance's highlight instead of adding
  // to it. Each instance instead adds its own Ranges into these shared
  // objects, and removes exactly those Ranges again on re-render or
  // disconnect (see DsCode._clearRanges below). ::highlight() matching is
  // itself scoped per shadow tree, so this sharing is safe: a rule defined in
  // one <ds-code>'s shadow root only paints Ranges whose nodes live inside
  // that same tree, even though the Highlight object backing it is shared.
  const sharedHighlights = SUPPORTS_HIGHLIGHT_API
    ? Object.fromEntries(
        HIGHLIGHT_NAMES.map((name) => {
          const highlight = new Highlight();
          CSS.highlights.set(name, highlight);
          return [name, highlight];
        }),
      )
    : {};

  class DsCode extends HTMLElement {
    static get observedAttributes() {
      return ["language", "label", "no-label", "inline", "wrap"];
    }

    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("code"));
      this._ranges = [];
    }

    connectedCallback() {
      // Defer render to ensure the browser has finished parsing the
      // element's inner text content. When the custom element is
      // defined synchronously, connectedCallback fires as soon as the
      // opening tag is parsed — before child text nodes exist. A single
      // requestAnimationFrame tick isn't a reliable guarantee of that (see
      // the equivalent note in spec-nav.js), so wait for DOMContentLoaded
      // when the document is still loading.
      var self = this;
      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            self._render();
          },
          { once: true },
        );
      } else {
        this._render();
      }
    }

    disconnectedCallback() {
      // Ranges hold live references to this instance's own text node. Once
      // this element is gone, leaving them in the shared Highlight objects
      // would both leak memory and paint stale, detached-node ranges if a
      // future document position ever coincided with their old offsets.
      this._clearRanges();
    }

    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }

    // Removes exactly the Ranges this instance previously added, from
    // whichever shared Highlight objects they belong to - never touches
    // another instance's ranges.
    _clearRanges() {
      for (const { cls, range } of this._ranges) {
        sharedHighlights[cls].delete(range);
      }
      this._ranges = [];
    }

    _render() {
      this._clearRanges();

      // ── Inline mode: render as a styled <code> span ──────────
      if (this.hasAttribute("inline")) {
        var raw = this.textContent || "";
        this._shadow.innerHTML = `<code>${esc(raw)}</code>`;
        return;
      }

      // ── Block mode: render as <pre><code> with syntax highlighting ──
      const label = this.hasAttribute("no-label")
        ? ""
        : this.getAttribute("label") || this.getAttribute("language") || "";
      const lang = this.getAttribute("language") || "";
      const rawBlock = (this.textContent || "").trim();

      const labelHtml = label ? `<span class="label">${esc(label)}</span>` : "";
      this._shadow.innerHTML = `${labelHtml}<pre><code></code></pre>`;

      // Plain text, not innerHTML - the code stays one untouched Text node
      // so Range offsets below line up exactly with `rawBlock`'s own indices.
      const codeEl = this._shadow.querySelector("code");
      codeEl.textContent = rawBlock;

      if (SUPPORTS_HIGHLIGHT_API && lang === "json" && codeEl.firstChild) {
        for (const { start, end, cls } of tokenizeJson(rawBlock)) {
          const range = new Range();
          range.setStart(codeEl.firstChild, start);
          range.setEnd(codeEl.firstChild, end);
          sharedHighlights[cls].add(range);
          this._ranges.push({ cls, range });
        }
      }
    }
  }

  // ── badge/badge.js ──
  // ═══════════════════════════════════════════════════════════════════════════
  // <ds-badge>
  //
  // Attributes:
  //   variant — "kind" | "experimental" | (default: neutral)
  //
  // Content:
  //   Text label inside the element.
  // ═══════════════════════════════════════════════════════════════════════════

  class DsBadge extends HTMLElement {
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

  // ── table/table.js ──
  // ═══════════════════════════════════════════════════════════════════════════
  // <ds-table>
  //
  // A wrapper that accepts a slotted <table> element.
  //
  // Usage:
  //   <ds-table>
  //     <table>
  //       <thead><tr><th>Name</th><th>Type</th></tr></thead>
  //       <tbody>
  //         <tr><td>kind</td><td>string</td></tr>
  //       </tbody>
  //     </table>
  //   </ds-table>
  // ═══════════════════════════════════════════════════════════════════════════

  class DsTable extends HTMLElement {
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("table"));
      this._shadow.innerHTML = "<slot></slot>";
    }
  }

  // ── heading/heading.js ──
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

  class DsHeading extends HTMLElement {
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

  // ── back-to-top/back-to-top.js ──
  class DsBackToTop extends HTMLElement {
    static get observedAttributes() {
      return ["label", "href"];
    }

    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("back-to-top"));
      this._render();
    }

    attributeChangedCallback() {
      this._render();
    }

    _render() {
      var label = this.getAttribute("label") || "\u2191 Back to top";
      var href = this.getAttribute("href") || "#";
      this._shadow.innerHTML = `<a href="${esc(href)}">${esc(label)}</a>`;
    }
  }

  // ── header/header.js ──
  // ═══════════════════════════════════════════════════════════════════════════
  // <ds-header>
  //
  // The page header block, used at the top of every page: a title, an optional
  // description, and an optional source path (for schema-reference pages).
  //
  // Attributes:
  //   title       — page title (rendered as the h1)
  //   description — optional lead paragraph (supports inline `code`)
  //   source      — optional source path shown as "Source: <code>" (schema pages)
  //
  // Slots:
  //   (default) — extra inline content next to the title (ex: a status badge)
  // ═══════════════════════════════════════════════════════════════════════════

  class DsHeader extends HTMLElement {
    static get observedAttributes() {
      return ["title", "description", "source"];
    }
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("header"));
    }
    connectedCallback() {
      this._render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }
    _render() {
      var t = this.getAttribute("title") || "";
      var d = this.getAttribute("description") || "";
      var s = this.getAttribute("source") || "";
      var html = `<h1>${esc(t)}<slot></slot></h1>`;
      //if (s) html += `<p>Source: <ds-code inline>${esc(s)}</ds-code></p>`;
      // Use escWithCode so backtick inline-code spans in the description
      // render as <ds-code inline> rather than literal `backticks`.
      if (d) html += `<p>${escWithCode(d)}</p>`;

      this._shadow.innerHTML = html;
    }
  }

  // ── def-section/def-section.js ──
  class DsDefSection extends HTMLElement {
    static get observedAttributes() {
      return ["name", "anchor", "description", "type", "source", "layout"];
    }
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("def-section"));
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
      // Set id on host for TOC linking
      if (anchor) this.id = anchor;

      var start = `<header>`
      start += `<h2 id="${esc(anchor)}">${esc(name)}</h2>`;
      // type and source share one line, separated by a middle dot, instead
      // of type living here and source living in a separate
      // "References:"-labeled line further down.
      if (type || source) {
        start += "<p>";
        if (type) start += `<span>${esc(type)}</span>`;
        if (type && source) start += " · ";
        if (source) start += `<ds-code inline>${esc(source)}</ds-code>`;
        start += "</p>";
      }
      start += `</header>`
      // Use escWithCode so CommonMark-style `inline code` spans in the
      // description render as <ds-code inline> rather than literal
      // backtick characters.
      if (desc) start += `<p>${escWithCode(desc)}</p>`;
      start += "<slot></slot>";

      var html =
        '<div class="cols">' +
        `<div class="start">${start}</div>` +
        '<div class="end"><slot name="example"></slot></div>' +
        "</div>";
      this._shadow.innerHTML = html;
    }
  }

  // ── type-ref/type-ref.js ──
  class DsTypeRef extends HTMLElement {
    static get observedAttributes() {
      return ["href"];
    }
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("type-ref"));
    }
    connectedCallback() {
      // A single requestAnimationFrame tick isn't a reliable guarantee that
      // this element's light-DOM children (read via textContent below) have
      // finished parsing — see the equivalent note in spec-nav.js. Waiting
      // for DOMContentLoaded when the document is still loading avoids an
      // intermittent empty-link-text race.
      var self = this;
      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            self._render();
          },
          { once: true },
        );
      } else {
        this._render();
      }
    }
    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }
    _render() {
      var href = this.getAttribute("href") || "#";
      var text = this.textContent.trim();
      this._shadow.innerHTML = `<a href="${esc(href)}">${esc(text)}</a>`;
    }
  }

  // ── cross-refs/cross-refs.js ──
  class DsCrossRefs extends HTMLElement {
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("cross-refs"));
      this._shadow.innerHTML = "<slot></slot>";
    }
  }

  // ── def-index/def-index.js ──
  class DsDefIndex extends HTMLElement {
    static get observedAttributes() {
      return ["title"];
    }

    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("def-index"));
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

  // ── def-example/def-example.js ──
  class DsDefExample extends HTMLElement {
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("def-example"));
      this._shadow.innerHTML = "<slot></slot>";
    }
  }

  // ── prop-table/prop-table.js ──
  class DsPropTable extends HTMLElement {
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("prop-table"));
    }

    connectedCallback() {
      // Defer to let child <ds-prop> elements parse. A single
      // requestAnimationFrame tick isn't a reliable guarantee of that (see
      // the equivalent note in spec-nav.js), so wait for DOMContentLoaded
      // when the document is still loading.
      var self = this;
      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            self._render();
          },
          { once: true },
        );
      } else {
        this._render();
      }
    }

    _render() {
      var props = Array.from(this.querySelectorAll("ds-prop"));
      if (props.length === 0) {
        this._shadow.innerHTML = "";
        return;
      }

      // Sort: required (0) → conditional (1) → optional (2)
      props.sort(function (a, b) {
        var oa = a.hasAttribute("required")
          ? 0
          : a.hasAttribute("conditional")
            ? 1
            : 2;
        var ob = b.hasAttribute("required")
          ? 0
          : b.hasAttribute("conditional")
            ? 1
            : 2;
        return oa - ob;
      });

      // A union type (joined with literal " | " by describeType() in
      // scripts/render-prop-table.js) wider than 2 alternatives collapses
      // to a footnote marker in the table, with the full list spelled out
      // below - past 2, the type cell starts crowding out the description
      // column. Each row that needs one gets its own marker (†, ‡, next
      // one doubled, ...) so multiple footnotes on the same table stay
      // distinguishable instead of every row pointing at an identical †.
      var MARKERS = ["†", "‡", "§", "¶", "‖"];
      function markerFor(i) {
        return MARKERS[i % MARKERS.length].repeat(Math.floor(i / MARKERS.length) + 1);
      }

      var footnotes = [];

      var trs = props
        .map(function (prop) {
          var name = prop.getAttribute("name") || "";
          var type = prop.getAttribute("type") || "";
          var desc = prop.innerHTML.trim();

          var nameHtml = prop.hasAttribute("required")
            ? `<strong>${esc(name)}</strong>`
            : esc(name);

          var typeCell = type;
          if (type.split(" | ").length > 2) {
            var marker = markerFor(footnotes.length);
            typeCell = marker;
            footnotes.push({ marker: marker, name: name, type: type });
          }

          return `<tr><td><code>${nameHtml}</code></td><td>${typeCell}</td><td>${desc}</td></tr>`;
        })
        .join("\n");

      var footnotesHtml = footnotes.length
        ? "<ul class=\"footnotes\">" +
          footnotes
            .map(function (f) {
              return `<li>${f.marker} <code>${esc(f.name)}</code>: ${f.type}</li>`;
            })
            .join("") +
          "</ul>"
        : "";

      this._shadow.innerHTML =
        `<table><thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead><tbody>${trs}</tbody></table>` +
        footnotesHtml;
    }
  }

  // <ds-prop> — declarative property row (child of <ds-prop-table>)
  // Attributes: name, type, required (boolean), conditional (boolean)
  // Content: description (innerHTML, supports rich HTML)
  class DsProp extends HTMLElement {
    constructor() {
      super();
    }
  }

  // ── spec-nav/spec-nav.js ──
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

  class DsSpecNav extends HTMLElement {
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

  // ── callout/callout.js ──
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

  class DsCallout extends HTMLElement {
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

  // ── tag/tag.js ──
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

  class DsTag extends HTMLElement {
    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("tag"));
      this._shadow.innerHTML = "<slot></slot>";
    }
  }

  // ── logo/logo.js ──
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

  class DsLogo extends HTMLElement {
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

  // ── icon-button/icon-button.js ──
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

  class DsIconButton extends HTMLElement {
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

  // ── json-view/json-view.js ──
  // ═══════════════════════════════════════════════════════════════════════════
  // <ds-json-view>
  //
  // A "View as JSON" toggle for spec definition pages: a button that opens an
  // overlay showing the page's raw schema JSON in a <ds-code> block.
  //
  // Attributes:
  //   label — the source file path, used only for the overlay's accessible
  //           name (ex: "Raw JSON: common/criterion.schema.json")
  //
  // Slots:
  //   (default) — the JSON content, typically a single <ds-code language="json">
  //
  // Usage:
  //   <ds-json-view label="common/criterion.schema.json">
  //     <ds-code language="json">{ ... }</ds-code>
  //   </ds-json-view>
  // ═══════════════════════════════════════════════════════════════════════════

  class DsJsonView extends HTMLElement {
    static get observedAttributes() {
      return ["label"];
    }

    constructor() {
      super();
      this._shadow = createShadow(this);
      attachStyles(this._shadow, loadCSS("json-view"));
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
      this._shadow.innerHTML = `<ds-icon-button class="btn" label="View as JSON"><span class="icon"></span></ds-icon-button><div class="overlay"><slot></slot></div>`;

      const btn = this._shadow.querySelector(".btn");
      if (btn) btn.addEventListener("click", () => this._setOpen(!this._open));

      this._updateIcon();
    }

    _setOpen(open) {
      this._open = open;
      const overlay = this._shadow.querySelector(".overlay");
      if (overlay) overlay.classList.toggle("overlay--open", open);
      this._updateIcon();
    }

    _updateIcon() {
      const btn = this._shadow.querySelector(".btn");
      const icon = this._shadow.querySelector(".icon");
      if (btn) btn.setAttribute("label", this._open ? "Close JSON view" : "View as JSON");
      loadIcon(this._open ? "close" : "brackets").then((svg) => {
        if (icon) icon.innerHTML = svg;
      });
    }

    _onKeydown(e) {
      if (e.key === "Escape" && this._open) this._setOpen(false);
    }
  }

  // ── Registration ──
  const registry = [
    ["ds-code", DsCode],
    ["ds-badge", DsBadge],
    ["ds-table", DsTable],
    ["ds-heading", DsHeading],
    ["ds-back-to-top", DsBackToTop],
    ["ds-header", DsHeader],
    ["ds-def-section", DsDefSection],
    ["ds-type-ref", DsTypeRef],
    ["ds-cross-refs", DsCrossRefs],
    ["ds-def-index", DsDefIndex],
    ["ds-def-example", DsDefExample],
    ["ds-prop-table", DsPropTable],
    ["ds-prop", DsProp],
    ["ds-spec-nav", DsSpecNav],
    ["ds-callout", DsCallout],
    ["ds-tag", DsTag],
    ["ds-logo", DsLogo],
    ["ds-icon-button", DsIconButton],
    ["ds-json-view", DsJsonView],
  ];

  for (const [name, ctor] of registry) {
    if (!customElements.get(name)) {
      customElements.define(name, ctor);
    }
  }
})();
