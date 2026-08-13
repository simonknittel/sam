import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import clsx from "clsx";
import { useId, useState, type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly name: string;
  readonly items: {
    value: string;
    label: string;
    icon?: ReactNode;
    hint?: ReactNode;
  }[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  /**
   * Spreads the items evenly over the full width instead of sizing each one
   * by its label. Keeps groups of short, icon-led options tidy.
   */
  readonly equalWidth?: boolean;
}

export const RadioGroup = ({
  className,
  name,
  items,
  value,
  onChange,
  equalWidth = false,
}: Props) => {
  const idPrefix = useId();

  const [_value, setValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    setValue(value);
  }
  const _onChange = (newValue: string) => {
    setValue(newValue);
    onChange(newValue);
  };

  const hint = items.find((item) => item.value === _value)?.hint;

  return (
    <>
      <RadixRadioGroup.Root
        defaultValue="role"
        value={_value}
        onValueChange={_onChange}
        className={clsx("flex", className)}
        orientation="horizontal"
        aria-label="Typ"
        name={name}
      >
        {items.map((item, index) => (
          <div key={item.value} className={clsx({ "flex-1": equalWidth })}>
            <RadixRadioGroup.Item
              className="peer sr-only"
              value={item.value}
              id={`${idPrefix}_${item.value}`}
            >
              <RadixRadioGroup.Indicator />
            </RadixRadioGroup.Item>

            <label
              htmlFor={`${idPrefix}_${item.value}`}
              className={clsx(
                "border border-brand-red-500 min-h-8 py-1 px-2 flex items-center justify-center gap-2 cursor-pointer text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300 peer-focus-visible:outline-solid peer-focus-visible:outline-1 peer-focus-visible:outline-offset-1 peer-aria-checked:bg-brand-red-500! peer-aria-checked:text-white! peer-aria-checked:border-brand-red-500! text-sm",
                {
                  "rounded-l": index === 0,
                  "rounded-r": index === items.length - 1,
                  "h-full": equalWidth,
                },
              )}
            >
              {item.icon}
              {item.label}
            </label>
          </div>
        ))}
      </RadixRadioGroup.Root>

      {hint && <p className="text-xs mt-1 text-white/40">{hint}</p>}
    </>
  );
};
