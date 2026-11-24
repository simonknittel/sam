"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import {
  getOldestLogAnalyzerEntryVersion,
  type LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { FaEye } from "react-icons/fa";
import { PATTERNS } from "../utils/PATTERNS";
import { useQuickLook } from "./QuickLookContext";

interface Props {
  readonly type: LogAnalyzerEntryType;
  readonly className?: string;
}

/**
 * The tooltip is the same on each button, thus the label carries the title of
 * the type.
 */
export const QuickLookToggle = ({ type, className }: Props) => {
  const { quickLookTypes, setQuickLookTypes } = useQuickLook();

  const oldestVersion = getOldestLogAnalyzerEntryVersion(type);
  const isInQuickLook = quickLookTypes.includes(oldestVersion);

  const handleClick = () => {
    setQuickLookTypes((previous) =>
      previous.includes(oldestVersion)
        ? previous.filter((quickLookType) => quickLookType !== oldestVersion)
        : [...previous, oldestVersion],
    );
  };

  return (
    <Button2
      type="button"
      variant={Button2Variant.IconOnly}
      tooltip="Schnellansicht"
      aria-label={`Schnellansicht: ${PATTERNS[type].title}`}
      aria-pressed={isInQuickLook}
      onClick={handleClick}
      className={clsx("shrink-0 aria-pressed:text-interaction-500", className)}
    >
      <FaEye />
    </Button2>
  );
};
