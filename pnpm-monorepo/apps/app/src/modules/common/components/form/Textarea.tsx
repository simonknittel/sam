import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";

interface Props extends ComponentProps<"textarea"> {
  readonly label: string;
  readonly hint?: ReactNode;
  readonly classNameTextarea?: string;
  /**
   * Let the browser size the height to the content (`field-sizing: content`)
   * instead of keeping the fixed default height. The caller supplies the
   * floor it wants through `classNameTextarea`, e.g. `min-h-32`.
   */
  readonly sizeToContent?: boolean;
}

export const Textarea = (props: Props) => {
  const { className, classNameTextarea, label, hint, sizeToContent, ...rest } =
    props;

  const _id = useId();
  const id = rest.id || _id;

  return (
    <>
      <label className={clsx("block text-white/90", className)} htmlFor={id}>
        {label}
      </label>

      <textarea
        className={clsx(
          "p-2 rounded-secondary bg-neutral-900 border border-neutral-800 w-full mt-2 align-middle focus-visible:outline-2 outline-interaction-700 outline-offset-4",
          sizeToContent ? "field-sizing-content" : "h-32",
          classNameTextarea,
        )}
        id={id}
        {...rest}
      />

      {hint && <p className="text-xs mt-1 text-white/40">{hint}</p>}
    </>
  );
};
