import clsx from "clsx";
import { useId, type ComponentProps } from "react";
import { NumericFormat } from "react-number-format";

interface Props extends ComponentProps<"input"> {
  readonly label?: string;
  readonly hint?: string;
  readonly labelClassName?: string;
}

export const NumberInput = (props: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, className, label, labelClassName, hint, ...rest } = props;

  const _id = useId();
  const id = rest.id || _id;

  return (
    <>
      {label && (
        <label className={clsx("block mb-2", labelClassName)} htmlFor={id}>
          {label}
        </label>
      )}

      <input
        type="number"
        className={clsx(
          "p-2 rounded-secondary bg-neutral-900 border border-neutral-800 w-full focus-visible:outline-2 outline-interaction-700 outline-offset-4",
          className,
        )}
        id={id}
        {...rest}
      />

      {hint && <p className="text-xs mt-1 text-gray-400">{hint}</p>}
    </>
  );
};

interface PropsFormatted extends ComponentProps<typeof NumericFormat> {
  label?: string;
  hint?: string;
  readonly labelClassName?: string;
}

export const NumberInputFormatted = (props: PropsFormatted) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, className, label, labelClassName, hint, ...rest } = props;

  const _id = useId();
  const id = rest.id || _id;

  return (
    <>
      {label && (
        <label className={clsx("block mb-2", labelClassName)} htmlFor={id}>
          {label}
        </label>
      )}

      <NumericFormat
        className={clsx(
          "p-2 rounded-secondary bg-neutral-900 border border-neutral-800 w-full focus-visible:outline-2 outline-interaction-700 outline-offset-4",
          className,
        )}
        id={id}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={0}
        {...rest}
      />

      {hint && <p className="text-xs mt-1 text-gray-400">{hint}</p>}
    </>
  );
};
