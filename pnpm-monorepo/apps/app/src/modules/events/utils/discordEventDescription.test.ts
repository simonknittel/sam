import { DISCORD_EVENT_DESCRIPTION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";
import { beforeEach, describe, expect, test, vi } from "vitest";

const BASE_URL = "https://sam.example.com";

const EVENT_URL = `${BASE_URL}/app/events/clhaw95yi0000jr08ybuvy137`;

/**
 * The module reads the base address at import time, so each case imports it
 * again with the address it wants to measure.
 */
const importModule = async (baseUrl = BASE_URL) => {
  vi.doMock("@/env", () => ({ env: { NEXT_PUBLIC_BASE_URL: baseUrl } }));

  return import("./discordEventDescription");
};

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock("@/env");
});

describe("buildDiscordEventDescription", () => {
  test("puts the note below the text of the manager", async () => {
    const { buildDiscordEventDescription } = await importModule();

    expect(buildDiscordEventDescription("Fleet-Op um 20 Uhr", EVENT_URL)).toBe(
      `Fleet-Op um 20 Uhr\n\nAnmeldung nur über SAM, nicht über Discord:\n${EVENT_URL}`,
    );
  });

  test("sends the note alone when there is no description", async () => {
    const { buildDiscordEventDescription } = await importModule();

    expect(buildDiscordEventDescription(null, EVENT_URL)).toBe(
      `Anmeldung nur über SAM, nicht über Discord:\n${EVENT_URL}`,
    );
  });
});

describe("findDescriptionProblem", () => {
  test("passes a description inside the limit", async () => {
    const { EVENT_DESCRIPTION_MAX_LENGTH, findDescriptionProblem } =
      await importModule();

    expect(
      findDescriptionProblem("a".repeat(EVENT_DESCRIPTION_MAX_LENGTH)),
    ).toBeNull();
    expect(findDescriptionProblem(undefined)).toBeNull();
  });

  /**
   * The browser keeps a field inside `maxLength` only while somebody types
   * in it, thus a description stored before the limit became smaller reaches
   * the actions untouched. The message must name the field, or the manager
   * reads only "bad request" and cannot save a changed title either.
   */
  test("names the field for a description from before the smaller limit", async () => {
    const { EVENT_DESCRIPTION_MAX_LENGTH, findDescriptionProblem } =
      await importModule();

    expect(
      findDescriptionProblem("a".repeat(EVENT_DESCRIPTION_MAX_LENGTH + 1)),
    ).toContain("Kurzbeschreibung");
  });
});

describe("EVENT_DESCRIPTION_MAX_LENGTH", () => {
  test("leaves room for the note inside Discord's cap", async () => {
    const { EVENT_DESCRIPTION_MAX_LENGTH, buildDiscordEventDescription } =
      await importModule();

    const description = "a".repeat(EVENT_DESCRIPTION_MAX_LENGTH);

    expect(
      buildDiscordEventDescription(description, EVENT_URL).length,
    ).toBeLessThanOrEqual(DISCORD_EVENT_DESCRIPTION_MAX_LENGTH);
  });

  test("is a multiple of ten", async () => {
    const { EVENT_DESCRIPTION_MAX_LENGTH } = await importModule();

    expect(EVENT_DESCRIPTION_MAX_LENGTH % 10).toBe(0);
  });

  test("becomes smaller when the base address becomes longer", async () => {
    const { EVENT_DESCRIPTION_MAX_LENGTH: shortAddress } = await importModule();

    vi.resetModules();
    const { EVENT_DESCRIPTION_MAX_LENGTH: longAddress } = await importModule(
      "https://sam-git-a-very-long-preview-branch-name.example.com",
    );

    expect(longAddress).toBeLessThan(shortAddress);
  });

  test("stays usable when the base address is absurdly long", async () => {
    const { EVENT_DESCRIPTION_MAX_LENGTH } = await importModule(
      `https://${"a".repeat(2000)}.example.com`,
    );

    expect(EVENT_DESCRIPTION_MAX_LENGTH).toBeGreaterThan(0);
  });
});

describe("PLACEHOLDER_EVENT_URL", () => {
  test("shows the real base address without inventing an identifier", async () => {
    const { PLACEHOLDER_EVENT_URL } = await importModule();

    expect(PLACEHOLDER_EVENT_URL).toBe(`${BASE_URL}/app/events/…`);
  });
});
