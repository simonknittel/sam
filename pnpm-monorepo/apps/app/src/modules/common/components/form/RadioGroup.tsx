import clsx from "clsx";
import { useLayoutEffect, useRef, type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly name: string;
  /**
   * The accessible name of the group. If the group has a visible heading,
   * use the text of the heading.
   */
  readonly label: string;
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
  label,
  items,
  value,
  onChange,
  equalWidth = false,
}: Props) => {
  const hint = items.find((item) => item.value === value)?.hint;
  const groupRef = useRef<HTMLDivElement>(null);

  /**
   * React sets `defaultChecked` only when an input mounts. After a
   * `<form action>`, React resets the form, and the reset restores
   * `defaultChecked`. Thus `defaultChecked` follows the value: else the
   * reset selects the value of the mount again, and the next submission
   * sends that value.
   */
  useLayoutEffect(() => {
    for (const input of groupRef.current?.querySelectorAll("input") ?? [])
      input.defaultChecked = input.value === value;
  }, [value]);

  return (
    <>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={label}
        className={clsx("flex", className)}
      >
        {items.map((item) => (
          <label
            key={item.value}
            className={clsx(
              "flex min-h-8 cursor-pointer items-center justify-center gap-2 border border-brand-red-500 px-2 py-1 text-sm text-brand-red-500 first:rounded-l last:rounded-r hover:border-brand-red-300 hover:text-brand-red-300 active:border-brand-red-300 active:text-brand-red-300 has-checked:border-brand-red-500! has-checked:bg-brand-red-500! has-checked:text-white! has-focus-visible:outline-1 has-focus-visible:outline-offset-1 has-focus-visible:outline-solid",
              { "flex-1": equalWidth },
            )}
          >
            <input
              type="radio"
              name={name}
              value={item.value}
              checked={item.value === value}
              onChange={() => onChange(item.value)}
              className="sr-only"
            />
            {item.icon}
            {item.label}
          </label>
        ))}
      </div>

      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </>
  );
};
