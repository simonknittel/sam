import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";

interface Props extends ComponentProps<"input"> {
  /** Omit only when the context already names the input — pass `aria-label` then */
  label?: ReactNode;
  hint?: ReactNode;
}

export const TextInput = (props: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, className, label, hint, ...rest } = props;

  const _id = useId();
  const id = rest.id || _id;

  return (
    <>
      {label && (
        <label className={clsx("block text-white/90", className)} htmlFor={id}>
          {label}
        </label>
      )}

      <input
        type="text"
        className="mt-2 w-full rounded-secondary border border-neutral-800 bg-neutral-900 p-2 outline-offset-4 outline-interaction-700 focus-visible:outline-2"
        id={id}
        {...rest}
      />

      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </>
  );
};
