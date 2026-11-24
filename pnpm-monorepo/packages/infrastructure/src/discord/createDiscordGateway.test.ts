import {
  DiscordOutcome,
  type DiscordGateway,
  type DiscordResult,
} from "@sam-monorepo/application";
import {
  DiscordScheduledEventEntityType,
  toGuildScheduledEventChange,
  type GuildScheduledEventContent,
  type GuildScheduledEventTarget,
} from "@sam-monorepo/domain";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createDiscordGateway,
  type DiscordGatewayOptions,
} from "./createDiscordGateway.js";
import {
  buildCreateGuildScheduledEventPayload,
  buildModifyGuildScheduledEventPayload,
} from "./guildScheduledEventPayload.js";

const API_BASE_URL = "https://discord.example/api/v10";
const BOT_TOKEN = "test-bot-token";
const GUILD_ID = "guild-1";
const USER_AGENT = "DiscordBot (https://sam.example, 1.2.3)";
const NOW = new Date("2027-03-01T12:00:00.000Z");

const fetchMock = vi.fn<typeof fetch>();

const getRequest = (index = 0) => {
  const [input, init] = fetchMock.mock.calls[index] ?? [];
  const url = new URL(String(input));

  return {
    url: url.toString(),
    path: url.pathname,
    searchParams: url.searchParams,
    method: init?.method,
    headers: new Headers(init?.headers),
    body: init?.body,
    signal: init?.signal,
  };
};

const jsonResponse = (
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) => new Response(JSON.stringify(body), { status, headers });

const content = (
  overrides: Partial<GuildScheduledEventContent> = {},
): GuildScheduledEventContent => ({
  name: "Operation Nachtwache",
  description: "Wir treffen uns am Sammelpunkt.",
  startTime: new Date("2027-03-05T19:00:00.000Z"),
  endTime: new Date("2027-03-05T21:00:00.000Z"),
  imageDataUri: null,
  ...overrides,
});

const CHANNEL_TARGET: GuildScheduledEventTarget = {
  entityType: DiscordScheduledEventEntityType.Voice,
  channelId: "1234567890",
};

const EXTERNAL_TARGET: GuildScheduledEventTarget = {
  entityType: DiscordScheduledEventEntityType.External,
  location: "https://sam.example/app/events/abc",
};

const createGateway = (overrides: Partial<DiscordGatewayOptions> = {}) => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const startedSpanNames: string[] = [];
  const tracer = {
    startActiveSpan: (
      name: string,
      callback: (span: unknown) => Promise<unknown>,
    ) => {
      startedSpanNames.push(name);
      return callback({ setStatus: () => undefined, end: () => undefined });
    },
  } as unknown as DiscordGatewayOptions["tracer"];

  const gateway = createDiscordGateway({
    apiBaseUrl: API_BASE_URL,
    botToken: BOT_TOKEN,
    guildId: GUILD_ID,
    userAgent: USER_AGENT,
    requestTimeoutMilliseconds: 1_000,
    rateLimitRetry: { maximumRetryCount: 1, maximumWaitSeconds: 5 },
    log,
    tracer,
    ...overrides,
  });

  return { gateway, log, startedSpanNames };
};

type TestLog = ReturnType<typeof createGateway>["log"];

const getLogCalls = (log: TestLog) =>
  [log.info, log.warn, log.error].flatMap(
    (logFunction) => logFunction.mock.calls,
  );

const getLoggedText = (log: TestLog) =>
  JSON.stringify(getLogCalls(log), (key, value: unknown) =>
    value instanceof Error
      ? { name: value.name, message: value.message, cause: value.cause }
      : value,
  );

interface FailureCase {
  readonly name: string;
  readonly options?: Partial<DiscordGatewayOptions>;
  readonly stubFetch?: () => void;
  readonly call: (gateway: DiscordGateway) => Promise<DiscordResult<unknown>>;
  /** How often the gateway calls `fetch` before it gives up */
  readonly fetchCount: number;
}

/** Discord user IDs are snowflakes: numbers as strings */
const createDiscordUserIds = (count: number) =>
  Array.from({ length: count }, (unused, index) =>
    String(100_000_000_000_000_000n + BigInt(index)),
  );

/**
 * Replaces the endpoint of the users of an event. Like Discord, it returns
 * the users in ascending order of their ID, at most `limit` users after the
 * user ID `after`.
 *
 * @returns the `after` parameter of each request
 */
const stubEventUsers = (
  userIds: readonly string[],
  { isAfterIgnored = false } = {},
) => {
  const requestedAfterValues: (string | null)[] = [];

  fetchMock.mockImplementation((input) => {
    const { searchParams } = new URL(String(input));
    const after = searchParams.get("after");
    const limit = Number(searchParams.get("limit") ?? 100);
    requestedAfterValues.push(after);

    const page = userIds
      .filter(
        (userId) =>
          isAfterIgnored || after === null || BigInt(userId) > BigInt(after),
      )
      .slice(0, limit)
      .map((userId) => ({
        guild_scheduled_event_id: "2",
        user_id: userId,
        user: { id: userId, username: `user-${userId}` },
      }));

    return Promise.resolve(jsonResponse(200, page));
  });

  return requestedAfterValues;
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the request", () => {
  test("authenticates as the bot, keeps the base path and returns the parsed body", async () => {
    const { gateway, startedSpanNames } = createGateway();
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "42", extra: true }));

    const result = await gateway.createScheduledEvent(
      content(),
      CHANNEL_TARGET,
    );

    expect(result).toEqual({
      outcome: DiscordOutcome.Success,
      data: { id: "42" },
    });

    const request = getRequest();
    expect(request.url).toBe(`${API_BASE_URL}/guilds/guild-1/scheduled-events`);
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe(`Bot ${BOT_TOKEN}`);
    expect(request.headers.get("User-Agent")).toBe(USER_AGENT);
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(request.body).toBe(
      JSON.stringify(
        buildCreateGuildScheduledEventPayload(content(), CHANNEL_TARGET),
      ),
    );
    expect(startedSpanNames).toEqual(["discord POST"]);
  });

  test("sends no User-Agent without the option, permits a loopback base URL and encodes the IDs of a path", async () => {
    const { gateway } = createGateway({
      apiBaseUrl: "http://127.0.0.1:4010/api/v10/",
      guildId: "guild/1",
      userAgent: undefined,
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await gateway.deleteScheduledEvent("../2");

    const request = getRequest();
    expect(request.url).toBe(
      "http://127.0.0.1:4010/api/v10/guilds/guild%2F1/scheduled-events/..%2F2",
    );
    expect(request.headers.has("User-Agent")).toBe(false);
  });

  test("reports an unknown scheduled event as its own outcome so callers can self-heal", async () => {
    const { gateway } = createGateway();
    // 10070 = Unknown Guild Scheduled Event
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(404, { code: 10070 })),
    );

    const modified = await gateway.modifyScheduledEvent(
      "2",
      toGuildScheduledEventChange(content(), NOW),
    );
    const deleted = await gateway.deleteScheduledEvent("2");

    expect(modified).toEqual({ outcome: DiscordOutcome.NotFound });
    expect(deleted).toEqual({ outcome: DiscordOutcome.NotFound });
    expect(getRequest(0).path).toBe(
      "/api/v10/guilds/guild-1/scheduled-events/2",
    );
    expect(getRequest(0).method).toBe("PATCH");
    expect(getRequest(1).method).toBe("DELETE");
  });

  test.each<FailureCase>([
    {
      name: "a 404 with a different error code",
      stubFetch: () =>
        // 10004 = Unknown Guild
        fetchMock.mockResolvedValue(jsonResponse(404, { code: 10004 })),
      call: (gateway) =>
        gateway.modifyScheduledEvent(
          "2",
          toGuildScheduledEventChange(content(), NOW),
        ),
      fetchCount: 1,
    },
    {
      name: "any other rejection",
      stubFetch: () =>
        fetchMock.mockResolvedValue(
          jsonResponse(403, { code: 50013, message: "Missing Permissions" }),
        ),
      call: (gateway) =>
        gateway.createScheduledEvent(content(), CHANNEL_TARGET),
      fetchCount: 1,
    },
    {
      name: "an unreachable Discord",
      stubFetch: () => fetchMock.mockRejectedValue(new Error("network down")),
      call: (gateway) => gateway.listChannels(),
      fetchCount: 1,
    },
    {
      name: "a request that times out",
      stubFetch: () =>
        fetchMock.mockRejectedValue(
          new DOMException("The operation timed out.", "TimeoutError"),
        ),
      call: (gateway) => gateway.listChannels(),
      fetchCount: 1,
    },
    {
      name: "a base URL that is not a URL",
      options: { apiBaseUrl: "not a URL" },
      call: (gateway) => gateway.listChannels(),
      fetchCount: 0,
    },
    {
      name: "a base URL without TLS on a host that is not loopback",
      options: { apiBaseUrl: "http://discord.example/api/v10" },
      call: (gateway) => gateway.listChannels(),
      fetchCount: 0,
    },
    {
      name: "a token that a header cannot carry",
      options: { botToken: `${BOT_TOKEN}\nX-Injected: 1` },
      call: (gateway) => gateway.listChannels(),
      fetchCount: 0,
    },
    {
      name: "a rate limit after the maximum retry count",
      options: {
        rateLimitRetry: { maximumRetryCount: 2, maximumWaitSeconds: 5 },
      },
      stubFetch: () =>
        fetchMock.mockImplementation(() =>
          Promise.resolve(jsonResponse(429, { retry_after: 0 })),
        ),
      call: (gateway) => gateway.listChannels(),
      fetchCount: 3,
    },
    {
      name: "a rate limit that asks for a long wait",
      stubFetch: () =>
        fetchMock.mockResolvedValue(jsonResponse(429, { retry_after: 120 })),
      call: (gateway) =>
        gateway.createScheduledEvent(content(), CHANNEL_TARGET),
      fetchCount: 1,
    },
    {
      name: "a rate limit that names no wait at all",
      stubFetch: () =>
        fetchMock.mockResolvedValue(new Response("nope", { status: 429 })),
      call: (gateway) =>
        gateway.createScheduledEvent(content(), CHANNEL_TARGET),
      fetchCount: 1,
    },
    {
      name: "a response that does not match the schema",
      stubFetch: () =>
        fetchMock.mockResolvedValue(jsonResponse(200, { unexpected: true })),
      call: (gateway) =>
        gateway.createScheduledEvent(content(), CHANNEL_TARGET),
      fetchCount: 1,
    },
  ])(
    "reports $name as a failure instead of throwing",
    async ({ options, stubFetch, call, fetchCount }) => {
      const { gateway } = createGateway(options);
      stubFetch?.();

      const result = await call(gateway);

      expect(result).toEqual({ outcome: DiscordOutcome.Failed });
      expect(fetchMock).toHaveBeenCalledTimes(fetchCount);
    },
  );

  test("retries a short rate limit once and then succeeds", async () => {
    const { gateway } = createGateway();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, { retry_after: 0 }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "42" }));

    const result = await gateway.createScheduledEvent(
      content(),
      CHANNEL_TARGET,
    );

    expect(result).toEqual({
      outcome: DiscordOutcome.Success,
      data: { id: "42" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("reads the wait of a rate limit from the Retry-After header", async () => {
    const { gateway } = createGateway();
    fetchMock
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 429,
          headers: { "Retry-After": "0" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, []));

    const result = await gateway.listChannels();

    expect(result).toEqual({ outcome: DiscordOutcome.Success, data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("sends no body and no content type for a delete", async () => {
    const { gateway } = createGateway();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await gateway.deleteScheduledEvent("2");

    expect(result).toEqual({ outcome: DiscordOutcome.Success, data: null });

    const request = getRequest();
    expect(request.method).toBe("DELETE");
    expect(request.body).toBeUndefined();
    expect(request.headers.get("Content-Type")).toBeNull();
  });

  describe("never writes the token to a log", () => {
    test("for a failed request, a rejection or an unexpected body", async () => {
      const { gateway, log } = createGateway();
      fetchMock
        .mockRejectedValueOnce(
          new TypeError(`"Bot ${BOT_TOKEN}" is an invalid header value.`),
        )
        .mockResolvedValueOnce(jsonResponse(403, { message: "Missing Access" }))
        .mockResolvedValueOnce(jsonResponse(200, { unexpected: true }));

      await gateway.listChannels();
      await gateway.listChannels();
      await gateway.createScheduledEvent(content(), CHANNEL_TARGET);

      expect(getLogCalls(log).length).toBeGreaterThanOrEqual(3);
      expect(getLoggedText(log)).not.toContain(BOT_TOKEN);
    });

    test("for a token that a header cannot carry", async () => {
      const { gateway, log } = createGateway({
        botToken: `${BOT_TOKEN}\nX-Injected: 1`,
      });
      // Like the fetch of Node, which names the invalid value in its error
      fetchMock.mockImplementation((input, init) => {
        new Headers(init?.headers);
        return Promise.resolve(jsonResponse(200, []));
      });

      const result = await gateway.listChannels();

      expect(result).toEqual({ outcome: DiscordOutcome.Failed });
      expect(getLogCalls(log).length).toBeGreaterThanOrEqual(1);
      expect(getLoggedText(log)).not.toContain(BOT_TOKEN);
    });
  });
});

describe("the reads", () => {
  test("lists the scheduled events and gives null for each absent value", async () => {
    const { gateway } = createGateway();
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        {
          id: "1",
          guild_id: GUILD_ID,
          name: "Mit allen Feldern",
          image: "cover-hash",
          scheduled_start_time: "2027-03-05T19:00:00.000Z",
          scheduled_end_time: "2027-03-05T21:00:00.000Z",
          description: "Beschreibung",
          creator_id: "creator",
          entity_metadata: { location: "Stanton" },
          user_count: 3,
        },
        {
          id: "2",
          guild_id: GUILD_ID,
          name: "Ohne optionale Felder",
          image: null,
          scheduled_start_time: "2027-03-06T19:00:00.000Z",
          scheduled_end_time: null,
          description: null,
          creator_id: null,
          entity_metadata: null,
        },
        {
          id: "3",
          guild_id: GUILD_ID,
          name: "Ohne Felder",
          scheduled_start_time: "2027-03-07T19:00:00.000Z",
          entity_metadata: { location: "" },
        },
      ]),
    );

    const result = await gateway.listScheduledEvents();

    expect(result).toEqual({
      outcome: DiscordOutcome.Success,
      data: [
        {
          id: "1",
          guildId: GUILD_ID,
          name: "Mit allen Feldern",
          image: "cover-hash",
          startTime: new Date("2027-03-05T19:00:00.000Z"),
          endTime: new Date("2027-03-05T21:00:00.000Z"),
          description: "Beschreibung",
          creatorId: "creator",
          location: "Stanton",
        },
        {
          id: "2",
          guildId: GUILD_ID,
          name: "Ohne optionale Felder",
          image: null,
          startTime: new Date("2027-03-06T19:00:00.000Z"),
          endTime: null,
          description: null,
          creatorId: null,
          location: null,
        },
        {
          id: "3",
          guildId: GUILD_ID,
          name: "Ohne Felder",
          image: null,
          startTime: new Date("2027-03-07T19:00:00.000Z"),
          endTime: null,
          description: null,
          creatorId: null,
          location: null,
        },
      ],
    });

    const request = getRequest();
    expect(request.method).toBe("GET");
    expect(request.path).toBe("/api/v10/guilds/guild-1/scheduled-events");
    expect(request.searchParams.get("with_user_count")).toBe("true");
  });

  test("lists the channels", async () => {
    const { gateway } = createGateway();
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        { id: "1", name: "Einsatzraum", type: 2, position: 1 },
        { id: "2", name: "allgemein", type: 0 },
      ]),
    );

    const result = await gateway.listChannels();

    expect(result).toEqual({
      outcome: DiscordOutcome.Success,
      data: [
        { id: "1", name: "Einsatzraum", type: 2, position: 1 },
        { id: "2", name: "allgemein", type: 0, position: null },
      ],
    });
    expect(getRequest().path).toBe("/api/v10/guilds/guild-1/channels");
  });

  describe("the users of a scheduled event", () => {
    const userIds = createDiscordUserIds(250);

    test("reads all pages", async () => {
      const { gateway } = createGateway();
      const requestedAfterValues = stubEventUsers(userIds);

      const result = await gateway.listScheduledEventUserIds("2");

      expect(result).toEqual({
        outcome: DiscordOutcome.Success,
        data: userIds,
      });
      expect(requestedAfterValues).toEqual([null, userIds[99], userIds[199]]);
      expect(getRequest().path).toBe(
        "/api/v10/guilds/guild-1/scheduled-events/2/users",
      );
      expect(getRequest().searchParams.get("limit")).toBe("100");
    });

    test("fails without a partial list when the pages do not end", async () => {
      const { gateway } = createGateway();
      const requestedAfterValues = stubEventUsers(userIds, {
        isAfterIgnored: true,
      });

      const result = await gateway.listScheduledEventUserIds("2");

      expect(result).toEqual({ outcome: DiscordOutcome.Failed });
      expect(requestedAfterValues).toHaveLength(100);
    });

    test("fails without a partial list when a later page fails", async () => {
      const { gateway } = createGateway();
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(
            200,
            userIds.slice(0, 100).map((userId) => ({ user_id: userId })),
          ),
        )
        .mockResolvedValueOnce(jsonResponse(500, { message: "Server error" }));

      const result = await gateway.listScheduledEventUserIds("2");

      expect(result).toEqual({ outcome: DiscordOutcome.Failed });
    });
  });
});

describe("the wire format of a change", () => {
  test("sends the modify payload as a PATCH", async () => {
    const { gateway } = createGateway();
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "2" }));

    const result = await gateway.modifyScheduledEvent(
      "2",
      toGuildScheduledEventChange(
        content({ imageDataUri: "data:image/png;base64,AAA" }),
        NOW,
      ),
    );

    expect(result).toEqual({ outcome: DiscordOutcome.Success, data: null });
    expect(getRequest().method).toBe("PATCH");
    expect(JSON.parse(String(getRequest().body))).toEqual({
      name: "Operation Nachtwache",
      description: "Wir treffen uns am Sammelpunkt.",
      scheduled_start_time: "2027-03-05T19:00:00.000Z",
      scheduled_end_time: "2027-03-05T21:00:00.000Z",
      image: "data:image/png;base64,AAA",
    });
  });
});

describe("buildCreateGuildScheduledEventPayload", () => {
  test("sends channel_id and no entity_metadata for a channel event", () => {
    const payload = buildCreateGuildScheduledEventPayload(
      content(),
      CHANNEL_TARGET,
    );

    expect(payload).toEqual({
      name: "Operation Nachtwache",
      description: "Wir treffen uns am Sammelpunkt.",
      scheduled_start_time: "2027-03-05T19:00:00.000Z",
      scheduled_end_time: "2027-03-05T21:00:00.000Z",
      image: null,
      privacy_level: 2,
      entity_type: DiscordScheduledEventEntityType.Voice,
      channel_id: "1234567890",
    });
  });

  test("sends entity_metadata and no channel_id for an external event", () => {
    const payload = buildCreateGuildScheduledEventPayload(
      content(),
      EXTERNAL_TARGET,
    );

    expect(payload).not.toHaveProperty("channel_id");
    expect(payload).toMatchObject({
      entity_type: DiscordScheduledEventEntityType.External,
      entity_metadata: { location: "https://sam.example/app/events/abc" },
    });
  });

  test("omits the image when the cover could not be read", () => {
    const payload = buildCreateGuildScheduledEventPayload(
      content({ imageDataUri: undefined }),
      CHANNEL_TARGET,
    );

    expect(payload).not.toHaveProperty("image");
  });
});

describe("buildModifyGuildScheduledEventPayload", () => {
  test("clears the cover on Discord when the app has none", () => {
    const payload = buildModifyGuildScheduledEventPayload(
      toGuildScheduledEventChange(content(), NOW),
    );

    expect(payload.image).toBeNull();
  });

  test("keeps the cover of Discord when the cover of the app could not be read", () => {
    const payload = buildModifyGuildScheduledEventPayload(
      toGuildScheduledEventChange(content({ imageDataUri: undefined }), NOW),
    );

    expect(payload).not.toHaveProperty("image");
  });

  test("sends no schedule keys for an event that already began", () => {
    const payload = buildModifyGuildScheduledEventPayload(
      toGuildScheduledEventChange(
        content({
          startTime: new Date("2027-02-28T19:00:00.000Z"),
          endTime: new Date("2027-03-01T19:00:00.000Z"),
        }),
        NOW,
      ),
    );

    expect(payload).not.toHaveProperty("scheduled_start_time");
    expect(payload).not.toHaveProperty("scheduled_end_time");
  });
});
