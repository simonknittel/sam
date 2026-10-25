import type { Page } from "@playwright/test";
import { expectAuditEvents } from "../fixtures/audit";
import { CIMD_CLIENT_NAME } from "../fixtures/cimd-server";
import {
  createCitizen,
  createMcpCitizen,
  MCP_USE_PERMISSION,
} from "../fixtures/factories";
import { clickUntilVisible, toggleLabel } from "../fixtures/interactions";
import {
  LEGACY_INITIALIZE_REQUEST,
  modernMcpRequest,
  postMcpEndpoint,
  UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE,
} from "../fixtures/mcp-client";
import {
  buildAuthorizationUrl,
  createPkcePair,
  createState,
  interceptAuthorizationResponse,
  MCP_CALLBACK_URL,
  postTokenEndpoint,
  readMcpServerMetadata,
  waitForAuthorizationResponse,
  type AuthorizationRequest,
} from "../fixtures/oauth";
import { expect, test } from "../fixtures/test";
import {
  expectFlagPropagation,
  setUnleashFlag,
  UNLEASH_FLAG,
} from "../fixtures/unleash";

/** 1 hour, the lifetime of an access token */
const ACCESS_TOKEN_LIFETIME_IN_SECONDS = 60 * 60;

const PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource/api/mcp";

/** Three polled flag states plus the consent page in each poll */
const KILL_SWITCH_TEST_TIMEOUT = 150_000;

const CONSENT_UNAVAILABLE_TEXT =
  "Die Verbindung von Anwendungen über MCP ist zurzeit nicht verfügbar.";

const MCP_ACCESS_DENIED_TEXT =
  "Du hast keine Berechtigung, den MCP-Server zu nutzen.";

interface SkillsListResponse {
  readonly result: {
    readonly skills: readonly {
      readonly uri: string;
      readonly frontmatter: { readonly name: string };
      readonly resources: readonly {
        readonly uri: string;
        readonly size: number;
      }[];
    }[];
  };
}

interface JsonRpcErrorResponse {
  readonly error: { readonly code: number; readonly message: string };
}

enum ConsentPageState {
  Consent = "consent",
  Unavailable = "unavailable",
  /** Neither the consent nor the message: the page did not render */
  Unknown = "unknown",
}

const readConsentPageState = async (page: Page, consentUrl: string) => {
  await page.goto(consentUrl);

  const allowButton = page.getByRole("button", { name: "Erlauben" });
  const unavailableMessage = page.getByText(CONSENT_UNAVAILABLE_TEXT);
  try {
    await allowButton
      .or(unavailableMessage)
      .first()
      .waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    return ConsentPageState.Unknown;
  }

  return (await unavailableMessage.isVisible())
    ? ConsentPageState.Unavailable
    : ConsentPageState.Consent;
};

test.describe("the OAuth server and the MCP endpoint", () => {
  test("the metadata documents describe the server, and a request without a token gets the challenge", async ({
    request,
  }) => {
    const resourceResponse = await request.get(
      PROTECTED_RESOURCE_METADATA_PATH,
    );
    expect(resourceResponse.status()).toBe(200);
    const resourceMetadata = (await resourceResponse.json()) as {
      authorization_servers: string[];
    };
    const issuer = resourceMetadata.authorization_servers[0]!;

    expect(resourceMetadata).toEqual({
      resource: new URL("/api/mcp", issuer).href,
      authorization_servers: [issuer],
      scopes_supported: ["mcp"],
      bearer_methods_supported: ["header"],
    });

    const serverResponse = await request.get(
      "/.well-known/oauth-authorization-server",
    );
    expect(serverResponse.status()).toBe(200);
    expect(await serverResponse.json()).toMatchObject({
      issuer,
      authorization_endpoint: new URL("/app/oauth/authorize", issuer).href,
      token_endpoint: new URL("/api/oauth/token", issuer).href,
      revocation_endpoint: new URL("/api/oauth/revoke", issuer).href,
      scopes_supported: ["mcp"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    });

    // The challenge tells a client where it finds the authorization server
    const response = await postMcpEndpoint(
      request,
      modernMcpRequest("server/discover"),
    );
    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain(
      `resource_metadata="${new URL(PROTECTED_RESOURCE_METADATA_PATH, issuer).href}"`,
    );
  });

  test("a client connects through the consent page and calls a tool", async ({
    prisma,
    request,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-nutzer" });

    const authorization = await authorizeMcpClient(citizen.user);
    const { issuer } = authorization.metadata;

    // RFC 9207: the authorization response names its server
    expect(authorization.authorizationResponse.get("iss")).toBe(issuer);
    expect(authorization.tokenResponse.tokenType).toBe("Bearer");
    expect(authorization.tokenResponse.scope).toBe("mcp");
    expect(authorization.tokenResponse.expiresIn).toBe(
      ACCESS_TOKEN_LIFETIME_IN_SECONDS,
    );

    const client = await connectMcpClient(authorization.accessToken);

    const discovery = await client.discover();
    expect(discovery.instructions).toContain(new URL("/app/mcp", issuer).href);
    expect(await client.listToolNames()).toContain("get_current_user");

    const result = await client.callTool("get_current_user");
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      user_id: citizen.user.id,
      citizen: { id: citizen.entity.id, handle: "mcp-nutzer" },
      role: "user",
      admin_mode: false,
    });

    // The server serves only the 2026-07-28 revision
    const legacyResponse = await postMcpEndpoint(
      request,
      LEGACY_INITIALIZE_REQUEST,
      authorization.accessToken,
    );
    expect(legacyResponse.status()).toBe(400);
    const legacyBody = (await legacyResponse.json()) as JsonRpcErrorResponse;
    expect(legacyBody.error.code).toBe(UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE);
  });

  test("a client lists the skills and reads the files of a skill", async ({
    prisma,
    request,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-skills" });
    const { accessToken } = await authorizeMcpClient(citizen.user);
    const client = await connectMcpClient(accessToken);

    const discovery = await client.discover();
    expect(discovery.capabilities.extensions).toHaveProperty([
      "io.modelcontextprotocol/skills",
    ]);

    // The client SDK has no method for the extension
    const response = await postMcpEndpoint(
      request,
      modernMcpRequest("skills/list"),
      accessToken,
    );
    expect(response.status()).toBe(200);
    const { result } = (await response.json()) as SkillsListResponse;
    const overview = result.skills.find(
      (skill) => skill.uri === "skill://sam-overview/SKILL.md",
    );
    expect(overview?.frontmatter.name).toBe("sam-overview");

    for (const { uri, size } of overview?.resources ?? [])
      expect(
        new TextEncoder().encode(await client.readResourceText(uri)).byteLength,
      ).toBe(size);
  });

  test("the consent page gives the new client an own name and its tools", async ({
    page,
    prisma,
    cimdServer,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-planer" });

    const authorization = await authorizeMcpClient(citizen.user, {
      beforeApprove: async (consentPage) => {
        const nameDialog = consentPage.getByRole("dialog", {
          name: "Client benennen",
        });
        await clickUntilVisible(
          consentPage.getByRole("button", { name: "Name ändern" }),
          nameDialog,
        );
        await nameDialog.getByLabel("Name").fill("Laptop");
        await nameDialog.getByRole("button", { name: "Übernehmen" }).click();
        await expect(nameDialog).toBeHidden();

        const toolsDialog = consentPage.getByRole("dialog", {
          name: "Tools auswählen",
        });
        await clickUntilVisible(
          consentPage.getByRole("button", { name: "Tools auswählen" }),
          toolsDialog,
        );
        const toolSwitch = consentPage.getByRole("checkbox", {
          name: "Get the current user",
        });
        await toggleLabel(toolsDialog, toolSwitch).click();
        await expect(toolSwitch).not.toBeChecked();
        await consentPage.keyboard.press("Escape");
        await expect(toolsDialog).toBeHidden();
      },
    });
    const client = await connectMcpClient(authorization.accessToken);
    expect(await client.listToolNames()).not.toContain("get_current_user");

    await page.goto("/app/mcp");
    const clientRow = page
      .getByRole("row")
      .filter({ hasText: cimdServer.host });
    await expect(clientRow.getByText("Laptop", { exact: true })).toBeVisible();
    // The browser of the consent identifies the client
    await expect(clientRow).toContainText("Chrome");

    await expectAuditEvents(prisma, ["OAUTH_GRANT_CREATED_V2"]);
  });

  test("a refresh token works once, and its reuse disconnects the client", async ({
    prisma,
    request,
    authorizeMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-erneuerer" });
    const authorization = await authorizeMcpClient(citizen.user);

    const rotation = await authorization.refresh(authorization.refreshToken);
    expect(rotation.status).toBe(200);
    const rotatedTokens = rotation.tokens;
    if (!rotatedTokens) throw new Error("The refresh gave no tokens");
    // A comparison of booleans, thus a failure does not print a token
    expect(rotatedTokens.refreshToken === authorization.refreshToken).toBe(
      false,
    );

    const rotatedCall = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      rotatedTokens.accessToken,
    );
    expect(rotatedCall.status()).toBe(200);

    // A used refresh token that comes again was possibly stolen
    const reuse = await authorization.refresh(authorization.refreshToken);
    expect(reuse.status).toBe(400);
    expect(reuse.error).toBe("invalid_grant");

    // The reuse revoked the grant, thus also its newest tokens
    const successorRefresh = await authorization.refresh(
      rotatedTokens.refreshToken,
    );
    expect(successorRefresh.status).toBe(400);
    expect(successorRefresh.error).toBe("invalid_grant");

    const callAfterReuse = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      rotatedTokens.accessToken,
    );
    expect(callAfterReuse.status()).toBe(401);
  });

  test("the revocation of the refresh token disconnects the client", async ({
    prisma,
    request,
    authorizeMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-trenner" });
    const authorization = await authorizeMcpClient(citizen.user);

    const callBefore = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(callBefore.status()).toBe(200);

    expect(await authorization.revoke(authorization.refreshToken)).toBe(200);

    const callAfter = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(callAfter.status()).toBe(401);

    const refresh = await authorization.refresh(authorization.refreshToken);
    expect(refresh.error).toBe("invalid_grant");
  });

  test("the consent page refuses a user without the permission mcp;use", async ({
    page,
    prisma,
    request,
    signIn,
    stack,
    cimdServer,
  }) => {
    const citizen = await createCitizen(prisma, { handle: "mcp-ohne-zugang" });
    await signIn(citizen.user);
    const { resource } = await readMcpServerMetadata(request);

    await page.goto(
      buildAuthorizationUrl(stack.baseURL, {
        clientId: cimdServer.clientId,
        codeChallenge: createPkcePair().challenge,
        state: createState(),
        resource,
      }),
    );

    await expect(page.getByText(MCP_ACCESS_DENIED_TEXT)).toBeVisible();
    await expect(page.getByRole("button", { name: "Erlauben" })).toHaveCount(0);
    expect(await prisma.oAuthGrant.count()).toBe(0);
  });

  test("a connected client gets 403 and no new token when the user loses the permission mcp;use", async ({
    prisma,
    request,
    authorizeMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-entzogen" });
    const authorization = await authorizeMcpClient(citizen.user);

    const callBefore = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(callBefore.status()).toBe(200);

    await prisma.permissionString.deleteMany({
      where: { roleId: citizen.role.id, permissionString: MCP_USE_PERMISSION },
    });

    const callAfter = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(callAfter.status()).toBe(403);
    expect(await callAfter.json()).toMatchObject({ error: "forbidden" });
    // No challenge: a new token does not help the user
    expect(callAfter.headers()["www-authenticate"]).toBeUndefined();

    // The token endpoint gives no new token either
    const refresh = await authorization.refresh(authorization.refreshToken);
    expect(refresh.status).toBe(400);
    expect(refresh.error).toBe("invalid_grant");
  });

  test("a connected client gets 403 and no new token when the user loses the clearance", async ({
    prisma,
    request,
    authorizeMcpClient,
  }) => {
    const citizen = await createMcpCitizen(prisma, {
      handle: "mcp-unbestaetigt",
    });
    const authorization = await authorizeMcpClient(citizen.user);

    await prisma.user.update({
      where: { id: citizen.user.id },
      data: { emailVerified: null },
    });

    const call = await postMcpEndpoint(
      request,
      modernMcpRequest("tools/list"),
      authorization.accessToken,
    );
    expect(call.status()).toBe(403);

    const refresh = await authorization.refresh(authorization.refreshToken);
    expect(refresh.status).toBe(400);
    expect(refresh.error).toBe("invalid_grant");
  });

  test("the consent page refuses an invalid client or redirect URI and links other errors back to the client", async ({
    page,
    prisma,
    request,
    signIn,
    stack,
    cimdServer,
  }) => {
    const citizen = await createMcpCitizen(prisma, { handle: "mcp-pruefer" });
    await signIn(citizen.user);
    const { issuer, resource } = await readMcpServerMetadata(request);
    const { challenge } = createPkcePair();
    const state = createState();
    const consentUrl = (parameters: Partial<AuthorizationRequest> = {}) =>
      buildAuthorizationUrl(stack.baseURL, {
        clientId: cimdServer.clientId,
        codeChallenge: challenge,
        state,
        resource,
        ...parameters,
      });
    const allowButton = page.getByRole("button", { name: "Erlauben" });

    // The host of the client id is the trusted identity, the name is not
    await page.goto(consentUrl());
    await expect(
      page.getByText(cimdServer.host, { exact: true }),
    ).toBeVisible();
    // The name also shows as the name of the new client
    await expect(
      page.getByText(CIMD_CLIENT_NAME, { exact: true }).first(),
    ).toBeVisible();
    await expect(allowButton).toBeVisible();

    /**
     * RFC 6749 section 4.1.2.1: without a valid client and redirect URI, the
     * server must not redirect. The `.invalid` host never resolves.
     */
    const refusals = [
      {
        parameters: { clientId: cimdServer.mismatchingClientId },
        message: "Die Beschreibung der Anwendung ist ungültig.",
      },
      {
        parameters: { clientId: cimdServer.missingClientId },
        message:
          "Die Beschreibung der Anwendung konnte nicht geladen werden. Bitte versuche es später erneut.",
      },
      {
        parameters: { redirectUri: "https://client.invalid/callback" },
        message:
          "Die Anwendung hat eine Weiterleitungsadresse gesendet, die sie nicht registriert hat.",
      },
    ];
    for (const { parameters, message } of refusals) {
      await page.goto(consentUrl(parameters));
      await expect(page.getByText(message)).toBeVisible();
      await expect(allowButton).toHaveCount(0);
      await expect(page).toHaveURL(/\/app\/oauth\/authorize\?/);
    }

    /**
     * Only S256 protects the code: the client gets the error. The page does
     * not redirect by itself, because each client document is a valid
     * client: the user follows the link.
     */
    await interceptAuthorizationResponse(page);
    await page.goto(consentUrl({ codeChallengeMethod: "plain" }));
    await expect(
      page.getByText(
        "Die Anfrage der Anwendung ist ungültig: The code_challenge_method parameter is missing or not valid",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Du wirst weitergeleitet zu ${new URL(MCP_CALLBACK_URL).host}`,
      ),
    ).toBeVisible();
    await expect(allowButton).toHaveCount(0);
    await expect(page).toHaveURL(/\/app\/oauth\/authorize\?/);

    await page.getByRole("link", { name: "Zurück zur Anwendung" }).click();
    const response = await waitForAuthorizationResponse(page);
    expect(response.get("error")).toBe("invalid_request");
    expect(response.get("state")).toBe(state);
    expect(response.get("iss")).toBe(issuer);
    expect(response.get("code")).toBeNull();
  });

  test("the kill switch takes the MCP endpoint, the token endpoint and the consent page offline", async ({
    page,
    prisma,
    request,
    signIn,
    stack,
    cimdServer,
    stackFlagScope,
  }) => {
    test.setTimeout(KILL_SWITCH_TEST_TIMEOUT);

    const citizen = await createMcpCitizen(prisma, { handle: "mcp-notaus" });
    await signIn(citizen.user);
    const { resource } = await readMcpServerMetadata(request);
    const consentUrl = buildAuthorizationUrl(stack.baseURL, {
      clientId: cimdServer.clientId,
      codeChallenge: createPkcePair().challenge,
      state: createState(),
      resource,
    });

    const readAvailability = async () => {
      const mcpResponse = await postMcpEndpoint(
        request,
        modernMcpRequest("server/discover"),
      );
      const tokenResult = await postTokenEndpoint(request, {
        grant_type: "refresh_token",
        refresh_token: "unknown-refresh-token",
        client_id: cimdServer.clientId,
      });

      return {
        mcpEndpoint: mcpResponse.status(),
        tokenEndpoint: tokenResult.status,
        consentPage: await readConsentPageState(page, consentUrl),
      };
    };
    const available = {
      mcpEndpoint: 401,
      tokenEndpoint: 400,
      consentPage: ConsentPageState.Consent,
    };

    await expectFlagPropagation.poll(readAvailability).toEqual(available);

    try {
      await setUnleashFlag(UNLEASH_FLAG.DisableMcpServer, true, stackFlagScope);
      await expectFlagPropagation.poll(readAvailability).toEqual({
        mcpEndpoint: 503,
        tokenEndpoint: 503,
        consentPage: ConsentPageState.Unavailable,
      });
    } finally {
      await setUnleashFlag(
        UNLEASH_FLAG.DisableMcpServer,
        false,
        stackFlagScope,
      );
      // The next test of this worker must not get the flag from a cache
      await expectFlagPropagation.poll(readAvailability).toEqual(available);
    }
  });
});
