import { describe, expect, test } from "vitest";
import { getPenaltyEntryCreatedText } from "./notificationTexts.js";

describe("getPenaltyEntryCreatedText", () => {
  test("names the reason of the penalty entry", () => {
    expect(getPenaltyEntryCreatedText({ points: 3, reason: "Spam" })).toEqual({
      title: "Strafpunkte erhalten",
      body: "Du hast 3 Strafpunkte erhalten für Spam",
    });
  });

  test("leaves out a reason that is null", () => {
    expect(getPenaltyEntryCreatedText({ points: 3, reason: null }).body).toBe(
      "Du hast 3 Strafpunkte erhalten",
    );
  });
});
