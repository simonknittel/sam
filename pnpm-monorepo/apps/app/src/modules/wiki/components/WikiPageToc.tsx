import clsx from "clsx";
import type { WikiPageTocEntry } from "../utils/buildWikiPageToc";

interface Props {
  readonly className?: string;
  readonly entries: WikiPageTocEntry[];
}

export const WikiPageToc = ({ className, entries }: Props) => {
  if (entries.length === 0) return null;

  const minLevel = Math.min(...entries.map((entry) => entry.level));

  return (
    <nav
      className={clsx(
        "rounded-secondary border border-neutral-800 p-4",
        className,
      )}
    >
      <p className="font-bold">Inhaltsverzeichnis</p>

      <ol className="mt-2 flex flex-col gap-1">
        {entries.map((entry) => (
          <li
            key={entry.id}
            style={{ paddingLeft: `${(entry.level - minLevel) * 12}px` }}
          >
            <a
              href={`#${entry.id}`}
              className="text-sm text-neutral-400 hover:text-interaction-300"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};
