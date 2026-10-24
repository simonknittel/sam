import {
  parseWikiCollabDisconnectTokenPayload,
  parseWikiCollabReplaceTokenPayload,
  parseWikiCollabSessionTokenPayload,
} from "@sam-monorepo/wiki-editor";
import { jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createCollabClient } from "./createCollabClient.js";

const JWT_SECRET = "test-collab-secret";
const REPLACE_TIMEOUT_MILLISECONDS = 15_000;
const DISCONNECT_TIMEOUT_MILLISECONDS = 5_000;
/** The lifetime of each token in seconds */
const TOKEN_LIFETIME_SECONDS = 60;

const fetchMock = vi.fn<typeof fetch>();

const createClient = (url = "ws://collab.example:1234") =>
  createCollabClient({
    url,
    jwtSecret: JWT_SECRET,
    replaceTimeoutMilliseconds: REPLACE_TIMEOUT_MILLISECONDS,
  });

const verifyToken = (token: string) =>
  jwtVerify(token, new TextEncoder().encode(JWT_SECRET), {
    algorithms: ["HS256"],
  });

const getRequest = () => {
  const [input, init] = fetchMock.mock.calls[0] ?? [];
  const headers = new Headers(init?.headers);

  return {
    url: String(input),
    method: init?.method,
    headers,
    token: headers.get("authorization")?.replace(/^Bearer /, "") ?? "",
    body: init?.body,
    signal: init?.signal,
  };
};

const REPLACEMENT = {
  pageId: "page-1",
  content: { type: "doc", content: [] },
  updatedByEntityId: "citizen-1",
};

beforeEach(() => {
  fetchMock.mockReset();
  /** A new response for each call: a response body can be read one time */
  fetchMock.mockImplementation(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("replaceContent", () => {
  test.each([
    ["ws://collab.example:1234", "http://collab.example:1234/replace"],
    ["wss://collab.example", "https://collab.example/replace"],
  ])("sends the replacement of %s to %s", async (url, replaceUrl) => {
    await createClient(url).replaceContent(REPLACEMENT);

    const request = getRequest();
    expect(request.url).toBe(replaceUrl);
    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(request.body))).toEqual({
      content: REPLACEMENT.content,
    });
  });

  test("authenticates with a replace token that the collab server accepts", async () => {
    await createClient().replaceContent(REPLACEMENT);

    const { payload, protectedHeader } = await verifyToken(getRequest().token);
    expect(protectedHeader.alg).toBe("HS256");
    expect(parseWikiCollabReplaceTokenPayload(payload)).toEqual({
      scope: "replace",
      pageId: "page-1",
      entityId: "citizen-1",
    });
    expect(parseWikiCollabSessionTokenPayload(payload)).toBeNull();
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(
      TOKEN_LIFETIME_SECONDS,
    );
  });

  test("stops the request after the timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    await createClient().replaceContent(REPLACEMENT);

    expect(timeoutSpy).toHaveBeenCalledWith(REPLACE_TIMEOUT_MILLISECONDS);
    expect(getRequest().signal).toBe(timeoutSpy.mock.results[0]?.value);
  });

  test("throws when the collab server refuses the replacement", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(createClient().replaceContent(REPLACEMENT)).rejects.toThrow(
      "Collab request to /replace failed with status 401",
    );
  });
});

describe("createSessionToken", () => {
  test("signs a session token for the user that the collab server accepts", async () => {
    const token = await createClient().createSessionToken({
      userId: "user-1",
      pageId: "page-1",
      entityId: null,
      canEdit: true,
    });

    const { payload, protectedHeader } = await verifyToken(token);
    expect(protectedHeader.alg).toBe("HS256");
    expect(parseWikiCollabSessionTokenPayload(payload)).toEqual({
      scope: "session",
      sub: "user-1",
      pageId: "page-1",
      entityId: null,
      canEdit: true,
    });
    expect(parseWikiCollabReplaceTokenPayload(payload)).toBeNull();
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(
      TOKEN_LIFETIME_SECONDS,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("disconnectUser", () => {
  test("sends a disconnect token for the user that only the disconnect endpoint accepts", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    await createClient("wss://collab.example").disconnectUser("user-1");

    const request = getRequest();
    expect(request.url).toBe("https://collab.example/disconnect");
    expect(request.method).toBe("POST");
    expect(timeoutSpy).toHaveBeenCalledWith(DISCONNECT_TIMEOUT_MILLISECONDS);
    const { payload } = await verifyToken(request.token);
    expect(parseWikiCollabDisconnectTokenPayload(payload)).toEqual({
      scope: "disconnect",
      sub: "user-1",
    });
    expect(parseWikiCollabSessionTokenPayload(payload)).toBeNull();
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(
      TOKEN_LIFETIME_SECONDS,
    );
  });
});
