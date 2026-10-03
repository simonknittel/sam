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
        "flex w-full flex-col items-center gap-4 rounded-primary bg-secondary p-2",
      )}
    >
      <h2 className="sr-only">Suche</h2>

      <SpynetSearchAutocomplete />
    </section>
  );
};
