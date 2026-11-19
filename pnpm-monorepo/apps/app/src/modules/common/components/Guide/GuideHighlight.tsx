import type { ReactNode } from "react";
import type { IconType } from "react-icons";

interface Props {
  readonly icon: IconType;
  readonly title: string;
  readonly children: ReactNode;
}

export const GuideHighlight = ({ icon: Icon, title, children }: Props) => {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-10 flex-none items-center justify-center rounded-full bg-brand-red-500/15 text-brand-red-300">
        <Icon aria-hidden />
      </span>

      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-white/60">{children}</p>
      </div>
    </li>
  );
};
