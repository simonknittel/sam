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
        "flex-none p-3 flex items-center justify-center border-l border-white/10 hover:bg-neutral-800 rounded-secondary",
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

export const AccordeonLink = (props: AccordeonLinkProps) => {
  const { className, ...rest } = props;

  return (
    <div
      title="Details öffnen"
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
