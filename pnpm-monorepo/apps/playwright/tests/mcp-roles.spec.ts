import { createMcpCitizen, createRole } from "../fixtures/factories";
import {
  callForContent,
  callForError,
  NOT_FOUND_RESULT,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

test.describe("the role tools of the MCP server", () => {
  test("list_roles gives only the roles with otherRole;read for their id, and get_role does not find a hidden role", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const scout = await prisma.role.create({
      data: { name: "Aufklärer", description: "**Späher**", maxLevel: 3 },
    });
    const salvage = await createRole(prisma, { name: "Bergung" });
    const command = await prisma.role.create({
      data: {
        name: "Kommando",
        inherits: { connect: [{ id: scout.id }, { id: salvage.id }] },
      },
    });
    const viewer = await createMcpCitizen(prisma, {
      handle: "mcp-rollen-betrachter",
      permissionStrings: [
        `otherRole;read;roleId=${command.id}`,
        `otherRole;read;roleId=${scout.id}`,
      ],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(viewer.user)).accessToken,
    );

    const toolNames = await client.listToolNames();
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "get_permission_catalog",
        "get_role",
        "list_roles",
      ]),
    );
    for (const managerToolName of ["change_role_permissions", "update_role"])
      expect(toolNames).not.toContain(managerToolName);

    // The own role of the viewer and the role "Bergung" are hidden, also as
    // an inherited role
    expect(await callForContent(client, "list_roles")).toEqual({
      roles: [
        {
          id: scout.id,
          name: "Aufklärer",
          description: "**Späher**",
          icon_url: null,
          max_level: 3,
          inherited_role_ids: [],
        },
        {
          id: command.id,
          name: "Kommando",
          description: null,
          icon_url: null,
          max_level: null,
          inherited_role_ids: [scout.id],
        },
      ],
      next_cursor: null,
    });

    const firstPage = await callForContent(client, "list_roles", { limit: 1 });
    expect(firstPage).toMatchObject({
      roles: [{ id: scout.id }],
      next_cursor: scout.id,
    });
    expect(
      await callForContent(client, "list_roles", {
        limit: 1,
        cursor: firstPage.next_cursor,
      }),
    ).toMatchObject({ roles: [{ id: command.id }], next_cursor: null });

    expect(
      await callForContent(client, "list_roles", { query: "KOMM" }),
    ).toMatchObject({ roles: [{ id: command.id }] });

    expect(
      await callForError(client, "get_role", { role_id: salvage.id }),
    ).toMatch(NOT_FOUND_RESULT);
  });

  test("get_role gives the inactivity rules and the permission strings only with role;manage", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const logistics = await createRole(prisma, {
      name: "Logistik",
      permissionStrings: ["ship;read", "event;read"],
    });
    await prisma.role.update({
      where: { id: logistics.id },
      data: { maxAgeDays: 30 },
    });
    const reader = await createMcpCitizen(prisma, {
      handle: "mcp-rollen-leser",
      permissionStrings: [`otherRole;read;roleId=${logistics.id}`],
    });
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-rollen-verwalter",
      permissionStrings: [
        "role;manage",
        `otherRole;read;roleId=${logistics.id}`,
      ],
    });
    const expectedRole = {
      id: logistics.id,
      name: "Logistik",
      description: null,
      icon_url: null,
      max_level: null,
      inherited_role_ids: [],
    };

    const readerClient = await connectMcpClient(
      (await authorizeMcpClient(reader.user)).accessToken,
    );
    expect(
      await callForContent(readerClient, "get_role", {
        role_id: logistics.id,
      }),
    ).toEqual({
      ...expectedRole,
      max_age_days: null,
      assign_after_inactive_days: null,
      permission_strings: null,
    });

    const managerClient = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );
    expect(
      await callForContent(managerClient, "get_role", {
        role_id: logistics.id,
      }),
    ).toEqual({
      ...expectedRole,
      max_age_days: 30,
      assign_after_inactive_days: null,
      permission_strings: ["event;read", "ship;read"],
    });
  });

  test("change_role_permissions adds strings of the catalog and rules, removes any string and writes one audit event per change", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const logistics = await createRole(prisma, {
      name: "Logistik",
      // The catalog does not have legacy;read
      permissionStrings: ["event;read", "legacy;read", "ship;manage"],
    });
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-rollen-verwalter",
      permissionStrings: ["role;manage"],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );
    const roleRule = `otherRole;read;roleId=${logistics.id}`;

    // The role has ship;manage already and does not have wiki;read
    expect(
      await callForContent(client, "change_role_permissions", {
        role_id: logistics.id,
        add: ["task;read", "ship;manage", roleRule],
        remove: ["event;read", "legacy;read", "wiki;read"],
      }),
    ).toEqual({
      role_id: logistics.id,
      permission_strings: [roleRule, "ship;manage", "task;read"],
      added: [roleRule, "task;read"],
      removed: ["event;read", "legacy;read"],
    });

    expect(
      await prisma.permissionString.findMany({
        where: { roleId: logistics.id },
        select: { permissionString: true },
        orderBy: { permissionString: "asc" },
      }),
    ).toEqual([
      { permissionString: roleRule },
      { permissionString: "ship;manage" },
      { permissionString: "task;read" },
    ]);

    const toggledEvent = (permissionString: string, enabled: boolean) => ({
      createdById: manager.user.id,
      data: { roleId: logistics.id, permissionString, enabled },
      triggeredViaMcp: true,
    });
    const auditEvents = await prisma.auditEvent.findMany({
      where: { type: "ROLE_PERMISSION_TOGGLED" },
      select: { createdById: true, data: true, triggeredViaMcp: true },
    });
    expect(auditEvents).toHaveLength(4);
    expect(auditEvents).toEqual(
      expect.arrayContaining([
        toggledEvent(roleRule, true),
        toggledEvent("task;read", true),
        toggledEvent("event;read", false),
        toggledEvent("legacy;read", false),
      ]),
    );

    expect(
      await callForError(client, "change_role_permissions", {
        role_id: logistics.id,
        add: ["citizen;reed"],
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(client, "change_role_permissions", {
        role_id: logistics.id,
        add: ["task;manage"],
        remove: ["task;manage"],
      }),
    ).toMatch(VALIDATION_RESULT);
  });

  test("get_permission_catalog gives the permissions of the role page with their texts", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    // The catalog needs no permission besides mcp;use
    const member = await createMcpCitizen(prisma, {
      handle: "mcp-rollen-mitglied",
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(member.user)).accessToken,
    );

    const { permissions } = await callForContent(
      client,
      "get_permission_catalog",
    );
    expect(permissions).toContainEqual({
      permission_string: "task;read;taskDeleted=1",
      section: "Tasks",
      title: "Lesen - Gelöschte",
      description:
        "Citizen mit dieser Berechtigung können gelöschte Tasks lesen.",
    });
    expect(permissions).toContainEqual({
      permission_string: "citizen;delete",
      section: "Citizen",
      title: "Citizen löschen",
      description: null,
    });
  });

  test("update_role changes only the given fields and refuses the name of a different role", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const logistics = await prisma.role.create({
      data: {
        name: "Logistik",
        description: "Transporte",
        maxAgeDays: 30,
        maxLevel: 3,
      },
    });
    await createRole(prisma, { name: "Bergung" });
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-rollen-verwalter",
      permissionStrings: ["role;manage"],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );

    expect(
      await callForContent(client, "update_role", {
        role_id: logistics.id,
        name: "Logistik und Handel",
        description: null,
        max_level: 5,
      }),
    ).toEqual({
      id: logistics.id,
      name: "Logistik und Handel",
      description: null,
      max_age_days: 30,
      assign_after_inactive_days: null,
      max_level: 5,
    });

    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "ROLE_UPDATED_V4" },
        select: { createdById: true, data: true, triggeredViaMcp: true },
      }),
    ).toEqual({
      createdById: manager.user.id,
      data: {
        roleId: logistics.id,
        previousName: "Logistik",
        newName: "Logistik und Handel",
        previousMaxAgeDays: 30,
        newMaxAgeDays: 30,
        previousAssignAfterInactiveDays: null,
        newAssignAfterInactiveDays: null,
        previousDescription: "Transporte",
        newDescription: null,
        previousMaxLevel: 3,
        newMaxLevel: 5,
      },
      triggeredViaMcp: true,
    });

    expect(
      await callForError(client, "update_role", {
        role_id: logistics.id,
        name: "Bergung",
      }),
    ).toMatch(VALIDATION_RESULT);
  });
});
