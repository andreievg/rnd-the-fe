// instrument-init.js  — perf-measure instrumentation v6
//
// THIS FILE IS READ VERBATIM AND INJECTED BEFORE ANY PAGE SCRIPT RUNS
// (chrome-devtools MCP: new_page does not support init scripts directly, so the
// skill injects this via evaluate_script immediately after navigate but the
// observers below are written to also recover buffered entries — see notes).
//
// WHY THIS EXISTS (do not "simplify" away):
//   - Buffered PerformanceObserver entries miss SPA LCP/paint candidates that
//     occur after a client-side route change. A pre-installed observer is the
//     ONLY reliable way to capture them, so we install observers as early as
//     possible and ALSO read buffered entries as a fallback.
//   - The browser `load` event and LCP are NOT trustworthy headline metrics for
//     a client-rendered SPA: on a real app `load` fired at ~441ms while data
//     finished at ~4.2s, missing 16 post-load data calls; LCP was null because
//     the largest content (a table) is injected after first interaction. We
//     therefore time DATA, not the load event.
//
// It exposes window.__perf with everything collect.js needs to read later.
// Version is mirrored in collect.js COLLECTOR_VERSION — bump BOTH together if
// you change what is collected.
(function () {
  "use strict";
  if (window.__perf && window.__perf.__installed) return;

  var perf = (window.__perf = {
    __installed: true,
    version: 6,
    navStart: 0,
    // data-request bookkeeping (fetch + XHR), filtered by URL pattern at read time
    requests: [], // {url, method, startMs, endMs, ok, durationMs, transferBytes}
    inFlight: 0,
    lastActivityMs: 0,
    // paint / LCP observed live
    fcpMs: null,
    lcpMs: null,
    // "page ready" content signal
    readyMs: null,
    readyMark: null, // 'selector' | 'text' | 'performance.mark'
  });

  function nowRel() {
    // ms since navigation start, using the high-res timeline
    return performance.now();
  }

  // ---- paint / LCP observers (installed live; also read buffered) -----------
  try {
    var paintObs = new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        if (e.name === "first-contentful-paint" && perf.fcpMs == null) {
          perf.fcpMs = e.startTime;
        }
      });
    });
    paintObs.observe({ type: "paint", buffered: true });
  } catch (e) {}

  try {
    var lcpObs = new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      if (entries.length) {
        // last entry is the largest so far
        perf.lcpMs = entries[entries.length - 1].startTime;
      }
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {}

  // ---- data-request timing: wrap fetch + XHR --------------------------------
  // We record EVERY request and let collect.js filter by dataRequestUrlPattern,
  // so the pattern can change without re-instrumenting.
  function record(url, method, startMs) {
    var entry = {
      url: String(url),
      method: method || "GET",
      startMs: startMs,
      endMs: null,
      ok: null,
      durationMs: null,
      transferBytes: null,
    };
    perf.requests.push(entry);
    perf.inFlight++;
    return entry;
  }
  function settle(entry, ok, bytes) {
    if (!entry || entry.endMs != null) return;
    entry.endMs = nowRel();
    entry.durationMs = entry.endMs - entry.startMs;
    entry.ok = !!ok;
    entry.transferBytes = typeof bytes === "number" ? bytes : null;
    perf.inFlight = Math.max(0, perf.inFlight - 1);
    perf.lastActivityMs = entry.endMs;
  }

  // Resolve the request URL from any of fetch()'s accepted first-arg forms:
  // a string, a URL object (no .url prop — use its string form), or a Request
  // (has .url). Getting this wrong records "undefined" and the URL-pattern
  // filter silently drops the request (seen with graphql-request / clients that
  // pass a Request or URL instead of a plain string).
  function resolveFetchUrl(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url; // Request
    if (input != null) { try { return String(input); } catch (e) {} }  // URL, etc.
    return "";
  }
  var _fetch = window.fetch;
  if (_fetch) {
    window.fetch = function (input, init) {
      var url = resolveFetchUrl(input);
      var method = (init && init.method) || (input && input.method) || "GET";
      var entry = record(url, method, nowRel());
      var p;
      try {
        p = _fetch.apply(this, arguments);
      } catch (err) {
        settle(entry, false, null);
        throw err;
      }
      return p.then(
        function (res) {
          // clone to measure body size without consuming the stream
          var bytes = null;
          try {
            var cl = res.headers && res.headers.get("content-length");
            if (cl) bytes = parseInt(cl, 10);
          } catch (e) {}
          settle(entry, res.ok, bytes);
          return res;
        },
        function (err) {
          settle(entry, false, null);
          throw err;
        }
      );
    };
  }

  var _open = XMLHttpRequest.prototype.open;
  var _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__perfMethod = method;
    this.__perfUrl = url;
    return _open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    var entry = record(xhr.__perfUrl, xhr.__perfMethod, nowRel());
    function done() {
      var bytes = null;
      try {
        var cl = xhr.getResponseHeader("content-length");
        if (cl) bytes = parseInt(cl, 10);
      } catch (e) {}
      settle(entry, xhr.status >= 200 && xhr.status < 400, bytes);
    }
    xhr.addEventListener("loadend", done);
    return _send.apply(this, arguments);
  };

  // ---- "page ready" content signal ------------------------------------------
  // The skill sets window.__perfReadyConfig = {selector, text} BEFORE the page
  // renders content. We watch the DOM and stamp the first time it matches.
  // Also honors an explicit performance.mark('perf-ready') from the page.
  function checkReady() {
    if (perf.readyMs != null) return true;
    var cfg = window.__perfReadyConfig || {};
    if (cfg.selector) {
      try {
        if (document.querySelector(cfg.selector)) {
          perf.readyMs = nowRel();
          perf.readyMark = "selector";
          return true;
        }
      } catch (e) {}
    }
    if (cfg.text) {
      // Use textContent, NOT innerText: MutationObserver callbacks run as
      // microtasks BEFORE layout flush, and innerText reads layout — it returns
      // "" mid-render and the match is missed. textContent is layout-independent.
      if (document.body && document.body.textContent && document.body.textContent.indexOf(cfg.text) !== -1) {
        perf.readyMs = nowRel();
        perf.readyMark = "text";
        return true;
      }
    }
    return false;
  }

  try {
    var mo = new MutationObserver(function () {
      if (checkReady()) mo.disconnect();
    });
    if (document.documentElement) {
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }
  } catch (e) {}

  // honor an explicit page mark
  try {
    var markObs = new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        if (e.name === "perf-ready" && perf.readyMs == null) {
          perf.readyMs = e.startTime;
          perf.readyMark = "performance.mark";
        }
      });
    });
    markObs.observe({ type: "mark", buffered: true });
  } catch (e) {}

  // in case content was already present at injection time
  checkReady();

  // Fallback: a short rAF/timeout poll. The MutationObserver can miss the exact
  // tick where content lands (microtask vs. layout ordering, batched mutations),
  // so we also re-check after paint for a few frames. checkReady() stamps
  // readyMs only ONCE, so this never overwrites an earlier (more accurate) hit.
  try {
    var polls = 0;
    function poll() {
      if (checkReady() || polls++ > 120) return; // ~2s at 60fps, then give up
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(poll);
      else setTimeout(poll, 16);
    }
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(poll);
    else setTimeout(poll, 16);
  } catch (e) {}
})();
