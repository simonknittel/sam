import { expect, test } from "vitest";
import { TOOL_CATALOG } from "./catalog.js";

test("each read tool has its own read audit event type, and no write tool has one", () => {
  const readTools = TOOL_CATALOG.filter(
    (tool) => tool.annotations.readOnlyHint,
  );

  expect(
    readTools
      .filter((tool) => !tool.readAuditEventType)
      .map(({ name }) => name),
  ).toEqual([]);
  expect(new Set(readTools.map((tool) => tool.readAuditEventType)).size).toBe(
    readTools.length,
  );
  expect(
    TOOL_CATALOG.filter(
      (tool) => !tool.annotations.readOnlyHint && tool.readAuditEventType,
    ).map(({ name }) => name),
  ).toEqual([]);
});
