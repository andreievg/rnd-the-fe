#!/usr/bin/env node
// heap-size.mjs — turn a .heapsnapshot into a "live MB" number.
//
// A V8 .heapsnapshot is a large JSON file. The honest "how much memory is the
// page actually holding" number is the sum of the `self_size` of every node
// (in bytes). We parse the node array + meta to compute that without loading
// the whole graph, and report MB.
//
// The .heapsnapshot itself is intentionally large and is GITIGNORED — store it
// out of git (see .gitignore: perf-snapshots/). This script only emits a number
// that the skill folds into the results row (heapSnapshotMB column).
//
// Usage:
//   node heap-size.mjs path/to/snapshot.heapsnapshot
//   -> prints the live size in MB (one number) to stdout
//
// Exit non-zero with a message if the file is missing or not a heapsnapshot.

import { readFileSync, existsSync } from "node:fs";

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("ERROR: usage: node heap-size.mjs <snapshot.heapsnapshot>");
    process.exit(2);
  }
  if (!existsSync(file)) {
    console.error(`ERROR: file not found: ${file}`);
    process.exit(2);
  }

  let snap;
  try {
    snap = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error("ERROR: could not parse snapshot as JSON: " + e.message);
    process.exit(2);
  }

  if (!snap.snapshot || !snap.snapshot.meta || !Array.isArray(snap.nodes)) {
    console.error("ERROR: this does not look like a V8 .heapsnapshot (missing snapshot.meta / nodes).");
    process.exit(2);
  }

  const fields = snap.snapshot.meta.node_fields;
  const fieldCount = fields.length;
  const selfSizeIdx = fields.indexOf("self_size");
  if (selfSizeIdx === -1) {
    console.error("ERROR: snapshot meta has no self_size field.");
    process.exit(2);
  }

  // nodes is a flat array: [field0_node0, field1_node0, ..., field0_node1, ...]
  const nodes = snap.nodes;
  let totalBytes = 0;
  for (let i = selfSizeIdx; i < nodes.length; i += fieldCount) {
    totalBytes += nodes[i];
  }

  const mb = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
  // print just the number so the skill can capture it directly
  console.log(mb);
}

main();
