import { expectAuditEvents } from "../fixtures/audit";
import { CIMD_CLIENT_NAME } from "../fixtures/cimd-server";
import { createCitizen, createMcpCitizen } from "../fixtures/factories";
import {
  clickUntilVisible,
  DELETED_TEXT,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import {
  modernMcpRequest,
  postMcpEndpoint,
  structuredContentOf,
  UNKNOWN_TOOL_ERROR_CODE,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

const MCP_APP_PAGE = "/app/mcp";

test.describe("the MCP app", () => {
  test("the page lists a connected client, and its disconnection stops the client", async ({
    page,
    prisma,
    request,
    cimdServer,
    authorizeMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-inhaber" });
    const authorization = await authorizeMcpClient(citizen.user);

    const callBefore = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(callBefore.status()).toBe(200);

    // The settings were on the account page before the MCP app
    await page.goto("/app/account/mcp");
    await expect(page).toHaveURL(MCP_APP_PAGE);
    const clientRow = page
      .getByRole("row")
      .filter({ hasText: cimdServer.host });
    await expect(clientRow).toBeVisible();
    await expect(
      clientRow.getByText(CIMD_CLIENT_NAME, { exact: true }),
    ).toBeVisible();

    const dialog = page.getByRole("alertdialog", { name: "Client trennen?" });
    await clickUntilVisible(
      clientRow.getByRole("button", { name: `${CIMD_CLIENT_NAME} trennen` }),
      dialog,
    );
    await dialog.getByRole("button", { name: "Trennen" }).click();
    await expect(page.getByText(DELETED_TEXT)).toBeVisible();
    await expect(
      page.getByText("Du hast noch keinen Client verbunden."),
    ).toBeVisible();

    const callAfter = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(callAfter.status()).toBe(401);

    await expectAuditEvents(prisma, [
      "OAUTH_GRANT_CREATED_V2",
      "OAUTH_GRANT_REVOKED",
    ]);
  });

  test("the own name and the tools of a client apply only to that client", async ({
    page,
    prisma,
    cimdServer,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, {
      handle: "mcp-auswaehler",
    });
    const laptop = await connectMcpClient(
      (await authorizeMcpClient(citizen.user)).accessToken,
    );
    const desktop = await connectMcpClient(
      (await authorizeMcpClient(citizen.user)).accessToken,
    );

    await page.goto(MCP_APP_PAGE);
    await waitForAppShellHydration(page);
    const clientRows = page
      .getByRole("row")
      .filter({ hasText: cimdServer.host });
    await expect(clientRows).toHaveCount(2);

    // The list shows the newest client first, thus the laptop is second
    const renameDialog = page.getByRole("dialog", {
      name: "Client umbenennen",
    });
    await clickUntilVisible(
      clientRows
        .nth(1)
        .getByRole("button", { name: `${CIMD_CLIENT_NAME} umbenennen` }),
      renameDialog,
    );
    await renameDialog.getByLabel("Name").fill("Laptop");
    await renameDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(renameDialog).toBeHidden();
    const laptopRow = clientRows.filter({ hasText: "Laptop" });
    await expect(laptopRow).toBeVisible();

    // One click for each change, because each click saves
    const toolsDialog = page.getByRole("dialog", { name: "Tools bearbeiten" });
    await clickUntilVisible(
      laptopRow.getByRole("button", { name: "Tools von Laptop bearbeiten" }),
      toolsDialog,
    );
    const toolSwitch = page.getByRole("checkbox", {
      name: "Get the current user",
    });
    await expect(toolSwitch).toBeChecked();

    await toggleLabel(toolsDialog, toolSwitch).click();
    await expect(toolSwitch).not.toBeChecked();
    await expect
      .poll(() => laptop.listToolNames())
      .not.toContain("get_current_user");
    await expect(laptop.callTool("get_current_user")).rejects.toMatchObject({
      code: UNKNOWN_TOOL_ERROR_CODE,
    });
    expect(await desktop.listToolNames()).toContain("get_current_user");

    await toggleLabel(toolsDialog, toolSwitch).click();
    await expect(toolSwitch).toBeChecked();
    await expect
      .poll(() => laptop.listToolNames())
      .toContain("get_current_user");
    expect(
      (await laptop.callTool("get_current_user")).structuredContent,
    ).toMatchObject({ user_id: citizen.user.id });

    await expectAuditEvents(prisma, [
      "OAUTH_GRANT_RENAMED",
      "MCP_TOOL_SETTING_UPDATED_V2",
    ]);
  });

  test("only an admin in admin mode can enable admin mode for a client, and it gives the client all permissions", async ({
    page,
    prisma,
    cimdServer,
    authorizeMcpClient,
    connectMcpClient,
    enableAdminMode,
  }) => {
    const member = await createMcpCitizen(prisma, { handle: "mcp-mitglied" });
    const admin = await createMcpCitizen(prisma, {
      handle: "mcp-admin",
      admin: true,
    });
    const adminModeSwitch = page.getByRole("checkbox", {
      name: `Admin-Modus für ${CIMD_CLIENT_NAME}`,
    });
    const clientRow = page
      .getByRole("row")
      .filter({ hasText: cimdServer.host });

    await authorizeMcpClient(member.user);
    await page.goto(MCP_APP_PAGE);
    await expect(clientRow).toBeVisible();
    await expect(adminModeSwitch).toHaveCount(0);

    const authorization = await authorizeMcpClient(admin.user);
    const client = await connectMcpClient(authorization.accessToken);
    // Admin mode is off for a new client, also for an admin
    expect(
      (await client.callTool("get_current_user")).structuredContent,
    ).toMatchObject({ role: "admin", admin_mode: false });

    // The switch shows only while the admin mode of the toolbar is active
    await page.goto(MCP_APP_PAGE);
    await expect(clientRow).toBeVisible();
    await expect(adminModeSwitch).toHaveCount(0);

    await enableAdminMode();
    await page.goto(MCP_APP_PAGE);
    await expect(clientRow).toBeVisible();
    await waitForAppShellHydration(page);
    await expect(adminModeSwitch).not.toBeChecked();

    await toggleLabel(page, adminModeSwitch).click();
    await expect(adminModeSwitch).toBeChecked();

    await expect
      .poll(
        async () =>
          structuredContentOf(await client.callTool("get_current_user"))
            .admin_mode,
      )
      .toBe(true);

    await expectAuditEvents(prisma, ["OAUTH_GRANT_ADMIN_MODE_UPDATED"]);
  });

  test("an admin who assumes a user sees the clients of that user, but not their admin mode", async ({
    page,
    context,
    prisma,
    cimdServer,
    signIn,
    authorizeMcpClient,
  }) => {
    const admin = await createCitizen(prisma, {
      handle: "mcp-vertreter",
      admin: true,
    });
    const target = await createMcpCitizen(prisma, {
      handle: "mcp-vertretener",
    });
    await authorizeMcpClient(target.user);
    await signIn(admin.user);
    await context.addCookies([
      {
        name: "assume_user",
        value: target.user.id,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto(MCP_APP_PAGE);
    await expect(page.getByText("Assuming mcp-vertretener")).toBeVisible();
    const clientRow = page
      .getByRole("row")
      .filter({ hasText: cimdServer.host });
    await expect(clientRow).toBeVisible();
    await expect(
      clientRow.getByRole("button", {
        name: `Tools von ${CIMD_CLIENT_NAME} bearbeiten`,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Admin-Modus" }),
    ).toHaveCount(0);
  });
});
