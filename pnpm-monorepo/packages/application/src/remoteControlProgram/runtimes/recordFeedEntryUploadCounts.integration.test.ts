import { AuditEventType, CapabilityId } from "@sam-monorepo/domain";
import { expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { recordFeedEntryUploadCounts } from "./recordFeedEntryUploadCounts.js";

const RUNTIME_ID = "0b6f1d3e-2a4c-4e8f-9a1b-3c5d7e9f1a2b";
const PERIOD_ENDED_AT = new Date(TEST_NOW.getTime() + 60 * 60 * 1000);

test("writes the counts of a connection into the system log, but no event without uploads", async () => {
  // The owner lost the permission before the connection closed
  const owner = createTestActor({
    userId: "owner-user",
    citizen: { id: "owner-citizen", handle: "owner" },
  });
  const { context, auditEvents } = createTestApplicationContext();
  const period = {
    runtime_id: RUNTIME_ID,
    capability_id: CapabilityId.LogEntries,
    period_started_at: TEST_NOW,
    period_ended_at: PERIOD_ENDED_AT,
  };

  await expect(
    recordFeedEntryUploadCounts(context, owner, {
      ...period,
      counts: {
        newEntryCount: 0,
        duplicateEntryCount: 0,
        refusedEntryCount: 0,
      },
    }),
  ).resolves.toEqual({ isRecorded: false });
  await expect(
    recordFeedEntryUploadCounts(context, owner, {
      ...period,
      counts: {
        newEntryCount: 12,
        duplicateEntryCount: 3,
        refusedEntryCount: 1,
      },
    }),
  ).resolves.toEqual({ isRecorded: true });

  expect(auditEvents).toEqual([
    {
      type: AuditEventType.REMOTE_CONTROL_PROGRAM_FEED_ENTRIES_UPLOADED,
      data: {
        ownerCitizenId: "owner-citizen",
        runtimeId: RUNTIME_ID,
        capabilityId: CapabilityId.LogEntries,
        newEntryCount: 12,
        duplicateEntryCount: 3,
        refusedEntryCount: 1,
        periodStartedAt: TEST_NOW,
        periodEndedAt: PERIOD_ENDED_AT,
      },
      createdById: "owner-user",
    },
  ]);
});
