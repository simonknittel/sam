import clsx from "clsx";
import { SpynetSearchAutocomplete } from "./SpynetSearchAutocomplete";

interface Props {
  readonly className?: string;
}

export const SpynetSearchTile = ({ className }: Props) => {
  return (
    <section
      className={clsx(
        className,
        "rounded-primary p-2 bg-secondary flex flex-col gap-4 items-center w-full",
      )}
    >
      <h2 className="sr-only">Suche</h2>

      <SpynetSearchAutocomplete />
    </section>
  );
};
