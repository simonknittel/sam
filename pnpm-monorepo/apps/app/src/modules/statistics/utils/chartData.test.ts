import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buildChartData, buildTotalAndDeltaChart } from "./chartData";

/**
 * Noon UTC is the same calendar day in UTC and in Europe/Berlin, thus the
 * chart window does not depend on the time zone of the test run. The chart
 * ends yesterday and starts 364 days before today.
 */
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
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildChartData", () => {
  test("keeps only the top series, ordered by their last value", () => {
    const records = Array.from({ length: 20 }, (_, index) =>
      record(`Variant ${index + 1}`, YESTERDAY, index + 1),
    );

    const chart = buildChartData(records, { top: 15 });

    expect(namesOf(chart)).toEqual(
      Array.from({ length: 15 }, (_, index) => `Variant ${20 - index}`),
    );
  });

  test("keeps all series without a top configuration", () => {
    const records = Array.from({ length: 20 }, (_, index) =>
      record(`Variant ${index + 1}`, YESTERDAY, index + 1),
    );

    expect(buildChartData(records).series).toHaveLength(20);
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
      { top: 2 },
    );

    expect(namesOf(chart)).toEqual(["Aurora", "Buccaneer"]);
  });

  test("puts only the values of the chart days on the axis", () => {
    const chart = buildChartData([
      record("Polaris", BEFORE_CHART, 1),
      record("Polaris", FIRST_CHART_DAY, 2),
      record("Polaris", YESTERDAY, 3),
    ]);

    expect(chart.dateRange.from.getTime()).toBeLessThan(
      FIRST_CHART_DAY.getTime(),
    );
    expect(chart.axisTimestamps).toHaveLength(364);

    const [polaris] = chart.series;
    expect(polaris.data[0]).toBe(2);
    expect(polaris.data.at(-1)).toBe(3);
    expect(polaris.data.filter((value) => value !== null)).toEqual([2, 3]);
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
        configuration,
      ),
    ).toEqual(buildChartData(inWindow, configuration));
  });
});

describe("buildTotalAndDeltaChart", () => {
  test("compares the first chart day with the total before the chart", () => {
    const chart = buildTotalAndDeltaChart(
      [
        { createdAt: BEFORE_CHART, count: 10 },
        { createdAt: FIRST_CHART_DAY, count: 12 },
      ],
      "total",
      "Gesamt",
    );

    const delta = chart.series.find((serie) => serie.yAxisIndex === 1);
    expect(delta?.data[0]).toBe(2);
  });
});
