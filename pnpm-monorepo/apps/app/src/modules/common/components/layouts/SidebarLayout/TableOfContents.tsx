import clsx from "clsx";

export interface TableOfContentsItem {
  /** The `id` of the target on the page, for example of a `Tile` */
  readonly id: string;
  readonly label: string;
}

interface Props {
  readonly className?: string;
  readonly items: readonly TableOfContentsItem[];
}

/** Links to the parts of a long page, for the sidebar of `SidebarLayout` */
export const TableOfContents = ({ className, items }: Props) => {
  return (
    <nav
      aria-label="Inhalt"
      className={clsx("corners-secondary bg-secondary p-2", className)}
    >
      {/* Below md, the toggle button of `SidebarLayout` already names the list */}
      <p className="hidden font-mono text-sm text-white/40 uppercase md:block">
        Inhalt
      </p>

      <ul className="flex flex-col gap-0.5 md:mt-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block rounded-secondary px-2 py-1 text-neutral-300 hover:bg-white/5 hover:text-interaction-300 focus-visible:bg-white/5 focus-visible:text-interaction-300 active:bg-white/10"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
