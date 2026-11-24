import { describe, expect, it } from "vitest";
import {
  DiscordChannelType,
  DiscordScheduledEventEntityType,
  findContentProblem,
  findPublishProblem,
  getEntityTypeForChannelType,
  GuildScheduledEventContentProblem,
  toGuildScheduledEventChange,
  type GuildScheduledEventContent,
  type GuildScheduledEventTarget,
} from "./guildScheduledEvent.js";

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

describe("toGuildScheduledEventChange", () => {
  it("leaves out the whole schedule of an event that already began", () => {
    const change = toGuildScheduledEventChange(
      content({
        startTime: new Date("2027-02-28T19:00:00.000Z"),
        endTime: new Date("2027-03-01T19:00:00.000Z"),
      }),
      NOW,
    );

    expect(change.schedule).toBeNull();
    expect(change.name).toBe("Operation Nachtwache");
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
