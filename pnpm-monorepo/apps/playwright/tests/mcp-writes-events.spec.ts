import {
  EventActivityType,
  EventSource,
  EventVisibility,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createMcpCitizen,
  createRole,
  futureEvent,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  CONFLICT_RESULT,
  FORBIDDEN_RESULT,
  NOT_FOUND_RESULT,
  UNKNOWN_TOOL_ERROR_CODE,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

/** Summer time: Berlin is two hours ahead of UTC */
const START_TIME = "2099-07-15T20:00:00+02:00";
const END_TIME = "2099-07-15T22:00:00+02:00";

test.describe("the event write tools of the MCP server", () => {
  test("create_event creates a restricted event like the form, with its briefing, its activity entry and the audit event", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const escort = await createRole(prisma, { name: "Geleitschutz" });
    const hiddenRole = await createRole(prisma, { name: "Geheimdienst" });
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-organisatorin",
      // The role picker of the form offers only the roles that the user can see
      permissionStrings: [
        "event;read",
        "event;create",
        `otherRole;read;roleId=${escort.id}`,
      ],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    expect(
      await callForError(client, "create_event", {
        name: "Konvoi nach Pyro",
        start_time: END_TIME,
        end_time: START_TIME,
        visibility: "public",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(client, "create_event", {
        name: "Konvoi nach Pyro",
        start_time: START_TIME,
        end_time: END_TIME,
        visibility: "restricted",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(client, "create_event", {
        name: "Konvoi nach Pyro",
        start_time: START_TIME,
        end_time: END_TIME,
        visibility: "restricted",
        visibility_role_ids: [hiddenRole.id],
      }),
    ).toMatch(VALIDATION_RESULT);
    /**
     * The description and the sign-up note of the Discord event must fit
     * into 1000 characters
     */
    expect(
      await callForError(client, "create_event", {
        name: "Konvoi nach Pyro",
        description: "a".repeat(1000),
        start_time: START_TIME,
        end_time: END_TIME,
        visibility: "public",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(await prisma.event.count()).toBe(0);

    const result = await callForContent(client, "create_event", {
      name: "Konvoi nach Pyro",
      description: "Treffpunkt ist Port Tressler.",
      start_time: START_TIME,
      end_time: END_TIME,
      visibility: "restricted",
      visibility_role_ids: [escort.id],
    });
    expect(result).toMatchObject({
      event: {
        name: "Konvoi nach Pyro",
        description: "Treffpunkt ist Port Tressler.",
        start_time: "2099-07-15T18:00:00.000Z",
        end_time: "2099-07-15T20:00:00.000Z",
        visibility: "restricted",
        visibility_role_ids: [escort.id],
        source: "app",
        lineup_enabled: false,
        created_by: { id: organizer.entity.id, handle: "mcp-organisatorin" },
        managers: [],
        participants: [],
        can_manage: true,
        is_updatable: true,
        is_participating: false,
      },
      notifications_sent: true,
    });

    const event = await prisma.event.findFirstOrThrow({
      include: { wikiPages: true, activities: true },
    });
    expect(event).toMatchObject({
      source: EventSource.APP,
      visibility: EventVisibility.RESTRICTED,
      createdById: organizer.entity.id,
    });
    // The briefing root page, like the form creates it
    expect(event.wikiPages).toHaveLength(1);
    expect(event.activities.map((activity) => activity.type)).toEqual([
      EventActivityType.CREATED,
    ]);

    await expectAuditEvents(prisma, ["EVENT_CREATED_IN_APP"]);
    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "EVENT_CREATED_IN_APP" },
        select: { createdById: true, data: true },
      }),
    ).toEqual({
      createdById: organizer.user.id,
      data: { eventId: event.id, name: "Konvoi nach Pyro" },
    });
  });

  test("update_event changes only the given fields, writes nothing for the same values and enables the lineup", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-eventleiter",
      permissionStrings: ["event;read"],
    });
    const event = await createAppEvent(prisma, {
      name: "Bergbau-Abend",
      description: "Quantanium im Aaron Halo.",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    expect(
      await callForContent(client, "update_event", {
        event_id: event.id,
        name: "Bergbau-Nacht",
        start_time: START_TIME,
        // A time without an offset is a wall time in Europe/Berlin
        end_time: "2099-07-16T01:00",
      }),
    ).toMatchObject({
      event: {
        name: "Bergbau-Nacht",
        description: "Quantanium im Aaron Halo.",
        start_time: "2099-07-15T18:00:00.000Z",
        end_time: "2099-07-15T23:00:00.000Z",
      },
      changes: ["name", "schedule"],
      notifications_sent: true,
    });

    expect(
      await callForContent(client, "update_event", {
        event_id: event.id,
        name: "Bergbau-Nacht",
      }),
    ).toMatchObject({ changes: [] });

    expect(
      await callForContent(client, "update_event", {
        event_id: event.id,
        lineup_enabled: true,
      }),
    ).toMatchObject({
      event: { lineup_enabled: true },
      changes: ["lineup_enabled"],
    });

    // The entries of one transaction have the same time, thus sorted by type
    expect(
      (await prisma.eventActivity.findMany({ where: { eventId: event.id } }))
        .map((activity) => activity.type)
        .toSorted(),
    ).toEqual(
      [
        EventActivityType.TITLE_UPDATED,
        EventActivityType.SCHEDULE_UPDATED,
        EventActivityType.LINEUP_TOGGLED,
      ].toSorted(),
    );

    await expectAuditEvents(prisma, [
      "EVENT_UPDATED_IN_APP",
      "EVENT_LINEUP_STATUS_CHANGED",
    ]);
    expect(
      await prisma.auditEvent.findMany({
        where: { type: "EVENT_UPDATED_IN_APP" },
        select: { createdById: true, data: true },
      }),
    ).toEqual([
      {
        createdById: organizer.user.id,
        data: { eventId: event.id, changedFields: ["name", "schedule"] },
      },
    ]);
  });

  test("update_my_event_participation signs up, changes the comment and cancels the sign-up", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createCitizen(prisma, { handle: "mcp-gastgeber" });
    const pilot = await createMcpCitizen(prisma, {
      handle: "mcp-pilot",
      permissionStrings: ["event;read"],
    });
    const event = await createAppEvent(prisma, {
      name: "Rennen auf Daymar",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(pilot.user)).accessToken,
    );
    const pilotReference = { id: pilot.entity.id, handle: "mcp-pilot" };

    const signUp = {
      event_id: event.id,
      action: "sign_up",
      comment: "Mit meiner Mustang Alpha.",
    };
    expect(
      await callForContent(client, "update_my_event_participation", signUp),
    ).toMatchObject({
      is_participating: true,
      participants: [
        { citizen: pilotReference, comment: "Mit meiner Mustang Alpha." },
      ],
    });
    // The same input again changes nothing
    await callForContent(client, "update_my_event_participation", signUp);
    expect(
      await callForContent(client, "update_my_event_participation", {
        event_id: event.id,
        action: "sign_up",
        comment: "Mit der Dragonfly.",
      }),
    ).toMatchObject({
      participants: [
        { citizen: pilotReference, comment: "Mit der Dragonfly." },
      ],
    });

    expect(
      await callForContent(client, "update_my_event_participation", {
        event_id: event.id,
        action: "cancel",
      }),
    ).toMatchObject({ is_participating: false, participants: [] });
    expect(
      await callForError(client, "update_my_event_participation", {
        event_id: event.id,
        action: "cancel",
      }),
    ).toMatch(CONFLICT_RESULT);

    await expectAuditEvents(prisma, [
      "EVENT_PARTICIPATION_SIGNED_UP",
      "EVENT_PARTICIPATION_COMMENT_UPDATED",
      "EVENT_PARTICIPATION_CANCELLED",
    ]);
    expect(
      await prisma.auditEvent.count({
        where: {
          type: {
            in: [
              "EVENT_PARTICIPATION_SIGNED_UP",
              "EVENT_PARTICIPATION_COMMENT_UPDATED",
            ],
          },
          createdById: pilot.user.id,
        },
      }),
    ).toBe(2);
  });

  test("update_event turns the participation off, and then the sign-up is refused", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-stille-orga",
      permissionStrings: ["event;read"],
    });
    const pilot = await createMcpCitizen(prisma, {
      handle: "mcp-stiller-pilot",
      permissionStrings: ["event;read"],
    });
    const event = await createAppEvent(prisma, {
      name: "Briefing ohne Anmeldung",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const organizerClient = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );
    const pilotClient = await connectMcpClient(
      (await authorizeMcpClient(pilot.user)).accessToken,
    );

    expect(
      await callForContent(organizerClient, "update_event", {
        event_id: event.id,
        participation_enabled: false,
      }),
    ).toMatchObject({
      event: { participation_enabled: false, participants: [] },
      changes: ["participation_enabled"],
    });

    expect(
      await callForError(pilotClient, "update_my_event_participation", {
        event_id: event.id,
        action: "sign_up",
      }),
    ).toMatch(CONFLICT_RESULT);
    expect(
      await prisma.eventParticipant.count({ where: { eventId: event.id } }),
    ).toBe(0);
    await expectAuditEvents(prisma, ["EVENT_PARTICIPATION_STATUS_CHANGED"]);
  });

  test("a manager adds and removes participants and managers, but cannot add a citizen who cannot see the event", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-flottenchef",
      permissionStrings: ["event;read"],
    });
    const wingman = await createCitizen(prisma, {
      handle: "mcp-fluegelmann",
      permissionStrings: ["event;read"],
    });
    const outsider = await createCitizen(prisma, { handle: "mcp-aussen" });
    const deputy = await createCitizen(prisma, {
      handle: "mcp-stellvertreterin",
    });
    const event = await createAppEvent(prisma, {
      name: "Patrouille im Stanton-System",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    expect(
      await callForError(client, "update_event_participants", {
        event_id: event.id,
        action: "add",
        citizen_ids: [wingman.entity.id, outsider.entity.id],
      }),
    ).toMatch(VALIDATION_RESULT);

    expect(
      await callForContent(client, "update_event_participants", {
        event_id: event.id,
        action: "add",
        citizen_ids: [wingman.entity.id],
        comment: "Als Geleitschutz.",
      }),
    ).toMatchObject({
      event: {
        participants: [
          {
            citizen: { id: wingman.entity.id, handle: "mcp-fluegelmann" },
            comment: "Als Geleitschutz.",
          },
        ],
      },
      changed_citizen_ids: [wingman.entity.id],
      notifications_sent: true,
    });

    expect(
      await callForContent(client, "update_event_participants", {
        event_id: event.id,
        action: "remove",
        citizen_ids: [wingman.entity.id],
        reason: "Doppelt eingeplant.",
      }),
    ).toMatchObject({
      event: { participants: [] },
      changed_citizen_ids: [wingman.entity.id],
      notifications_sent: true,
    });
    expect(
      await callForError(client, "update_event_participants", {
        event_id: event.id,
        action: "remove",
        citizen_ids: [wingman.entity.id],
      }),
    ).toMatch(CONFLICT_RESULT);

    expect(
      await callForContent(client, "update_event_managers", {
        event_id: event.id,
        action: "add",
        citizen_ids: [deputy.entity.id],
      }),
    ).toMatchObject({
      managers: [{ id: deputy.entity.id, handle: "mcp-stellvertreterin" }],
    });
    expect(
      await callForContent(client, "update_event_managers", {
        event_id: event.id,
        action: "remove",
        citizen_ids: [deputy.entity.id],
      }),
    ).toMatchObject({ managers: [] });

    await expectAuditEvents(prisma, [
      "EVENT_PARTICIPANT_ADDED_BY_MANAGER",
      "EVENT_PARTICIPANT_REMOVED_BY_MANAGER",
      "EVENT_MANAGERS_ASSIGNED",
      "EVENT_MANAGER_REMOVED",
    ]);
  });

  test("delete_event deletes the event, but not an event that is published on Discord", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const pilots = await createRole(prisma, { name: "Piloten" });
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-planerin",
      permissionStrings: ["event;read", `otherRole;read;roleId=${pilots.id}`],
    });
    const event = await createAppEvent(prisma, {
      name: "Abgesagte Übung",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const publishedEvent = await createAppEvent(prisma, {
      name: "Öffentliche Übung",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    // Published to Discord like the publish action records it
    await prisma.event.update({
      where: { id: publishedEvent.id },
      data: {
        discordPublishedId: "1300000000000000001",
        discordPublishedAt: new Date(),
        discordPublishedById: organizer.entity.id,
        discordPublishedLocation: "Port Olisar",
      },
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    // The MCP server cannot reach Discord, thus the Discord event would keep
    // the old data
    expect(
      await callForError(client, "delete_event", {
        event_id: publishedEvent.id,
      }),
    ).toMatch(CONFLICT_RESULT);
    expect(
      await callForError(client, "update_event", {
        event_id: publishedEvent.id,
        name: "Verschobene Übung",
      }),
    ).toMatch(CONFLICT_RESULT);
    // The guild keeps seeing the Discord event of a restricted event
    expect(
      await callForError(client, "update_event", {
        event_id: publishedEvent.id,
        visibility: "restricted",
        visibility_role_ids: [pilots.id],
      }),
    ).toMatch(CONFLICT_RESULT);
    expect(
      await prisma.event.findUniqueOrThrow({
        where: { id: publishedEvent.id },
      }),
    ).toMatchObject({
      name: "Öffentliche Übung",
      visibility: EventVisibility.PUBLIC,
      deletedAt: null,
    });

    expect(
      await callForContent(client, "delete_event", { event_id: event.id }),
    ).toEqual({ event_id: event.id, notifications_sent: true });
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: event.id } }),
    ).toMatchObject({
      deletedAt: expect.any(Date),
      deletedById: organizer.entity.id,
    });
    expect(
      await callForError(client, "get_event", { event_id: event.id }),
    ).toMatch(NOT_FOUND_RESULT);

    await expectAuditEvents(prisma, ["EVENT_DELETED_IN_APP"]);
  });

  test("a user who cannot manage the event cannot change it, and create_event needs event;create", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createCitizen(prisma, { handle: "mcp-chefin" });
    const bystander = await createMcpCitizen(prisma, {
      handle: "mcp-zuschauer",
      permissionStrings: ["event;read"],
    });
    const event = await createAppEvent(prisma, {
      name: "Geschlossene Runde",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(bystander.user)).accessToken,
    );

    const toolNames = await client.listToolNames();
    expect(toolNames).toEqual(
      expect.arrayContaining(["update_event", "update_my_event_participation"]),
    );
    expect(toolNames).not.toContain("create_event");
    await expect(
      client.callTool("create_event", {
        name: "Eigene Runde",
        start_time: START_TIME,
        end_time: END_TIME,
        visibility: "public",
      }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });

    expect(
      await callForError(client, "update_event", {
        event_id: event.id,
        name: "Übernommene Runde",
      }),
    ).toMatch(FORBIDDEN_RESULT);
    expect(
      await callForError(client, "delete_event", { event_id: event.id }),
    ).toMatch(FORBIDDEN_RESULT);
    expect(
      await callForError(client, "update_event_managers", {
        event_id: event.id,
        action: "add",
        citizen_ids: [bystander.entity.id],
      }),
    ).toMatch(FORBIDDEN_RESULT);

    expect(
      await prisma.event.findUniqueOrThrow({
        where: { id: event.id },
        include: { managers: true },
      }),
    ).toMatchObject({
      name: "Geschlossene Runde",
      deletedAt: null,
      managers: [],
    });
    expect(
      await prisma.auditEvent.count({
        where: { type: { startsWith: "EVENT_" } },
      }),
    ).toBe(0);
  });
});
