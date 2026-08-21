import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsDefExample extends HTMLElement {
  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("def-example"));
    this._shadow.innerHTML = "<slot></slot>";
  }
}
