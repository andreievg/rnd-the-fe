// collect.js — perf-measure deterministic in-page collector v6
//
// READ VERBATIM AND EVALUATED IN THE PAGE BY THE SKILL ONCE THE PAGE IS READY
// (or once the network has gone quiet). Returns the FIXED metric set as a JSON
// object. Do NOT hand-edit per run — that is the whole point of versioning this.
//
// COLLECTOR_VERSION is stamped onto every result and into the results doc.
// Bump it (and instrument-init.js `version`) whenever you change WHAT is
// collected, so rows produced by different code are distinguishable.
//
// Reads window.__perf (installed by instrument-init.js) plus the standard
// Navigation Timing / Paint / Layout-Shift APIs.
//
// Usage from the skill (chrome-devtools evaluate_script):
//   const json = await evaluate_script(<contents of this file wrapped to return collectPerf(opts)>)
// The skill passes opts = { dataRequestUrlPattern, dataItemCountSelector }.
(function () {
  const COLLECTOR_VERSION = 6;

  function collectPerf(opts) {
    opts = opts || {};
    const perf = window.__perf || {};
    const out = { collectorVersion: COLLECTOR_VERSION };

    // ----- navigation timing baseline ----------------------------------------
    const navEntry = (performance.getEntriesByType("navigation") || [])[0] || null;

    // TTFB: responseStart relative to nav start
    out.ttfbMs = navEntry ? round(navEntry.responseStart) : null;
    // load event end (reference only — NOT the headline)
    out.loadEventMs = navEntry && navEntry.loadEventEnd ? round(navEntry.loadEventEnd) : null;

    // ----- paint / LCP (reference only) --------------------------------------
    out.fcpMs = perf.fcpMs != null ? round(perf.fcpMs) : firstContentfulFromBuffer();
    // LCP is frequently null for SPAs (largest content injected after interaction).
    // That is EXPECTED, not an error.
    out.lcpMs = perf.lcpMs != null ? round(perf.lcpMs) : null;

    // ----- CLS (reference) ----------------------------------------------------
    out.cls = cumulativeLayoutShift();

    // ----- HEADLINE: content-based timings -----------------------------------
    // timeToDataRendered: nav start -> "page ready" signal appeared.
    out.timeToDataRenderedMs = perf.readyMs != null ? round(perf.readyMs) : null;
    out.readyMark = perf.readyMark || null; // how we detected ready (selector/text/mark)

    // ----- data requests (filtered by pattern) -------------------------------
    const pattern = opts.dataRequestUrlPattern ? safeRegex(opts.dataRequestUrlPattern) : null;
    const all = perf.requests || [];
    const dataReqs = all.filter(function (r) {
      if (!pattern) return false;
      return pattern.test(r.url);
    });
    const completed = dataReqs.filter(function (r) {
      return r.endMs != null;
    });

    out.dataRequestCount = dataReqs.length;
    out.slowestDataRequestMs = completed.length
      ? round(Math.max.apply(null, completed.map(function (r) { return r.durationMs; })))
      : null;

    // timeToNetworkQuiet: nav start -> last data request settled, PROVIDED no
    // data request was in flight for the trailing quiet window. The skill is
    // responsible for only calling collect() after it has polled inFlight===0
    // for ~500ms; here we report the timestamp of the last settled data req.
    out.timeToNetworkQuietMs = completed.length
      ? round(Math.max.apply(null, completed.map(function (r) { return r.endMs; })))
      : null;
    out.dataInFlightAtCollect = perf.inFlight || 0;

    // ----- data item count ----------------------------------------------------
    out.dataItemCount = null;
    if (opts.dataItemCountSelector) {
      try {
        out.dataItemCount = document.querySelectorAll(opts.dataItemCountSelector).length;
      } catch (e) {
        out.dataItemCount = null;
      }
    }

    // ----- memory -------------------------------------------------------------
    // performance.memory is Chromium-only and requires the page to be measured
    // in a context where it is exposed. Null elsewhere — that's fine.
    out.jsHeapUsedMB =
      performance.memory && performance.memory.usedJSHeapSize
        ? round(performance.memory.usedJSHeapSize / (1024 * 1024), 2)
        : null;

    // ----- page weight --------------------------------------------------------
    out.domNodeCount = document.getElementsByTagName("*").length;

    const resources = performance.getEntriesByType("resource") || [];
    out.requestCount = resources.length + (navEntry ? 1 : 0);
    let decoded = 0;
    let transfer = 0;
    resources.forEach(function (r) {
      // decodedBodySize is the UNCOMPRESSED bytes the browser parses/executes;
      // transferSize is the OVER-THE-WIRE bytes (compressed + headers).
      decoded += r.decodedBodySize || r.transferSize || 0;
      transfer += r.transferSize || 0;
    });
    if (navEntry) {
      decoded += navEntry.decodedBodySize || navEntry.transferSize || 0;
      transfer += navEntry.transferSize || 0;
    }
    out.totalDecodedKB = round(decoded / 1024, 1);
    // over-the-wire size; will read ~0 for memory-cached resources (transferSize
    // is 0 on a cache hit) — that's correct, nothing crossed the network.
    out.totalTransferKB = round(transfer / 1024, 1);

    return out;
  }

  // ----- helpers --------------------------------------------------------------
  function round(n, dp) {
    if (n == null || isNaN(n)) return null;
    const f = Math.pow(10, dp || 0);
    return Math.round(n * f) / f;
  }
  function firstContentfulFromBuffer() {
    const paints = performance.getEntriesByType("paint") || [];
    const fcp = paints.filter(function (p) { return p.name === "first-contentful-paint"; })[0];
    return fcp ? round(fcp.startTime) : null;
  }
  function cumulativeLayoutShift() {
    try {
      const shifts = performance.getEntriesByType("layout-shift") || [];
      let cls = 0;
      shifts.forEach(function (s) {
        if (!s.hadRecentInput) cls += s.value;
      });
      return round(cls, 4);
    } catch (e) {
      return null;
    }
  }
  function safeRegex(src) {
    try {
      return new RegExp(src);
    } catch (e) {
      return null;
    }
  }

  // expose for the skill to call
  window.__collectPerf = collectPerf;
  return collectPerf;
})();
