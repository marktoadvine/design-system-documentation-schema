import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsCrossRefs extends HTMLElement {
  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("cross-refs"));
    this._shadow.innerHTML = "<slot></slot>";
  }
}
