import { createShadow, esc, attachStyles, loadCSS } from "../_shared.js";

export class DsPropTable extends HTMLElement {
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
export class DsProp extends HTMLElement {
  constructor() {
    super();
  }
}
