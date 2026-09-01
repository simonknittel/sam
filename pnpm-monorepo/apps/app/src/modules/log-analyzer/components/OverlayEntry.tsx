import clsx from "clsx";
import { PATTERNS, type IEntry } from "../utils/PATTERNS";
import styles from "./Entry.module.css";

interface Props {
  readonly entry: IEntry;
}

export const OverlayEntry = ({ entry }: Props) => {
  const { title, icon: Icon } = PATTERNS[entry.type];

  return (
    <div className={clsx("relative", styles.Row)}>
      <div className="truncate text-sm">
        <span className="text-white/40">
          <Icon className="inline-block align-[-0.125em]" /> {title}:
        </span>{" "}
        {/* The overlay lives in its own window, thus it uses plain text
            instead of the citizen link with its popover. */}
        {entry.isShared && entry.citizen && (
          <span className="text-white/40">{entry.citizen.handle} </span>
        )}
        {entry.message}
      </div>

      <div
        className={clsx(
          "absolute left-0 top-0 bg-amber-500 text-black font-mono uppercase text-xs px-1 rounded-br-secondary",
          styles.New,
        )}
      >
        Neu
      </div>
    </div>
  );
};
