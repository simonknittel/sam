import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { NotFoundError } from "../errors.js";
import { renameOwnGrant } from "./renameOwnGrant.js";
import { setOwnGrantToolEnabled } from "./setOwnGrantToolEnabled.js";

let ownerId: string;
let otherUserId: string;

const createGrant = (userId: string, revokedAt: Date | null = null) =>
  prisma.oAuthGrant.create({
    data: {
      userId,
      clientId: "https://client.example.com/metadata",
      clientName: "Client",
      redirectHost: "client.example.com",
      scope: "mcp",
      resource: "https://sam.example.com/api/mcp",
      revokedAt,
    },
  });

const createOwnerActor = () =>
  createTestActor({ userId: ownerId, permissionStrings: ["mcp;use"] });

beforeEach(async () => {
  await truncateAllTables();
  ({ id: ownerId } = await prisma.user.create({ data: {} }));
  ({ id: otherUserId } = await prisma.user.create({ data: {} }));
});

test("the user renames an own grant and disables a tool of it", async () => {
  const grant = await createGrant(ownerId);
  const { context, auditEvents } = createTestApplicationContext();

  await renameOwnGrant(context, createOwnerActor(), {
    grant_id: grant.id,
    custom_name: "Laptop",
  });
  await setOwnGrantToolEnabled(context, createOwnerActor(), {
    grant_id: grant.id,
    tool_name: "delete_ship",
    enabled: false,
  });

  expect(
    await prisma.oAuthGrant.findUniqueOrThrow({
      where: { id: grant.id },
      select: {
        customName: true,
        toolSettings: { select: { toolName: true } },
      },
    }),
  ).toEqual({
    customName: "Laptop",
    toolSettings: [{ toolName: "delete_ship" }],
  });
  expect(auditEvents.map((event) => event.type)).toEqual([
    AuditEventType.OAUTH_GRANT_RENAMED,
    AuditEventType.MCP_TOOL_SETTING_UPDATED_V2,
  ]);
});

test("a grant of a different user and a revoked grant do not exist for the user", async () => {
  const grants = [
    await createGrant(otherUserId),
    await createGrant(ownerId, TEST_NOW),
  ];
  const { context, auditEvents } = createTestApplicationContext();

  for (const grant of grants) {
    await expect(
      renameOwnGrant(context, createOwnerActor(), {
        grant_id: grant.id,
        custom_name: "Laptop",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      setOwnGrantToolEnabled(context, createOwnerActor(), {
        grant_id: grant.id,
        tool_name: "delete_ship",
        enabled: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  }

  expect(
    await prisma.oAuthGrant.count({ where: { customName: { not: null } } }),
  ).toBe(0);
  expect(await prisma.mcpToolSetting.count()).toBe(0);
  expect(auditEvents).toEqual([]);
});
