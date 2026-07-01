#!/usr/bin/env node
// append-row.mjs — perf-measure results-doc appender
//
// SINGLE SOURCE OF TRUTH for the results-doc format. The COLUMNS array below
// defines every column, in fixed order, identical for everyone on the team so
// our docs line up. To add a project-specific column, append to COLUMNS — do
// NOT reorder or remove the fixed ones.
//
// APPEND-ONLY + MARKER-GUARDED:
//   - Creates the doc on first run if it does not exist.
//   - Inserts one <tr> immediately BEFORE the marker comment.
//   - REFUSES TO WRITE if the marker is missing or appears != 1 time, so
//     history can't be silently corrupted by a malformed/edited doc.
//
// Usage:
//   node append-row.mjs --doc docs/perf/frontend-runs.html --data row.json
//   echo '<json>' | node append-row.mjs --doc docs/perf/frontend-runs.html
//
// The JSON is one object whose keys are COLUMNS[].key. Missing keys render as
// the empty placeholder. Median/spread fields are expected pre-computed by the
// skill (e.g. { value: 4210, min: 3980, max: 4550 }) for timing columns.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ===========================================================================
// COLUMNS — fixed order. Group comments mark the mandatory team-wide set.
// `kind` controls rendering: 'text' | 'num' | 'timingMedian' | 'note'.
// `headline: true` columns get a highlighted cell so the ranking metrics pop.
// ===========================================================================
export const FORMAT_VERSION = 4;

export const COLUMNS = [
  // ---- Run context --------------------------------------------------------
  { key: "utc", label: "UTC", kind: "text", group: "context" },
  { key: "scenario", label: "Scenario", kind: "text", group: "context" },
  { key: "gitBranch", label: "Branch", kind: "text", group: "context" },
  { key: "gitCommit", label: "Commit", kind: "text", group: "context" },
  { key: "machine", label: "Machine (cores · OS · Chrome)", kind: "text", group: "context" },
  { key: "cpuThrottle", label: "CPU×", kind: "text", group: "context" },
  { key: "networkPreset", label: "Network", kind: "text", group: "context" },
  { key: "cacheState", label: "Cold/Warm", kind: "text", group: "context" },
  { key: "dataItemCount", label: "Data items", kind: "num", group: "context" },
  { key: "runs", label: "Runs (N)", kind: "num", group: "context" },

  // ---- HEADLINE: content-based timings (median of N, min–max) -------------
  { key: "timeToNetworkQuietMs", label: "⏱ TTNetworkQuiet (ms)", kind: "timingMedian", headline: true, group: "headline" },
  { key: "timeToDataRenderedMs", label: "⏱ TTDataRendered (ms)", kind: "timingMedian", headline: true, group: "headline" },

  // ---- Network waterfall --------------------------------------------------
  { key: "dataRequestCount", label: "Data reqs", kind: "num", group: "network" },
  { key: "slowestDataRequestMs", label: "Slowest data req (ms)", kind: "timingMedian", group: "network" },

  // ---- Reference (recorded, NOT ranked on) --------------------------------
  { key: "ttfbMs", label: "TTFB (ms)", kind: "timingMedian", group: "reference" },
  { key: "fcpMs", label: "FCP (ms)", kind: "timingMedian", group: "reference" },
  { key: "loadEventMs", label: "load (ms)", kind: "timingMedian", group: "reference" },
  { key: "cls", label: "CLS", kind: "num", group: "reference" },
  { key: "lcpMs", label: "LCP (ms) †", kind: "timingMedian", group: "reference" },

  // ---- Memory -------------------------------------------------------------
  { key: "jsHeapUsedMB", label: "JS heap (MB)", kind: "num", group: "memory" },
  { key: "heapSnapshotMB", label: "Heapsnap live (MB)", kind: "num", group: "memory" },

  // ---- Weight -------------------------------------------------------------
  { key: "domNodeCount", label: "DOM nodes", kind: "num", group: "weight" },
  { key: "requestCount", label: "Requests", kind: "num", group: "weight" },
  { key: "totalDecodedKB", label: "Decoded (KB)", kind: "num", group: "weight" },
  { key: "totalTransferKB", label: "Over-wire (KB)", kind: "num", group: "weight" },

  // ---- Provenance + notes -------------------------------------------------
  { key: "collectorVersion", label: "Collector v", kind: "num", group: "context" },
  { key: "notes", label: "Notes", kind: "note", group: "context" },
];

const ROW_MARKER = "<!-- PERF_ROWS_INSERT_BEFORE_THIS -->";

// Fingerprint of the column set baked into the doc when created. On append we
// compare it to the CURRENT COLUMNS; a mismatch means the doc's header no longer
// matches the row shape (someone added/removed a column since the doc was made),
// which would silently misalign cells. We refuse, and offer --migrate to rebuild.
const COLUMNS_FINGERPRINT = COLUMNS.map((c) => c.key).join(",");
function fingerprintComment(fp) {
  return `<!-- PERF_COLUMNS: ${fp} -->`;
}
const FP_RE = /<!-- PERF_COLUMNS: ([^>]*?) -->/;

// ===========================================================================
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--doc") args.doc = argv[++i];
    else if (a === "--data") args.data = argv[++i];
    else if (a === "--migrate") args.migrate = true;
  }
  return args;
}

// Rebuild an existing doc to the CURRENT column set: regenerate the <thead>,
// re-pad every existing <tr> so its <td> count matches (missing keys we can't
// recover render as the empty placeholder), preserving row order. Used by
// --migrate after COLUMNS changes. Returns the new HTML, or throws on a doc we
// can't safely parse (no thead / no marker).
function migrateDoc(html) {
  const theadMatch = html.match(/<thead>[\s\S]*?<\/thead>/);
  if (!theadMatch) throw new Error("cannot migrate: no <thead> found");
  if ((html.split(ROW_MARKER).length - 1) !== 1) throw new Error("cannot migrate: row marker not present exactly once");

  const oldThead = theadMatch[0];
  const oldThCount = (oldThead.match(/<th\b/g) || []).length;
  const newThead = `<thead>\n    <tr>\n${buildHeaderCells()}\n    </tr>\n  </thead>`;
  let out = html.replace(oldThead, newThead);

  // re-pad existing data rows (those between the </thead> and the marker) whose
  // <td> count is short of the new column count, by inserting empty cells at the
  // end. Rows already at the right width are left untouched.
  const newColCount = COLUMNS.length;
  out = out.replace(/<tr>([\s\S]*?)<\/tr>/g, (full, inner) => {
    const tds = (inner.match(/<td\b/g) || []).length;
    if (tds === 0) return full; // header row already replaced; skip
    if (tds >= newColCount) return full;
    const pad = Array.from({ length: newColCount - tds }, () => `      <td><span class="empty">—</span></td>`).join("\n");
    return `<tr>${inner}${pad}\n    </tr>`;
  });

  // refresh the fingerprint + format-version comments
  if (FP_RE.test(out)) out = out.replace(FP_RE, fingerprintComment(COLUMNS_FINGERPRINT));
  else out = out.replace(/<!-- format-version: \d+ -->/, (m) => `${m}\n${fingerprintComment(COLUMNS_FINGERPRINT)}`);
  out = out.replace(/<!-- format-version: \d+ -->/, `<!-- format-version: ${FORMAT_VERSION} -->`);
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtCell(col, value) {
  if (value == null || value === "") return '<span class="empty">—</span>';
  if (col.kind === "timingMedian") {
    // accept either a scalar or { value, min, max }
    if (typeof value === "object") {
      const v = value.value != null ? value.value : "—";
      const spread =
        value.min != null && value.max != null
          ? ` <span class="spread">(${value.min}–${value.max})</span>`
          : "";
      return `${esc(v)}${spread}`;
    }
    return esc(value);
  }
  return esc(value);
}

function buildRow(data) {
  const cells = COLUMNS.map((col) => {
    const cls = col.headline ? ' class="headline"' : "";
    return `      <td${cls}>${fmtCell(col, data[col.key])}</td>`;
  }).join("\n");
  return `    <tr>\n${cells}\n    </tr>`;
}

function buildHeaderCells() {
  return COLUMNS.map((col) => {
    const cls = col.headline ? ' class="headline"' : "";
    return `        <th${cls} title="${esc(col.group)}">${col.label}</th>`;
  }).join("\n");
}

function newDoc() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Frontend perf bake-off — results</title>
<!-- format-version: ${FORMAT_VERSION} -->
${fingerprintComment(COLUMNS_FINGERPRINT)}
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 0; padding: 1.5rem; color: #1a1a1a; }
  h1 { margin: 0 0 .25rem; }
  .lede { color: #444; max-width: 70ch; }
  .lede code { background:#f0f0f0; padding:0 .25em; border-radius:3px; }
  .warn { background:#fff8e1; border:1px solid #ffe082; padding:.75rem 1rem; border-radius:6px; max-width:80ch; margin:1rem 0; }
  .warn b { color:#a06a00; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; font-variant-numeric: tabular-nums; }
  th, td { border: 1px solid #ddd; padding: .3rem .5rem; text-align: right; white-space: nowrap; }
  th:first-child, td:first-child, th:nth-child(2), td:nth-child(2) { text-align: left; }
  thead th { position: sticky; top: 0; background: #fafafa; z-index: 1; border-bottom: 2px solid #bbb; }
  tbody tr:nth-child(even) { background: #fbfbfb; }
  .headline { background: #e8f5e9 !important; font-weight: 600; }
  thead th.headline { background:#c8e6c9 !important; }
  .spread { color:#888; font-weight: 400; font-size: .85em; }
  .empty { color:#bbb; }
  .note { text-align:left; white-space:normal; max-width:30ch; }
  footer { margin-top:1.5rem; color:#666; font-size:.85em; }
</style>
</head>
<body>
<h1>Frontend perf bake-off — results</h1>
<p class="lede">
  Comparable frontend performance numbers for the team bake-off. Every row is produced by the
  same versioned collector (<code>collect.js</code>) under identical CPU/network throttle.
  The <b>highlighted green columns are the headline, content-based metrics</b> —
  <code>TTNetworkQuiet</code> (primary ranking metric) and <code>TTDataRendered</code>.
  All timings are the <b>median of N runs</b> with the warm-up run dropped; the
  <span class="spread">(min–max)</span> in parentheses is the spread.
</p>
<div class="warn">
  <b>Read me before comparing:</b>
  <ul>
    <li><b>Do not rank on the <code>load</code> event or LCP.</b> For a client-rendered SPA the
      <code>load</code> event fires long before the data the user came for has arrived
      (we measured <code>load</code> at ~441ms vs data settling at ~4.2s on a real app).
      Rank on <b>TTNetworkQuiet</b> / <b>TTDataRendered</b>.</li>
    <li>† <b>LCP is often blank for SPAs — that is expected, not an error.</b> The largest content
      (e.g. a table) is client-rendered after first interaction, so no LCP candidate is recorded.</li>
    <li>A row is only comparable to another with a <b>similar data-item count</b> and the
      <b>same throttle</b>. A 50-row page and a 2000-row page are not comparable.</li>
  </ul>
</div>
<table>
  <thead>
    <tr>
${buildHeaderCells()}
    </tr>
  </thead>
  <tbody>
    ${ROW_MARKER}
  </tbody>
</table>
<footer>
  Newest rows at the bottom. Format version ${FORMAT_VERSION}. Append-only via
  <code>append-row.mjs</code>; the appender refuses to write if the row marker is missing.
</footer>
</body>
</html>
`;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.doc) {
    console.error("ERROR: --doc <path> is required");
    process.exit(2);
  }

  // read row data
  let raw;
  if (args.data) {
    raw = readFileSync(args.data, "utf8");
  } else {
    raw = readFileSync(0, "utf8"); // stdin
  }
  if (!raw.trim()) {
    console.error("ERROR: no row JSON provided (use --data <file> or pipe via stdin)");
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("ERROR: row data is not valid JSON: " + e.message);
    process.exit(2);
  }

  // create on first run
  let created = false;
  if (!existsSync(args.doc)) {
    mkdirSync(dirname(args.doc), { recursive: true });
    writeFileSync(args.doc, newDoc(), "utf8");
    created = true;
  }

  let html = readFileSync(args.doc, "utf8");

  // MARKER GUARD — refuse to write unless exactly one marker is present
  const markerCount = html.split(ROW_MARKER).length - 1;
  if (markerCount !== 1) {
    console.error(
      `REFUSING TO WRITE: expected exactly 1 row marker, found ${markerCount}. ` +
        `The results doc may be corrupted or hand-edited. Marker: ${ROW_MARKER}`
    );
    process.exit(3);
  }

  // COLUMNS FINGERPRINT GUARD — refuse to append if the doc's columns differ
  // from the current COLUMNS, since the new row would misalign with the header.
  if (!created) {
    const fpMatch = html.match(FP_RE);
    const docFp = fpMatch ? fpMatch[1] : null;
    if (docFp !== COLUMNS_FINGERPRINT) {
      if (args.migrate) {
        try {
          html = migrateDoc(html);
          writeFileSync(args.doc, html, "utf8");
          console.error(
            `Migrated ${args.doc} to current columns ` +
              `(${docFp === null ? "no fingerprint" : "old: " + docFp.split(",").length + " cols"} → ${COLUMNS.length} cols). Existing rows padded with —.`
          );
        } catch (e) {
          console.error(`REFUSING TO WRITE: --migrate failed: ${e.message}`);
          process.exit(3);
        }
      } else {
        console.error(
          `REFUSING TO WRITE: the doc's columns do not match the current COLUMNS ` +
            `(doc: ${docFp === null ? "<no fingerprint — pre-dates column tracking>" : docFp.split(",").length + " cols"}, ` +
            `current: ${COLUMNS.length} cols). Appending now would misalign cells with the header. ` +
            `Re-run with --migrate to rebuild the header and pad existing rows.`
        );
        process.exit(3);
      }
    }
  }

  const row = buildRow(data);
  // insert the new row BEFORE the marker (newest at the bottom, just above marker)
  html = html.replace(ROW_MARKER, `${row}\n    ${ROW_MARKER}`);

  // re-check we still have exactly one marker after write
  const after = html.split(ROW_MARKER).length - 1;
  if (after !== 1) {
    console.error(`INTERNAL ERROR: marker count became ${after} after insert — aborting, not writing.`);
    process.exit(3);
  }

  writeFileSync(args.doc, html, "utf8");
  console.log(
    `${created ? "Created doc and appended" : "Appended"} 1 row to ${args.doc} ` +
      `(scenario="${data.scenario || "?"}", marker count OK = 1).`
  );
}

// run only when invoked directly (allow importing COLUMNS in tests)
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
