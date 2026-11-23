import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { useId, type ReactNode } from "react";

interface Props {
  readonly heading: string;
  /** Shows a spinner next to the heading while the data loads again */
  readonly isRefreshing?: boolean;
  readonly children: ReactNode;
}

/** A section of the sharing popover with its heading */
export const SharingPopoverSection = ({
  heading,
  isRefreshing = false,
  children,
}: Props) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2
        id={headingId}
        className="flex items-center gap-2 font-mono text-sm text-neutral-500 uppercase"
      >
        {heading}
        {isRefreshing && <AsciiSpinner />}
      </h2>

      {children}
    </section>
  );
};
