import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import { useQueryState } from "nuqs";
import { useEffect, useTransition } from "react";
import { RadioGroup } from "../form/RadioGroup";

interface Props {
  readonly name: string;
  readonly label: string;
  readonly items: { value: string; label: string; default?: boolean }[];
  readonly className?: string;
}

export const RadioFilter = ({ name, label, items, className }: Props) => {
  const [isLoading, startTransition] = useTransition();

  const [value, setValue] = useQueryState(name, {
    shallow: false,
    startTransition,
  });

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

  let defaultItem = items.find((item) => item.default);
  if (!defaultItem) defaultItem = items[0];

  return (
    <div
      className={clsx(
        "background-secondary rounded-primary p-2 beveled-br",
        className,
      )}
      style={{
        "--bevel-size": "16px",
      }}
    >
      <p className="text-sm text-neutral-500">{label}</p>

      <RadioGroup
        name={name}
        items={items}
        value={value || defaultItem.value}
        onChange={setValue}
        className="mt-1"
      />
    </div>
  );
};
