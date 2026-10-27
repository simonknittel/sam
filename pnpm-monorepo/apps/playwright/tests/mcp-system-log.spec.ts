import type { AuditEvent, PrismaClient } from "@sam-monorepo/database/client";
import { createMcpCitizen, ONE_MINUTE_MS } from "../fixtures/factories";
import { callForContent } from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

const TOOL_NAME = "list_audit_events";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * ONE_MINUTE_MS);

/**
 * Creates five events with distinct times, from the oldest to the newest:
 * a task by the viewer, a ship without a creator, a read by a colleague
 * through the MCP server, a task by the colleague (done through the MCP
 * server) and a high-volume wiki visit by the viewer.
 * The returned window contains only these events. The stack writes events of
 * its own at the current time (the login and the OAuth grant of the viewer),
 * and the window ends before them.
 */
const seedAuditEvents = async (
  prisma: PrismaClient,
  {
    viewerUserId,
    viewerCitizenId,
    colleagueUserId,
  }: {
    readonly viewerUserId: string;
    readonly viewerCitizenId: string;
    readonly colleagueUserId: string;
  },
) => {
  const taskOfViewer = await prisma.auditEvent.create({
    data: {
      type: "TASK_CREATED",
      data: { taskIds: ["task-a"], visibility: "PUBLIC", rewardType: "TEXT" },
      createdById: viewerUserId,
      createdAt: minutesAgo(40),
    },
  });
  const ship = await prisma.auditEvent.create({
    data: {
      type: "SHIP_CREATED_V2",
      data: { shipId: "ship-a", ownerId: "citizen-a", variantId: "variant-a" },
      createdById: null,
      createdAt: minutesAgo(30),
    },
  });
  const readOfColleague = await prisma.auditEvent.create({
    data: {
      type: "TASK_READ",
      data: { arguments: { task_id: "task-a" } },
      createdById: colleagueUserId,
      triggeredViaMcp: true,
      createdAt: minutesAgo(25),
    },
  });
  const taskOfColleague = await prisma.auditEvent.create({
    data: {
      type: "TASK_CREATED",
      data: { taskIds: ["task-b"], visibility: "PUBLIC", rewardType: "TEXT" },
      createdById: colleagueUserId,
      triggeredViaMcp: true,
      createdAt: minutesAgo(20),
    },
  });
  const wikiVisit = await prisma.auditEvent.create({
    data: {
      type: "WIKI_PAGE_VISITED",
      data: { pageId: "page-a", citizenId: viewerCitizenId },
      createdById: viewerUserId,
      createdAt: minutesAgo(10),
    },
  });

  return {
    taskOfViewer,
    ship,
    readOfColleague,
    taskOfColleague,
    wikiVisit,
    window: {
      from: minutesAgo(45).toISOString(),
      to: minutesAgo(5).toISOString(),
    },
  };
};

/** Matches the events with these ids in this order, and no other event */
const eventsWithIds = (...auditEvents: readonly AuditEvent[]) => ({
  events: auditEvents.map((auditEvent) => ({ id: auditEvent.id })),
});

test.describe("the list_audit_events tool of the MCP server", () => {
  test("the events come newest first, the high-volume types and the reads need a request, the filters narrow the events, a cursor pages through them, and each call is a read", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const viewer = await createMcpCitizen(prisma, {
      handle: "mcp-protokoll-betrachter",
      permissionStrings: ["systemLog;read"],
    });
    const colleague = await createMcpCitizen(prisma, {
      handle: "mcp-protokoll-kollege",
    });
    const {
      taskOfViewer,
      ship,
      readOfColleague,
      taskOfColleague,
      wikiVisit,
      window,
    } = await seedAuditEvents(prisma, {
      viewerUserId: viewer.user.id,
      viewerCitizenId: viewer.entity.id,
      colleagueUserId: colleague.user.id,
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(viewer.user)).accessToken,
    );

    expect(await client.listToolNames()).toContain(TOOL_NAME);

    // Without a filter for the types, the wiki visit and the read are hidden
    expect(await callForContent(client, TOOL_NAME, window)).toEqual({
      events: [
        {
          id: taskOfColleague.id,
          type: "TASK_CREATED",
          created_at: taskOfColleague.createdAt.toISOString(),
          created_by: {
            user_id: colleague.user.id,
            name: "mcp-protokoll-kollege",
            citizen: {
              id: colleague.entity.id,
              handle: "mcp-protokoll-kollege",
            },
          },
          triggered_via_mcp: true,
          data: {
            taskIds: ["task-b"],
            visibility: "PUBLIC",
            rewardType: "TEXT",
          },
        },
        {
          id: ship.id,
          type: "SHIP_CREATED_V2",
          created_at: ship.createdAt.toISOString(),
          created_by: null,
          triggered_via_mcp: false,
          data: {
            shipId: "ship-a",
            ownerId: "citizen-a",
            variantId: "variant-a",
          },
        },
        {
          id: taskOfViewer.id,
          type: "TASK_CREATED",
          created_at: taskOfViewer.createdAt.toISOString(),
          created_by: {
            user_id: viewer.user.id,
            name: "mcp-protokoll-betrachter",
            citizen: {
              id: viewer.entity.id,
              handle: "mcp-protokoll-betrachter",
            },
          },
          triggered_via_mcp: false,
          data: {
            taskIds: ["task-a"],
            visibility: "PUBLIC",
            rewardType: "TEXT",
          },
        },
      ],
      next_cursor: null,
    });

    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        include_high_volume: true,
      }),
    ).toMatchObject(
      eventsWithIds(wikiVisit, taskOfColleague, ship, taskOfViewer),
    );
    // A filter for the types shows the named types, also the high-volume ones
    // and the reads
    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        types: ["WIKI_PAGE_VISITED"],
      }),
    ).toMatchObject(eventsWithIds(wikiVisit));
    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        types: ["TASK_READ"],
      }),
    ).toMatchObject(eventsWithIds(readOfColleague));

    // The access filter gives only the reads, or the reads and the writes
    expect(
      await callForContent(client, TOOL_NAME, { ...window, access: "read" }),
    ).toMatchObject(eventsWithIds(readOfColleague));
    expect(
      await callForContent(client, TOOL_NAME, { ...window, access: "all" }),
    ).toMatchObject(
      eventsWithIds(taskOfColleague, readOfColleague, ship, taskOfViewer),
    );

    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        created_by_user_ids: [viewer.user.id],
      }),
    ).toMatchObject(eventsWithIds(taskOfViewer));
    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        created_by_citizen_ids: [viewer.entity.id],
      }),
    ).toMatchObject(eventsWithIds(taskOfViewer));

    // The filter for the MCP server keeps its events, or drops them
    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        triggered_via_mcp: true,
      }),
    ).toMatchObject(eventsWithIds(taskOfColleague));
    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        triggered_via_mcp: false,
      }),
    ).toMatchObject(eventsWithIds(ship, taskOfViewer));

    // The start of the time range is inclusive, the end is exclusive
    expect(
      await callForContent(client, TOOL_NAME, {
        from: ship.createdAt.toISOString(),
        to: taskOfColleague.createdAt.toISOString(),
      }),
    ).toMatchObject(eventsWithIds(ship));

    const firstPage = await callForContent(client, TOOL_NAME, {
      ...window,
      limit: 1,
    });
    expect(firstPage).toMatchObject(eventsWithIds(taskOfColleague));
    expect(firstPage.next_cursor).toEqual(expect.any(String));

    const secondPage = await callForContent(client, TOOL_NAME, {
      ...window,
      limit: 1,
      cursor: firstPage.next_cursor,
    });
    expect(secondPage).toMatchObject(eventsWithIds(ship));
    expect(secondPage.next_cursor).toEqual(expect.any(String));

    expect(
      await callForContent(client, TOOL_NAME, {
        ...window,
        limit: 1,
        cursor: secondPage.next_cursor,
      }),
    ).toMatchObject({ ...eventsWithIds(taskOfViewer), next_cursor: null });

    // Each successful call of the tool wrote its read through the MCP server
    // with the parsed arguments, but not with the result
    const reads = await prisma.auditEvent.findMany({
      where: { type: "AUDIT_EVENTS_LISTED", createdById: viewer.user.id },
      select: { triggeredViaMcp: true, data: true },
    });
    expect(reads).toHaveLength(14);
    expect(reads.every((read) => read.triggeredViaMcp)).toBe(true);
    expect(reads).toContainEqual({
      triggeredViaMcp: true,
      data: {
        arguments: {
          ...window,
          access: "all",
          include_high_volume: false,
          limit: 25,
        },
      },
    });
  });

  test("the email addresses in the payloads are redacted, also in an older payload that is a JSON-encoded string", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const viewer = await createMcpCitizen(prisma, {
      handle: "mcp-protokoll-datenschutz",
      permissionStrings: ["systemLog;read"],
    });
    const login = await prisma.auditEvent.create({
      data: {
        type: "USER_LOGIN_V3",
        data: {
          userId: viewer.user.id,
          userEmail: "jane.doe@example.org",
          userName: "Jane",
          discordTwoFactorEnabled: true,
        },
        createdById: viewer.user.id,
        createdAt: minutesAgo(20),
      },
    });
    const confirmation = await prisma.auditEvent.create({
      data: {
        type: "EMAIL_CONFIRMATION_REQUESTED",
        data: JSON.stringify({
          userId: viewer.user.id,
          email: "jane.doe@example.org",
        }),
        createdById: viewer.user.id,
        createdAt: minutesAgo(10),
      },
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(viewer.user)).accessToken,
    );

    const result = await callForContent(client, TOOL_NAME, {
      types: ["USER_LOGIN_V3", "EMAIL_CONFIRMATION_REQUESTED"],
      from: minutesAgo(30).toISOString(),
      to: minutesAgo(5).toISOString(),
    });

    expect(result).toMatchObject({
      events: [
        {
          id: confirmation.id,
          data: JSON.stringify({
            userId: viewer.user.id,
            email: "j***e@e***e.org",
          }),
        },
        {
          id: login.id,
          data: {
            userId: viewer.user.id,
            userEmail: "j***e@e***e.org",
            userName: "Jane",
            discordTwoFactorEnabled: true,
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("jane.doe@example.org");
  });
});
