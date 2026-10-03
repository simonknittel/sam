/**
 * The results must not depend on the time zone of the system. Run this
 * suite with the environment variable TZ set to different zones.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildChartData,
  buildTotalAndDeltaChart,
  normalizeOptions,
} from "./chartData";

/** The chart ends yesterday and starts 364 days before today. */
const NOW = new Date("2027-06-15T12:00:00Z");
const YESTERDAY = new Date("2027-06-14T12:00:00Z");
const FIRST_CHART_DAY = new Date("2026-06-16T12:00:00Z");
const BEFORE_CHART = new Date("2026-06-15T12:00:00Z");

const record = (name: string, createdAt: Date, count: number) => ({
  id: name,
  name,
  createdAt,
  count,
});

const namesOf = (chart: ReturnType<typeof buildChartData>) =>
  chart.series.map((serie) => serie.name);

beforeEach(() => {
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const axisKeysOf = (options: ReturnType<typeof normalizeOptions>) =>
  options.axisPoints.map((point) => point.key);

describe("normalizeOptions", () => {
  test("uses the days of Europe/Berlin after midnight in Europe/Berlin", () => {
    // 00:30 on 2027-06-15 in Europe/Berlin, but still 2027-06-14 in UTC
    vi.setSystemTime(new Date("2027-06-14T22:30:00Z"));

    const options = normalizeOptions();

    expect(axisKeysOf(options).at(0)).toBe("2026-06-16");
    expect(axisKeysOf(options).at(-1)).toBe("2027-06-14");
    expect(options.fromDate.toISOString()).toBe("2026-06-15T22:00:00.000Z");
    expect(options.fromDateColumnValue.toISOString()).toBe(
      "2026-06-16T00:00:00.000Z",
    );
    expect(options.toDate.toISOString()).toBe("2027-06-14T22:00:00.000Z");
  });

  test("uses the days of Europe/Berlin before midnight in Europe/Berlin", () => {
    // 23:30 on 2027-01-14 in Europe/Berlin
    vi.setSystemTime(new Date("2027-01-14T22:30:00Z"));

    const options = normalizeOptions();

    expect(axisKeysOf(options).at(-1)).toBe("2027-01-13");
    expect(options.toDate.toISOString()).toBe("2027-01-13T23:00:00.000Z");
  });

  test("has one axis point for each day across the changes of daylight saving time", () => {
    const keys = axisKeysOf(normalizeOptions());

    expect(keys).toHaveLength(364);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(
      expect.arrayContaining([
        "2026-10-24",
        "2026-10-25",
        "2026-10-26",
        "2027-03-27",
        "2027-03-28",
        "2027-03-29",
      ]),
    );
    expect(keys.indexOf("2027-03-29") - keys.indexOf("2026-10-24")).toBe(156);
  });

  test("starts the chart not before the first day with statistics", () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

    expect(axisKeysOf(normalizeOptions()).at(0)).toBe("2025-12-02");
  });
});

describe("buildChartData", () => {
  test("keeps only the top series, ordered by their last value", () => {
    const records = Array.from({ length: 20 }, (_, index) =>
      record(`Variant ${index + 1}`, YESTERDAY, index + 1),
    );

    const chart = buildChartData(records, normalizeOptions(), { top: 15 });

    expect(namesOf(chart)).toEqual(
      Array.from({ length: 15 }, (_, index) => `Variant ${20 - index}`),
    );
  });

  test("keeps all series without a top configuration", () => {
    const records = Array.from({ length: 20 }, (_, index) =>
      record(`Variant ${index + 1}`, YESTERDAY, index + 1),
    );

    expect(buildChartData(records, normalizeOptions()).series).toHaveLength(20);
  });

  test("removes empty series before it applies the top limit", () => {
    const chart = buildChartData(
      [
        // Only a value before the chart: the highest last value, but empty
        record("Retired", BEFORE_CHART, 100),
        record("Zero", YESTERDAY, 0),
        record("Large", YESTERDAY, 30),
        record("Medium", YESTERDAY, 20),
        record("Small", YESTERDAY, 10),
      ],
      normalizeOptions(),
      { top: 2, filterEmpty: true },
    );

    expect(namesOf(chart)).toEqual(["Large", "Medium"]);
  });

  test("orders series with the same last value by name", () => {
    const chart = buildChartData(
      [
        record("Cutlass", YESTERDAY, 5),
        record("Aurora", YESTERDAY, 5),
        record("Buccaneer", YESTERDAY, 5),
      ],
      normalizeOptions(),
      { top: 2 },
    );

    expect(namesOf(chart)).toEqual(["Aurora", "Buccaneer"]);
  });

  test("puts only the values of the chart days on the axis", () => {
    const chart = buildChartData(
      [
        record("Polaris", BEFORE_CHART, 1),
        record("Polaris", FIRST_CHART_DAY, 2),
        record("Polaris", YESTERDAY, 3),
      ],
      normalizeOptions(),
    );

    expect(chart.dateRange.from.getTime()).toBeLessThan(
      FIRST_CHART_DAY.getTime(),
    );
    expect(chart.axisTimestamps).toHaveLength(364);

    const [polaris] = chart.series;
    expect(polaris.data[0]).toBe(2);
    expect(polaris.data.at(-1)).toBe(3);
    expect(polaris.data.filter((value) => value !== null)).toEqual([2, 3]);
  });

  test("keys the value of a `@db.Date` column under its own day", () => {
    const options = normalizeOptions();
    /** A `@db.Date` column holds midnight UTC of its day */
    const chart = buildChartData(
      [record("Polaris", new Date("2027-06-14T00:00:00Z"), 3)],
      options,
    );

    const axisKeys = axisKeysOf(options);
    const [polaris] = chart.series;
    expect(polaris.data[axisKeys.indexOf("2027-06-14")]).toBe(3);
    expect(polaris.data.filter((value) => value !== null)).toEqual([3]);
  });

  test("gives the same chart without the records before the chart days", () => {
    const inWindow = [
      record("Polaris", FIRST_CHART_DAY, 2),
      record("Idris", FIRST_CHART_DAY, 4),
      record("Polaris", YESTERDAY, 3),
      record("Idris", YESTERDAY, 3),
    ];
    const configuration = { top: 15, filterEmpty: true };

    expect(
      buildChartData(
        [
          record("Idris", BEFORE_CHART, 9),
          record("Retired", BEFORE_CHART, 50),
          ...inWindow,
        ],
        normalizeOptions(),
        configuration,
      ),
    ).toEqual(buildChartData(inWindow, normalizeOptions(), configuration));
  });
});

describe("buildTotalAndDeltaChart", () => {
  test("compares the first chart day with the total before the chart", () => {
    const chart = buildTotalAndDeltaChart(
      [
        { createdAt: BEFORE_CHART, count: 10 },
        { createdAt: FIRST_CHART_DAY, count: 12 },
      ],
      normalizeOptions(),
      "total",
      "Gesamt",
    );

    const delta = chart.series.find((serie) => serie.yAxisIndex === 1);
    expect(delta?.data[0]).toBe(2);
  });
});
