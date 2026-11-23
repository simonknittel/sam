import { expect, test, vi } from "vitest";
import type { PusherClient } from "./createPusherClient.js";
import { createPusherRealtimeServer } from "./createPusherRealtimeServer.js";

const createEvents = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    citizenId: `citizen-${index}`,
    name: "test-event",
    data: { index },
  }));

test("sends the events in batches to the private channels of the citizens, and throws after all batches when one failed", async () => {
  const triggerBatch = vi
    .fn<PusherClient["triggerBatch"]>()
    .mockRejectedValueOnce(new Error("The realtime server refused the batch"))
    .mockResolvedValue(new Response(null) as never);
  const realtime = createPusherRealtimeServer({
    client: { triggerBatch } as unknown as PusherClient,
  });

  await expect(realtime.publishToCitizens(createEvents(12))).rejects.toThrow(
    "refused 1 of 2 batches",
  );

  expect(triggerBatch.mock.calls.map(([batch]) => batch.length)).toEqual([
    10, 2,
  ]);
  expect(triggerBatch.mock.calls[1]?.[0]).toEqual([
    {
      channel: "private-citizen-citizen-10",
      name: "test-event",
      data: JSON.stringify({ index: 10 }),
    },
    {
      channel: "private-citizen-citizen-11",
      name: "test-event",
      data: JSON.stringify({ index: 11 }),
    },
  ]);
});
