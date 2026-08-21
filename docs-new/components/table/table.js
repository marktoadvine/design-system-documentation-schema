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

import { createShadow, attachStyles, loadCSS } from "../_shared.js";

export class DsTable extends HTMLElement {
  constructor() {
    super();
    this._shadow = createShadow(this);
    attachStyles(this._shadow, loadCSS("table"));
    this._shadow.innerHTML = "<slot></slot>";
  }
}
