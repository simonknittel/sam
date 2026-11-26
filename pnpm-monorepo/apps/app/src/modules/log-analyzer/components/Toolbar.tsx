import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import type { ReactNode } from "react";
import { EntrySettings } from "./EntrySettings";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { OverlayButton } from "./OverlayButton";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * The settings of the view. The start, the stop, the autostart and the log
 * folder of the browser runtime are in the sharing popover.
 */
export const Toolbar = ({ className, children }: Props) => {
  const { isLiveStatusVisible, setIsLiveStatusVisible } =
    useLogAnalyzerContext();

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-4 rounded-primary bg-secondary p-2",
        className,
      )}
    >
      <YesNoCheckbox
        yesLabel={<span className="text-sm">Live-Status</span>}
        noLabel={<span className="text-sm">Live-Status</span>}
        labelClassName="w-auto"
        checked={isLiveStatusVisible}
        onChange={(event) => setIsLiveStatusVisible(event.target.checked)}
      />

      <OverlayButton />

      <EntrySettings />

      {children}
    </div>
  );
};
