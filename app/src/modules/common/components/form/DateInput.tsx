import clsx from "clsx";
import { useId, type ComponentProps } from "react";

interface Props extends ComponentProps<"input"> {
  readonly label: string;
  readonly labelClassName?: string;
  readonly hint?: string;
}

export const DateInput = (props: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, className, label, labelClassName, hint, ...rest } = props;

  const _id = useId();
  const id = rest.id || _id;

  return (
    <>
      <label className={clsx("block", labelClassName)} htmlFor={id}>
        {label}
      </label>

      <input
        type="date"
        className={clsx(
          "p-2 rounded-secondary bg-neutral-900 border border-neutral-800 w-full mt-2 focus-visible:outline-2 outline-interaction-700 outline-offset-4",
          className,
        )}
        id={id}
        {...rest}
      />

      {hint && <p className="text-xs mt-1 text-gray-400">{hint}</p>}
    </>
  );
};
