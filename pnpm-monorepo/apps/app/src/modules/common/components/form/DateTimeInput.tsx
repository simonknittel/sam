import clsx from "clsx";
import { useId, type ComponentProps } from "react";

interface Props extends ComponentProps<"input"> {
  label: string;
  hint?: string;
}

export const DateTimeInput = (props: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, className, label, hint, ...rest } = props;

  const _id = useId();
  const id = rest.id || _id;

  return (
    <>
      <label className={clsx("block", className)} htmlFor={id}>
        {label}
      </label>

      <input
        type="datetime-local"
        className="mt-2 w-full rounded-secondary border border-neutral-800 bg-neutral-900 p-2 outline-offset-4 outline-interaction-700 focus-visible:outline-2"
        id={id}
        {...rest}
      />

      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </>
  );
};
