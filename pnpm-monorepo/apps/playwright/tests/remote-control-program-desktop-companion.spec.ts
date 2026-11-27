import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { randomUUID } from "node:crypto";
import { createCitizen, MCP_USE_PERMISSION } from "../fixtures/factories";
import { clickUntilVisible } from "../fixtures/interactions";
import {
  LOG_ANALYZER_PAGE_PATH,
  LOG_ANALYZER_PERMISSIONS,
} from "../fixtures/log-analyzer";
import { modernMcpRequest, postMcpEndpoint } from "../fixtures/mcp-client";
import {
  buildAuthorizationUrl,
  createPkcePair,
  createState,
  getDesktopCompanionClientId,
  readRemoteControlProgramMetadata,
  REMOTE_CONTROL_PROGRAM_SCOPE,
  requestConnectionTokenWithAccessToken,
} from "../fixtures/oauth";
import {
  REMOTE_CONTROL_PROGRAM_PERMISSION,
  sharingPopover,
  sharingPopoverSection,
  SharingPopoverSection,
  sharingPopoverTab,
  sharingPopoverTrigger,
  showSharingPopoverSection,
} from "../fixtures/remote-control-program";
import { expect, test } from "../fixtures/test";

/**
 * The desktop companion in SAM: its OAuth login up to a connection token,
 * and its sub-tab in the sharing popover (see "Desktop companion" of
 * docs/remote-control-program/README.md). The program itself is not a part
 * of this repository: the tests do its requests.
 */

const RUNTIME_ID = "0b6f1d3e-2a4c-4e8f-9a1b-3c5d7e9f1a2b";

const OWNER_PERMISSIONS = [
  REMOTE_CONTROL_PROGRAM_PERMISSION,
  MCP_USE_PERMISSION,
];

const NO_PERMISSION_TEXT =
  "Du hast keine Berechtigung, das Remote Control Program zu nutzen";

/** The sub-tab of the desktop companion, after the read of the data of the server */
const showDesktopCompanionSection = async (page: Page) => {
  const runtimesTab = sharingPopoverTab(page, SharingPopoverSection.Runtimes);
  if (!(await runtimesTab.isVisible()))
    await clickUntilVisible(sharingPopoverTrigger(page), runtimesTab);

  const section = await showSharingPopoverSection(
    page,
    SharingPopoverSection.DesktopCompanion,
  );
  await expect(section.getByText("Lade den Status …")).toHaveCount(0);
  return section;
};

/**
 * The presence of a runtime whose local access layer lets `log_entries`
 * leave the machine. The relay service writes this row for a connected
 * runtime.
 */
const createRuntimePresence = (
  prisma: PrismaClient,
  ownerId: string,
  kind: "browser" | "desktop_companion",
) =>
  prisma.remoteControlProgramRuntime.create({
    data: {
      runtimeId: randomUUID(),
      ownerId,
      kind,
      runtimeVersion: "0.1.0",
      protocolVersion: 1,
      connectedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      announcement: {
        connectors: [
          {
            id: "log_file",
            version: 1,
            capabilities: [{ id: "log_entries", version: 1 }],
          },
        ],
        local_access_layer: {
          capability_rules: [
            { capability_id: "log_entries", is_on: true, is_filtered: true },
          ],
        },
      },
    },
  });

test.describe("the OAuth login of the desktop companion", () => {
  test("the metadata names the resource of the Remote Control Program and the document of the desktop companion", async ({
    request,
  }) => {
    const { issuer, resource } =
      await readRemoteControlProgramMetadata(request);
    expect(resource).toBe(new URL("/api/remote-control-program", issuer).href);

    const serverResponse = await request.get(
      "/.well-known/oauth-authorization-server",
    );
    expect(await serverResponse.json()).toMatchObject({
      scopes_supported: ["mcp", REMOTE_CONTROL_PROGRAM_SCOPE],
    });

    const clientId = getDesktopCompanionClientId(issuer);
    const documentResponse = await request.get(new URL(clientId).pathname);
    expect(documentResponse.status()).toBe(200);
    expect(await documentResponse.json()).toMatchObject({
      client_id: clientId,
      client_name: "SAM Desktop Companion",
      redirect_uris: ["http://127.0.0.1/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
    });
  });

  test("the desktop companion signs in on the consent page and gets connection tokens until its log-out", async ({
    page,
    prisma,
    request,
    authorizeDesktopCompanion,
  }) => {
    const owner = await createCitizen(prisma, {
      handle: "companion-nutzer",
      permissionStrings: OWNER_PERMISSIONS,
    });

    const authorization = await authorizeDesktopCompanion(owner.user, {
      beforeApprove: async (consentPage) => {
        await expect(
          consentPage.getByText("SAM Desktop Companion", { exact: true }),
        ).toBeVisible();
        await expect(
          consentPage.getByText(
            "sich als Runtime deines Citizens mit dem Remote Control Program verbinden",
          ),
        ).toBeVisible();
        await expect(
          consentPage.getByRole("button", { name: "Tools auswählen" }),
        ).toHaveCount(0);
      },
    });
    expect(authorization.tokenResponse.scope).toBe(
      REMOTE_CONTROL_PROGRAM_SCOPE,
    );

    /** The token of the Remote Control Program does not work on the MCP endpoint */
    const mcpResponse = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(mcpResponse.status()).toBe(401);

    const connection = await requestConnectionTokenWithAccessToken(
      request,
      authorization.accessToken,
      RUNTIME_ID,
    );
    expect(connection.status).toBe(200);
    // Single fields, thus a failure does not print the token
    expect(connection.body?.handle).toBe("companion-nutzer");
    expect(connection.body?.citizen_id).toEqual(expect.any(String));
    expect(connection.body?.relay_url).toMatch(/^wss?:\/\//);

    /** The app KI-Agenten lists only the clients of the MCP server */
    await page.goto("/app/ai-agents/clients");
    await expect(
      page.getByText("Du hast noch keinen Client verbunden."),
    ).toBeVisible();

    /** The log-out of the program revokes the grant */
    expect(await authorization.revoke(authorization.refreshToken)).toBe(200);
    const connectionAfterLogOut = await requestConnectionTokenWithAccessToken(
      request,
      authorization.accessToken,
      RUNTIME_ID,
    );
    expect(connectionAfterLogOut.status).toBe(401);
    expect(connectionAfterLogOut.wwwAuthenticate).toContain(
      'error="invalid_token"',
    );
    // The route checks the token before the body
    expect(
      (
        await requestConnectionTokenWithAccessToken(
          request,
          authorization.accessToken,
          "not-a-runtime-id",
        )
      ).status,
    ).toBe(401);
    const refresh = await authorization.refresh(authorization.refreshToken);
    expect(refresh.error).toBe("invalid_grant");
  });

  test("the consent needs remoteControlProgram;use, and an MCP client cannot get the resource", async ({
    page,
    prisma,
    request,
    signIn,
    stack,
    cimdServer,
  }) => {
    const { issuer, resource } =
      await readRemoteControlProgramMetadata(request);
    const consentUrl = (clientId: string) =>
      buildAuthorizationUrl(stack.baseURL, {
        clientId,
        codeChallenge: createPkcePair().challenge,
        state: createState(),
        resource,
        scope: REMOTE_CONTROL_PROGRAM_SCOPE,
      });
    const allowButton = page.getByRole("button", { name: "Erlauben" });

    const mcpUser = await createCitizen(prisma, {
      handle: "companion-ohne-zugang",
      permissionStrings: [MCP_USE_PERMISSION],
    });
    await signIn(mcpUser.user);
    await page.goto(consentUrl(getDesktopCompanionClientId(issuer)));
    await expect(page.getByText(NO_PERMISSION_TEXT)).toBeVisible();
    await expect(allowButton).toHaveCount(0);

    const owner = await createCitizen(prisma, {
      handle: "companion-mcp-client",
      permissionStrings: OWNER_PERMISSIONS,
    });
    await signIn(owner.user);
    await page.goto(consentUrl(cimdServer.clientId));
    await expect(
      page.getByText(
        "Die Anfrage der Anwendung ist ungültig: The client cannot get tokens for this resource",
      ),
    ).toBeVisible();
    await expect(allowButton).toHaveCount(0);
    expect(await prisma.oAuthGrant.count()).toBe(0);
  });
});

test.describe("the sub-tab of the desktop companion", () => {
  test("lists the sign-ins of the desktop companion, and the sign-out ends one", async ({
    page,
    prisma,
    request,
    signIn,
    authorizeDesktopCompanion,
  }) => {
    const owner = await createCitizen(prisma, {
      handle: "companion-abmelder",
      permissionStrings: OWNER_PERMISSIONS,
    });
    await signIn(owner.user);
    await page.goto("/app/dashboard");

    /** Without a log folder, the popover opens with the start, whose matrix opens the sub-tab */
    const start = sharingPopoverSection(page, SharingPopoverSection.Start);
    await clickUntilVisible(sharingPopoverTrigger(page), start);
    await start
      .getByRole("button", { name: "Desktop Companion", exact: true })
      .click();
    const section = sharingPopoverSection(
      page,
      SharingPopoverSection.DesktopCompanion,
    );
    await expect(section.getByText(/kommt bald/)).toBeVisible();
    await expect(
      sharingPopoverTab(page, SharingPopoverSection.DesktopCompanion),
    ).toBeFocused();
    await expect(section.getByText("Lade den Status …")).toHaveCount(0);
    await expect(
      section.getByRole("heading", { name: "Anmeldungen" }),
    ).toHaveCount(0);
    const openLink = (container: typeof section) =>
      container.getByRole("link", { name: "Desktop Companion öffnen" });
    /** Without a sign-in, the owner has no program that the link could open */
    await expect(openLink(section)).toHaveCount(0);

    const authorization = await authorizeDesktopCompanion(owner.user);
    await page.goto("/app/dashboard");
    const signedInSection = await showDesktopCompanionSection(page);
    const signIns = signedInSection.getByRole("listitem");
    await expect(signIns).toHaveCount(1);
    await expect(signIns).toContainText("Chrome");
    await expect(openLink(signedInSection)).toHaveAttribute(
      "href",
      "sam-desktop-companion://open",
    );

    await signIns.getByRole("button", { name: "Abmelden" }).click();
    const confirmation = page.getByRole("alertdialog", {
      name: "Desktop Companion abmelden?",
    });
    await confirmation.getByRole("button", { name: "Abmelden" }).click();
    await expect(confirmation).toHaveCount(0);
    await expect(
      signedInSection.getByRole("heading", { name: "Anmeldungen" }),
    ).toHaveCount(0);

    const connection = await requestConnectionTokenWithAccessToken(
      request,
      authorization.accessToken,
      RUNTIME_ID,
    );
    expect(connection.status).toBe(401);
  });

  test("shows a connected desktop companion and no other browser, and the Log Analyzer then asks for no log folder", async ({
    page,
    prisma,
    signIn,
  }) => {
    const owner = await createCitizen(prisma, {
      handle: "companion-log-analyzer",
      permissionStrings: LOG_ANALYZER_PERMISSIONS,
    });
    await signIn(owner.user);
    await page.goto(LOG_ANALYZER_PAGE_PATH);
    await expect(
      page.getByText(
        "Wähle im Remote Control Program den Ordner deiner Star-Citizen-Installation aus",
      ),
    ).toBeVisible();

    await createRuntimePresence(prisma, owner.entity.id, "desktop_companion");
    await createRuntimePresence(prisma, owner.entity.id, "browser");
    await page.reload();
    await expect(
      page.getByText(
        "Dein Desktop Companion lädt deine eigenen Einträge hoch.",
      ),
    ).toBeVisible();

    const section = await showDesktopCompanionSection(page);
    const connected = section.getByRole("region", { name: "Verbunden" });
    const companions = connected.getByRole("listitem");
    await expect(companions).toHaveCount(1);
    await expect(companions).toContainText("Online seit");
    await expect(companions).toContainText(
      "Version 0.1.0 · Aktive Connectors: Game Logs",
    );
    await expect(
      sharingPopover(page).getByRole("tab", { name: "Status" }),
    ).toHaveCount(0);
  });
});
