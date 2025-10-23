import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";

interface Props extends ComponentProps<"textarea"> {
  readonly label: string;
  readonly hint?: ReactNode;
  readonly classNameTextarea?: string;
}

export const Textarea = (props: Props) => {
  const { className, classNameTextarea, label, hint, ...rest } = props;

  const _id = useId();
  const id = rest.id || _id;

  return (
    <>
      <label className={clsx("block", className)} htmlFor={id}>
        {label}
      </label>

      <textarea
        className={clsx(
          "p-2 rounded-secondary bg-neutral-900 border border-solid border-neutral-800 w-full h-32 mt-2 align-middle focus-visible:outline outline-2 outline-interaction-700 outline-offset-4",
          classNameTextarea,
        )}
        id={id}
        {...rest}
      />

      {hint && <p className="text-xs mt-1 text-gray-400">{hint}</p>}
    </>
  );
};
