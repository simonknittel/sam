import { describe, expect, it } from "vitest";
import {
  buildCreateGuildScheduledEventPayload,
  buildModifyGuildScheduledEventPayload,
  findContentProblem,
  findPublishProblem,
  getEntityTypeForChannelType,
  GuildScheduledEventContentProblem,
  type GuildScheduledEventContent,
  type GuildScheduledEventTarget,
} from "./guildScheduledEventPayload";
import {
  DiscordChannelType,
  DiscordScheduledEventEntityType,
  DiscordScheduledEventPrivacyLevel,
} from "./schemas";

const NOW = new Date("2027-03-01T12:00:00.000Z");

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

describe("getEntityTypeForChannelType", () => {
  it("maps the two channel types Discord accepts", () => {
    expect(getEntityTypeForChannelType(DiscordChannelType.GuildVoice)).toBe(
      DiscordScheduledEventEntityType.Voice,
    );
    expect(
      getEntityTypeForChannelType(DiscordChannelType.GuildStageVoice),
    ).toBe(DiscordScheduledEventEntityType.StageInstance);
  });

  it("rejects any other channel type", () => {
    // 0 = GUILD_TEXT, 4 = GUILD_CATEGORY
    expect(getEntityTypeForChannelType(0)).toBeNull();
    expect(getEntityTypeForChannelType(4)).toBeNull();
  });
});

describe("buildCreateGuildScheduledEventPayload", () => {
  it("sends channel_id and no entity_metadata for a channel event", () => {
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
      privacy_level: DiscordScheduledEventPrivacyLevel.GuildOnly,
      entity_type: DiscordScheduledEventEntityType.Voice,
      channel_id: "1234567890",
    });
  });

  it("sends entity_metadata and no channel_id for an external event", () => {
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

  it("omits the image when the cover could not be read", () => {
    const payload = buildCreateGuildScheduledEventPayload(
      content({ imageDataUri: undefined }),
      CHANNEL_TARGET,
    );

    expect(payload).not.toHaveProperty("image");
  });
});

describe("buildModifyGuildScheduledEventPayload", () => {
  it("re-asserts name, description, schedule and cover", () => {
    const payload = buildModifyGuildScheduledEventPayload(
      content({ imageDataUri: "data:image/png;base64,AAA" }),
      NOW,
    );

    expect(payload).toEqual({
      name: "Operation Nachtwache",
      description: "Wir treffen uns am Sammelpunkt.",
      scheduled_start_time: "2027-03-05T19:00:00.000Z",
      scheduled_end_time: "2027-03-05T21:00:00.000Z",
      image: "data:image/png;base64,AAA",
    });
  });

  it("clears the cover on Discord when the app has none", () => {
    const payload = buildModifyGuildScheduledEventPayload(content(), NOW);

    expect(payload.image).toBeNull();
  });

  it("keeps Discord's cover when the app's one could not be read", () => {
    const payload = buildModifyGuildScheduledEventPayload(
      content({ imageDataUri: undefined }),
      NOW,
    );

    expect(payload).not.toHaveProperty("image");
  });

  it("leaves out the start time of an event that already began", () => {
    const payload = buildModifyGuildScheduledEventPayload(
      content({
        startTime: new Date("2027-02-28T19:00:00.000Z"),
        endTime: new Date("2027-03-01T19:00:00.000Z"),
      }),
      NOW,
    );

    expect(payload).not.toHaveProperty("scheduled_start_time");
    expect(payload.scheduled_end_time).toBe("2027-03-01T19:00:00.000Z");
  });
});

describe("findPublishProblem", () => {
  it("passes a publishable event", () => {
    expect(findPublishProblem(content(), CHANNEL_TARGET, NOW)).toBeNull();
  });

  it("rejects a name beyond Discord's cap", () => {
    expect(
      findPublishProblem(
        content({ name: "a".repeat(101) }),
        CHANNEL_TARGET,
        NOW,
      ),
    ).toBe(GuildScheduledEventContentProblem.NameTooLong);
  });

  it("rejects a legacy description beyond Discord's cap", () => {
    expect(
      findPublishProblem(
        content({ description: "a".repeat(1001) }),
        CHANNEL_TARGET,
        NOW,
      ),
    ).toBe(GuildScheduledEventContentProblem.DescriptionTooLong);
  });

  it("rejects an external location beyond Discord's cap", () => {
    expect(
      findPublishProblem(
        content(),
        {
          entityType: DiscordScheduledEventEntityType.External,
          location: "a".repeat(101),
        },
        NOW,
      ),
    ).toBe(GuildScheduledEventContentProblem.LocationTooLong);
  });

  it("rejects an event that already started", () => {
    expect(
      findPublishProblem(
        content({
          startTime: new Date("2027-02-28T19:00:00.000Z"),
          endTime: new Date("2027-03-01T19:00:00.000Z"),
        }),
        CHANNEL_TARGET,
        NOW,
      ),
    ).toBe(GuildScheduledEventContentProblem.StartInThePast);
  });

  it("rejects an end before the start", () => {
    expect(
      findPublishProblem(
        content({ endTime: new Date("2027-03-05T18:00:00.000Z") }),
        CHANNEL_TARGET,
        NOW,
      ),
    ).toBe(GuildScheduledEventContentProblem.EndBeforeStart);
  });
});

describe("findContentProblem", () => {
  it("still enforces the length caps when re-asserting content", () => {
    expect(findContentProblem(content({ name: "a".repeat(101) }))).toBe(
      GuildScheduledEventContentProblem.NameTooLong,
    );
  });

  it("accepts an event that already started", () => {
    expect(
      findContentProblem(
        content({
          startTime: new Date("2027-02-28T19:00:00.000Z"),
          endTime: new Date("2027-03-01T19:00:00.000Z"),
        }),
      ),
    ).toBeNull();
  });
});
