#!/usr/bin/env node
//
// Examines the telemetry which the local `otel-collector` container received
// and fails when a span references a parent span that the collector never
// received. Such a span is an orphan: a trace viewer cannot find its parent
// and shows the span at the root of the trace.
//
//   node scripts/check-telemetry-export.mjs
//
// The check gives a lower bound of the losses, not a proof of completeness: a
// lost span which has no exported child leaves no evidence, and a whole trace
// which never arrives is invisible here. Thus also compare the span counts and
// the span names below with a run which you know is good.
//
// See docs/setup-local-machine.md for the setup and for how to begin a clean
// measurement.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CHECKOUT = resolve(fileURLToPath(import.meta.url), "../..");
const MAXIMUM_LISTED_ENTRIES = 15;
const SHORTENED_IDENTIFIER_LENGTH = 12;

const copyFromContainer = (fileName, targetDirectory) => {
  try {
    execFileSync(
      "docker",
      [
        "compose",
        "cp",
        `otel-collector:/output/${fileName}`,
        join(targetDirectory, fileName),
      ],
      { cwd: CHECKOUT, stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch {
    return null;
  }

  return join(targetDirectory, fileName);
};

/** One line per received OTLP request; the last line can still be incomplete. */
const readJsonLines = (path) => {
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  return lines.flatMap((line, index) => {
    try {
      return [JSON.parse(line)];
    } catch (error) {
      if (index === lines.length - 1) return [];
      throw error;
    }
  });
};

const collectSpans = (requests) =>
  requests.flatMap((request) =>
    (request.resourceSpans ?? []).flatMap((resourceSpan) =>
      (resourceSpan.scopeSpans ?? []).flatMap((scopeSpan) =>
        (scopeSpan.spans ?? []).map((span) => ({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId || null,
          name: span.name,
        })),
      ),
    ),
  );

const collectLogRecords = (requests) =>
  requests.flatMap((request) =>
    (request.resourceLogs ?? []).flatMap((resourceLog) =>
      (resourceLog.scopeLogs ?? []).flatMap(
        (scopeLog) => scopeLog.logRecords ?? [],
      ),
    ),
  );

const shorten = (identifier) =>
  identifier.slice(0, SHORTENED_IDENTIFIER_LENGTH) + "…";

const countByName = (spans) => {
  const counts = new Map();
  for (const span of spans)
    counts.set(span.name, (counts.get(span.name) ?? 0) + 1);
  return [...counts].sort(([, first], [, second]) => second - first);
};

/** Prints the traces and their span names, and returns the orphans. */
const reportSpans = (spans) => {
  const traces = Map.groupBy(spans, (span) => span.traceId);
  const orphans = [];

  console.log(`${spans.length} spans in ${traces.size} traces\n`);

  for (const [traceId, traceSpans] of traces) {
    const spanIds = new Set(traceSpans.map((span) => span.spanId));
    const traceOrphans = traceSpans.filter(
      (span) => span.parentSpanId && !spanIds.has(span.parentSpanId),
    );
    orphans.push(...traceOrphans);

    const roots = traceSpans
      .filter((span) => !span.parentSpanId)
      .map((span) => span.name);

    console.log(
      `  ${shorten(traceId)}  ${String(traceSpans.length).padStart(4)} spans  ` +
        `${String(traceOrphans.length).padStart(3)} orphans  ` +
        `root: ${roots.join(", ") || "none"}`,
    );
  }

  console.log("\nSpan names");
  for (const [name, count] of countByName(spans))
    console.log(`  ${String(count).padStart(4)}  ${name}`);

  return orphans;
};

const reportVerdict = (orphans) => {
  if (orphans.length === 0) {
    console.log("\nOK: every span parent is present in its trace.");
    return 0;
  }

  console.error(
    `\nFAIL: ${orphans.length} spans reference a parent which the collector never received.`,
  );
  for (const orphan of orphans.slice(0, MAXIMUM_LISTED_ENTRIES))
    console.error(
      `  ${orphan.name} (${shorten(orphan.spanId)}) misses parent ${shorten(orphan.parentSpanId)}`,
    );
  if (orphans.length > MAXIMUM_LISTED_ENTRIES)
    console.error(`  … and ${orphans.length - MAXIMUM_LISTED_ENTRIES} more`);
  console.error(
    "\nA few spans of the framework end after the response and leave the app " +
      "with the next scheduled batch. Thus run the check a second time some " +
      "seconds later. An orphan which is still there is a lost span.",
  );
  return 1;
};

const reportLogRecords = (logsPath) => {
  const logRecords = collectLogRecords(readJsonLines(logsPath));
  console.log(`\n${logRecords.length} log records`);

  for (const logRecord of logRecords.slice(0, MAXIMUM_LISTED_ENTRIES))
    console.log(
      `  ${logRecord.severityText ?? "?"}  ${logRecord.body?.stringValue ?? ""}`,
    );
  if (logRecords.length > MAXIMUM_LISTED_ENTRIES)
    console.log(`  … and ${logRecords.length - MAXIMUM_LISTED_ENTRIES} more`);
};

const temporaryDirectory = mkdtempSync(join(tmpdir(), "sam-telemetry-"));

try {
  const tracesPath = copyFromContainer("traces.jsonl", temporaryDirectory);

  const spans = tracesPath ? collectSpans(readJsonLines(tracesPath)) : [];

  if (spans.length === 0) {
    console.error(
      "The collector received no spans. Is the container running, and does the app send spans (see docs/setup-local-machine.md)?",
    );
    process.exitCode = 1;
  } else {
    const orphans = reportSpans(spans);

    const logsPath = copyFromContainer("logs.jsonl", temporaryDirectory);
    if (logsPath) reportLogRecords(logsPath);

    process.exitCode = reportVerdict(orphans);
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
