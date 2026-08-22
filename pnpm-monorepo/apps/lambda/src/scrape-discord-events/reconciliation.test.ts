import { EventSource } from "@sam-monorepo/database/client";
import { describe, expect, test } from "vitest";
import {
  diffParticipants,
  excludeAppPublishedEvents,
  selectCancelledDiscordEvents,
} from "./reconciliation";

describe("excludeAppPublishedEvents", () => {
  test("drops the guild events the app published itself", () => {
    const remaining = excludeAppPublishedEvents(
      [{ id: "discord-1" }, { id: "published-by-app" }, { id: "discord-2" }],
      new Set(["published-by-app"]),
    );

    expect(remaining.map((event) => event.id)).toEqual([
      "discord-1",
      "discord-2",
    ]);
  });

  test("keeps every event when the app published none", () => {
    const remaining = excludeAppPublishedEvents(
      [{ id: "discord-1" }],
      new Set<string>(),
    );

    expect(remaining.map((event) => event.id)).toEqual(["discord-1"]);
  });

  /**
   * The whole point of the filter: a published app event that also survives
   * the "missing from Discord" check would be imported once and deleted the
   * next run, over and over.
   */
  test("leaves a published app event out of the cancellation check", () => {
    const remaining = excludeAppPublishedEvents(
      [{ id: "published-by-app" }],
      new Set(["published-by-app"]),
    );

    const cancelled = selectCancelledDiscordEvents(
      [
        {
          id: "the-app-event",
          source: EventSource.APP,
          discordId: null,
        },
      ],
      new Set(remaining.map((event) => event.id)),
    );

    expect(remaining).toEqual([]);
    expect(cancelled).toEqual([]);
  });
});

describe("selectCancelledDiscordEvents", () => {
  test("selects Discord events missing from the Discord response", () => {
    const cancelled = selectCancelledDiscordEvents(
      [
        { id: "kept", source: EventSource.DISCORD, discordId: "discord-1" },
        { id: "gone", source: EventSource.DISCORD, discordId: "discord-2" },
      ],
      new Set(["discord-1"]),
    );

    expect(cancelled.map((event) => event.id)).toEqual(["gone"]);
  });

  test("never selects app events, even though they are missing from the Discord response", () => {
    const cancelled = selectCancelledDiscordEvents(
      [
        { id: "app-event", source: EventSource.APP, discordId: null },
        { id: "gone", source: EventSource.DISCORD, discordId: "discord-2" },
      ],
      new Set<string>(),
    );

    expect(cancelled.map((event) => event.id)).toEqual(["gone"]);
  });

  test("ignores Discord-sourced rows without a Discord id", () => {
    const cancelled = selectCancelledDiscordEvents(
      [{ id: "broken", source: EventSource.DISCORD, discordId: null }],
      new Set<string>(),
    );

    expect(cancelled).toEqual([]);
  });
});

describe("diffParticipants", () => {
  test("detects new RSVPs", () => {
    const diff = diffParticipants(
      ["user-1", "user-2"],
      [{ discordUserId: "user-1" }],
    );

    expect(diff.added).toEqual(["user-2"]);
    expect(diff.removed).toEqual([]);
  });

  test("detects withdrawals", () => {
    const diff = diffParticipants(
      ["user-1"],
      [{ discordUserId: "user-1" }, { discordUserId: "user-2" }],
    );

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual(["user-2"]);
  });

  test("treats a re-RSVP after a withdrawal as an addition because only active rows are diffed", () => {
    const diff = diffParticipants(["user-1"], []);

    expect(diff.added).toEqual(["user-1"]);
    expect(diff.removed).toEqual([]);
  });

  test("ignores active rows without a Discord id instead of removing them", () => {
    const diff = diffParticipants([], [{ discordUserId: null }]);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  test("reports no changes when Discord matches the database", () => {
    const diff = diffParticipants(
      ["user-1", "user-2"],
      [{ discordUserId: "user-2" }, { discordUserId: "user-1" }],
    );

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });
});
