import { EventSource } from "@sam-monorepo/database/client";
import { describe, expect, test } from "vitest";
import {
  diffParticipants,
  selectCancelledDiscordEvents,
} from "./reconciliation";

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
