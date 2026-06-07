import clsx from "clsx";
import { PATTERNS, type IEntry } from "../utils/PATTERNS";
import styles from "./Entry.module.css";

interface Props {
  readonly entry: IEntry;
}

export const OverlayEntry = ({ entry }: Props) => {
  return (
    <div className={clsx("relative", styles.Row)}>
      <div className="truncate text-sm">
        <span className="text-white/40">{PATTERNS[entry.type].title}:</span>{" "}
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
