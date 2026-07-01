# perf-measure — frontend performance bake-off harness

Measures this SolidJS app's **real** frontend performance under CPU/network throttle and
appends one **comparable** row to a shared team results doc: `docs/perf/frontend-runs.html`.

This exists because several people are each building their own version of a similar page
and we need numbers that line up. Every row is produced by the same versioned collector
under identical throttle, with full machine/git/throttle context stamped on it.

> **The single most important idea:** we measure the moment the **data the user came for
> is actually on screen** and the **data layer goes quiet** — *not* the browser `load`
> event and *not* LCP. For a client-rendered SPA those fire far too early (load at ~441ms
> while data settled at ~4.2s on a real app) and LCP is often null. See "Gotchas" in
> `SKILL.md`.

## One-time setup

1. **Node** (for the two `.mjs` scripts) and **Chrome** + the **chrome-devtools MCP**
   server connected in Claude Code. The measured run is driven only through that MCP.
2. **No login is needed for this project today.** If your real page later needs auth:
   ```
   cp perf.local.example.json perf.local.json   # then fill in credentials
   git check-ignore perf.local.json              # MUST print the path (it's gitignored)
   ```
   Never put secrets in `scenarios.json` or the results doc.
3. That's it — the results doc is created automatically on the first run.

## How to run

Ask Claude Code, e.g. *"measure page performance"*, *"run a perf test"*, or
*"benchmark the home screen"*. Optionally name a scenario: *"perf-measure home"*.

What happens (full detail in `SKILL.md`):
1. Reads `scenarios.json` (how to launch the app + which pages to measure).
2. Starts the app (`npm run build`, then **static-serves `dist/`** with a gzip-capable
   server — *not* the dev-server, see "Why some numbers look wrong" below) and waits for it.
3. Opens the page, **injecting `instrument-init.js` before app scripts** so paint/LCP
   observers and fetch/XHR timing wrappers exist from the start.
4. Applies CPU throttle (default **6×**) + optional network preset.
5. Runs **5×**, drops the warm-up run, waits each time for the page-ready signal **and**
   network-quiet, then runs `collect.js` verbatim. Retries any run where the renderer crashes.
6. Computes **median + min–max**, gathers machine/git context.
7. Appends one row via `append-row.mjs`, then reports the headline numbers and compares
   to the previous row for the same scenario.

## How to add a scenario (a new measurable page)

Edit `scenarios.json` and add an entry to `scenarios[]`:

```jsonc
{
  "name": "items",                          // friendly name shown in the doc
  "path": "/items",                          // route to measure
  "readySignal": { "selector": "table tbody tr" },  // <-- the moment real content is on screen
  "dataItemCountSelector": "table tbody tr", // counts rendered rows (comparability)
  "dataRequestUrlPattern": "/graphql"        // JS RegExp string for your data calls
}
```

- **`readySignal` is the most important field.** It must match the moment the *content the
  user came for* is rendered — not first paint, not the spinner. Use a `{selector}` that
  only exists once data is on screen, a `{text}` string that appears with the data, or call
  `performance.mark('perf-ready')` in your page and the collector picks it up.
- **`dataRequestUrlPattern`** is how we detect "data settled". Default matches `/graphql`.
  Widen to `"/(graphql|api)/"` if you also use REST.

See `scenarios.example.json` for fully commented fields.

## How to add a metric (a new column)

`append-row.mjs`'s `COLUMNS` array is the **single source of truth** for the results doc.

1. **Collect it:** add the field to `collect.js` (in-page) and/or `instrument-init.js`,
   and **bump `COLLECTOR_VERSION` + `instrument-init.js` `version`** so rows are distinguishable.
2. **Display it:** append a `{ key, label, kind, group }` entry to `COLUMNS`. Use
   `kind: "timingMedian"` for a `{value,min,max}` timing, `"num"` for a scalar, `"note"`
   for free text. Set `headline: true` only for content-based ranking metrics.
3. **Keep the fixed team columns** (context / headline / network / reference / memory /
   weight) in place and in order so everyone's docs still line up — only *append*.
4. **Migrate any existing doc.** The doc records the column set it was built with
   (a `PERF_COLUMNS` fingerprint). After you change `COLUMNS`, the appender will **refuse**
   to write to an older doc (the new row would misalign with the old header). Run it once
   with `--migrate` to rebuild the header and pad existing rows with `—`:

   ```sh
   node .claude/skills/perf-measure/append-row.mjs --doc docs/perf/frontend-runs.html --data row.json --migrate
   ```

Old rows render the new column as `—` (empty); that's expected.

## Files

| File | Role |
| --- | --- |
| `SKILL.md` | The procedure Claude follows + gotchas. |
| `instrument-init.js` | Pre-app instrumentation (paint/LCP observers, fetch/XHR timing, ready signal). Versioned. |
| `collect.js` | Deterministic collector, read verbatim each run → fixed metric JSON. Versioned. |
| `append-row.mjs` | Owns the HTML format (`COLUMNS`), marker-guarded append-only writer. |
| `heap-size.mjs` | `.heapsnapshot` → live MB. |
| `scenarios.json` / `.example.json` | Measurable pages + app launch config. |
| `perf.local.example.json` | Template for gitignored local creds (unused until you add auth). |
| `perf-snapshots/` | Heap snapshots land here — **gitignored** (large, out of git). |

## Why some numbers look "wrong"

- **LCP blank/null** — expected for an SPA whose largest content is client-rendered. Not an error.
- **`load` much smaller than TTDataRendered** — expected; the page keeps fetching after load.
- **Big min–max spread** — real. Cold/warm cache and GC swing results; that's why we run N
  and report the spread instead of a single number.
- **Decoded (KB) ≫ Over-wire (KB)** — expected. Decoded is the uncompressed bytes the browser
  parses; over-wire is what a gzipping server sends. For this app the ~18KB bundle is ~7KB
  gzipped over the wire — matching SolidJS's ~7KB runtime.
- **Bundle looks ~3× too big?** You measured the **dev-server**, not the production build.
  `webpack serve` (used by `npm start` / `npm run preview`) bakes ~56KB of HMR/websocket
  client into the bundle even in production mode. The skill builds (`npm run build`) and
  static-serves `dist/` precisely to avoid this. If over-wire reads ~24KB instead of ~7KB,
  something is serving via the dev-server.
