import type { IconType } from "react-icons";

interface Props {
  readonly icon?: IconType;
  readonly children: string;
}

/** The name of a control of the Log Analyzer in a text, in the look of the control */
export const UiLabel = ({ icon: Icon, children }: Props) => {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-secondary border border-white/15 bg-white/5 px-1.5 py-0.5 align-middle font-mono text-xs whitespace-nowrap text-white/80 uppercase">
      {Icon && <Icon aria-hidden className="flex-none text-brand-red-300" />}
      {children}
    </span>
  );
};
