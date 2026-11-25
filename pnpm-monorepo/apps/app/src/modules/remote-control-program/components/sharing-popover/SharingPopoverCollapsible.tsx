import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { useId, type ReactNode } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

interface Props {
  readonly heading: string;
  /** Next to the heading, for example what the closed part hides */
  readonly summary: string | null;
  /** Replaces the summary while something is in progress. Null: nothing is. */
  readonly progressText?: string | null;
  readonly isExpanded: boolean;
  readonly onExpandedChange: (isExpanded: boolean) => void;
  readonly children: ReactNode;
}

/** A part of a section of the sharing popover that the owner can close */
export const SharingPopoverCollapsible = ({
  heading,
  summary,
  progressText,
  isExpanded,
  onExpandedChange,
  children,
}: Props) => {
  const contentId = useId();

  return (
    <div className="rounded-secondary border border-white/10">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => onExpandedChange(!isExpanded)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-secondary px-3 py-2 text-left text-sm hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10"
      >
        <span className="flex-none">{heading}</span>

        {progressText ? (
          <span
            aria-hidden
            className="ml-auto flex min-w-0 items-center gap-2 text-neutral-500"
          >
            <AsciiSpinner />
            {progressText}
          </span>
        ) : (
          <span
            className="ml-auto min-w-0 truncate text-neutral-500"
            title={summary ?? undefined}
          >
            {summary}
          </span>
        )}

        {isExpanded ? (
          <FaChevronUp aria-hidden className="flex-none text-neutral-500" />
        ) : (
          <FaChevronDown aria-hidden className="flex-none text-neutral-500" />
        )}
      </button>

      {/* Always in the page for a part with a progress, else a screen reader does not announce its first text */}
      {progressText !== undefined && (
        <span role="status" className="sr-only">
          {progressText}
        </span>
      )}

      {isExpanded && (
        <div
          id={contentId}
          className="flex flex-col gap-3 border-t border-white/10 p-3"
        >
          {children}
        </div>
      )}
    </div>
  );
};
