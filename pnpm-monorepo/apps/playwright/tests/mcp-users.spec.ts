import type { User } from "@sam-monorepo/database/client";
import {
  createCitizen,
  createMcpCitizen,
  ONE_MINUTE_MS,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  FORBIDDEN_RESULT,
  NOT_FOUND_RESULT,
  UNKNOWN_TOOL_ERROR_CODE,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * ONE_MINUTE_MS);

/**
 * The factories give each user the address `<handle>-<suffix>@example.com`.
 * The redaction keeps the first and the last character of the local part and
 * of the domain name, and the top-level domain.
 */
const redactedEmailOf = (user: User) => {
  const localPart = user.email?.split("@")[0] ?? "";
  return `${localPart.at(0)}***${localPart.at(-1)}@e***e.com`;
};

/** Matches the users with these ids in this order, and no other user */
const usersWithIds = (...users: readonly User[]) => ({
  users: users.map((user) => ({ id: user.id })),
});

test.describe("the user tools of the MCP server", () => {
  test("list_users gives the users with redacted email addresses, the newest first, the filters narrow them, a cursor pages through them, and get_user gives one user", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const viewer = await createMcpCitizen(prisma, {
      handle: "mcp-nutzer-leser",
      permissionStrings: ["user;read"],
    });
    const banned = await createCitizen(prisma, {
      handle: "mcp-nutzer-gesperrt",
    });
    const withoutTwoFactor = await createCitizen(prisma, {
      handle: "mcp-nutzer-ohne-2fa",
      discordTwoFactorEnabled: null,
    });
    await prisma.user.update({
      where: { id: viewer.user.id },
      data: { createdAt: minutesAgo(30) },
    });
    const bannedUser = await prisma.user.update({
      where: { id: banned.user.id },
      data: {
        createdAt: minutesAgo(20),
        bannedAt: minutesAgo(15),
        bannedReason: "Spam",
        bannedById: viewer.entity.id,
      },
    });
    await prisma.user.update({
      where: { id: withoutTwoFactor.user.id },
      data: { createdAt: minutesAgo(10) },
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(viewer.user)).accessToken,
    );

    expect(await client.listToolNames()).toEqual(
      expect.arrayContaining(["get_user", "list_users"]),
    );

    const allUsers = await callForContent(client, "list_users");
    expect(allUsers).toMatchObject({
      ...usersWithIds(withoutTwoFactor.user, banned.user, viewer.user),
      next_cursor: null,
    });
    expect(JSON.stringify(allUsers)).not.toContain("@example.com");

    const bannedOutput = {
      id: banned.user.id,
      name: "mcp-nutzer-gesperrt",
      email: redactedEmailOf(banned.user),
      email_verified_at: banned.user.emailVerified?.toISOString(),
      created_at: bannedUser.createdAt?.toISOString(),
      role: "user",
      discord_id: banned.entity.discordId,
      discord_two_factor_enabled: true,
      citizen: { id: banned.entity.id, handle: "mcp-nutzer-gesperrt" },
      ban: {
        banned_at: bannedUser.bannedAt?.toISOString(),
        reason: "Spam",
        banned_by: { id: viewer.entity.id, handle: "mcp-nutzer-leser" },
      },
    };
    expect(
      await callForContent(client, "get_user", { user_id: banned.user.id }),
    ).toEqual({ ...bannedOutput, client: null });
    expect(
      await callForContent(client, "list_users", { query: "GESPERRT" }),
    ).toEqual({ users: [bannedOutput], next_cursor: null });

    expect(
      await callForContent(client, "list_users", { ban_status: "banned" }),
    ).toMatchObject(usersWithIds(banned.user));
    expect(
      await callForContent(client, "list_users", { ban_status: "active" }),
    ).toMatchObject(usersWithIds(withoutTwoFactor.user, viewer.user));
    expect(
      await callForContent(client, "list_users", {
        two_factor_status: "unknown",
      }),
    ).toMatchObject(usersWithIds(withoutTwoFactor.user));

    const firstPage = await callForContent(client, "list_users", { limit: 2 });
    expect(firstPage).toMatchObject(
      usersWithIds(withoutTwoFactor.user, banned.user),
    );
    expect(firstPage.next_cursor).toEqual(expect.any(String));
    expect(
      await callForContent(client, "list_users", {
        limit: 2,
        cursor: firstPage.next_cursor,
      }),
    ).toMatchObject({ ...usersWithIds(viewer.user), next_cursor: null });
    expect(
      await callForError(client, "list_users", { cursor: "not-a-cursor" }),
    ).toMatch(VALIDATION_RESULT);

    expect(
      await callForError(client, "get_user", {
        user_id: "clxxxxxxxxxxxxxxxxxxxxxxx",
      }),
    ).toMatch(NOT_FOUND_RESULT);

    // Each successful call wrote its read with the parsed arguments
    expect(
      await prisma.auditEvent.findMany({
        where: { type: "USER_READ", createdById: viewer.user.id },
        select: { triggeredViaMcp: true, data: true },
      }),
    ).toEqual([
      {
        triggeredViaMcp: true,
        data: { arguments: { user_id: banned.user.id } },
      },
    ]);
  });

  test("a user without user;read sees get_user, but not list_users, and gets only the own user", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const member = await createMcpCitizen(prisma, {
      handle: "mcp-nutzer-mitglied",
    });
    const stranger = await createCitizen(prisma, {
      handle: "mcp-nutzer-fremd",
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(member.user)).accessToken,
    );

    const toolNames = await client.listToolNames();
    expect(toolNames).toContain("get_user");
    expect(toolNames).not.toContain("list_users");
    await expect(client.callTool("list_users")).rejects.toMatchObject({
      code: UNKNOWN_TOOL_ERROR_CODE,
    });

    const ownUser = {
      id: member.user.id,
      email: redactedEmailOf(member.user),
      citizen: { id: member.entity.id, handle: "mcp-nutzer-mitglied" },
      ban: null,
      client: {
        admin_mode: false,
        permission_count: 2,
        tool_groups: expect.arrayContaining(["users"]),
        settings_page_url: expect.stringMatching(/\/app\/mcp$/),
      },
    };
    expect(await callForContent(client, "get_user")).toMatchObject(ownUser);
    expect(
      await callForContent(client, "get_user", { user_id: member.user.id }),
    ).toMatchObject(ownUser);
    expect(
      await callForError(client, "get_user", { user_id: stranger.user.id }),
    ).toMatch(FORBIDDEN_RESULT);
  });
});
