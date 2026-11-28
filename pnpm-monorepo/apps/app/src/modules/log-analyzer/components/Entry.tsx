import { CitizenAvatarSize } from "@/modules/common/components/CitizenAvatarSize";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import { getCitizenDisplayName } from "@sam-monorepo/domain";
import clsx from "clsx";
import { memo } from "react";
import { PATTERNS, type IEntry } from "../utils/PATTERNS";
import styles from "./Entry.module.css";
import { useEntryClock } from "./EntryClock";
import { EntryGameBuildCell } from "./EntryGameBuildCell";
import { EntryUploadState } from "./EntryUploadState";
import { QuickLookToggle } from "./QuickLookToggle";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface EntryDateProps {
  readonly date: Date;
}

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
 * The entries are immutable: every change replaces the entry object (see
 * `toEntry`), thus the default comparison of `memo` by identity is enough.
 */
export const Entry = memo(function Entry({ entry }: Props) {
  const { title, icon: Icon } = PATTERNS[entry.type];

  return (
    <TRow
      className={clsx("group", {
        [styles.Row]: entry.isNew,
        relative: entry.isNew,
      })}
    >
      <td>
        <EntryDate date={entry.isoDate} />

        {entry.isNew && (
          <div
            className={clsx(
              "absolute top-0 left-0 rounded-br-secondary bg-amber-500 px-1 text-xs text-black uppercase",
              styles.New,
            )}
          >
            Neu
          </div>
        )}
      </td>

      <td className="truncate" title={getCitizenDisplayName(entry.citizen)}>
        <CitizenLink
          citizen={entry.citizen}
          avatarSize={CitizenAvatarSize.Row}
        />
      </td>

      <td className="text-white/40">
        <EntryUploadState uploadState={entry.uploadState} />
      </td>

      <td className="flex items-center gap-2 text-white/40">
        <Icon className="shrink-0" />
        <span className="min-w-0 truncate" title={title}>
          {title}
        </span>

        {/* Shows on the hover of the row, so that 200 rows do not repeat it.
            The negative margin keeps the height of the row. */}
        <QuickLookToggle
          type={entry.type}
          className="-my-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100"
        />
      </td>

      <td className="truncate">{entry.message}</td>

      <EntryGameBuildCell
        gameChannel={entry.gameChannel}
        gameVersion={entry.gameVersion}
      />
    </TRow>
  );
});
