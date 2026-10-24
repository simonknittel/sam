import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { User } from "@sam-monorepo/database/client";
import { createHash, randomBytes } from "node:crypto";
import type { CimdServer } from "./cimd-server";
import { waitForAppShellHydration } from "./interactions";

/**
 * The redirect URI of the authorization requests of the tests. The client
 * document registers it without a port. Nothing listens on the port: the
 * test answers the navigation of the browser itself (see
 * interceptAuthorizationResponse).
 */
export const MCP_CALLBACK_URL = "http://127.0.0.1:47613/callback";

const CALLBACK_ORIGIN = new URL(MCP_CALLBACK_URL).origin;

/** RFC 7636 section 4.1: 32 random bytes give a verifier of 43 characters */
const PKCE_VERIFIER_BYTE_COUNT = 32;

const STATE_BYTE_COUNT = 16;

export interface PkcePair {
  readonly verifier: string;
  /** The S256 challenge of the verifier */
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
  /** The URL of the authorization server, also the `iss` of its responses */
  readonly issuer: string;
  /** The canonical URL of the MCP server, also the audience of the tokens */
  readonly resource: string;
}

/**
 * Reads the protected resource metadata of the MCP endpoint (RFC 9728).
 *
 * The app takes the issuer and the resource from NEXT_PUBLIC_BASE_URL, which
 * the build inlines. The workers of the stack listen on other ports. Thus the
 * tests take both values from the metadata, and send their requests to the
 * URL of the worker.
 */
export const readMcpServerMetadata = async (
  request: APIRequestContext,
): Promise<McpServerMetadata> => {
  const response = await request.get(
    "/.well-known/oauth-protected-resource/api/mcp",
  );
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
}

/** The URL of the consent page for an authorization request of a client */
export const buildAuthorizationUrl = (
  baseUrl: string,
  {
    clientId,
    redirectUri = MCP_CALLBACK_URL,
    codeChallenge,
    codeChallengeMethod = "S256",
    state,
    resource,
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
    scope: "mcp",
    resource,
  }).toString();

  return url.href;
};

const isCallbackUrl = (url: URL) => url.origin === CALLBACK_ORIGIN;

/**
 * Answers the navigation of the browser to the redirect URI, as the client
 * would. Call it before the navigation to the consent page.
 */
export const interceptAuthorizationResponse = (page: Page) =>
  page.route(isCallbackUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "Authorization response received",
    }),
  );

/**
 * Waits until the consent page sends the browser to the redirect URI, and
 * gives the parameters of the authorization response.
 */
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
  /** The `error` code of RFC 6749 section 5.2, or null */
  readonly error: string | null;
  readonly tokens: McpTokens | null;
}

/** Reads a token response without a value in the error message */
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

export interface McpAuthorization {
  readonly clientId: string;
  readonly metadata: McpServerMetadata;
  /** The parameters of the redirect to the client: `code`, `state`, `iss` */
  readonly authorizationResponse: URLSearchParams;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenResponse: McpTokens;
  /** Exchanges a refresh token of this client for a new pair */
  readonly refresh: (refreshToken: string) => Promise<TokenEndpointResult>;
  /** Revokes a token (RFC 7009) and gives the status code */
  readonly revoke: (token: string) => Promise<number>;
}

export interface AuthorizeMcpClientOptions {
  readonly page: Page;
  readonly request: APIRequestContext;
  /** The URL of the app of the worker */
  readonly baseUrl: string;
  readonly signIn: (user: Pick<User, "id">) => Promise<void>;
  readonly cimdServer: CimdServer;
  readonly user: Pick<User, "id">;
  /** Changes the settings of the consent page before the approval */
  readonly beforeApprove?: (page: Page) => Promise<void>;
}

/**
 * Connects the test client like a real MCP client: a PKCE pair, the consent
 * of the user on the consent page, the authorization response at the
 * loopback redirect URI, and the exchange of the code at the token endpoint.
 * Signs the user in (and replaces the session of an earlier user).
 */
export const authorizeMcpClient = async ({
  page,
  request,
  baseUrl,
  signIn,
  cimdServer,
  user,
  beforeApprove,
}: AuthorizeMcpClientOptions): Promise<McpAuthorization> => {
  const metadata = await readMcpServerMetadata(request);
  const pkce = createPkcePair();
  const state = createState();
  const clientId = cimdServer.clientId;

  await signIn(user);
  await interceptAuthorizationResponse(page);
  await page.goto(
    buildAuthorizationUrl(baseUrl, {
      clientId,
      codeChallenge: pkce.challenge,
      state,
      resource: metadata.resource,
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
