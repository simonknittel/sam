import { AuditEventType } from "@sam-monorepo/domain";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createPrismaAuditWriter,
  type PrismaAuditWriterOptions,
} from "./createPrismaAuditWriter.js";

const CALL_TIME = new Date("2026-11-03T12:00:00.000Z");

const createWriter = (
  createMany: () => Promise<unknown>,
  defer?: PrismaAuditWriterOptions["defer"],
) => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const prisma = {
    auditEvent: { createMany: vi.fn(createMany) },
  };
  const writer = createPrismaAuditWriter({
    prisma: prisma as unknown as PrismaAuditWriterOptions["prisma"],
    log,
    defer,
  });

  return { writer, prisma, log };
};

describe("createPrismaAuditWriter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("writes all events in one call", async () => {
    vi.useFakeTimers({ now: CALL_TIME });
    const { writer, prisma } = createWriter(async () => ({ count: 2 }));

    await writer.create([
      {
        type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
        data: { citizenCount: 2 },
      },
      {
        type: AuditEventType.NEW_YEAR_GREETINGS_SENT,
        data: { citizenCount: 3 },
        createdById: "user",
      },
    ]);

    expect(prisma.auditEvent.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [
        {
          type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
          data: { citizenCount: 2 },
          createdAt: CALL_TIME,
          createdById: null,
          triggeredViaMcp: false,
        },
        {
          type: AuditEventType.NEW_YEAR_GREETINGS_SENT,
          data: { citizenCount: 3 },
          createdAt: CALL_TIME,
          createdById: "user",
          triggeredViaMcp: false,
        },
      ],
    });
  });

  test("logs a failed write and does not throw", async () => {
    const failure = new Error("The database is not available");
    const { writer, log } = createWriter(async () => {
      throw failure;
    });

    await expect(
      writer.create([
        {
          type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
          data: { citizenCount: 2 },
        },
      ]),
    ).resolves.toBeUndefined();

    expect(log.error).toHaveBeenCalledExactlyOnceWith(
      "Failed to write audit events",
      { types: AuditEventType.BIRTHDAY_GREETINGS_SENT, error: failure },
    );
  });

  test("a deferred write keeps the time of the call", async () => {
    vi.useFakeTimers({ now: CALL_TIME });
    let deferredWrite: (() => Promise<void>) | undefined;
    const { writer, prisma } = createWriter(
      async () => ({ count: 1 }),
      (write) => {
        deferredWrite = write;
      },
    );

    await writer.create([
      {
        type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
        data: { citizenCount: 2 },
      },
    ]);
    expect(prisma.auditEvent.createMany).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-11-03T12:00:01.000Z"));
    await deferredWrite?.();

    expect(prisma.auditEvent.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [
        {
          type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
          data: { citizenCount: 2 },
          createdAt: CALL_TIME,
          createdById: null,
          triggeredViaMcp: false,
        },
      ],
    });
  });
});
