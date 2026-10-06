import { afterEach, expect, test, vi } from "vitest";
import { log } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

test("keeps the message, the stack and the cause of an error", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = new Error("Outer error", {
    cause: new Error("Inner error"),
  });

  log.error("Job failed", { error, job: "countShips" });

  expect(consoleError).toHaveBeenCalledOnce();
  /** The Lambda runtime writes the entry as JSON */
  const writtenEntry: unknown = JSON.parse(
    JSON.stringify(consoleError.mock.lastCall?.[0]),
  );
  expect(writtenEntry).toEqual({
    message: "Job failed",
    stack: expect.any(String),
    job: "countShips",
    error: expect.objectContaining({
      message: "Outer error",
      stack: expect.stringContaining("Outer error"),
      cause: expect.objectContaining({ message: "Inner error" }),
    }),
  });
});
