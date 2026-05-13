"use client";

import { type Entity } from "@/generated/prisma/browser";
import { api } from "@/trpc/react";
import type { GenericEntityLogType } from "@/types";
import { Create } from "./Create";
import { HistoryEntry } from "./HistoryEntry";
import { HistoryEntrySkelton } from "./HistoryEntrySkeleton";

interface Props {
  type: GenericEntityLogType;
  entity: Entity;
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
  const history = api.entityLog.getHistory.useQuery({
    type,
    entityId: entity.id,
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
      <p className="text-neutral-500 italic mt-8">Keine Einträge vorhanden</p>
    );
  }

  return (
    <>
      {showCreate && <Create type={type} entity={entity} />}

      {entries}
    </>
  );
};
