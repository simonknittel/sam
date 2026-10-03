import { prisma, type Prisma } from "@sam-monorepo/database";
import { vi } from "vitest";

/**
 * Shorter than the time limit of an interactive Prisma transaction (5
 * seconds): the transaction that holds the lock commits after the wait.
 */
const LOCK_WAIT_TIMEOUT_MILLISECONDS = 3_000;
const POLL_INTERVAL_MILLISECONDS = 10;

/**
 * Waits until a session of the test database waits for a lock. The test
 * files run one after the other, thus no other test takes locks at the same
 * time.
 */
const waitForLockWait = () =>
  vi.waitFor(
    async () => {
      const [waiting] = await prisma.$queryRaw<{ count: number }[]>`
        SELECT count(*)::integer AS "count" FROM pg_locks WHERE NOT "granted"
      `;
      if (!waiting?.count) throw new Error("No session waits for a lock yet");
    },
    {
      timeout: LOCK_WAIT_TIMEOUT_MILLISECONDS,
      interval: POLL_INTERVAL_MILLISECONDS,
    },
  );

/**
 * Runs `lockHolder` in a transaction and keeps the transaction open. Then it
 * starts `contender`, and the transaction of `lockHolder` commits only when
 * a session waits for a lock. Thus the order is certain: `contender` waits
 * for the locks of `lockHolder` and continues after its commit.
 */
export const runAgainstLockHolder = async <LockHolderResult, ContenderResult>(
  lockHolder: (
    transaction: Prisma.TransactionClient,
  ) => Promise<LockHolderResult>,
  contender: () => Promise<ContenderResult>,
) => {
  const { promise: lockHolderMayCommit, resolve: commitLockHolder } =
    Promise.withResolvers<void>();
  const { promise: locksTaken, resolve: signalLocksTaken } =
    Promise.withResolvers<void>();

  const lockHolderRun = prisma.$transaction(async (transaction) => {
    const result = await lockHolder(transaction);
    signalLocksTaken();
    await lockHolderMayCommit;
    return result;
  });
  /** The race ends the wait also when `lockHolder` fails */
  await Promise.race([locksTaken, lockHolderRun]);

  const contenderRun = contender();
  const lockWait = waitForLockWait().finally(commitLockHolder);

  const [lockHolderResult, contenderResult] = await Promise.all([
    lockHolderRun,
    contenderRun,
    lockWait,
  ]);
  return [lockHolderResult, contenderResult] as const;
};
