import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { STATISTIC_CATALOG } from "./statisticCatalog.js";

const dashboardFile = new URL(
  "../../../../../grafana/dashboards/statistics.json",
  import.meta.url,
);

interface DashboardPanel {
  readonly type: string;
  readonly title?: string;
}

test("the catalog has the charts of the dashboard, in the same order", async () => {
  const dashboard = JSON.parse(await readFile(dashboardFile, "utf8")) as {
    readonly panels: readonly DashboardPanel[];
  };

  expect(
    dashboard.panels
      .filter((panel) => panel.type !== "text")
      .map((panel) => panel.title),
  ).toEqual(STATISTIC_CATALOG.map((statistic) => statistic.title));
});
