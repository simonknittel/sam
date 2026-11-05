import { describe, expect, test } from "vitest";
import { getDateRangePresets } from "./dateRangePresets";

const findPreset = (today: string, label: string) => {
  const preset = getDateRangePresets(today, null).find(
    (candidate) => candidate.label === label,
  );
  if (!preset) throw new Error(`There is no preset ${label}`);
  return { from: preset.from, to: preset.to };
};

describe("getDateRangePresets", () => {
  test("the last days include today", () => {
    expect(findPreset("2026-11-05", "Letzte 7 Tage")).toEqual({
      from: "2026-10-30",
      to: "2026-11-05",
    });
    expect(findPreset("2026-11-05", "Letzte 30 Tage")).toEqual({
      from: "2026-10-07",
      to: "2026-11-05",
    });
  });

  test("the month starts on its first day and ends today", () => {
    expect(findPreset("2026-11-05", "Dieser Monat")).toEqual({
      from: "2026-11-01",
      to: "2026-11-05",
    });
  });

  test("the last month of January is December of the year before", () => {
    expect(findPreset("2026-01-15", "Letzter Monat")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  test("the last month ends on its last day, also in a leap year", () => {
    expect(findPreset("2028-03-31", "Letzter Monat")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });

  test("the years cover their calendar days", () => {
    expect(findPreset("2026-11-05", "Dieses Jahr")).toEqual({
      from: "2026-01-01",
      to: "2026-11-05",
    });
    expect(findPreset("2026-11-05", "Letztes Jahr")).toEqual({
      from: "2025-01-01",
      to: "2025-12-31",
    });
  });

  test("all logs start at the oldest log, if a file name gives one", () => {
    expect(getDateRangePresets("2026-11-05", "2026-01-31").at(-1)).toEqual({
      label: "Alle Logs",
      from: "2026-01-31",
      to: "2026-11-05",
    });

    expect(
      getDateRangePresets("2026-11-05", null).map(({ label }) => label),
    ).not.toContain("Alle Logs");
  });
});
