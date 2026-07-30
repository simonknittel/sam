import { authenticate } from "@/modules/auth/server";
import { SmallBadge } from "@/modules/common/components/SmallBadge";
import clsx from "clsx";
import type { ChangelogEntry } from "../types";
import { RedactedDayItem } from "./RedactedDayItem";

interface Props {
  readonly entry: ChangelogEntry;
  readonly isNew?: boolean;
}

export const DayItem = async ({ entry, isNew = false }: Props) => {
  if (entry.requiresAuth) {
    const authentication = await authenticate();
    if (!authentication) return <RedactedDayItem />;

    const authorized = await authentication.authorize(
      entry.requiresAuth.resource,
      entry.requiresAuth.action,
    );
    if (!authorized) return <RedactedDayItem />;
  }

  return (
    <li
      className={clsx("border-l pl-5 relative", {
        "border-l-transparent": isNew,
        "border-l-neutral-800/80": !isNew,
      })}
    >
      {isNew && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px"
          style={{
            background: "linear-gradient(to bottom, #f59e0b, transparent)",
          }}
        />
      )}

      <div className="flex items-center gap-2">
        <strong className="block font-bold font-mono uppercase">
          {entry.title}
        </strong>

        {isNew && (
          <div className="bg-amber-500 text-black font-mono uppercase text-xs px-1 py-0.5">
            Neu
          </div>
        )}
      </div>

      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {entry.tags.map((tag, index) => (
            <SmallBadge key={index} value={tag} />
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2">{entry.body()}</div>
    </li>
  );
};
