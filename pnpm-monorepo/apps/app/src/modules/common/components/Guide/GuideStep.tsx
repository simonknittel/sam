import type { ReactNode } from "react";
import type { IconType } from "react-icons";

interface Props {
  readonly number: number;
  readonly icon: IconType;
  readonly title: string;
  readonly children: ReactNode;
}

/** One step of `GuideStepList` */
export const GuideStep = ({ number, icon: Icon, title, children }: Props) => {
  return (
    <li className="relative overflow-hidden rounded-secondary border border-white/5 bg-white/5 p-4">
      <Icon
        aria-hidden
        className="absolute -right-3 -bottom-3 size-20 text-white/5"
      />

      <span
        aria-hidden
        className="font-mono text-3xl leading-none font-bold text-brand-red-500"
      >
        {String(number).padStart(2, "0")}
      </span>

      <h4 className="mt-3 font-bold">{title}</h4>

      <div className="relative mt-1 text-sm leading-relaxed text-white/70">
        {children}
      </div>
    </li>
  );
};
