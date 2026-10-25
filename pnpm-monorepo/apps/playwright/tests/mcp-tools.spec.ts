import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  TaskRewardType,
  TaskVisibility,
} from "@sam-monorepo/database/client";
import {
  addCitizenToOrganization,
  createAppEvent,
  createCitizen,
  createMcpCitizen,
  createRole,
  createVariant,
  createWikiPage,
  futureEvent,
  LINEUP_PERMISSIONS,
  wikiDocument,
  wikiHeading,
  WikiPageAccessType,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  FORBIDDEN_RESULT,
  NOT_FOUND_RESULT,
  UNKNOWN_TOOL_ERROR_CODE,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

/**
 * The tools that each user with a citizen sees: they need no permission, or
 * they check each item (the wiki pages, the own citizen). In the order of
 * `tools/list`: by group, then by name.
 */
const TOOLS_WITHOUT_PERMISSION = [
  "get_current_user",
  "list_my_notifications",
  "update_notification",
  "get_citizen",
  "get_permission_catalog",
  "get_wiki_page",
  "list_wiki_pages",
  "search_wiki",
  "list_changelog_entries",
];

test.describe("the read tools of the MCP server", () => {
  test("a user without permissions sees only the tools that need none, and reads only the own citizen", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const outsider = await createMcpCitizen(prisma, {
      handle: "mcp-ohne-rechte",
    });
    const stranger = await createCitizen(prisma, { handle: "mcp-fremder" });
    const client = await connectMcpClient(
      (await authorizeMcpClient(outsider.user)).accessToken,
    );

    expect(await client.listToolNames()).toEqual(TOOLS_WITHOUT_PERMISSION);
    await expect(client.callTool("list_citizens")).rejects.toMatchObject({
      code: UNKNOWN_TOOL_ERROR_CODE,
    });

    expect(
      await callForContent(client, "get_citizen", {
        citizen_id: outsider.entity.id,
      }),
    ).toMatchObject({ id: outsider.entity.id, handle: "mcp-ohne-rechte" });
    expect(
      await callForError(client, "get_citizen", {
        citizen_id: stranger.entity.id,
      }),
    ).toMatch(FORBIDDEN_RESULT);
  });

  test("spynet: the search, the citizens, the organization and only the notes of the permitted note types", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const observation = await prisma.noteType.create({
      data: { name: "Beobachtung" },
    });
    const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
    const secret = await prisma.classificationLevel.create({
      data: { name: "Geheim" },
    });
    const analyst = await createMcpCitizen(prisma, {
      handle: "mcp-analyst",
      permissionStrings: [
        "citizen;read",
        // The citizens table of the Spynet
        "spynetCitizen;read",
        "organization;read",
        "organizationMembership;read",
        `note;read;noteTypeId=${observation.id};classificationLevelId=*`,
      ],
    });
    const target = await createCitizen(prisma, { handle: "komet-pilot" });
    const organization = await prisma.organization.create({
      data: { name: "Roter Komet", spectrumId: "ROTKOMET" },
    });
    await prisma.activeOrganizationMembership.create({
      data: {
        organizationId: organization.id,
        citizenId: target.entity.id,
        type: OrganizationMembershipType.MAIN,
        visibility: OrganizationMembershipVisibility.PUBLIC,
      },
    });
    const confirmation = {
      confirmed: ConfirmationStatus.CONFIRMED,
      confirmedAt: new Date(),
    };
    await prisma.citizenLog.createMany({
      data: [
        {
          citizenId: target.entity.id,
          type: "note",
          content: "Fliegt eine Cutlass Black.",
          noteTypeId: observation.id,
          classificationLevelId: secret.id,
          ...confirmation,
        },
        {
          citizenId: target.entity.id,
          type: "note",
          content: "Soll Schulden haben.",
          noteTypeId: rumour.id,
          classificationLevelId: secret.id,
          ...confirmation,
        },
      ],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(analyst.user)).accessToken,
    );

    const search = await callForContent(
      client,
      "search_citizens_and_organizations",
      { query: "komet" },
    );
    expect(search.hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "citizen", id: target.entity.id }),
        expect.objectContaining({ type: "organization", id: organization.id }),
      ]),
    );

    const citizens = await callForContent(client, "list_citizens");
    expect(citizens.citizens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: target.entity.id,
          handle: "komet-pilot",
        }),
      ]),
    );

    expect(
      await callForContent(client, "get_citizen", {
        citizen_id: target.entity.id,
      }),
    ).toMatchObject({
      handle: "komet-pilot",
      organization_memberships: [
        { organization: { id: organization.id, name: "Roter Komet" } },
      ],
    });

    expect(
      await callForContent(client, "get_organization", {
        organization_id: organization.id,
      }),
    ).toMatchObject({
      name: "Roter Komet",
      memberships: [
        { citizen: { id: target.entity.id, handle: "komet-pilot" } },
      ],
    });

    const notes = await callForContent(client, "list_citizen_notes", {
      citizen_id: target.entity.id,
    });
    expect(notes.notes).toEqual([
      expect.objectContaining({
        redacted: false,
        note_type: { id: observation.id, name: "Beobachtung" },
        content: "Fliegt eine Cutlass Black.",
      }),
    ]);
  });

  test("penalty points: the own entries, but not the entries of all citizens", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const penalized = await createMcpCitizen(prisma, {
      handle: "mcp-verwarnter",
      // The app shows the own entries on the profile of the citizen
      permissionStrings: ["ownPenaltyEntry;read", "citizen;read"],
    });
    const withoutProfile = await createMcpCitizen(prisma, {
      handle: "mcp-ohne-profil",
      permissionStrings: ["ownPenaltyEntry;read"],
    });
    const other = await createCitizen(prisma, { handle: "mcp-anderer" });
    await prisma.penaltyEntry.createMany({
      data: [
        {
          citizenId: penalized.entity.id,
          points: 3,
          reason: "Zu spät zum Event",
        },
        { citizenId: other.entity.id, points: 5, reason: "Fremder Eintrag" },
      ],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(penalized.user)).accessToken,
    );

    const ownEntries = await callForContent(client, "list_penalty_entries", {
      citizen_id: penalized.entity.id,
    });
    expect(ownEntries.entries).toEqual([
      expect.objectContaining({
        citizen: expect.objectContaining({ id: penalized.entity.id }),
        points: 3,
        reason: "Zu spät zum Event",
      }),
    ]);

    expect(await callForError(client, "list_penalty_entries")).toMatch(
      FORBIDDEN_RESULT,
    );

    const clientWithoutProfile = await connectMcpClient(
      (await authorizeMcpClient(withoutProfile.user)).accessToken,
    );
    expect(await clientWithoutProfile.listToolNames()).not.toContain(
      "list_penalty_entries",
    );
    await expect(
      clientWithoutProfile.callTool("list_penalty_entries", {
        citizen_id: withoutProfile.entity.id,
      }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });
  });

  test("fleet: the own ships, the variant search and the fleet of the organization", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const owner = await createMcpCitizen(prisma, {
      handle: "mcp-pilotin",
      permissionStrings: [
        // The page of the own ships needs it
        "ship;manage",
        "orgFleet;read",
        "organizationMembership;read",
      ],
    });
    const neighbour = await createMcpCitizen(prisma, {
      handle: "mcp-nachbar",
      permissionStrings: ["ship;read"],
    });
    await addCitizenToOrganization(prisma, owner);
    const { variant } = await createVariant(prisma, {
      manufacturerName: "Roberts Space Industries",
      seriesName: "Polaris",
      variantName: "Polaris",
    });
    const { variant: otherVariant } = await createVariant(prisma, {
      manufacturerName: "Aegis Dynamics",
      seriesName: "Avenger",
      variantName: "Avenger Titan",
    });
    await prisma.ship.createMany({
      data: [
        { ownerId: owner.entity.id, variantId: variant.id, name: "Nachtfalke" },
        // Neither the own ship nor a ship of the organization
        { ownerId: neighbour.entity.id, variantId: otherVariant.id },
      ],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(owner.user)).accessToken,
    );

    const myShips = await callForContent(client, "list_my_ships");
    expect(myShips.ships).toEqual([
      expect.objectContaining({
        name: "Nachtfalke",
        variant: expect.objectContaining({ id: variant.id, name: "Polaris" }),
      }),
    ]);

    const search = await callForContent(client, "search_ship_variants", {
      query: "Polaris",
    });
    expect(search.variants).toEqual([
      expect.objectContaining({ id: variant.id }),
    ]);

    const orgFleet = await callForContent(client, "list_org_fleet");
    expect(orgFleet).toMatchObject({ total_ships: 1, total_citizens: 1 });
    expect(orgFleet.fleet).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variant: expect.objectContaining({ id: variant.id }),
          count: 1,
        }),
        expect.objectContaining({
          variant: expect.objectContaining({ id: otherVariant.id }),
          count: 0,
        }),
      ]),
    );

    const readerClient = await connectMcpClient(
      (await authorizeMcpClient(neighbour.user)).accessToken,
    );
    expect(await readerClient.listToolNames()).toContain(
      "search_ship_variants",
    );
    await expect(readerClient.callTool("list_my_ships")).rejects.toMatchObject({
      code: UNKNOWN_TOOL_ERROR_CODE,
    });
  });

  test("wiki: the list, the search and the Markdown of the readable pages", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const reader = await createMcpCitizen(prisma, { handle: "mcp-leser" });
    const secretRole = await createRole(prisma, { name: "mcp-geheim" });
    const page = await createWikiPage(prisma, {
      title: "Sprungpunkte",
      visibility: WikiPageVisibility.PUBLIC,
      content: wikiDocument(
        wikiHeading(2, "Route nach Pyro"),
        wikiParagraph("Der Sprungpunkt liegt im Stanton-System."),
      ),
    });
    const secretPage = await createWikiPage(prisma, {
      title: "Geheimplan",
      visibility: WikiPageVisibility.RESTRICTED,
      roleAccess: [{ roleId: secretRole.id, type: WikiPageAccessType.READ }],
      content: wikiDocument(wikiParagraph("Ein geheimer Sprungpunkt.")),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(reader.user)).accessToken,
    );

    const list = await callForContent(client, "list_wiki_pages");
    expect(list.pages).toEqual([
      expect.objectContaining({ id: page.id, title: "Sprungpunkte" }),
    ]);

    const search = await callForContent(client, "search_wiki", {
      query: "Sprungpunkt",
    });
    expect(search.pages).toEqual([expect.objectContaining({ id: page.id })]);

    const wikiPage = await callForContent(client, "get_wiki_page", {
      page_id: page.id,
    });
    expect(wikiPage.title).toBe("Sprungpunkte");
    expect(wikiPage.markdown).toContain("## Route nach Pyro");
    expect(wikiPage.markdown).toContain(
      "Der Sprungpunkt liegt im Stanton-System.",
    );

    // A page that the user cannot read does not exist for the user
    expect(
      await callForError(client, "get_wiki_page", { page_id: secretPage.id }),
    ).toMatch(NOT_FOUND_RESULT);
  });

  test("events and lineup: the list, the details and the lineup only while it is enabled", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createCitizen(prisma, {
      handle: "mcp-organisator",
    });
    const participant = await createMcpCitizen(prisma, {
      handle: "mcp-teilnehmer",
      permissionStrings: LINEUP_PERMISSIONS,
    });
    const convoy = await createAppEvent(prisma, {
      name: "Konvoi nach Pyro",
      createdById: organizer.entity.id,
      ...futureEvent(),
      lineupEnabled: true,
    });
    await prisma.eventPosition.create({
      data: { eventId: convoy.id, name: "Begleitjäger", order: 0 },
    });
    const briefing = await createAppEvent(prisma, {
      name: "Lagebesprechung",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(participant.user)).accessToken,
    );

    const events = await callForContent(client, "list_events");
    expect(events.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: convoy.id, name: "Konvoi nach Pyro" }),
        expect.objectContaining({ id: briefing.id, name: "Lagebesprechung" }),
      ]),
    );

    expect(
      await callForContent(client, "get_event", { event_id: convoy.id }),
    ).toMatchObject({
      name: "Konvoi nach Pyro",
      created_by: { id: organizer.entity.id, handle: "mcp-organisator" },
      lineup_enabled: true,
      can_manage: false,
    });

    const lineup = await callForContent(client, "get_event_lineup", {
      event_id: convoy.id,
    });
    expect(lineup.positions).toEqual([
      expect.objectContaining({ name: "Begleitjäger", children: [] }),
    ]);

    expect(
      await callForError(client, "get_event_lineup", { event_id: briefing.id }),
    ).toMatch(FORBIDDEN_RESULT);
  });

  test("tasks: the list and the details of the visible tasks", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const creator = await createCitizen(prisma, { handle: "mcp-auftraggeber" });
    const worker = await createMcpCitizen(prisma, {
      handle: "mcp-auftragnehmer",
      permissionStrings: ["task;read"],
    });
    const secretRole = await createRole(prisma);
    const escort = await prisma.task.create({
      data: {
        title: "Frachter eskortieren",
        visibility: TaskVisibility.PUBLIC,
        rewardType: TaskRewardType.SILC,
        rewardSilcValue: 50,
        createdById: creator.entity.id,
      },
    });
    // Only for the citizens with the role
    const hiddenTask = await prisma.task.create({
      data: {
        title: "Geheimer Auftrag",
        visibility: TaskVisibility.PUBLIC,
        rewardType: TaskRewardType.TEXT,
        rewardTypeTextValue: "Ruhm und Ehre",
        createdById: creator.entity.id,
        hiddenForOtherRoles: true,
        requiredRoles: { connect: { id: secretRole.id } },
      },
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(worker.user)).accessToken,
    );

    const tasks = await callForContent(client, "list_tasks");
    expect(tasks.tasks).toEqual([
      expect.objectContaining({ id: escort.id, title: "Frachter eskortieren" }),
    ]);

    expect(
      await callForContent(client, "get_task", { task_id: escort.id }),
    ).toMatchObject({
      title: "Frachter eskortieren",
      status: "open",
      reward: { type: "silc", value: 50 },
      created_by: { id: creator.entity.id, handle: "mcp-auftraggeber" },
    });

    expect(
      await callForError(client, "get_task", { task_id: hiddenTask.id }),
    ).toMatch(NOT_FOUND_RESULT);
  });

  test("changelog: the entry of the MCP server with its Markdown", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-neugierig" });
    const client = await connectMcpClient(
      (await authorizeMcpClient(citizen.user)).accessToken,
    );
    const key = "2026-10-18-mcp-server";

    const list = (await callForContent(client, "list_changelog_entries")) as {
      entries: { key: string; title: string; markdown: string }[];
    };
    const entry = list.entries.find((candidate) => candidate.key === key);
    expect(entry).toMatchObject({
      is_tracked: true,
      title: "MCP-Server für KI-Clients",
    });
    expect(entry?.markdown).toContain("/app/account/mcp");
  });
});
