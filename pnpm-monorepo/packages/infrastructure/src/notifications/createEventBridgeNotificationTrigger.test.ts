import { expect, test, vi } from "vitest";
import type { EmitEvents } from "../eventbridge/createEventBridgeEmitter.js";
import { createEventBridgeNotificationTrigger } from "./createEventBridgeNotificationTrigger.js";

test("a deferred send logs a failure instead of giving it to the caller", async () => {
  const failure = new Error("EventBridge is not available");
  const emitEvents = vi.fn<EmitEvents>(async () => {
    throw failure;
  });
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  let deferredSend: (() => Promise<void>) | undefined;
  const notifications = createEventBridgeNotificationTrigger({
    emitEvents,
    source: "App",
    log,
    defer: (send) => {
      deferredSend = send;
    },
  });

  await expect(
    notifications.trigger([{ type: "TaskDeleted", payload: { taskId: "1" } }]),
  ).resolves.toBeUndefined();
  expect(emitEvents).not.toHaveBeenCalled();

  await deferredSend?.();

  expect(emitEvents).toHaveBeenCalledOnce();
  expect(log.error).toHaveBeenCalledExactlyOnceWith(
    "Failed to trigger notifications after the response",
    { types: ["TaskDeleted"], error: failure },
  );
});
