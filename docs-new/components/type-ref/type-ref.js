import { createShadow, esc, attachStyles, loadCSS } from "../_shared.js";

export class DsTypeRef extends HTMLElement {
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
