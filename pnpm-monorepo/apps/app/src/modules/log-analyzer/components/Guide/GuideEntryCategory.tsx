import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { PATTERNS } from "../../utils/PATTERNS";

interface EntryTypeProps {
  readonly type: LogAnalyzerEntryType;
}

const EntryType = ({ type }: EntryTypeProps) => {
  const { title, icon: Icon } = PATTERNS[type];

  return (
    <li className="inline-flex items-center gap-1.5 rounded-secondary bg-white/5 px-2 py-1 text-sm">
      <Icon aria-hidden className="flex-none text-white/40" />
      {title}
    </li>
  );
};

interface Props {
  readonly title: string;
  readonly types: readonly LogAnalyzerEntryType[];
}

export const GuideEntryCategory = ({ title, types }: Props) => {
  return (
    <li className="mb-4 break-inside-avoid rounded-secondary border border-white/5 p-3">
      <h4 className="flex items-baseline justify-between gap-2 font-mono text-sm text-white/40 uppercase">
        {title}
        <span className="text-xs">{types.length}</span>
      </h4>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {types.map((type) => (
          <EntryType key={type} type={type} />
        ))}
      </ul>
    </li>
  );
};
