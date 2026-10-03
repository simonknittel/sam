import { logs } from "@opentelemetry/api-logs";
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";
import { log } from ".";

const deferredCallbacks = vi.hoisted((): (() => Promise<void>)[] => []);

vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => {
    deferredCallbacks.push(callback);
  },
}));

vi.mock("@/env", () => ({
  env: {
    NODE_ENV: "production",
    NEXT_PUBLIC_HOST: "sam.example.com",
    ENABLE_INSTRUMENTATION: "true",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.com",
  },
}));

const exporter = new InMemoryLogRecordExporter();

logs.setGlobalLoggerProvider(
  new LoggerProvider({
    processors: [new SimpleLogRecordProcessor({ exporter })],
  }),
);

/** `after()` runs its callbacks after the response. */
const runDeferredCallbacks = async () => {
  await Promise.all(deferredCallbacks.splice(0).map((callback) => callback()));
};

const getConsoleEntry = (consoleMethod: MockInstance<typeof console.error>) =>
  JSON.parse(consoleMethod.mock.calls[0][0] as string) as Record<
    string,
    unknown
  >;

beforeEach(() => {
  exporter.reset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("log", () => {
  test("serializes an error for the console and for OpenTelemetry", async () => {
    const consoleError = vi.spyOn(console, "error").mockReturnValue();

    log.error("Failed to fetch roles", {
      error: new TypeError("Database not reachable"),
      reason: "Timeout",
    });
    await runDeferredCallbacks();

    const expectedError = {
      name: "TypeError",
      message: "Database not reachable",
    };

    const consoleEntry = getConsoleEntry(consoleError);
    expect(consoleEntry).toMatchObject({
      message: "Failed to fetch roles",
      level: "error",
      error: expectedError,
      reason: "Timeout",
    });
    expect(consoleEntry.error).toHaveProperty(
      "stack",
      expect.stringContaining("TypeError: Database not reachable"),
    );

    const [logRecord] = exporter.getFinishedLogRecords();
    expect(logRecord.body).toBe("Failed to fetch roles");
    expect(logRecord.attributes).toMatchObject({
      error: expectedError,
      reason: "Timeout",
    });
    expect(logRecord.attributes.error).toHaveProperty(
      "stack",
      expect.stringContaining("TypeError: Database not reachable"),
    );
  });

  test("takes the timestamp and the stack at the call, not in after()", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockReturnValue();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00.000Z"));

    const callerOfTheLog = () => {
      log.info("Login attempt");
    };
    callerOfTheLog();

    vi.setSystemTime(new Date("2026-10-03T10:00:05.000Z"));
    await runDeferredCallbacks();

    const entry = getConsoleEntry(consoleInfo);
    expect(entry.timestamp).toBe("2026-10-03T10:00:00.000Z");
    expect(entry.stack).toContain("callerOfTheLog");
  });
});
