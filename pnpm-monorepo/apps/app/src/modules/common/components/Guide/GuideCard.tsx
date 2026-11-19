import type { ReactNode } from "react";
import type { IconType } from "react-icons";

interface Props {
  readonly icon: IconType;
  readonly title: string;
  readonly children: ReactNode;
}

/** One option or one term of a list, without a screenshot, see `GuideCardList` */
export const GuideCard = ({ icon: Icon, title, children }: Props) => {
  return (
    <li className="rounded-secondary border border-white/5 bg-white/5 p-4">
      <h4 className="flex items-center gap-2 font-bold">
        <Icon aria-hidden className="flex-none text-brand-red-300" />
        {title}
      </h4>

      <div className="mt-1 text-sm leading-relaxed text-white/70">
        {children}
      </div>
    </li>
  );
};
