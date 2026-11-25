import { useId, type ReactNode, type Ref } from "react";

interface Props {
  readonly heading: string;
  /**
   * Makes the heading a target of the focus, for example after a part of
   * the section that had the focus disappears
   */
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly children: ReactNode;
}

/** A section of the sharing popover with its heading */
export const SharingPopoverSection = ({
  heading,
  headingRef,
  children,
}: Props) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="flex items-center gap-2 font-mono text-sm text-neutral-500 uppercase focus:outline-none"
      >
        {heading}
      </h2>

      {children}
    </section>
  );
};
