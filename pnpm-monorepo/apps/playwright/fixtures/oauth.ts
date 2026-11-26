import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { User } from "@sam-monorepo/database/client";
import { createHash, randomBytes } from "node:crypto";
import type { CimdServer } from "./cimd-server";
import { waitForAppShellHydration } from "./interactions";

/**
 * The client document registers the URI without a port. Nothing listens on the
 * port: the test answers the navigation of the browser itself (see
 * interceptAuthorizationResponse). The document of the desktop companion
 * registers the same URI.
 */
export const MCP_CALLBACK_URL = "http://127.0.0.1:47613/callback";

export const MCP_SCOPE = "mcp";

export const REMOTE_CONTROL_PROGRAM_SCOPE = "remote_control_program";

export const REMOTE_CONTROL_PROGRAM_METADATA_PATH =
  "/.well-known/oauth-protected-resource/api/remote-control-program";

/** The app knows the client document of the desktop companion without a fetch */
export const getDesktopCompanionClientId = (issuer: string) =>
  new URL(
    "/api/remote-control-program/desktop-companion/client-metadata.json",
    issuer,
  ).href;

const CALLBACK_ORIGIN = new URL(MCP_CALLBACK_URL).origin;

/** RFC 7636 section 4.1: 32 random bytes give a verifier of 43 characters */
const PKCE_VERIFIER_BYTE_COUNT = 32;

const STATE_BYTE_COUNT = 16;

export interface PkcePair {
  readonly verifier: string;
  readonly challenge: string;
}

export const createPkcePair = (): PkcePair => {
  const verifier = randomBytes(PKCE_VERIFIER_BYTE_COUNT).toString("base64url");

  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
};

export const createState = () =>
  randomBytes(STATE_BYTE_COUNT).toString("base64url");

export interface McpServerMetadata {
  /** Also the `iss` of the authorization responses */
  readonly issuer: string;
  /** Also the audience of the tokens */
  readonly resource: string;
}

/**
 * The issuer and the resource come from NEXT_PUBLIC_BASE_URL (see
 * setup/stack.ts). Thus the tests take both values from the metadata (RFC
 * 9728), and send their requests to the URL of the worker.
 */
export const readMcpServerMetadata = (request: APIRequestContext) =>
  readProtectedResourceMetadata(
    request,
    "/.well-known/oauth-protected-resource/api/mcp",
  );

/** See `readMcpServerMetadata()` */
export const readRemoteControlProgramMetadata = (request: APIRequestContext) =>
  readProtectedResourceMetadata(request, REMOTE_CONTROL_PROGRAM_METADATA_PATH);

const readProtectedResourceMetadata = async (
  request: APIRequestContext,
  path: string,
): Promise<McpServerMetadata> => {
  const response = await request.get(path);
  expect(response.status()).toBe(200);

  const metadata = (await response.json()) as {
    resource: string;
    authorization_servers: string[];
  };
  const [issuer] = metadata.authorization_servers;
  if (!issuer) throw new Error("The protected resource metadata has no issuer");

  return { issuer, resource: metadata.resource };
};

export interface AuthorizationRequest {
  readonly clientId: string;
  readonly redirectUri?: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod?: string;
  readonly state: string;
  readonly resource: string;
  readonly scope?: string;
}

export const buildAuthorizationUrl = (
  baseUrl: string,
  {
    clientId,
    redirectUri = MCP_CALLBACK_URL,
    codeChallenge,
    codeChallengeMethod = "S256",
    state,
    resource,
    scope = MCP_SCOPE,
  }: AuthorizationRequest,
) => {
  const url = new URL("/app/oauth/authorize", baseUrl);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    state,
    scope,
    resource,
  }).toString();

  return url.href;
};

const isCallbackUrl = (url: URL) => url.origin === CALLBACK_ORIGIN;

/** Call it before the navigation to the consent page. */
export const interceptAuthorizationResponse = (page: Page) =>
  page.route(isCallbackUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "Authorization response received",
    }),
  );

export const waitForAuthorizationResponse = async (page: Page) => {
  await page.waitForURL(isCallbackUrl);

  return new URL(page.url()).searchParams;
};

export interface McpTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly scope: string;
}

/**
 * The answer of the token endpoint. Assert `status` and `error` only: a
 * failed assertion prints the received value, and `tokens` holds secrets.
 */
export interface TokenEndpointResult {
  readonly status: number;
  readonly error: string | null;
  readonly tokens: McpTokens | null;
}

/** No value of the response gets into the error message. */
const parseTokens = (body: Record<string, unknown>): McpTokens => {
  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: tokenType,
    expires_in: expiresIn,
    scope,
  } = body;

  if (
    typeof accessToken !== "string" ||
    typeof refreshToken !== "string" ||
    typeof tokenType !== "string" ||
    typeof expiresIn !== "number" ||
    typeof scope !== "string"
  )
    throw new Error(
      `The token response is not valid. Its keys: ${Object.keys(body).join(", ")}`,
    );

  return { accessToken, refreshToken, tokenType, expiresIn, scope };
};

export const postTokenEndpoint = async (
  request: APIRequestContext,
  fields: Readonly<Record<string, string>>,
): Promise<TokenEndpointResult> => {
  const response = await request.post("/api/oauth/token", { form: fields });
  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok())
    return {
      status: response.status(),
      error: typeof body.error === "string" ? body.error : null,
      tokens: null,
    };

  return { status: response.status(), error: null, tokens: parseTokens(body) };
};

/** Also the authorization of the desktop companion */
export interface McpAuthorization {
  readonly clientId: string;
  readonly metadata: McpServerMetadata;
  readonly authorizationResponse: URLSearchParams;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenResponse: McpTokens;
  readonly refresh: (refreshToken: string) => Promise<TokenEndpointResult>;
  readonly revoke: (token: string) => Promise<number>;
}

export interface AuthorizeDesktopCompanionOptions {
  readonly page: Page;
  readonly request: APIRequestContext;
  readonly baseUrl: string;
  readonly signIn: (user: Pick<User, "id">) => Promise<void>;
  readonly user: Pick<User, "id">;
  readonly beforeApprove?: (page: Page) => Promise<void>;
}

export interface AuthorizeMcpClientOptions extends AuthorizeDesktopCompanionOptions {
  readonly cimdServer: CimdServer;
}

interface AuthorizeClientOptions extends AuthorizeDesktopCompanionOptions {
  readonly metadata: McpServerMetadata;
  readonly clientId: string;
  readonly scope: string;
}

/** Signs the user in (and replaces the session of an earlier user). */
export const authorizeMcpClient = async ({
  cimdServer,
  ...options
}: AuthorizeMcpClientOptions): Promise<McpAuthorization> =>
  authorizeClient({
    ...options,
    metadata: await readMcpServerMetadata(options.request),
    clientId: cimdServer.clientId,
    scope: MCP_SCOPE,
  });

/**
 * The login of the desktop companion, like the program does it. Signs the
 * user in (and replaces the session of an earlier user).
 */
export const authorizeDesktopCompanion = async (
  options: AuthorizeDesktopCompanionOptions,
): Promise<McpAuthorization> => {
  const metadata = await readRemoteControlProgramMetadata(options.request);

  return authorizeClient({
    ...options,
    metadata,
    clientId: getDesktopCompanionClientId(metadata.issuer),
    scope: REMOTE_CONTROL_PROGRAM_SCOPE,
  });
};

const authorizeClient = async ({
  page,
  request,
  baseUrl,
  signIn,
  user,
  beforeApprove,
  metadata,
  clientId,
  scope,
}: AuthorizeClientOptions): Promise<McpAuthorization> => {
  const pkce = createPkcePair();
  const state = createState();

  await signIn(user);
  await interceptAuthorizationResponse(page);
  await page.goto(
    buildAuthorizationUrl(baseUrl, {
      clientId,
      codeChallenge: pkce.challenge,
      state,
      resource: metadata.resource,
      scope,
    }),
  );

  const allowButton = page.getByRole("button", { name: "Erlauben" });
  await expect(allowButton).toBeVisible();
  // One click, because each approval creates a grant
  await waitForAppShellHydration(page);
  await beforeApprove?.(page);
  await allowButton.click();

  const authorizationResponse = await waitForAuthorizationResponse(page);
  await page.unroute(isCallbackUrl);

  const code = authorizationResponse.get("code");
  if (!code)
    throw new Error(
      `The authorization response has no code. Error: ${authorizationResponse.get("error")}`,
    );
  if (authorizationResponse.get("state") !== state)
    throw new Error("The authorization response has a different state");

  const exchange = await postTokenEndpoint(request, {
    grant_type: "authorization_code",
    code,
    redirect_uri: MCP_CALLBACK_URL,
    client_id: clientId,
    code_verifier: pkce.verifier,
    resource: metadata.resource,
  });
  if (!exchange.tokens)
    throw new Error(
      `The token endpoint refused the code: ${exchange.status} ${exchange.error}`,
    );

  return {
    clientId,
    metadata,
    authorizationResponse,
    accessToken: exchange.tokens.accessToken,
    refreshToken: exchange.tokens.refreshToken,
    tokenResponse: exchange.tokens,
    refresh: (refreshToken) =>
      postTokenEndpoint(request, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        resource: metadata.resource,
      }),
    revoke: async (token) => {
      const response = await request.post("/api/oauth/revoke", {
        form: { token, client_id: clientId },
      });
      return response.status();
    },
  };
};

export interface ConnectionTokenResult {
  readonly status: number;
  readonly wwwAuthenticate: string | null;
  /** Only for a 200. It holds the token: assert its other fields. */
  readonly body: {
    readonly token: string;
    readonly expires_at: string;
    readonly relay_url: string | null;
    readonly handle: string | null;
  } | null;
}

/**
 * The request of the desktop companion for a connection token, with its
 * access token. The `request` fixture has no session cookie.
 */
export const requestConnectionTokenWithAccessToken = async (
  request: APIRequestContext,
  accessToken: string,
  runtimeId: string,
): Promise<ConnectionTokenResult> => {
  const response = await request.post(
    "/api/remote-control-program/connection-token",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { runtime_id: runtimeId },
    },
  );

  return {
    status: response.status(),
    wwwAuthenticate: response.headers()["www-authenticate"] ?? null,
    body: response.ok()
      ? ((await response.json()) as ConnectionTokenResult["body"])
      : null,
  };
};
