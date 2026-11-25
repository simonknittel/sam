import { formatDate } from "@/modules/common/utils/formatDate";
import { instantToWallTime, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import type { OlderEntriesTimeRange } from "@sam-monorepo/remote-control-program-runtime";

const isStartOfDay = (date: Date) =>
  instantToWallTime(date, ORGANIZATION_TIMEZONE).endsWith("T00:00");

const formatStart = (start: Date) =>
  formatDate(start, isStartOfDay(start) ? "short" : undefined);

/** The end is exclusive: the start of a day is the end of the day before */
const formatEnd = (end: Date) =>
  isStartOfDay(end)
    ? formatDate(new Date(end.getTime() - 1), "short")
    : formatDate(end);

/** Whole days show without a time, with the last day of the range as the end */
export const formatOlderEntriesRange = ({
  start,
  end,
}: OlderEntriesTimeRange) =>
  `${start ? formatStart(start) : "Anfang deiner Game Logs"} – ${end ? formatEnd(end) : "jetzt"}`;
