import clsx from "clsx";

interface Item {
  readonly title: string;
  readonly href: string;
  readonly items?: readonly Item[];
}

interface Props {
  readonly className?: string;
  readonly items: readonly Item[];
}

export const TableOfContents = ({ className, items }: Props) => {
  return (
    <section
      className={clsx(
        "background-secondary rounded-primary p-4 lg:w-96 flex-none lg:sticky top-[calc(104px+16px)]",
        className,
      )}
    >
      <div className="border-b border-neutral-700 pb-4 mb-4">
        <h2 className="font-bold font-mono uppercase">Inhaltsverzeichnis</h2>
      </div>

      <ol className="ml-4 list-decimal">
        {items.map((item) => (
          <li key={item.href} className="mt-2">
            <a
              href={item.href}
              className="text-brand-red-500 hover:text-brand-red-300 hover:underline active:text-brand-red-700"
            >
              {item.title}
            </a>

            {item.items && item.items.length > 0 && (
              <ol className="ml-4 list-decimal">
                {item.items.map((subItem) => (
                  <li key={subItem.href} className="mt-2">
                    <a
                      href={subItem.href}
                      className="text-brand-red-500 hover:text-brand-red-300 hover:underline active:text-brand-red-700"
                    >
                      {subItem.title}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};
