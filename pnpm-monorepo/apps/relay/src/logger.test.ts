import { expect, test } from "vitest";
import { createJsonLogger } from "./logger.js";

test("an error of the database client loses its message in the log", () => {
  const lines: string[] = [];
  const log = createJsonLogger((line) => lines.push(line));
  const databaseError = Object.assign(
    new Error("Unique constraint failed on the raw line <Join PU> player"),
    { name: "PrismaClientKnownRequestError", code: "P2002" },
  );

  log.error("An upload failed", {
    error: databaseError,
    other: new Error("The realtime server cannot be reached"),
  });

  expect(lines).toHaveLength(1);
  const record = JSON.parse(lines[0] ?? "") as Record<string, unknown>;
  expect(record).toMatchObject({
    level: "error",
    message: "An upload failed",
    error: { name: "PrismaClientKnownRequestError", code: "P2002" },
    other: { name: "Error", message: "The realtime server cannot be reached" },
  });
  expect(record.error).not.toHaveProperty("message");
  expect(lines[0]).not.toContain("<Join PU>");
});
