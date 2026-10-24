import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createMcpCitizen,
  createVariant,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  CONFLICT_RESULT,
  NOT_FOUND_RESULT,
  UNKNOWN_TOOL_ERROR_CODE,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

/** The citizen picker of the form needs citizen;read, thus the tool too */
const KEEPER_PERMISSIONS = ["penaltyEntry;create", "citizen;read"];

test.describe("the penalty points and fleet write tools of the MCP server", () => {
  test("create_penalty_entry books an entry like the form, with the author, the expiry and the audit event", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const keeper = await createMcpCitizen(prisma, {
      handle: "mcp-strafpunkt-verwalter",
      permissionStrings: KEEPER_PERMISSIONS,
    });
    const offender = await createCitizen(prisma, { handle: "mcp-delinquent" });
    const client = await connectMcpClient(
      (await authorizeMcpClient(keeper.user)).accessToken,
    );

    const result = await callForContent(client, "create_penalty_entry", {
      citizen_id: offender.entity.id,
      points: 3,
      reason: "Beschuss eines Members",
      // Summer time: Berlin is two hours ahead of UTC
      expires_at: "2099-07-15T08:15:00+02:00",
    });
    expect(result).toMatchObject({
      entry: {
        citizen: { id: offender.entity.id, handle: "mcp-delinquent" },
        points: 3,
        reason: "Beschuss eines Members",
        created_by: { id: keeper.entity.id },
        expires_at: "2099-07-15T06:15:00.000Z",
        deleted_at: null,
      },
      notifications_sent: true,
    });

    const entry = await prisma.penaltyEntry.findFirstOrThrow();
    expect(entry).toMatchObject({
      citizenId: offender.entity.id,
      createdById: keeper.entity.id,
      points: 3,
    });

    await expectAuditEvents(prisma, ["PENALTY_ENTRY_CREATED"]);
    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "PENALTY_ENTRY_CREATED" },
        select: { createdById: true, data: true },
      }),
    ).toEqual({
      createdById: keeper.user.id,
      data: {
        penaltyEntryId: entry.id,
        citizenId: offender.entity.id,
        points: 3,
        reason: "Beschuss eines Members",
        expiresAt: "2099-07-15T06:15:00.000Z",
      },
    });
  });

  test("create_penalty_entry refuses a deleted citizen and is not available without citizen;read", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const keeper = await createMcpCitizen(prisma, {
      handle: "mcp-strafpunkt-verwalter",
      permissionStrings: KEEPER_PERMISSIONS,
    });
    // Without citizen;read
    const reader = await createMcpCitizen(prisma, {
      handle: "mcp-strafpunkt-leser",
      permissionStrings: ["penaltyEntry;read", "penaltyEntry;create"],
    });
    // A deleted citizen has no login
    const deletedCitizen = await prisma.citizen.create({
      data: { handle: "mcp-geloescht", deletedAt: new Date() },
    });

    const keeperClient = await connectMcpClient(
      (await authorizeMcpClient(keeper.user)).accessToken,
    );
    expect(
      await callForError(keeperClient, "create_penalty_entry", {
        citizen_id: deletedCitizen.id,
        points: 1,
      }),
    ).toMatch(CONFLICT_RESULT);

    const readerClient = await connectMcpClient(
      (await authorizeMcpClient(reader.user)).accessToken,
    );
    expect(await readerClient.listToolNames()).not.toContain(
      "create_penalty_entry",
    );
    await expect(
      readerClient.callTool("create_penalty_entry", {
        citizen_id: deletedCitizen.id,
        points: 1,
      }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });

    expect(await prisma.penaltyEntry.count()).toBe(0);
  });

  test("create_ship and rename_ship change the own fleet with the audit events of the web app", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const owner = await createMcpCitizen(prisma, {
      handle: "mcp-pilotin",
      permissionStrings: ["ship;manage"],
    });
    const { variant } = await createVariant(prisma, {
      manufacturerName: "Roberts Space Industries",
      seriesName: "Polaris",
      variantName: "Polaris",
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(owner.user)).accessToken,
    );

    const createdShip = await callForContent(client, "create_ship", {
      variant_id: variant.id,
      name: "Sternenfaust",
    });
    const ship = await prisma.ship.findFirstOrThrow();
    expect(createdShip).toMatchObject({
      id: ship.id,
      name: "Sternenfaust",
      variant: { id: variant.id, name: "Polaris" },
      deleted_at: null,
    });

    expect(
      await callForContent(client, "rename_ship", {
        ship_id: ship.id,
        name: "Sternenhammer",
      }),
    ).toMatchObject({ id: ship.id, name: "Sternenhammer" });

    const myShips = await callForContent(client, "list_my_ships");
    expect(myShips.ships).toEqual([
      expect.objectContaining({ id: ship.id, name: "Sternenhammer" }),
    ]);
    expect(
      await prisma.ship.findUniqueOrThrow({
        where: { id: ship.id },
        select: { ownerId: true, createdById: true, updatedById: true },
      }),
    ).toEqual({
      ownerId: owner.entity.id,
      createdById: owner.entity.id,
      updatedById: owner.entity.id,
    });

    expect(
      await callForError(client, "create_ship", {
        variant_id: "unknownvariant000000000000",
      }),
    ).toMatch(NOT_FOUND_RESULT);

    await expectAuditEvents(prisma, ["SHIP_CREATED_V2", "SHIP_UPDATED_V2"]);
    const auditEvents = await prisma.auditEvent.findMany({
      where: { type: { in: ["SHIP_CREATED_V2", "SHIP_UPDATED_V2"] } },
      orderBy: { createdAt: "asc" },
      select: { type: true, createdById: true, data: true },
    });
    expect(auditEvents).toEqual([
      {
        type: "SHIP_CREATED_V2",
        createdById: owner.user.id,
        data: {
          shipId: ship.id,
          ownerId: owner.entity.id,
          variantId: variant.id,
        },
      },
      {
        type: "SHIP_UPDATED_V2",
        createdById: owner.user.id,
        data: {
          shipId: ship.id,
          ownerId: owner.entity.id,
          previousName: "Sternenfaust",
          newName: "Sternenhammer",
        },
      },
    ]);
  });

  test("delete_ship deletes only an own ship, only once and only while the tool is enabled", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const owner = await createMcpCitizen(prisma, {
      handle: "mcp-pilotin",
      permissionStrings: ["ship;manage"],
    });
    const neighbour = await createCitizen(prisma, {
      handle: "mcp-nachbar",
      permissionStrings: ["ship;manage"],
    });
    const { variant } = await createVariant(prisma, {
      manufacturerName: "Aegis Dynamics",
      seriesName: "Avenger",
      variantName: "Avenger Titan",
    });
    const ownShip = await prisma.ship.create({
      data: { ownerId: owner.entity.id, variantId: variant.id, name: "Falke" },
    });
    const neighbourShip = await prisma.ship.create({
      data: { ownerId: neighbour.entity.id, variantId: variant.id },
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(owner.user)).accessToken,
    );

    const deleteTool = (await client.listTools()).find(
      (tool) => tool.name === "delete_ship",
    );
    expect(deleteTool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });

    // A tool that the user disabled for the client does not exist
    const grant = await prisma.oAuthGrant.findFirstOrThrow({
      where: { userId: owner.user.id },
      select: { id: true },
    });
    const toolSetting = await prisma.mcpToolSetting.create({
      data: { grantId: grant.id, toolName: "delete_ship" },
    });
    await expect(
      client.callTool("delete_ship", { ship_id: ownShip.id }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });
    await prisma.mcpToolSetting.delete({ where: { id: toolSetting.id } });

    // A ship of a different citizen does not exist for the user
    expect(
      await callForError(client, "delete_ship", { ship_id: neighbourShip.id }),
    ).toMatch(NOT_FOUND_RESULT);
    expect(
      await prisma.ship.findUniqueOrThrow({
        where: { id: neighbourShip.id },
        select: { deletedAt: true },
      }),
    ).toEqual({ deletedAt: null });

    const deletedShip = await callForContent(client, "delete_ship", {
      ship_id: ownShip.id,
    });
    expect(deletedShip).toMatchObject({ id: ownShip.id, name: "Falke" });
    expect(deletedShip.deleted_at).toEqual(expect.any(String));
    expect(
      await prisma.ship.findUniqueOrThrow({
        where: { id: ownShip.id },
        select: { deletedById: true },
      }),
    ).toEqual({ deletedById: owner.entity.id });

    expect(
      await callForError(client, "delete_ship", { ship_id: ownShip.id }),
    ).toMatch(NOT_FOUND_RESULT);

    const deletedShips = await callForContent(client, "list_my_ships", {
      deleted: true,
    });
    expect(deletedShips.ships).toEqual([
      expect.objectContaining({ id: ownShip.id }),
    ]);

    await expectAuditEvents(prisma, ["SHIP_DELETED_V2"]);
    const auditEvents = await prisma.auditEvent.findMany({
      where: { type: "SHIP_DELETED_V2" },
      select: { createdById: true, data: true },
    });
    expect(auditEvents).toEqual([
      {
        createdById: owner.user.id,
        data: {
          shipId: ownShip.id,
          ownerId: owner.entity.id,
          name: "Falke",
          variantId: variant.id,
        },
      },
    ]);
  });
});
