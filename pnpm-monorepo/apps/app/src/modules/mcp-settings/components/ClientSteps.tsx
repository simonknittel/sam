import type { ReactNode } from "react";

interface Props {
  readonly title: string;
  /** The `<li>` elements of the steps */
  readonly children: ReactNode;
  /** Shown below the steps */
  readonly note?: ReactNode;
}

export const ClientSteps = ({ title, children, note }: Props) => {
  return (
    <section className="min-w-0">
      <h3 className="font-bold">{title}</h3>

      <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm">
        {children}
      </ol>

      {note && <p className="mt-2 text-sm text-neutral-500">{note}</p>}
    </section>
  );
};
