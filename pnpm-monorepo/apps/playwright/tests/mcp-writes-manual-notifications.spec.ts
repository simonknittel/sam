import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createMcpCitizen,
  createRole,
} from "../fixtures/factories";
import {
  callForContent,
  callForError,
  UNKNOWN_TOOL_ERROR_CODE,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

/** The citizen picker of the form needs citizen;read, thus the tool too */
const SENDER_PERMISSIONS = ["manualNotification;manage", "citizen;read"];

test.describe("the manual notification write tool of the MCP server", () => {
  test("send_manual_notification sends to a citizen and a role like the form, with the receivers and the audit event", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const escort = await createRole(prisma, { name: "Geleitschutz" });
    const sender = await createMcpCitizen(prisma, {
      handle: "mcp-absenderin",
      // The role picker of the form offers only the roles that the user can see
      permissionStrings: [
        ...SENDER_PERMISSIONS,
        `otherRole;read;roleId=${escort.id}`,
      ],
    });
    const receiver = await createCitizen(prisma, { handle: "mcp-empfaenger" });
    const client = await connectMcpClient(
      (await authorizeMcpClient(sender.user)).accessToken,
    );

    const result = await callForContent(client, "send_manual_notification", {
      title: "Treffen am Samstag",
      body: "Wir treffen uns um 20 Uhr in Port Tressler.",
      citizen_ids: [receiver.entity.id],
      role_ids: [escort.id],
    });
    expect(result).toMatchObject({
      notification: {
        title: "Treffen am Samstag",
        body: "Wir treffen uns um 20 Uhr in Port Tressler.",
        created_by: { id: sender.entity.id, handle: "mcp-absenderin" },
        receiver_citizens: [
          { id: receiver.entity.id, handle: "mcp-empfaenger" },
        ],
        receiver_roles: [{ id: escort.id, name: "Geleitschutz" }],
      },
      notifications_sent: true,
    });

    const notification = await prisma.manualNotification.findFirstOrThrow();
    expect(notification).toMatchObject({
      createdById: sender.entity.id,
      title: "Treffen am Samstag",
      body: "Wir treffen uns um 20 Uhr in Port Tressler.",
    });
    expect(
      await prisma.manualNotificationCitizen.findMany({
        select: { manualNotificationId: true, citizenId: true },
      }),
    ).toEqual([
      { manualNotificationId: notification.id, citizenId: receiver.entity.id },
    ]);
    expect(
      await prisma.manualNotificationRole.findMany({
        select: { manualNotificationId: true, roleId: true },
      }),
    ).toEqual([{ manualNotificationId: notification.id, roleId: escort.id }]);

    await expectAuditEvents(prisma, ["MANUAL_NOTIFICATION_CREATED"]);
    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "MANUAL_NOTIFICATION_CREATED" },
        select: { createdById: true, triggeredViaMcp: true, data: true },
      }),
    ).toEqual({
      createdById: sender.user.id,
      triggeredViaMcp: true,
      data: {
        manualNotificationId: notification.id,
        title: "Treffen am Samstag",
        receiverCitizenIds: [receiver.entity.id],
        receiverRoleIds: [escort.id],
      },
    });
  });

  test("send_manual_notification refuses no receivers and a hidden role, and is not available without manualNotification;manage", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const hiddenRole = await createRole(prisma, { name: "Geheimdienst" });
    // Without otherRole;read for the hidden role
    const sender = await createMcpCitizen(prisma, {
      handle: "mcp-absenderin",
      permissionStrings: SENDER_PERMISSIONS,
    });
    // Without manualNotification;manage
    const reader = await createMcpCitizen(prisma, {
      handle: "mcp-leserin",
      permissionStrings: ["citizen;read", "otherRole;read;roleId=*"],
    });
    const receiver = await createCitizen(prisma, { handle: "mcp-empfaenger" });

    const senderClient = await connectMcpClient(
      (await authorizeMcpClient(sender.user)).accessToken,
    );
    expect(
      await callForError(senderClient, "send_manual_notification", {
        title: "Ohne Empfänger",
        body: "Diese Benachrichtigung hat keinen Empfänger.",
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(
      await callForError(senderClient, "send_manual_notification", {
        title: "An eine verborgene Rolle",
        body: "Die Rolle ist für die Absenderin nicht sichtbar.",
        role_ids: [hiddenRole.id],
      }),
    ).toMatch(VALIDATION_RESULT);

    const readerClient = await connectMcpClient(
      (await authorizeMcpClient(reader.user)).accessToken,
    );
    expect(await readerClient.listToolNames()).not.toContain(
      "send_manual_notification",
    );
    await expect(
      readerClient.callTool("send_manual_notification", {
        title: "Ohne Berechtigung",
        body: "Die Leserin darf keine Benachrichtigung senden.",
        citizen_ids: [receiver.entity.id],
      }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });

    expect(await prisma.manualNotification.count()).toBe(0);
    expect(
      await prisma.auditEvent.count({
        where: { type: "MANUAL_NOTIFICATION_CREATED" },
      }),
    ).toBe(0);
  });
});
