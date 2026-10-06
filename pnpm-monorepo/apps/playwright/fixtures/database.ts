import { Prisma, type PrismaClient } from "@sam-monorepo/database/client";
import { ACTION_FEEDBACK_TIMEOUT } from "./interactions";
import { expect } from "./test";

/** The statements of the database of the worker that wait for a lock */
export const countLockWaits = async (prisma: PrismaClient) => {
  const waits = await prisma.$queryRaw<{ count: number }[]>`
    SELECT count(*)::int AS "count"
    FROM pg_stat_activity
    WHERE "datname" = current_database() AND "wait_event_type" = 'Lock'
  `;
  return waits[0]?.count;
};

/** The types of locks in `pg_locks` that a test can wait for */
export enum LockType {
  /** For example the lock of the wiki page tree */
  Advisory = "advisory",
}

/**
 * Starts the change of a different user in a transaction that stays open
 * until the test commits it. Until the commit, the app does not see the
 * change, and a write of the app to a row of the change waits for it.
 *
 * @param beforeCommit More statements of the change. They run when the test
 * calls `commit`, before the commit. For example a write that waits for a
 * lock that the app holds.
 */
export const startParallelChange = async <Result>(
  prisma: PrismaClient,
  change: (transaction: Prisma.TransactionClient) => Promise<Result>,
  beforeCommit?: (transaction: Prisma.TransactionClient) => Promise<unknown>,
) => {
  const { promise: canCommit, resolve: allowCommit } =
    Promise.withResolvers<void>();
  const { promise: changeIsDone, resolve: signalChange } =
    Promise.withResolvers<{ sessionId: number; result: Result }>();
  const parallelTransaction = prisma.$transaction(
    async (transaction) => {
      const result = await change(transaction);

      const [session] = await transaction.$queryRaw<{ id: number }[]>`
        SELECT pg_backend_pid() AS "id"
      `;
      signalChange({ sessionId: session!.id, result });
      await canCommit;
      await beforeCommit?.(transaction);
    },
    /** Longer than the click and the poll of a test, which wait for the lock */
    { timeout: ACTION_FEEDBACK_TIMEOUT * 2 },
  );

  /** The race ends the wait also when the change fails */
  const { sessionId, result } = await Promise.race([
    changeIsDone,
    parallelTransaction.then(() => {
      throw new Error("The parallel change ended before its commit");
    }),
  ]);

  return {
    /** The result of the change, for example the row that it created */
    result,
    /**
     * Waits until a statement of the app waits for a lock of the change.
     * With a lock type, only a wait for a lock of that type counts.
     */
    waitForBlockedStatement: (lockType?: LockType) =>
      expect
        .poll(async () => {
          const waitingLocks = await prisma.$queryRaw<{ count: number }[]>`
            SELECT count(*)::int AS "count"
            FROM pg_locks
            WHERE NOT "granted"
              AND ${sessionId}::int = ANY(pg_blocking_pids("pid"))
              ${lockType ? Prisma.sql`AND "locktype" = ${lockType}` : Prisma.empty}
          `;
          return waitingLocks[0]?.count;
        })
        .toBe(1),
    /** Runs `beforeCommit`, if there is one, and commits the change */
    commit: async () => {
      allowCommit();
      await parallelTransaction;
    },
  };
};
