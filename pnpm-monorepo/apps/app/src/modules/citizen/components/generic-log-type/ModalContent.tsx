"use client";

import { api } from "@/trpc/react";
import type { GenericCitizenLogType } from "@/types";
import { type Citizen } from "@sam-monorepo/database/browser";
import { Create } from "./Create";
import { HistoryEntry } from "./HistoryEntry";
import { HistoryEntrySkelton } from "./HistoryEntrySkeleton";

interface Props {
  type: GenericCitizenLogType;
  entity: Pick<Citizen, "id">;
  showCreate?: boolean;
  showDelete?: boolean;
  showConfirm?: boolean;
}

export const ModalContent = ({
  type,
  entity,
  showCreate,
  showDelete,
  showConfirm,
}: Readonly<Props>) => {
  const history = api.citizenLog.getHistory.useQuery({
    type,
    citizenId: entity.id,
  });

  let entries;
  if (!history.data && history.isLoading) {
    entries = <HistoryEntrySkelton />;
  } else if (history.data && history.data.length > 0) {
    entries = (
      <ul className="mt-8 flex flex-col gap-4">
        {history.data.map((log) => (
          <HistoryEntry
            key={log.id}
            log={log}
            showDelete={showDelete}
            showConfirm={showConfirm}
          />
        ))}
      </ul>
    );
  } else {
    entries = (
      <p className="mt-8 text-neutral-500 italic">Keine Einträge vorhanden</p>
    );
  }

  return (
    <>
      {showCreate && <Create type={type} entity={entity} />}

      {entries}
    </>
  );
};
