#!/usr/bin/env node
//
// Examines the telemetry which the local `otel-collector` container received
// (see docs/setup-local-machine.md) and fails when a span references a parent
// span that the collector never received. Such a span is an orphan: a trace
// viewer cannot find its parent and shows the span at the root of the trace.
//
//   node scripts/check-telemetry-export.mjs [--file <path>]
//
// Without --file, the script copies the files out of the container of the
// checkout it belongs to. Restart the container to begin a clean measurement:
// `docker compose restart otel-collector`.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CHECKOUT = resolve(fileURLToPath(import.meta.url), "../..");
const CONTAINER_OUTPUT_DIRECTORY = "/output";
const MAXIMUM_LISTED_ORPHANS = 15;
const SHORTENED_IDENTIFIER_LENGTH = 12;

const copyFromContainer = (fileName, targetDirectory) => {
  try {
    execFileSync(
      "docker",
      [
        "compose",
        "cp",
        `otel-collector:${CONTAINER_OUTPUT_DIRECTORY}/${fileName}`,
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

const groupByTrace = (spans) => {
  const traces = new Map();

  for (const span of spans) {
    const trace = traces.get(span.traceId) ?? [];
    trace.push(span);
    traces.set(span.traceId, trace);
  }

  return traces;
};

const shorten = (identifier) =>
  identifier.slice(0, SHORTENED_IDENTIFIER_LENGTH) + "…";

const countByName = (spans) => {
  const counts = new Map();
  for (const span of spans)
    counts.set(span.name, (counts.get(span.name) ?? 0) + 1);
  return [...counts].sort(([, first], [, second]) => second - first);
};

const fileArgumentIndex = process.argv.indexOf("--file");
const temporaryDirectory =
  fileArgumentIndex === -1
    ? mkdtempSync(join(tmpdir(), "sam-telemetry-"))
    : null;

try {
  const tracesPath =
    fileArgumentIndex === -1
      ? copyFromContainer("traces.jsonl", temporaryDirectory)
      : process.argv[fileArgumentIndex + 1];

  if (!tracesPath) {
    console.error(
      "No traces.jsonl in the otel-collector container. Is the container running, and does the app send spans (ENABLE_INSTRUMENTATION, OTEL_EXPORTER_OTLP_* in the .env of the app)?",
    );
    process.exit(1);
  }

  const spans = collectSpans(readJsonLines(tracesPath));

  if (spans.length === 0) {
    console.error("The collector received no spans.");
    process.exit(1);
  }

  const traces = groupByTrace(spans);
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

  const logsPath =
    fileArgumentIndex === -1
      ? copyFromContainer("logs.jsonl", temporaryDirectory)
      : null;
  if (logsPath) {
    const logRecords = collectLogRecords(readJsonLines(logsPath));
    console.log(`\n${logRecords.length} log records`);
    for (const logRecord of logRecords)
      console.log(
        `  ${logRecord.severityText ?? "?"}  ${logRecord.body?.stringValue ?? ""}`,
      );
  }

  if (orphans.length === 0) {
    console.log("\nOK: every span parent is present in its trace.");
    process.exit(0);
  }

  console.error(
    `\nFAIL: ${orphans.length} spans reference a parent which the collector never received.`,
  );
  for (const orphan of orphans.slice(0, MAXIMUM_LISTED_ORPHANS))
    console.error(
      `  ${orphan.name} (${shorten(orphan.spanId)}) misses parent ${shorten(orphan.parentSpanId)}`,
    );
  if (orphans.length > MAXIMUM_LISTED_ORPHANS)
    console.error(`  … and ${orphans.length - MAXIMUM_LISTED_ORPHANS} more`);
  console.error(
    "\nA few spans of the framework end after the response, thus they leave " +
      "the app with the next scheduled batch. Wait some seconds after the " +
      "last request, then run the check again.",
  );
  process.exit(1);
} finally {
  if (temporaryDirectory)
    rmSync(temporaryDirectory, { recursive: true, force: true });
}
