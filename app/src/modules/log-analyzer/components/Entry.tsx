import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { memo } from "react";
import { PATTERNS, type IEntry } from "../utils/PATTERNS";
import styles from "./Entry.module.css";
import { GRID_COLS } from "./LogAnalyzer";

interface Props {
  readonly entry: IEntry;
}

export const Entry = memo(
  function Entry({ entry }: Props) {
    const now = new Date();
    const showRelativeDate =
      entry.isoDate.getTime() > now.getTime() - 1000 * 60 * 60 * 24;

    return (
      <TRow
        className={clsx(
          { [styles.Row]: entry.isNew, relative: entry.isNew },
          GRID_COLS,
        )}
      >
        <td>
          {showRelativeDate ? (
            <RelativeDate date={entry.isoDate} updateInterval={10_000} />
          ) : (
            <time
              dateTime={entry.isoDate.toISOString()}
              title={formatDate(entry.isoDate) || undefined}
            >
              {formatDate(entry.isoDate)}
            </time>
          )}

          {entry.isNew && (
            <div
              className={clsx(
                "absolute left-0 top-0 bg-amber-500 text-black uppercase text-xs px-1 rounded-br-secondary",
                styles.New,
              )}
            >
              Neu
            </div>
          )}
        </td>

        <td className="truncate text-white/40">{PATTERNS[entry.type].title}</td>

        <td className="overflow-hidden">{entry.message}</td>
      </TRow>
    );
  },
  (previousProps, nextProps) => previousProps.entry.key === nextProps.entry.key,
);
