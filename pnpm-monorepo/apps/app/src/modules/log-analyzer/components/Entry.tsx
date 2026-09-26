import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { SmallBadge } from "@/modules/common/components/SmallBadge";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { memo } from "react";
import { PATTERNS, type IEntry } from "../utils/PATTERNS";
import styles from "./Entry.module.css";
import { useEntryClock } from "./EntryClock";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface EntryDateProps {
  readonly date: Date;
}

/** The age of an entry of the last 24 hours, the date of an older one */
const EntryDate = ({ date }: EntryDateProps) => {
  const now = useEntryClock();

  if (date.getTime() > now.getTime() - MILLISECONDS_PER_DAY)
    return <RelativeDate date={date} now={now} />;

  return (
    <time dateTime={date.toISOString()} title={formatDate(date) || undefined}>
      {formatDate(date)}
    </time>
  );
};

interface Props {
  readonly entry: IEntry;
}

/**
 * The entries are immutable: every change replaces the entry object (an
 * upload flips `isUploaded`, a local entry replaces a shared one), thus the
 * default comparison of `memo` by identity is enough.
 */
export const Entry = memo(function Entry({ entry }: Props) {
  const { title, icon: Icon } = PATTERNS[entry.type];

  /**
   * An entry is either one the user received or one they sent, never both.
   * One which is neither stays on this computer.
   */
  const sharingLabel = entry.isShared
    ? "Geteilt"
    : entry.isUploaded
      ? "Hochgeladen"
      : "Lokal";

  return (
    <TRow
      className={clsx({ [styles.Row]: entry.isNew, relative: entry.isNew })}
    >
      <td>
        <EntryDate date={entry.isoDate} />

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

      <td>
        <SmallBadge value={sharingLabel} className="text-white/40" />
      </td>

      <td className="flex items-center gap-2 text-white/40">
        <Icon className="shrink-0" />
        <span className="truncate">{title}</span>
      </td>

      <td className="truncate">{entry.message}</td>
    </TRow>
  );
});
