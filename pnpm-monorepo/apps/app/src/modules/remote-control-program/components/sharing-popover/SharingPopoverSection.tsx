import { useId, type ReactNode } from "react";

interface Props {
  readonly heading: string;
  readonly children: ReactNode;
}

/** A section of the sharing popover. Its tab shows the name, thus the heading is only for screen readers. */
export const SharingPopoverSection = ({ heading, children }: Props) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h3 id={headingId} className="sr-only">
        {heading}
      </h3>

      {children}
    </section>
  );
};

interface SubsectionProps {
  readonly heading: string;
  /** Next to the heading */
  readonly action?: ReactNode;
  readonly children: ReactNode;
}

export const SharingPopoverSubsection = ({
  heading,
  action,
  children,
}: SubsectionProps) => {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 border-t border-white/10 pt-4 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h4 id={headingId} className="font-bold">
          {heading}
        </h4>

        {action}
      </div>

      {children}
    </section>
  );
};
