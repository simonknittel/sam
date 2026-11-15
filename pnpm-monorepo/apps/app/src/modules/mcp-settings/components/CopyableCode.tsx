import { CopyToClipboard } from "@/modules/common/components/CopyToClipboard";

interface Props {
  readonly value: string;
}

export const CopyableCode = ({ value }: Props) => {
  return (
    <div className="mt-1 flex items-start gap-2 rounded-secondary bg-neutral-800 px-3 py-2">
      <code className="flex-1 font-mono text-sm wrap-anywhere">{value}</code>
      <CopyToClipboard value={value} className="mt-0.5 flex-none" />
    </div>
  );
};
