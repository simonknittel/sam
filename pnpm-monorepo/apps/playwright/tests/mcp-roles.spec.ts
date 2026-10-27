import {
  createMcpCitizen,
  createRole,
  createRoleTag,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  NOT_FOUND_RESULT,
  UNKNOWN_TOOL_ERROR_CODE,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

test.describe("the role tools of the MCP server", () => {
  test("list_roles gives only the roles with otherRole;read for their id with their tags, and get_role does not find a hidden role", async ({
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
    const leadership = await createRoleTag(prisma, {
      name: "Führung",
      roles: [command, salvage],
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
        "list_role_tags",
        "list_roles",
      ]),
    );
    for (const managerToolName of [
      "change_role_permissions",
      "create_role_tag",
      "delete_role_tag",
      "update_role",
      "update_role_tag",
    ])
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
          tags: [],
        },
        {
          id: command.id,
          name: "Kommando",
          description: null,
          icon_url: null,
          max_level: null,
          inherited_role_ids: [scout.id],
          tags: [{ id: leadership.id, name: "Führung" }],
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
    // The tag filter also leaves out the hidden role "Bergung"
    expect(
      await callForContent(client, "list_roles", { tag_id: leadership.id }),
    ).toMatchObject({ roles: [{ id: command.id }], next_cursor: null });

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
      tags: [],
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
      requires_two_factor_authentication: false,
    });
    expect(permissions).toContainEqual({
      permission_string: "citizen;delete",
      section: "Citizen",
      title: "Citizen löschen",
      description: null,
      requires_two_factor_authentication: false,
    });
    expect(permissions).toContainEqual({
      permission_string: "discord-id;delete",
      section: "Citizen",
      title: "Discord ID löschen",
      description: null,
      requires_two_factor_authentication: true,
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

  test("list_role_tags gives only the tags with a visible role without role;manage, and all tags with it", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const command = await createRole(prisma, { name: "Kommando" });
    const salvage = await createRole(prisma, { name: "Bergung" });
    const leadership = await createRoleTag(prisma, {
      name: "Führung",
      description: "Leitende Rollen",
      roles: [command, salvage],
    });
    // Only a hidden role, and no role
    const hiddenOnly = await createRoleTag(prisma, {
      name: "Bergungsdienst",
      roles: [salvage],
    });
    const empty = await createRoleTag(prisma, { name: "Leer" });
    const viewer = await createMcpCitizen(prisma, {
      handle: "mcp-tags-betrachter",
      permissionStrings: [`otherRole;read;roleId=${command.id}`],
    });
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-tags-verwalter",
      permissionStrings: ["role;manage", `otherRole;read;roleId=${command.id}`],
    });

    const viewerClient = await connectMcpClient(
      (await authorizeMcpClient(viewer.user)).accessToken,
    );
    // Without role;manage, the tag tools that change a tag are not visible
    const viewerToolNames = await viewerClient.listToolNames();
    expect(viewerToolNames).toContain("list_role_tags");
    for (const toolName of [
      "create_role_tag",
      "delete_role_tag",
      "update_role_tag",
    ]) {
      expect(viewerToolNames).not.toContain(toolName);
      await expect(
        viewerClient.callTool(toolName, { name: "Neu", tag_id: leadership.id }),
      ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });
    }
    expect(await prisma.roleTag.count()).toBe(3);

    // The roles of a tag are only the visible roles
    expect(await callForContent(viewerClient, "list_role_tags")).toEqual({
      tags: [
        {
          id: leadership.id,
          name: "Führung",
          description: "Leitende Rollen",
          icon_url: null,
          role_ids: [command.id],
        },
      ],
      next_cursor: null,
    });

    const managerClient = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );
    expect(await managerClient.listToolNames()).toEqual(
      expect.arrayContaining([
        "create_role_tag",
        "delete_role_tag",
        "list_role_tags",
        "update_role_tag",
      ]),
    );
    const firstPage = await callForContent(managerClient, "list_role_tags", {
      limit: 2,
    });
    expect(firstPage).toEqual({
      tags: [
        {
          id: hiddenOnly.id,
          name: "Bergungsdienst",
          description: null,
          icon_url: null,
          role_ids: [],
        },
        {
          id: leadership.id,
          name: "Führung",
          description: "Leitende Rollen",
          icon_url: null,
          role_ids: [command.id],
        },
      ],
      next_cursor: leadership.id,
    });
    expect(
      await callForContent(managerClient, "list_role_tags", {
        limit: 2,
        cursor: firstPage.next_cursor,
      }),
    ).toEqual({
      tags: [
        {
          id: empty.id,
          name: "Leer",
          description: null,
          icon_url: null,
          role_ids: [],
        },
      ],
      next_cursor: null,
    });

    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "ROLE_TAGS_LISTED", createdById: viewer.user.id },
        select: { createdById: true, triggeredViaMcp: true, data: true },
      }),
    ).toEqual({
      createdById: viewer.user.id,
      triggeredViaMcp: true,
      data: { arguments: { limit: 25 } },
    });
  });

  test("create_role_tag, update_role_tag and delete_role_tag change a tag, refuse a taken name and write the audit events", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const command = await createRole(prisma, { name: "Kommando" });
    const salvage = await createRole(prisma, { name: "Bergung" });
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-tags-verwalter",
      permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );
    const auditEventsOf = (type: string) =>
      prisma.auditEvent.findMany({
        where: { type },
        orderBy: { createdAt: "asc" },
        select: { createdById: true, data: true, triggeredViaMcp: true },
      });

    const created = await callForContent(client, "create_role_tag", {
      name: "  Führung ",
      description: "Leitende Rollen",
      role_ids: [command.id],
    });
    expect(created).toEqual({
      id: expect.any(String),
      name: "Führung",
      description: "Leitende Rollen",
      icon_url: null,
      role_ids: [command.id],
    });
    const tagId = String(created.id);
    expect(
      await prisma.roleTag.findUniqueOrThrow({
        where: { id: tagId },
        select: { createdById: true, updatedById: true },
      }),
    ).toEqual({
      createdById: manager.entity.id,
      updatedById: manager.entity.id,
    });
    expect(await auditEventsOf("ROLE_TAG_CREATED")).toEqual([
      {
        createdById: manager.user.id,
        data: { tagId, name: "Führung", description: "Leitende Rollen" },
        triggeredViaMcp: true,
      },
    ]);
    expect(await auditEventsOf("ROLE_TAG_ASSIGNMENTS_UPDATED")).toEqual([
      {
        createdById: manager.user.id,
        data: { added: [{ roleId: command.id, tagId }], removed: [] },
        triggeredViaMcp: true,
      },
    ]);

    // The names are unique without regard to the case
    expect(
      await callForError(client, "create_role_tag", { name: "FÜHRUNG" }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(client, "create_role_tag", {
        name: "Neu",
        role_ids: ["nichtvorhanden"],
      }),
    ).toMatch(NOT_FOUND_RESULT);
    expect(await prisma.roleTag.count()).toBe(1);

    // One call changes the name, removes the description and moves the tag
    // from one role to the other
    expect(
      await callForContent(client, "update_role_tag", {
        tag_id: tagId,
        name: "Leitung",
        description: null,
        add_role_ids: [salvage.id],
        remove_role_ids: [command.id],
      }),
    ).toEqual({
      id: tagId,
      name: "Leitung",
      description: null,
      icon_url: null,
      role_ids: [salvage.id],
    });
    expect(await auditEventsOf("ROLE_TAG_UPDATED")).toEqual([
      {
        createdById: manager.user.id,
        data: {
          tagId,
          previousName: "Führung",
          newName: "Leitung",
          previousDescription: "Leitende Rollen",
          newDescription: null,
        },
        triggeredViaMcp: true,
      },
    ]);
    expect(await auditEventsOf("ROLE_TAG_ASSIGNMENTS_UPDATED")).toHaveLength(2);
    expect((await auditEventsOf("ROLE_TAG_ASSIGNMENTS_UPDATED"))[1]).toEqual({
      createdById: manager.user.id,
      data: {
        added: [{ roleId: salvage.id, tagId }],
        removed: [{ roleId: command.id, tagId }],
      },
      triggeredViaMcp: true,
    });

    // A repeated call changes nothing and writes no event
    expect(
      await callForContent(client, "update_role_tag", {
        tag_id: tagId,
        name: "Leitung",
        add_role_ids: [salvage.id],
        remove_role_ids: [command.id],
      }),
    ).toMatchObject({ name: "Leitung", role_ids: [salvage.id] });
    expect(await auditEventsOf("ROLE_TAG_UPDATED")).toHaveLength(1);
    expect(await auditEventsOf("ROLE_TAG_ASSIGNMENTS_UPDATED")).toHaveLength(2);

    expect(
      await callForError(client, "update_role_tag", {
        tag_id: tagId,
        add_role_ids: [command.id],
        remove_role_ids: [command.id],
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(client, "update_role_tag", {
        tag_id: tagId,
        add_role_ids: ["nichtvorhanden"],
      }),
    ).toMatch(NOT_FOUND_RESULT);

    const other = await callForContent(client, "create_role_tag", {
      name: "Sonstiges",
    });
    expect(
      await callForError(client, "update_role_tag", {
        tag_id: other.id,
        name: "LEITUNG",
      }),
    ).toMatch(VALIDATION_RESULT);

    expect(
      await callForContent(client, "delete_role_tag", { tag_id: tagId }),
    ).toEqual({ id: tagId, name: "Leitung" });
    // The roles stay, and only the tag and its links are gone
    expect(
      await prisma.role.count({
        where: { id: { in: [command.id, salvage.id] } },
      }),
    ).toBe(2);
    expect(await prisma.roleTagAssignment.count()).toBe(0);
    expect(await prisma.roleTag.findMany({ select: { id: true } })).toEqual([
      { id: other.id },
    ]);
    expect(await auditEventsOf("ROLE_TAG_DELETED")).toEqual([
      {
        createdById: manager.user.id,
        data: { tagId, name: "Leitung", roleIds: [salvage.id] },
        triggeredViaMcp: true,
      },
    ]);

    expect(
      await callForError(client, "delete_role_tag", { tag_id: tagId }),
    ).toMatch(NOT_FOUND_RESULT);
    expect(
      await callForError(client, "update_role_tag", {
        tag_id: tagId,
        name: "Wieder da",
      }),
    ).toMatch(NOT_FOUND_RESULT);
    expect(
      await callForContent(client, "list_roles", { tag_id: tagId }),
    ).toEqual({ roles: [], next_cursor: null });
  });

  test("update_role adds and removes tags, get_role gives them, and list_roles filters by tag", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const logistics = await createRole(prisma, { name: "Logistik" });
    const salvage = await createRole(prisma, { name: "Bergung" });
    const leadership = await createRoleTag(prisma, { name: "Führung" });
    const support = await createRoleTag(prisma, {
      name: "Unterstützung",
      roles: [salvage],
    });
    const manager = await createMcpCitizen(prisma, {
      handle: "mcp-tags-verwalter",
      permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(manager.user)).accessToken,
    );
    const roleEvents = () =>
      prisma.auditEvent.findMany({
        where: {
          type: { in: ["ROLE_UPDATED_V4", "ROLE_TAG_ASSIGNMENTS_UPDATED"] },
        },
        orderBy: { createdAt: "asc" },
        select: { type: true, createdById: true, triggeredViaMcp: true },
      });

    // A call with only tags writes only the event of the links, and the
    // output has no tags
    expect(
      await callForContent(client, "update_role", {
        role_id: logistics.id,
        add_tag_ids: [leadership.id, support.id],
      }),
    ).toEqual({
      id: logistics.id,
      name: "Logistik",
      description: null,
      max_age_days: null,
      assign_after_inactive_days: null,
      max_level: null,
    });
    expect(
      await callForContent(client, "get_role", { role_id: logistics.id }),
    ).toMatchObject({
      tags: [
        { id: leadership.id, name: "Führung" },
        { id: support.id, name: "Unterstützung" },
      ],
    });
    expect(
      await prisma.auditEvent.findMany({
        where: { type: "ROLE_TAG_ASSIGNMENTS_UPDATED" },
        select: { data: true },
      }),
    ).toEqual([
      {
        data: {
          added: [
            { roleId: logistics.id, tagId: leadership.id },
            { roleId: logistics.id, tagId: support.id },
          ],
          removed: [],
        },
      },
    ]);
    expect(await roleEvents()).toEqual([
      {
        type: "ROLE_TAG_ASSIGNMENTS_UPDATED",
        createdById: manager.user.id,
        triggeredViaMcp: true,
      },
    ]);

    // The filter gives the roles with one tag
    expect(
      await callForContent(client, "list_roles", { tag_id: support.id }),
    ).toMatchObject({
      roles: [{ id: salvage.id }, { id: logistics.id }],
      next_cursor: null,
    });
    expect(
      await callForContent(client, "list_roles", { tag_id: leadership.id }),
    ).toMatchObject({ roles: [{ id: logistics.id }], next_cursor: null });

    // A field and the tags in one call write both events
    expect(
      await callForContent(client, "update_role", {
        role_id: logistics.id,
        description: "Transporte",
        add_tag_ids: [leadership.id],
        remove_tag_ids: [support.id],
      }),
    ).toMatchObject({ id: logistics.id, description: "Transporte" });
    expect(
      await callForContent(client, "get_role", { role_id: logistics.id }),
    ).toMatchObject({ tags: [{ id: leadership.id, name: "Führung" }] });
    expect((await roleEvents()).map(({ type }) => type).toSorted()).toEqual([
      "ROLE_TAG_ASSIGNMENTS_UPDATED",
      "ROLE_TAG_ASSIGNMENTS_UPDATED",
      "ROLE_UPDATED_V4",
    ]);
    expect(
      await callForContent(client, "list_roles", { tag_id: support.id }),
    ).toMatchObject({ roles: [{ id: salvage.id }], next_cursor: null });

    expect(
      await callForError(client, "update_role", {
        role_id: logistics.id,
        add_tag_ids: [support.id],
        remove_tag_ids: [support.id],
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(client, "update_role", {
        role_id: logistics.id,
        add_tag_ids: ["nichtvorhanden"],
      }),
    ).toMatch(NOT_FOUND_RESULT);
    expect(await roleEvents()).toHaveLength(3);
  });
});
