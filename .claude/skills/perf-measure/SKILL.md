---
name: perf-measure
description: >-
  Measure this SolidJS app's real frontend performance under CPU/network throttle
  and append one comparable row to the shared team bake-off results HTML. Use when
  the user wants to "measure page performance", "run a perf test", "benchmark this
  screen", "measure frontend perf", "perf-measure", or compare load timings for the
  bake-off. Times content/data settling (not the load event), runs N times and
  reports median + spread, and stamps machine/git/throttle context on every row.
argument-hint: "[scenario-name] (default: all scenarios in scenarios.json)"
---

# perf-measure

Produce **comparable** frontend performance numbers for the team bake-off and append
them to `docs/perf/frontend-runs.html`. Everyone's doc shares the same fixed columns
(owned by `append-row.mjs`'s `COLUMNS`) and the same versioned collector, so rows from
different people/machines line up.

Drive Chrome **only via the chrome-devtools MCP** (`new_page`, `navigate_page`,
`emulate`, `performance_start_trace`/`stop`, `take_heapsnapshot`, `evaluate_script`,
`wait_for`). Do not use other browser tooling for the measured run.

## Files in this skill
- `instrument-init.js` — instrumentation installed in the page **before app scripts**:
  PerformanceObserver for paint/LCP, fetch/XHR wrappers that time data calls, a
  MutationObserver that stamps the "page ready" signal. Versioned (`version`).
- `collect.js` — deterministic collector, **read verbatim each run**, returns the fixed
  metric set as JSON. Versioned (`COLLECTOR_VERSION`). Bump it + `instrument-init.js`
  together if you change what's collected.
- `append-row.mjs` — owns the HTML format. `COLUMNS` is the single source of truth.
  Inserts one `<tr>` before the marker; **refuses to write if the marker count ≠ 1**.
- `heap-size.mjs` — turns a `.heapsnapshot` into a live-MB number.
- `scenarios.json` / `scenarios.example.json` — measurable pages + app launch config.
- `perf.local.example.json` — template for gitignored local creds (login not needed here yet).

## Procedure

### 0. Load config
- Read `scenarios.json` (app launch, defaults, scenarios). Pick the scenario named in
  the argument, or run all scenarios if none given.
- If a scenario needs login, copy `perf.local.example.json` → `perf.local.json`, then
  **verify it's gitignored**: `git check-ignore .claude/skills/perf-measure/perf.local.json`
  must print the path. Never write secrets into `scenarios.json` or the results doc.

### 1. Start / confirm the app
- If `app.runCommand` is set, start it in the background and wait until
  `app.baseUrl + app.readyProbePath` responds (poll up to `startupTimeoutMs`).
  Default is `npm run build && npx --yes serve -l 3000 dist` — build the real production
  bundle, then **static-serve `dist/` with a gzip-capable server**. Confirm the **actual
  served port** from the output; if 3000 is taken the server may pick another. Use the real URL.
- **Do NOT use `npm run preview` / `webpack serve` for measurement.** This project's `serve`
  script is webpack-dev-server, which injects ~56KB of HMR/websocket client into the bundle
  even in `--mode production` — over-wire size jumps from ~7KB (real) to ~24KB (artifact).
  Static-serving `dist/` measures the true artifact. Zero-dep fallback (no gzip):
  `cd dist && python3 -m http.server <port>` — over-wire then reads ~18KB (uncompressed) but
  is still comparable if everyone uses it.
- If `runCommand` is empty, assume the app/deployed URL is already serving.

### 2. Open the page with instrumentation installed first
For each run:
1. `new_page` (or reuse one) and **before navigating to content**, set the ready config
   and inject instrumentation so observers exist before app scripts run:
   - `evaluate_script`: set `window.__perfReadyConfig = <scenario.readySignal>` (either
     `{selector}` or `{text}`).
   - `evaluate_script`: the **verbatim contents of `instrument-init.js`**.
   In practice with the MCP: navigate to `about:blank`, inject those two, then
   `navigate_page` to the scenario URL — buffered observers (`buffered:true`) + the
   pre-installed wrappers recover the early entries. The MutationObserver catches the
   "ready" signal regardless of timing.

### 3. Apply throttle
- `emulate` with `cpuThrottlingRate = defaults.cpuThrottle` (default **6×**) and the
  network preset from `defaults.networkPreset` (`none` = no network throttle).

### 4. Run N times, drop the warm-up, retry crashes
- `runs` defaults to **5**. The **first run is warm-up and dropped**; cold-vs-warm,
  GC, and background activity swing results 20–40%, so one run is noise.
- Between runs, `navigate_page` reload (or new page) to reset, re-injecting
  instrumentation as in step 2.
- Wait for **content ready**: poll `window.__perf.readyMs != null` (or `wait_for` the
  ready text/selector).
- Then wait for **network quiet**: poll until `window.__perf.inFlight === 0` and it has
  stayed 0 for `defaults.networkQuietMs` (~500ms). Only then collect.
- **Run `collect.js` verbatim** via `evaluate_script`, calling
  `collectPerf({ dataRequestUrlPattern, dataItemCountSelector })` from the scenario.
  Capture the returned JSON per run.
- **Renderer crash handling:** after heavy-throttle reloads Chrome may report
  "Target crashed". Detect it (evaluate throws / page unresponsive), wait for recovery
  (re-`list_pages`/`new_page`), and **retry that run** — do not record a crashed sample.
- Optionally once (not per run): `take_heapsnapshot`, save under
  `perf-snapshots/<scenario>-<utc>.heapsnapshot` (gitignored), then
  `node heap-size.mjs <file>` → `heapSnapshotMB`.

### 5. Aggregate
- For each timing metric, compute **median across the kept runs** and the **min–max**.
  Emit timing columns as `{ value: <median>, min, max }`; counts/memory as the median
  scalar. (See `COLUMNS` kinds in `append-row.mjs`.)

### 6. Gather context (stamp every row)
- `utc`: current UTC timestamp.
- `gitBranch` / `gitCommit`: `git rev-parse --abbrev-ref HEAD` / `git rev-parse --short HEAD`.
- `machine`: cores (`os.cpus().length`), OS (`os.platform()`/`os.release()`), and the
  Chrome/UA string (read `navigator.userAgent` via `evaluate_script`). Include CPU model
  if available (`os.cpus()[0].model`).
- `cpuThrottle`, `networkPreset`, `cacheState` (cold/warm — note reloads are warm),
  `dataItemCount` (median), `runs` (N), `collectorVersion`, `notes`.

### 7. Append the row
- Write the assembled row object to a temp JSON, then:
  `node .claude/skills/perf-measure/append-row.mjs --doc docs/perf/frontend-runs.html --data <tmp>.json`
- The doc is created on first run. If the appender prints "REFUSING TO WRITE":
  - **marker missing/duplicated** → stop and inspect, do not force it.
  - **columns do not match** → `COLUMNS` changed since the doc was built. Re-run the same
    command with `--migrate` once; it rebuilds the header and pads existing rows with `—`,
    then appends. (The doc carries a `PERF_COLUMNS` fingerprint so this is detected, not
    silently misaligned.)

### 8. Report + compare
- Print the headline numbers (TTNetworkQuiet, TTDataRendered) with spread.
- Compare against the **previous row for the same scenario** in the doc and state
  regression/improvement. Note the data-item count so the comparison is honest.

## Gotchas — DO NOT skip these

- **Never headline the `load` event or LCP for this SPA.** On a real app `load` fired at
  ~441ms while data finished at ~4.2s, missing 16 post-load data calls. LCP was null
  because the largest content (a table) is client-rendered after first interaction.
  Record both for reference; **rank on TTNetworkQuiet / TTDataRendered**.
- **LCP being null/blank is expected**, not a bug. Don't retry trying to "fix" it.
- **One run is noise.** Always N runs, drop the first, report median + min–max.
- **Comparability needs context.** A 50-row and a 2000-row page are not comparable;
  always stamp data-item count, throttle, cold/warm, machine, branch/commit, UTC.
- **Determinism.** Always inject `instrument-init.js` and run `collect.js` **verbatim** —
  never hand-write the in-page JS per run. Bump versions if you change collected fields.
- **Append-only.** Only `append-row.mjs` writes the doc; it guards the marker. Don't
  hand-edit rows.
- **Serve the production build, not the dev-server.** `webpack serve` (what `npm start` /
  `npm run preview` use here) bundles its HMR/websocket client into the app even in
  production mode — measured over-wire weight was ~24KB vs the real ~7KB gzipped. Always
  `npm run build` then static-serve `dist/` (gzip-capable, e.g. `npx serve`). A 3× weight
  swing from tooling alone makes bake-off rows incomparable.
- **`totalDecodedKB` vs `totalTransferKB`.** Decoded = uncompressed bytes the browser parses
  (the CPU cost). Over-wire = compressed bytes sent (needs a gzipping server, else it equals
  decoded). `transferSize` is 0 for memory-cached resources — expected on warm loads.
- **The "ready" signal is the whole game.** If `timeToDataRenderedMs` comes back null,
  the scenario's `readySignal` doesn't match the page — fix the selector/text, don't
  record a null headline as a result.
