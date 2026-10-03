import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import { truncateAllTables } from "../../test/database";
import { autoAssignInactiveRoles } from "./autoAssignInactiveRoles";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVE_DAYS = 60;

const daysAgo = (days: number) => new Date(Date.now() - days * ONE_DAY_MS);

beforeEach(async () => {
  await truncateAllTables();
  await prisma.role.create({
    data: { name: "Reserve", assignAfterInactiveDays: INACTIVE_DAYS },
  });
});

test("assigns the role to inactive citizens with a login only", async () => {
  const inactive = await prisma.citizen.create({
    data: {
      handle: "inactive",
      user: { create: { lastSeenAt: daysAgo(INACTIVE_DAYS + 1) } },
    },
  });
  const active = await prisma.citizen.create({
    data: {
      handle: "active",
      user: { create: { lastSeenAt: daysAgo(1) } },
    },
  });
  const withoutLogin = await prisma.citizen.create({
    data: { handle: "without-login" },
  });

  await autoAssignInactiveRoles();

  const assignments = await prisma.roleAssignment.findMany({
    select: { citizenId: true },
  });
  expect(assignments.map(({ citizenId }) => citizenId)).toEqual([inactive.id]);
  expect(
    await prisma.roleAssignmentChange.count({
      where: { citizenId: { in: [active.id, withoutLogin.id] } },
    }),
  ).toBe(0);
  expect(
    await prisma.auditEvent.findMany({
      where: { type: AuditEventType.ROLE_AUTO_ASSIGNED },
      select: { data: true },
    }),
  ).toEqual([
    {
      data: {
        citizenId: inactive.id,
        citizenHandle: "inactive",
        roleId: expect.any(String),
        roleName: "Reserve",
      },
    },
  ]);
});

test("a second run adds no second history row", async () => {
  await prisma.citizen.create({
    data: {
      handle: "inactive",
      user: { create: { lastSeenAt: daysAgo(INACTIVE_DAYS + 1) } },
    },
  });

  await autoAssignInactiveRoles();
  await autoAssignInactiveRoles();

  expect(await prisma.roleAssignment.count()).toBe(1);
  expect(await prisma.roleAssignmentChange.count()).toBe(1);
});
