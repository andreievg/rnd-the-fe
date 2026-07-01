/**
 * Generate a self-contained, ZERO-JS static HTML baseline of the stocktake
 * table into static-baseline/index.html.
 *
 * Why this exists: to measure how the raw table *feels* (scroll / focus / type)
 * with the whole list in the DOM but NO framework at all — no Solid, no
 * reactivity, no event handlers. Any lag here is purely the browser dealing
 * with a large DOM of form controls, which isolates DOM cost from framework
 * cost. Compare it against the Solid app to see the framework delta (if any).
 *
 * It fetches the full dataset from the GraphQL endpoint, then string-builds the
 * markup (every row baked in, editable controls as plain <input>/<select>).
 *
 * Usage:
 *   node scripts/gen-static.mjs
 *   SCHEMA_URL=http://192.168.1.75:8000/graphql node scripts/gen-static.mjs
 *
 * Then serve it (any static server), e.g.:
 *   npx serve -s static-baseline -l 3122
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

const ENDPOINT = process.env.SCHEMA_URL || "http://localhost:8000/graphql";
const STOCKTAKE_ID = "019f17d0-1444-795c-ac53-da2216c73cff";
const STORE_ID = "5B28901C52396E4BB098B9862CCF5DF9";

const LOCATION_OPTIONS = ["A1", "A2", "B1", "B2", "Cold room", "Quarantine"];
const REASON_OPTIONS = ["Stock count", "Damaged", "Expired", "Correction", "Lost"];
const MANUFACTURER_OPTIONS = ["Shimadzu", "Pfizer", "Roche", "Novartis", "Generic"];

const QUERY = `query q($stocktakeId: String!, $storeId: String!, $page: PaginationInput, $sort: [StocktakeLineSortInput!]) {
  stocktakeLines(stocktakeId: $stocktakeId, storeId: $storeId, page: $page, sort: $sort) {
    ... on StocktakeLineConnector {
      totalCount
      nodes {
        id itemName batch expiryDate manufactureDate packSize
        snapshotNumberOfPacks countedNumberOfPacks
        item { code unitName }
        location { name }
        reasonOption { reason }
        manufacturer(storeId: $storeId) { name }
      }
    }
  }
}`;

async function fetchAll() {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        stocktakeId: STOCKTAKE_ID,
        storeId: STORE_ID,
        page: { first: 100000, offset: 0 },
        sort: { key: "itemName", desc: false },
      },
    }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("GraphQL errors: " + JSON.stringify(json.errors));
  return json.data.stocktakeLines;
}

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const select = (options, current) => {
  const cur = current ?? "";
  const opts = ['<option value="">—</option>']
    .concat(
      options.map(
        (o) => `<option value="${esc(o)}"${o === cur ? " selected" : ""}>${esc(o)}</option>`,
      ),
    )
    .join("");
  return `<select class="editSelect">${opts}</select>`;
};

const numAttr = (v) => (v == null ? "" : ` value="${esc(v)}"`);
const strAttr = (v) => (v ? ` value="${esc(v)}"` : "");

const rowHtml = (n) => {
  const snapshot = n.snapshotNumberOfPacks;
  const counted = n.countedNumberOfPacks;
  const diff = counted == null ? "-" : String(counted - snapshot);
  return (
    "<tr>" +
    `<td class="td checkboxCell"><input type="checkbox" class="rowCheckbox"></td>` +
    `<td class="td"><span class="linkCell">${esc(n.item.code)}</span></td>` +
    `<td class="td"><span class="linkCell">${esc(n.itemName)}</span></td>` +
    `<td class="td"><input type="text" class="editInput"${strAttr(n.batch)}></td>` +
    `<td class="td"><input type="date" class="editInput"${strAttr(n.expiryDate)}></td>` +
    `<td class="td"><input type="date" class="editInput"${strAttr(n.manufactureDate)}></td>` +
    `<td class="td">${select(LOCATION_OPTIONS, n.location?.name)}</td>` +
    `<td class="td">${esc(n.item.unitName)}</td>` +
    `<td class="td alignRight"><input type="number" class="editInput editNumber"${numAttr(n.packSize)}></td>` +
    `<td class="td alignRight">${esc(snapshot)}</td>` +
    `<td class="td alignRight"><input type="number" class="editInput editNumber"${numAttr(counted)}></td>` +
    `<td class="td alignRight">${esc(diff)}</td>` +
    `<td class="td">${select(REASON_OPTIONS, n.reasonOption?.reason)}</td>` +
    `<td class="td">${select(MANUFACTURER_OPTIONS, n.manufacturer?.name)}</td>` +
    "</tr>"
  );
};

const HEADERS = [
  "", "Code", "Name", "Batch", "Expiry date", "Manufacture date", "Location",
  "Unit name", "Pack size", "Packs snapshot", "Packs counted", "Difference",
  "Reason", "Manufacturer",
];

const CSS = `
:root { font-family: "Inter", system-ui, -apple-system, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: rgb(252,252,252); color: rgba(0,0,0,0.87); font-size: 14px; }
.page { padding: 16px 24px; }
.topBar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.breadcrumb { display:flex; align-items:center; gap:8px; font-size:18px; font-weight:600; }
.muted { color: rgba(0,0,0,0.6); font-weight:400; }
.subBar { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.descriptionLabel { font-weight:600; }
.descriptionValue { background: rgb(250,250,252); border:1px solid rgb(228,228,235); border-radius:8px; padding:8px 12px; min-width:260px; }
.tabs { display:flex; justify-content:center; gap:32px; border-bottom:1px solid rgb(228,228,235); }
.tab { padding:10px 4px; color: rgba(0,0,0,0.6); font-weight:600; border-bottom:2px solid transparent; }
.tabActive { color: rgb(91,141,239); border-bottom-color: rgb(91,141,239); }
.wrap { background:#fff; overflow:auto; border-bottom:1px solid rgb(228,228,235); }
table { width:100%; border-collapse:separate; border-spacing:0; font-size:14px; white-space:nowrap; }
.th { position:sticky; top:0; z-index:1; background:#fff; text-align:left; font-size:12.6px; font-weight:600; color: rgba(0,0,0,0.87); padding:12px 16px 12px 8px; border-bottom:1px solid rgb(238,238,242); }
.td { padding:5.6px 8px; border-bottom:1px solid rgb(228,228,235); height:52px; vertical-align:middle; }
tbody tr:nth-child(odd) { background: rgb(250,250,252); }
tbody tr:nth-child(even) { background:#fff; }
tbody tr:hover { background: rgb(245,247,252); }
.alignRight { text-align:right; }
.linkCell { color: rgb(91,141,239); }
.checkboxCell { width:40px; padding-left:16px; }
.rowCheckbox { width:16px; height:16px; margin:0; accent-color: rgb(91,141,239); }
.editInput { width:100%; min-width:80px; padding:4px 6px; border:1px solid rgb(228,228,235); border-radius:6px; font-family:inherit; font-size:14px; background:#fff; }
.editNumber { text-align:right; min-width:64px; }
.editSelect { width:100%; min-width:110px; padding:4px 6px; border:1px solid rgb(228,228,235); border-radius:6px; font-family:inherit; font-size:14px; background:#fff; }
`.trim();

async function main() {
  console.log(`gen-static: fetching from ${ENDPOINT} ...`);
  const conn = await fetchAll();
  const nodes = conn.nodes;

  const headHtml = HEADERS.map((h) => `<th class="th">${esc(h)}</th>`).join("");
  const rowsHtml = nodes.map(rowHtml).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Stocktake 112 — static baseline</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="page">
  <div class="topBar">
    <div class="breadcrumb">📦 Stocktakes <span class="muted">/ 112</span></div>
    <div>Static baseline — ${nodes.length} rows, zero JS</div>
  </div>
  <div class="subBar">
    <div><span class="descriptionLabel">Description:</span> <span class="descriptionValue">Created by check on 30/06/2026</span></div>
    <div class="muted">🔍 Filter items</div>
  </div>
  <div class="tabs"><span class="tab tabActive">Details</span><span class="tab">Log</span></div>
  <div class="wrap">
    <table>
      <thead><tr>${headHtml}</tr></thead>
      <tbody>
${rowsHtml}
      </tbody>
    </table>
  </div>
</div>
</body>
</html>`;

  const outDir = join(REPO, "static-baseline");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "index.html");
  writeFileSync(outPath, html, "utf8");
  console.log(
    `gen-static: wrote ${outPath} (${(html.length / 1024).toFixed(0)} KB, ${nodes.length} rows)`,
  );
}

main().catch((err) => {
  console.error("gen-static failed:", err.message);
  process.exit(1);
});
