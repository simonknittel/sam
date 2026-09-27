import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import { truncateAllTables } from "../../test/database";
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
