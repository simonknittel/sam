import { Link } from "@/modules/common/components/Link";
import {
  UPLOAD_USAGE_TYPE_LABELS,
  UploadUsageType,
} from "@sam-monorepo/domain";
import type { UploadUsage } from "../utils/uploadUsage";

interface Props {
  readonly usages: readonly UploadUsage[];
}

export const UploadLocations = ({ usages }: Props) => {
  if (usages.length === 0)
    return (
      <div className="flex flex-col gap-1">
        <span className="w-fit rounded-secondary border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-400">
          {UPLOAD_USAGE_TYPE_LABELS[UploadUsageType.Unused]}
        </span>

        <span className="text-xs text-white/40">
          Wird frühestens 24 Stunden nach dem Hochladen bei der nächtlichen
          Bereinigung gelöscht.
        </span>
      </div>
    );

  return (
    <ul className="flex flex-col gap-1">
      {usages.map((usage) => (
        <li key={usage.key} className="flex min-w-0 items-baseline gap-2">
          <span className="flex-none text-xs text-white/40">
            {UPLOAD_USAGE_TYPE_LABELS[usage.type]}
          </span>

          <Link
            href={usage.href}
            title={usage.label}
            className="truncate text-interaction-500 hover:underline focus-visible:underline"
          >
            {usage.label}
          </Link>
        </li>
      ))}
    </ul>
  );
};
