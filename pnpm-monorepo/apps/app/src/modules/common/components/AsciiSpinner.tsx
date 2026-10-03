import clsx from "clsx";
import styles from "./AsciiSpinner.module.css";

/** The CSS module moves through these frames and knows their number. */
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface Props {
  readonly className?: string;
}

export const AsciiSpinner = ({ className }: Props) => {
  return (
    <span
      className={clsx(
        "relative inline-block w-[1ch] overflow-y-clip text-center font-mono select-none",
        className,
      )}
      aria-hidden="true"
    >
      {/* The invisible frame gives the window the height of one line and
          keeps the baseline of the text around the spinner. */}
      <span className="invisible">{FRAMES[0]}</span>

      <span
        className={clsx(
          "absolute inset-x-0 top-0 whitespace-pre",
          styles.frames,
        )}
      >
        {FRAMES.join("\n")}
      </span>
    </span>
  );
};
