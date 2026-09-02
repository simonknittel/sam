import { newYearPayloadSchema } from "@sam-monorepo/notifications";
import { describe, expect, test } from "vitest";
import { buildWording, NEW_YEAR_WORDINGS } from "./newYearWordings";

/** The first turn of the year the greeting goes out for */
const REAL_YEAR = 2027;
const IN_GAME_YEAR = "2957";

const allWordings = () =>
  NEW_YEAR_WORDINGS.map((_wording, index) => buildWording(REAL_YEAR, index));

describe("the New Year wordings", () => {
  test("stay within the limits of the payload schema", () => {
    for (const wording of allWordings()) {
      expect(newYearPayloadSchema.safeParse(wording).success).toBe(true);
    }
  });

  test("name the in-game year and never the real one", () => {
    for (const wording of allWordings()) {
      const years = `${wording.title} ${wording.body}`.match(/\d{4}/g) ?? [];

      for (const year of years) expect(year).toBe(IN_GAME_YEAR);
    }

    expect(
      allWordings().filter((wording) =>
        `${wording.title} ${wording.body}`.includes(IN_GAME_YEAR),
      ).length,
    ).toBeGreaterThan(0);
  });
});
