import clsx from "clsx";
import type { ComponentProps } from "react";
import { FaChevronDown, FaChevronRight, FaChevronUp } from "react-icons/fa";

interface AccordeonToggleProps extends ComponentProps<"button"> {
  readonly isOpen: boolean;
}

export const AccordeonToggle = (props: AccordeonToggleProps) => {
  const { className, isOpen, ...rest } = props;

  return (
    <button
      type="button"
      title={isOpen ? "Details schließen" : "Details öffnen"}
      className={clsx(
        "flex-none p-3 flex items-center justify-center border-l border-white/10 hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10 hover:cursor-pointer rounded-secondary",
        className,
      )}
      {...rest}
    >
      {isOpen ? (
        <FaChevronUp className="text-brand-red-500" />
      ) : (
        <FaChevronDown className="text-brand-red-500" />
      )}
    </button>
  );
};

type AccordeonLinkProps = ComponentProps<"div">;

/**
 * Decorative chevron for card links whose whole surface already is the
 * interactive element — it must not carry a title or any control
 * semantics of its own (nested controls are invalid); put the label on
 * the surrounding link instead.
 */
export const AccordeonLink = (props: AccordeonLinkProps) => {
  const { className, ...rest } = props;

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "flex-none p-3 flex items-center justify-center border-l border-white/10",
        className,
      )}
      {...rest}
    >
      <FaChevronRight className="text-brand-red-500" />
    </div>
  );
};
