import * as z from "zod";

/**
 * A position in an order of the entries of a feed: a time and the id of an
 * entry. The id breaks the tie of two entries of the same millisecond. An
 * empty id is the position before all entries of the time.
 */
export interface FeedEntryPosition {
  readonly time: Date;
  readonly id: string;
}

const SEPARATOR = "|";

/**
 * The time of `Date.toISOString()`, the separator and an id of `cuid(2)` or
 * an empty id. For example `2026-11-23T17:32:05.001Z|t1g5qf0d8x3k2m7n9p4r6s8v`.
 */
const POSITION_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\|[a-z0-9]{0,32}$/;

/** The length of the longest text of `POSITION_PATTERN` */
const MAXIMUM_POSITION_LENGTH = 57;

export const encodeFeedEntryPosition = ({ time, id }: FeedEntryPosition) =>
  [time.toISOString(), id].join(SEPARATOR);

/** A cursor of a read of the feed entries. The output is the position. */
export const feedEntryPositionSchema = z
  .string()
  .max(MAXIMUM_POSITION_LENGTH)
  .regex(POSITION_PATTERN)
  .transform((value, context): FeedEntryPosition => {
    const separatorIndex = value.indexOf(SEPARATOR);
    const time = new Date(value.slice(0, separatorIndex));
    if (Number.isNaN(time.getTime())) {
      // For example the month 13
      context.addIssue({ code: "custom", message: "Invalid time" });
      return z.NEVER;
    }

    return { time, id: value.slice(separatorIndex + 1) };
  })
  .describe("A cursor from an earlier result.");

/**
 * Compares two positions in the ascending order of the time and the id. The
 * ids contain only lowercase letters and digits, thus the order of the
 * JavaScript strings is the order of the database.
 */
export const compareFeedEntryPositions = (
  first: FeedEntryPosition,
  second: FeedEntryPosition,
) => {
  const timeDifference = first.time.getTime() - second.time.getTime();
  if (timeDifference !== 0) return timeDifference;
  if (first.id === second.id) return 0;
  return first.id < second.id ? -1 : 1;
};
