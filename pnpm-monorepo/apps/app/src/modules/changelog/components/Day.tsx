import type { ReactNode } from "react";
import { FaCalendar } from "react-icons/fa";

interface Props {
  readonly heading: ReactNode;
  readonly children: ReactNode;
}

export const Day = ({ heading, children }: Props) => {
  return (
    <article className="bg-neutral-800/50 p-4 lg:p-8 corners-primary">
      <h2 className="font-thin text-2xl flex gap-3 items-center font-mono uppercase">
        <FaCalendar className="text-neutral-500 text-base" />
        {heading}
      </h2>

      <ul className="flex flex-col gap-6 mt-4 pl-2">{children}</ul>
    </article>
  );
};
