import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import { truncateAllTables } from "../../test/database";
import { runAgainstLockHolder } from "../../test/locks";
import { removeExpiredRoles } from "./removeExpiredRoles";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_DAYS = 30;

const daysAgo = (days: number) => new Date(Date.now() - days * ONE_DAY_MS);

const createAssignment = async ({
  handle,
  lastSeenAt,
  assignedAt,
  withLogin = true,
}: {
  readonly handle: string;
  readonly lastSeenAt: Date | null;
  readonly assignedAt: Date;
  readonly withLogin?: boolean;
}) => {
  const role = await prisma.role.upsert({
    where: { name: "Expiring" },
    create: { name: "Expiring", maxAgeDays: MAX_AGE_DAYS },
    update: {},
  });

  const citizen = await prisma.citizen.create({
    data: {
      handle,
      ...(withLogin ? { user: { create: { lastSeenAt } } } : {}),
      roleAssignments: {
        create: { roleId: role.id, createdAt: assignedAt },
      },
    },
  });

  return citizen;
};

const hasRole = async (citizenId: string) =>
  (await prisma.roleAssignment.count({ where: { citizenId } })) === 1;

beforeEach(async () => {
  await truncateAllTables();
});

test("removes the expired role of an inactive citizen with a login", async () => {
  const citizen = await createAssignment({
    handle: "inactive",
    lastSeenAt: daysAgo(MAX_AGE_DAYS + 5),
    assignedAt: daysAgo(MAX_AGE_DAYS + 10),
  });

  await removeExpiredRoles();

  expect(await hasRole(citizen.id)).toBe(false);
  expect(
    await prisma.roleAssignmentChange.count({
      where: { citizenId: citizen.id, type: "REMOVE" },
    }),
  ).toBe(1);
  expect(
    await prisma.auditEvent.findMany({
      where: { type: AuditEventType.ROLE_AUTO_REMOVED },
      select: { data: true },
    }),
  ).toEqual([
    {
      data: {
        citizenId: citizen.id,
        citizenHandle: "inactive",
        roleId: expect.any(String),
        roleName: "Expiring",
      },
    },
  ]);
});

test("keeps the role of a citizen without a login", async () => {
  const citizen = await createAssignment({
    handle: "no-login",
    lastSeenAt: null,
    assignedAt: daysAgo(MAX_AGE_DAYS + 10),
    withLogin: false,
  });

  await removeExpiredRoles();

  expect(await hasRole(citizen.id)).toBe(true);
});

test("keeps a role that was assigned after the last visit", async () => {
  const citizen = await createAssignment({
    handle: "recently-assigned",
    lastSeenAt: daysAgo(MAX_AGE_DAYS + 70),
    assignedAt: daysAgo(1),
  });

  await removeExpiredRoles();

  expect(await hasRole(citizen.id)).toBe(true);
});

test("keeps the role of an active citizen", async () => {
  const citizen = await createAssignment({
    handle: "active",
    lastSeenAt: daysAgo(1),
    assignedAt: daysAgo(MAX_AGE_DAYS + 10),
  });

  await removeExpiredRoles();

  expect(await hasRole(citizen.id)).toBe(true);
});

test("uses the maximum age of each role", async () => {
  const shortRole = await prisma.role.create({
    data: { name: "Short", maxAgeDays: MAX_AGE_DAYS },
  });
  const longRole = await prisma.role.create({
    data: { name: "Long", maxAgeDays: 3 * MAX_AGE_DAYS },
  });
  const citizen = await prisma.citizen.create({
    data: {
      handle: "two-roles",
      user: { create: { lastSeenAt: daysAgo(2 * MAX_AGE_DAYS) } },
      roleAssignments: {
        create: [shortRole, longRole].map((role) => ({
          roleId: role.id,
          createdAt: daysAgo(4 * MAX_AGE_DAYS),
        })),
      },
    },
  });

  await removeExpiredRoles();

  expect(
    await prisma.roleAssignment.findMany({
      where: { citizenId: citizen.id },
      select: { roleId: true },
    }),
  ).toEqual([{ roleId: longRole.id }]);
});

test("writes no history for a role that a parallel transaction removed first", async () => {
  const citizen = await createAssignment({
    handle: "removed-by-manager",
    lastSeenAt: daysAgo(MAX_AGE_DAYS + 5),
    assignedAt: daysAgo(MAX_AGE_DAYS + 10),
  });

  await runAgainstLockHolder(
    (transaction) =>
      transaction.roleAssignment.deleteMany({
        where: { citizenId: citizen.id },
      }),
    removeExpiredRoles,
  );

  expect(await hasRole(citizen.id)).toBe(false);
  expect(await prisma.roleAssignmentChange.count()).toBe(0);
  expect(
    await prisma.auditEvent.count({
      where: { type: AuditEventType.ROLE_AUTO_REMOVED },
    }),
  ).toBe(0);
});
