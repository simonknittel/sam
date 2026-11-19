import clsx from "clsx";
import type { FormEvent, ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly heading: string;
  /**
   * The current values of the fields of the section in a few words. The
   * summary also shows while the section is closed, thus a closed section
   * hides no value, for example a value of a template.
   */
  readonly summary: string;
  readonly children: ReactNode;
}

/**
 * A group of fields of a long form that the user opens when necessary. The
 * section starts closed. The fields stay in the form while it is closed, thus
 * the form sends their values.
 */
export const FormSection = ({
  className,
  heading,
  summary,
  children,
}: Props) => {
  /**
   * The browser cannot show its message at a field that fails its check in
   * a closed section, thus the form could not be sent and showed no reason
   */
  const openForInvalidField = (event: FormEvent<HTMLDetailsElement>) => {
    event.currentTarget.open = true;
  };

  return (
    <details
      className={clsx(
        "group rounded-secondary border border-white/10",
        className,
      )}
      onInvalidCapture={openForInvalidField}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-secondary px-3 py-2 hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10 [&::-webkit-details-marker]:hidden">
        <span className="flex-none">{heading}</span>
        <span
          className="ml-auto min-w-0 truncate text-sm text-white/60"
          title={summary}
        >
          {summary}
        </span>
        <FaChevronDown
          aria-hidden
          className="flex-none text-brand-red-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>

      <div className="flex flex-col gap-4 border-t border-white/10 p-3">
        {children}
      </div>
    </details>
  );
};
