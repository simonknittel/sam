import { newYearPayloadSchema } from "@sam-monorepo/notifications";
import { describe, expect, test } from "vitest";
import { buildWording, NEW_YEAR_WORDINGS } from "./newYearWordings";

/** The first turn of the year the greeting goes out for */
const REAL_YEAR = 2027;
const IN_GAME_YEAR = "2957";

const ALL_WORDINGS = NEW_YEAR_WORDINGS.map((unused, index) =>
  buildWording(REAL_YEAR, index),
);

describe("the New Year wordings", () => {
  test("stay within the limits of the payload schema", () => {
    for (const wording of ALL_WORDINGS) {
      expect(newYearPayloadSchema.safeParse(wording).success).toBe(true);
    }
  });

  test("name the in-game year and never the real one", () => {
    for (const wording of ALL_WORDINGS) {
      const years = `${wording.title} ${wording.body}`.match(/\d{4}/g) ?? [];

      for (const year of years) expect(year).toBe(IN_GAME_YEAR);
    }
  });

  /**
   * A wording which spells the year out instead of taking it would still
   * pass the assertion above. It moves with the year exactly while it names
   * one, whichever wordings the list holds.
   */
  test("move with the year they are built for", () => {
    for (const [index, wording] of ALL_WORDINGS.entries()) {
      const nextYear = buildWording(REAL_YEAR + 1, index);

      expect(`${wording.title} ${wording.body}`.includes(IN_GAME_YEAR)).toBe(
        wording.title !== nextYear.title || wording.body !== nextYear.body,
      );
    }
  });
});
