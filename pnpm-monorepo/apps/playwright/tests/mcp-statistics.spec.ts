import { createMcpCitizen } from "../fixtures/factories";
import {
  callForContent,
  callForError,
  UNKNOWN_TOOL_ERROR_CODE,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

test.describe("the statistics tools of the MCP server", () => {
  test("only a user with globalStatistics;read gets the tools, a successful call writes its read with the arguments, and a failed call writes none", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const outsider = await createMcpCitizen(prisma, {
      handle: "mcp-statistik-ohne-recht",
    });
    const analyst = await createMcpCitizen(prisma, {
      handle: "mcp-statistik-leser",
      permissionStrings: ["globalStatistics;read"],
    });
    await prisma.dailyLoginCount.createMany({
      data: [
        { date: new Date("2026-01-15"), count: 4 },
        { date: new Date("2026-01-16"), count: 6 },
      ],
    });

    const outsiderClient = await connectMcpClient(
      (await authorizeMcpClient(outsider.user)).accessToken,
    );
    const outsiderToolNames = await outsiderClient.listToolNames();
    expect(outsiderToolNames).not.toContain("list_statistics");
    expect(outsiderToolNames).not.toContain("get_statistic");
    await expect(
      outsiderClient.callTool("get_statistic", { key: "logins" }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });

    const client = await connectMcpClient(
      (await authorizeMcpClient(analyst.user)).accessToken,
    );
    expect(await client.listToolNames()).toEqual(
      expect.arrayContaining(["get_statistic", "list_statistics"]),
    );

    expect(
      await callForError(client, "get_statistic", {
        key: "logins",
        ids: [analyst.entity.id],
      }),
    ).toMatch(VALIDATION_RESULT);

    const catalog = await callForContent(client, "list_statistics");
    expect(catalog).toMatchObject({ first_day: "2025-12-02" });
    expect(catalog.statistics).toHaveLength(12);
    expect(catalog.statistics).toContainEqual({
      key: "logins",
      title: "Logins",
      description: expect.any(String),
      unit: "count",
      value_kind: "amount_of_day",
      has_multiple_series: false,
      ids_filter: null,
    });

    const logins = { key: "logins", from: "2026-01-15", to: "2026-01-16" };
    expect(await callForContent(client, "get_statistic", logins)).toEqual({
      key: "logins",
      unit: "count",
      from: "2026-01-15",
      to: "2026-01-16",
      days: ["2026-01-15", "2026-01-16"],
      series: [{ id: "logins", name: "Logins", values: [4, 6] }],
      total_series: 1,
    });

    // The failed call came first, thus its read would be in place by now
    await expect
      .poll(() =>
        prisma.auditEvent.findMany({
          where: {
            createdById: analyst.user.id,
            type: { in: ["STATISTICS_LISTED", "STATISTIC_READ"] },
          },
          orderBy: { createdAt: "asc" },
          select: { type: true, data: true, triggeredViaMcp: true },
        }),
      )
      .toEqual([
        {
          type: "STATISTICS_LISTED",
          data: { arguments: {} },
          triggeredViaMcp: true,
        },
        {
          type: "STATISTIC_READ",
          data: { arguments: { ...logins, series_limit: 15 } },
          triggeredViaMcp: true,
        },
      ]);
  });
});
