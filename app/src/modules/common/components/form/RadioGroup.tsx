import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import clsx from "clsx";
import { useEffect, useId, useState, type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly name: string;
  readonly items: { value: string; label: string; hint?: ReactNode }[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export const RadioGroup = ({
  className,
  name,
  items,
  value,
  onChange,
}: Props) => {
  const idPrefix = useId();

  const [_value, setValue] = useState(value);
  useEffect(() => {
    setValue(value);
  }, [value]);
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
          <div key={item.value}>
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
                "border border-brand-red-500 min-h-8 py-1 px-2 flex items-center justify-center gap-2 cursor-pointer text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-1 peer-aria-checked:bg-brand-red-500 peer-aria-checked:text-white text-sm",
                {
                  "rounded-l": index === 0,
                  "rounded-r": index === items.length - 1,
                },
              )}
            >
              {item.label}
            </label>
          </div>
        ))}
      </RadixRadioGroup.Root>

      {hint && <p className="text-xs mt-1 text-gray-400">{hint}</p>}
    </>
  );
};
