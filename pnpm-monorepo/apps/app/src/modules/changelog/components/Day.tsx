import type { ReactNode } from "react";
import { FaCalendar } from "react-icons/fa";

interface Props {
  readonly heading: ReactNode;
  readonly children: ReactNode;
}

export const Day = ({ heading, children }: Props) => {
  return (
    <article className="corners-primary bg-neutral-800/50 p-4 lg:p-8">
      <h2 className="flex items-center gap-3 font-mono text-2xl font-thin uppercase">
        <FaCalendar className="text-base text-neutral-500" />
        {heading}
      </h2>

      <ul className="mt-4 flex flex-col gap-6 pl-2">{children}</ul>
    </article>
  );
};
