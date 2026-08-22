import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const API_BASE_URL = "https://discord.example/api/v10";
const BOT_TOKEN = "test-bot-token";

const fetchMock = vi.fn<typeof fetch>();

const requestAt = (index: number) => {
  const [url, init] = fetchMock.mock.calls[index];
  return {
    url,
    method: init?.method,
    headers: new Headers(init?.headers),
    body: init?.body,
  };
};

/**
 * The module reads the environment at call time but pulls in `server-only`
 * and the logger at import time, so each suite run gets its own module graph
 * with both stubbed out.
 */
const importDiscordBotRequest = async () => {
  vi.resetModules();
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/env", () => ({
    env: {
      DISCORD_API_BASE_URL: API_BASE_URL,
      DISCORD_TOKEN: BOT_TOKEN,
    },
  }));
  vi.doMock("@/modules/logging", () => ({
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }));

  return import("./discordBotRequest");
};

const jsonResponse = (status: number, body: unknown, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("discordBotRequest", () => {
  it("authenticates as the bot and returns the parsed body", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "42" }));

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events",
      method: DiscordRequestMethod.Post,
      body: { name: "Operation" },
      responseSchema: z.object({ id: z.string() }),
    });

    expect(result).toEqual({
      outcome: DiscordOutcome.Success,
      data: { id: "42" },
    });

    const request = requestAt(0);
    expect(request.url).toBe(`${API_BASE_URL}/guilds/1/scheduled-events`);
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe(`Bot ${BOT_TOKEN}`);
    expect(request.body).toBe(JSON.stringify({ name: "Operation" }));
  });

  it("reports a 404 as its own outcome so callers can self-heal", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockResolvedValue(jsonResponse(404, { code: 10070 }));

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events/2",
      method: DiscordRequestMethod.Patch,
      body: {},
    });

    expect(result).toEqual({ outcome: DiscordOutcome.NotFound });
  });

  it("reports any other rejection as a plain failure", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockResolvedValue(
      jsonResponse(403, { code: 50013, message: "Missing Permissions" }),
    );

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events",
      method: DiscordRequestMethod.Post,
      body: {},
    });

    expect(result).toEqual({ outcome: DiscordOutcome.Failed });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports an unreachable Discord as a failure instead of throwing", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await discordBotRequest({
      path: "/guilds/1/channels",
      method: DiscordRequestMethod.Get,
    });

    expect(result).toEqual({ outcome: DiscordOutcome.Failed });
  });

  it("retries a short rate limit once and then succeeds", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { retry_after: 0 }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "42" }));

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events",
      method: DiscordRequestMethod.Post,
      body: {},
      responseSchema: z.object({ id: z.string() }),
    });

    expect(result).toEqual({
      outcome: DiscordOutcome.Success,
      data: { id: "42" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up on a rate limit that asks for a long wait", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockResolvedValue(jsonResponse(429, { retry_after: 120 }));

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events",
      method: DiscordRequestMethod.Post,
      body: {},
    });

    expect(result).toEqual({ outcome: DiscordOutcome.Failed });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up on a rate limit that names no wait at all", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockResolvedValue(new Response("nope", { status: 429 }));

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events",
      method: DiscordRequestMethod.Post,
      body: {},
    });

    expect(result).toEqual({ outcome: DiscordOutcome.Failed });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a response that does not match the schema as a failure", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockResolvedValue(jsonResponse(200, { unexpected: true }));

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events",
      method: DiscordRequestMethod.Post,
      body: {},
      responseSchema: z.object({ id: z.string() }),
    });

    expect(result).toEqual({ outcome: DiscordOutcome.Failed });
  });

  it("sends no body and no content type for a delete", async () => {
    const { discordBotRequest, DiscordOutcome, DiscordRequestMethod } =
      await importDiscordBotRequest();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await discordBotRequest({
      path: "/guilds/1/scheduled-events/2",
      method: DiscordRequestMethod.Delete,
    });

    expect(result).toMatchObject({ outcome: DiscordOutcome.Success });

    const request = requestAt(0);
    expect(request.body).toBeUndefined();
    expect(request.headers.get("Content-Type")).toBeNull();
  });
});
