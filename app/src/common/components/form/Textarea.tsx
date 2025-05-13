import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";

interface Props extends ComponentProps<"textarea"> {
  readonly label: string;
  readonly hint?: ReactNode;
  readonly classNameTextarea?: string;
}

export const Textarea = (props: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          "p-2 rounded bg-neutral-900 w-full h-32 mt-2 align-middle",
          classNameTextarea,
        )}
        id={id}
        {...rest}
      />

      {hint && <p className="text-xs mt-1 text-gray-400">{hint}</p>}
    </>
  );
};
