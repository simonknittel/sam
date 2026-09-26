import type { ReactNode } from "react";

interface Props {
  readonly title: string;
  readonly children: ReactNode;
}

export const AdminToolbarSection = ({ title, children }: Props) => {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-mono uppercase text-neutral-500">{title}</h2>
      {children}
    </section>
  );
};
