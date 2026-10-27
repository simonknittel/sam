import { EventVisibility } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createEventTemplate,
  createMcpCitizen,
  createParticipant,
  createRole,
  createVariant,
  futureEvent,
  LINEUP_PERMISSIONS,
  ONE_DAY_MS,
  ONE_HOUR_MS,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  CONFLICT_RESULT,
  FORBIDDEN_RESULT,
  NOT_FOUND_RESULT,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

test.describe("the lineup write tools of the MCP server", () => {
  test("an organizer creates, updates and reorders positions with the audit events of the web app", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-staffelfuehrer",
      permissionStrings: LINEUP_PERMISSIONS,
    });
    const { variant } = await createVariant(prisma, {
      manufacturerName: "Anvil Aerospace",
      seriesName: "Carrack",
      variantName: "Carrack",
    });
    const event = await createAppEvent(prisma, {
      name: "Expedition nach Nyx",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    const pilot = await callForContent(client, "create_event_position", {
      event_id: event.id,
      name: "Pilot",
      required_variant_ids: [variant.id],
      background_color: "#204060",
      font_size: "large",
    });
    expect(pilot).toMatchObject({
      name: "Pilot",
      required_variants: [{ id: variant.id, name: "Carrack" }],
      assignee: null,
      children: [],
    });
    const pilotId = String(pilot.id);
    const copilot = await callForContent(client, "create_event_position", {
      event_id: event.id,
      parent_position_id: pilotId,
      name: "Copilot",
    });
    const copilotId = String(copilot.id);
    const escort = await callForContent(client, "create_event_position", {
      event_id: event.id,
      name: "Begleitschutz",
    });
    const escortId = String(escort.id);

    // A field that the update does not give keeps its value
    expect(
      await callForContent(client, "update_event_position", {
        position_id: pilotId,
        name: "Kapitän",
      }),
    ).toMatchObject({
      name: "Kapitän",
      required_variants: [{ id: variant.id, name: "Carrack" }],
      children: [expect.objectContaining({ id: copilotId })],
    });
    expect(
      await prisma.eventPosition.findUniqueOrThrow({
        where: { id: pilotId },
        select: { backgroundColor: true },
      }),
    ).toEqual({ backgroundColor: "#204060" });
    expect(
      await prisma.eventPosition.findUniqueOrThrow({
        where: { id: pilotId },
        select: { fontSize: true },
      }),
    ).toEqual({ fontSize: "large" });

    const lineup = await callForContent(client, "reorder_event_lineup", {
      event_id: event.id,
      positions: [
        { id: escortId },
        { id: pilotId, children: [{ id: copilotId }] },
      ],
    });
    expect(lineup).toMatchObject({
      event: { id: event.id, name: "Expedition nach Nyx" },
      can_manage_positions: true,
      positions: [
        { id: escortId, name: "Begleitschutz", children: [] },
        {
          id: pilotId,
          name: "Kapitän",
          children: [{ id: copilotId, name: "Copilot" }],
        },
      ],
    });

    /**
     * A position that the tree does not name keeps its parent, thus the
     * copilot below the pilot on the fourth level would be on the fifth
     * level. The order refuses this and changes nothing.
     */
    const second = await callForContent(client, "create_event_position", {
      event_id: event.id,
      parent_position_id: escortId,
      name: "Zweite Ebene",
    });
    const third = await callForContent(client, "create_event_position", {
      event_id: event.id,
      parent_position_id: String(second.id),
      name: "Dritte Ebene",
    });
    expect(
      await callForError(client, "reorder_event_lineup", {
        event_id: event.id,
        positions: [
          {
            id: escortId,
            children: [
              {
                id: String(second.id),
                children: [
                  { id: String(third.id), children: [{ id: pilotId }] },
                ],
              },
            ],
          },
        ],
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await prisma.eventPosition.findUniqueOrThrow({
        where: { id: pilotId },
        select: { parentPositionId: true },
      }),
    ).toEqual({ parentPositionId: null });

    await expectAuditEvents(prisma, [
      "EVENT_POSITION_CREATED",
      "EVENT_POSITION_UPDATED_V2",
      "EVENT_LINEUP_ORDER_CHANGED",
    ]);
    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: {
          type: "EVENT_POSITION_CREATED",
          data: { path: ["positionId"], equals: copilotId },
        },
        select: { createdById: true, data: true },
      }),
    ).toEqual({
      createdById: organizer.user.id,
      data: {
        eventId: event.id,
        positionId: copilotId,
        name: "Copilot",
        variantIds: [],
        parentPositionId: pilotId,
      },
    });
  });

  test("a participant applies and withdraws, and the organizer assigns and clears the position", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-einsatzleiter",
      permissionStrings: LINEUP_PERMISSIONS,
    });
    const participant = await createMcpCitizen(prisma, {
      handle: "mcp-bewerberin",
      permissionStrings: LINEUP_PERMISSIONS,
    });
    const event = await createAppEvent(prisma, {
      name: "Konvoi nach Pyro",
      createdById: organizer.entity.id,
      ...futureEvent(),
      lineupEnabled: true,
    });
    await createParticipant(prisma, {
      eventId: event.id,
      citizen: participant,
    });
    const position = await prisma.eventPosition.create({
      data: { eventId: event.id, name: "Navigator" },
    });
    const participantClient = await connectMcpClient(
      (await authorizeMcpClient(participant.user)).accessToken,
    );
    const organizerClient = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    const tools = await participantClient.listTools();
    expect(
      tools.find((tool) => tool.name === "update_my_event_position_application")
        ?.annotations,
    ).toMatchObject({ destructiveHint: true, idempotentHint: false });

    // The applicants are visible only for the managers of the positions
    expect(
      await callForContent(
        participantClient,
        "update_my_event_position_application",
        {
          position_id: position.id,
          action: "apply",
        },
      ),
    ).toMatchObject({ id: position.id, applications: [] });
    // A repeated application changes nothing
    expect(
      await callForContent(
        participantClient,
        "update_my_event_position_application",
        {
          position_id: position.id,
          action: "apply",
        },
      ),
    ).toMatchObject({ id: position.id, applications: [] });
    expect(await prisma.eventPositionApplication.count()).toBe(1);
    expect(
      await prisma.auditEvent.count({
        where: { type: "EVENT_POSITION_APPLICATION_CREATED" },
      }),
    ).toBe(1);

    // Only a participant or an applicant gets the position, like in the form
    expect(
      await callForError(organizerClient, "assign_event_position", {
        position_id: position.id,
        citizen_id: organizer.entity.id,
      }),
    ).toMatch(CONFLICT_RESULT);

    expect(
      await callForContent(organizerClient, "assign_event_position", {
        position_id: position.id,
        citizen_id: participant.entity.id,
      }),
    ).toMatchObject({
      assignee: { id: participant.entity.id, handle: "mcp-bewerberin" },
      applications: [{ id: participant.entity.id, handle: "mcp-bewerberin" }],
    });
    expect(
      await callForContent(organizerClient, "assign_event_position", {
        position_id: position.id,
        citizen_id: null,
      }),
    ).toMatchObject({ assignee: null });

    await callForContent(
      participantClient,
      "update_my_event_position_application",
      { position_id: position.id, action: "withdraw" },
    );
    expect(
      await callForError(
        participantClient,
        "update_my_event_position_application",
        { position_id: position.id, action: "withdraw" },
      ),
    ).toMatch(CONFLICT_RESULT);
    expect(await prisma.eventPositionApplication.count()).toBe(0);

    await expectAuditEvents(prisma, [
      "EVENT_POSITION_APPLICATION_CREATED",
      "EVENT_POSITION_CITIZEN_ASSIGNED",
      "EVENT_POSITION_CITIZEN_REMOVED",
      "EVENT_POSITION_APPLICATION_DELETED",
    ]);
    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "EVENT_POSITION_CITIZEN_REMOVED" },
        select: { createdById: true, data: true },
      }),
    ).toEqual({
      createdById: organizer.user.id,
      data: {
        eventId: event.id,
        positionId: position.id,
        previousCitizenId: participant.entity.id,
      },
    });
  });

  test("delete_event_position is destructive and deletes the position with its children", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-aufraeumer",
      permissionStrings: LINEUP_PERMISSIONS,
    });
    const event = await createAppEvent(prisma, {
      name: "Bergungseinsatz",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const parent = await prisma.eventPosition.create({
      data: { eventId: event.id, name: "Bergungsschiff" },
    });
    await prisma.eventPosition.create({
      data: {
        eventId: event.id,
        name: "Traktorstrahl",
        parentPositionId: parent.id,
      },
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    const deleteTool = (await client.listTools()).find(
      (tool) => tool.name === "delete_event_position",
    );
    expect(deleteTool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });

    expect(
      await callForContent(client, "delete_event_position", {
        position_id: parent.id,
      }),
    ).toMatchObject({
      id: parent.id,
      name: "Bergungsschiff",
      children: [expect.objectContaining({ name: "Traktorstrahl" })],
    });
    expect(
      await prisma.eventPosition.count({ where: { eventId: event.id } }),
    ).toBe(0);
    expect(
      await callForError(client, "delete_event_position", {
        position_id: parent.id,
      }),
    ).toMatch(NOT_FOUND_RESULT);

    await expectAuditEvents(prisma, ["EVENT_POSITION_DELETED"]);
    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "EVENT_POSITION_DELETED" },
        select: { createdById: true, data: true },
      }),
    ).toEqual({
      createdById: organizer.user.id,
      data: {
        eventId: event.id,
        positionId: parent.id,
        name: "Bergungsschiff",
      },
    });
  });

  test("the tools refuse a user who does not manage the positions, an event that the user cannot see, an event that ended and a template position", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-veranstalter",
      permissionStrings: LINEUP_PERMISSIONS,
    });
    const reader = await createMcpCitizen(prisma, {
      handle: "mcp-zuschauer",
      permissionStrings: LINEUP_PERMISSIONS,
    });
    const outsider = await createMcpCitizen(prisma, { handle: "mcp-aussen" });
    const lineupManager = await createMcpCitizen(prisma, {
      handle: "mcp-aufstellungsleiter",
      permissionStrings: [...LINEUP_PERMISSIONS, "othersEventPosition;manage"],
    });
    const officers = await createRole(prisma, { name: "Offiziere" });
    const restrictedEvent = await createAppEvent(prisma, {
      name: "Geheime Patrouille",
      createdById: organizer.entity.id,
      ...futureEvent(),
      visibility: EventVisibility.RESTRICTED,
      visibilityRoleIds: [officers.id],
    });
    const hiddenLineupEvent = await createAppEvent(prisma, {
      name: "Patrouille ohne Aufstellung",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const hiddenLineupPosition = await prisma.eventPosition.create({
      data: { eventId: hiddenLineupEvent.id, name: "Unsichtbar" },
    });
    const event = await createAppEvent(prisma, {
      name: "Patrouille",
      createdById: organizer.entity.id,
      ...futureEvent(),
      lineupEnabled: true,
    });
    const position = await prisma.eventPosition.create({
      data: { eventId: event.id, name: "Späher" },
    });
    const endedEvent = await createAppEvent(prisma, {
      name: "Vergangene Patrouille",
      createdById: organizer.entity.id,
      startTime: new Date(Date.now() - ONE_DAY_MS),
      endTime: new Date(Date.now() - ONE_DAY_MS + ONE_HOUR_MS),
    });
    const {
      positions: [templatePosition],
    } = await createEventTemplate(prisma, {
      name: "Patrouillenvorlage",
      ownedById: organizer.entity.id,
      positionNames: ["Vorlagenposten"],
    });

    const readerClient = await connectMcpClient(
      (await authorizeMcpClient(reader.user)).accessToken,
    );
    expect(
      await callForError(readerClient, "create_event_position", {
        event_id: event.id,
        name: "Eindringling",
      }),
    ).toMatch(FORBIDDEN_RESULT);
    expect(
      await callForError(readerClient, "assign_event_position", {
        position_id: position.id,
        citizen_id: reader.entity.id,
      }),
    ).toMatch(FORBIDDEN_RESULT);
    // Without a participation, an application is a conflict
    expect(
      await callForError(readerClient, "update_my_event_position_application", {
        position_id: position.id,
        action: "apply",
      }),
    ).toMatch(CONFLICT_RESULT);
    // A lineup that is not enabled is visible only for its managers
    expect(
      await callForError(readerClient, "update_my_event_position_application", {
        position_id: hiddenLineupPosition.id,
        action: "apply",
      }),
    ).toMatch(FORBIDDEN_RESULT);

    /**
     * The permission for the positions of other events does not show a
     * restricted event
     */
    const lineupManagerClient = await connectMcpClient(
      (await authorizeMcpClient(lineupManager.user)).accessToken,
    );
    expect(
      await callForError(lineupManagerClient, "reorder_event_lineup", {
        event_id: restrictedEvent.id,
        positions: [],
      }),
    ).toMatch(NOT_FOUND_RESULT);
    expect(
      await callForContent(lineupManagerClient, "create_event_position", {
        event_id: event.id,
        name: "Verstärkung",
      }),
    ).toMatchObject({ name: "Verstärkung" });

    const organizerClient = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );
    expect(
      await callForError(organizerClient, "create_event_position", {
        event_id: endedEvent.id,
        name: "Zu spät",
      }),
    ).toMatch(CONFLICT_RESULT);
    // The tools change only the lineups of events, not of templates
    expect(
      await callForError(organizerClient, "update_event_position", {
        position_id: templatePosition!.id,
        name: "Umbenannt",
      }),
    ).toMatch(NOT_FOUND_RESULT);

    const outsiderClient = await connectMcpClient(
      (await authorizeMcpClient(outsider.user)).accessToken,
    );
    expect(await outsiderClient.listToolNames()).not.toContain(
      "create_event_position",
    );

    expect(
      await prisma.eventPosition.findMany({
        where: { OR: [{ eventId: event.id }, { eventId: endedEvent.id }] },
        select: { name: true, citizenId: true },
        orderBy: { name: "asc" },
      }),
    ).toEqual([
      { name: "Späher", citizenId: null },
      { name: "Verstärkung", citizenId: null },
    ]);
    expect(
      await prisma.eventPosition.findUniqueOrThrow({
        where: { id: templatePosition!.id },
        select: { name: true },
      }),
    ).toEqual({ name: "Vorlagenposten" });
  });
});
