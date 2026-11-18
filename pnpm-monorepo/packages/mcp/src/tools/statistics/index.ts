import type { CatalogTool } from "../../toolDefinition.js";
import { getStatisticTool } from "./getStatistic.js";
import { listStatisticsTool } from "./listStatistics.js";

export const statisticsTools: readonly CatalogTool[] = [
  getStatisticTool,
  listStatisticsTool,
];
