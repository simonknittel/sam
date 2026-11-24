import { WikiPageNamespace } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createMcpCitizen,
  createWikiPage,
  futureEvent,
  ONE_DAY_MS,
  WikiPageVisibility,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  CONFLICT_RESULT,
  FORBIDDEN_RESULT,
  NOT_FOUND_RESULT,
  UNKNOWN_TOOL_ERROR_CODE,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

test.describe("the wiki write tool of the MCP server", () => {
  test("create_wiki_page creates a private top-level page with the Markdown content and the audit event of the form", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const author = await createMcpCitizen(prisma, {
      handle: "mcp-autorin",
      permissionStrings: ["wiki;create"],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(author.user)).accessToken,
    );

    const createTool = (await client.listTools()).find(
      (tool) => tool.name === "create_wiki_page",
    );
    expect(createTool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
    });

    const created = await callForContent(client, "create_wiki_page", {
      title: "Einsatzplan",
      markdown:
        "## Ablauf\n\nWir treffen uns am **Hangar**.\n\n- Schiffe prüfen\n- Funk testen",
    });
    const page = await prisma.wikiPage.findFirstOrThrow();
    expect(created).toMatchObject({
      id: page.id,
      title: "Einsatzplan",
      slug: "einsatzplan",
      path: `/app/wiki/${page.id}/einsatzplan`,
      parent_id: null,
      event_id: null,
      can_add_children: true,
    });
    expect(created.markdown).toContain("## Ablauf");

    // The content went through the collab server into the stored page
    const readBack = await callForContent(client, "get_wiki_page", {
      page_id: page.id,
    });
    expect(readBack.markdown).toContain("## Ablauf");
    expect(readBack.markdown).toContain("Wir treffen uns am **Hangar**.");
    expect(readBack.markdown).toContain("- Schiffe prüfen");

    expect(
      await prisma.wikiPage.findUniqueOrThrow({
        where: { id: page.id },
        select: {
          namespace: true,
          visibility: true,
          ownerId: true,
          createdById: true,
        },
      }),
    ).toEqual({
      namespace: WikiPageNamespace.WIKI,
      visibility: WikiPageVisibility.RESTRICTED,
      ownerId: author.entity.id,
      createdById: author.entity.id,
    });

    // The content writes the event of an editor session
    await expectAuditEvents(prisma, ["WIKI_PAGE_CREATED", "WIKI_PAGE_UPDATED"]);
    expect(
      await prisma.auditEvent.findMany({
        where: { type: { in: ["WIKI_PAGE_CREATED", "WIKI_PAGE_UPDATED"] } },
        select: { type: true, createdById: true, data: true },
        orderBy: { type: "asc" },
      }),
    ).toEqual([
      {
        type: "WIKI_PAGE_CREATED",
        createdById: author.user.id,
        data: { pageId: page.id, title: "Einsatzplan", parentId: null },
      },
      {
        type: "WIKI_PAGE_UPDATED",
        createdById: author.user.id,
        data: { pageId: page.id },
      },
    ]);
  });

  test("create_wiki_page adds a page to the briefing of a managed event, but not after the event", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const organizer = await createMcpCitizen(prisma, {
      handle: "mcp-organisator",
      permissionStrings: ["event;read"],
    });
    const event = await createAppEvent(prisma, {
      name: "Konvoi nach Pyro",
      createdById: organizer.entity.id,
      ...futureEvent(),
    });
    const [rootPage] = event.wikiPages;
    const pastEvent = await createAppEvent(prisma, {
      name: "Vergangener Konvoi",
      createdById: organizer.entity.id,
      startTime: new Date(Date.now() - 2 * ONE_DAY_MS),
      endTime: new Date(Date.now() - ONE_DAY_MS),
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(organizer.user)).accessToken,
    );

    const created = await callForContent(client, "create_wiki_page", {
      title: "Treffpunkt",
      event_id: event.id,
      markdown: "Wir starten am **Hangar 3**.",
    });
    const page = await prisma.wikiPage.findFirstOrThrow({
      where: { title: "Treffpunkt" },
    });
    expect(created).toMatchObject({
      id: page.id,
      path: `/app/events/${event.id}/briefing/${page.id}/treffpunkt`,
      parent_id: rootPage?.id,
      event_id: event.id,
    });
    expect(created.markdown).toContain("Wir starten am **Hangar 3**.");
    expect(page).toMatchObject({
      namespace: WikiPageNamespace.EVENT,
      eventId: event.id,
      parentId: rootPage?.id,
      ownerId: null,
    });

    expect(
      await callForError(client, "create_wiki_page", {
        title: "Nachtrag",
        event_id: pastEvent.id,
      }),
    ).toMatch(CONFLICT_RESULT);
    expect(
      await prisma.wikiPage.count({ where: { eventId: pastEvent.id } }),
    ).toBe(1);

    await expectAuditEvents(prisma, ["WIKI_PAGE_CREATED"]);
    expect(
      await prisma.auditEvent.findMany({
        where: { type: "WIKI_PAGE_CREATED" },
        select: { createdById: true, data: true },
      }),
    ).toEqual([
      {
        createdById: organizer.user.id,
        data: {
          pageId: page.id,
          eventId: event.id,
          title: "Treffpunkt",
          parentId: rootPage?.id,
        },
      },
    ]);
  });

  test("create_wiki_page is not available without a wiki or event permission and needs the management of the parent", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const outsider = await createMcpCitizen(prisma, {
      handle: "mcp-ohne-rechte",
    });
    const author = await createMcpCitizen(prisma, {
      handle: "mcp-autor",
      permissionStrings: ["wiki;create"],
    });
    // Each user reads it, but nobody except wiki;manage manages it
    const publicPage = await createWikiPage(prisma, {
      title: "Regeln",
      visibility: WikiPageVisibility.PUBLIC,
    });

    const outsiderClient = await connectMcpClient(
      (await authorizeMcpClient(outsider.user)).accessToken,
    );
    expect(await outsiderClient.listToolNames()).not.toContain(
      "create_wiki_page",
    );
    await expect(
      outsiderClient.callTool("create_wiki_page", { title: "Spam" }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });

    const authorClient = await connectMcpClient(
      (await authorizeMcpClient(author.user)).accessToken,
    );
    expect(
      await callForContent(authorClient, "get_wiki_page", {
        page_id: publicPage.id,
      }),
    ).toMatchObject({ id: publicPage.id, can_add_children: false });
    expect(
      await callForError(authorClient, "create_wiki_page", {
        title: "Unterseite",
        parent_id: publicPage.id,
      }),
    ).toMatch(FORBIDDEN_RESULT);
    expect(
      await callForError(authorClient, "create_wiki_page", {
        title: "Unterseite",
        parent_id: "unknownpage00000000000000",
      }),
    ).toMatch(NOT_FOUND_RESULT);

    expect(await prisma.wikiPage.count()).toBe(1);
  });
});
