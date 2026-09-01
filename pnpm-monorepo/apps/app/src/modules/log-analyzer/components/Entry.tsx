import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { memo } from "react";
import { PATTERNS, type IEntry } from "../utils/PATTERNS";
import styles from "./Entry.module.css";

interface Props {
  readonly entry: IEntry;
}

export const Entry = memo(
  function Entry({ entry }: Props) {
    const { title, icon: Icon } = PATTERNS[entry.type];
    const now = new Date();
    const showRelativeDate =
      entry.isoDate.getTime() > now.getTime() - 1000 * 60 * 60 * 24;

    return (
      <TRow
        className={clsx({ [styles.Row]: entry.isNew, relative: entry.isNew })}
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

        <td className="flex items-center gap-2 text-white/40">
          <Icon className="shrink-0" />
          <span className="truncate">{title}</span>
        </td>

        <td
          className="truncate"
          title={entry.citizen?.handle ?? entry.citizen?.id}
        >
          {entry.citizen ? (
            <CitizenLink citizen={entry.citizen} />
          ) : (
            <span className="text-white/40">-</span>
          )}
        </td>

        <td className="truncate">{entry.message}</td>
      </TRow>
    );
  },
  /**
   * The citizen belongs to the comparison too: a local entry replaces a
   * shared one under the same key and brings its own citizen with it.
   */
  (previousProps, nextProps) =>
    previousProps.entry.key === nextProps.entry.key &&
    previousProps.entry.citizen?.id === nextProps.entry.citizen?.id,
);
