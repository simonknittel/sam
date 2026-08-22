"use client";

import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import type { EventTemplateListEntry } from "../queries/getEventTemplates";
import { CreateEventTemplateForm } from "./CreateEventTemplateForm";
import { EventTemplateRow } from "./EventTemplateRow";

const OWNER_COLUMN: TableColumn = {
  key: "owner",
  label: "Besitzer",
  track: "minmax(140px,1fr)",
  minWidth: 140,
};

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Name", track: "minmax(200px,2fr)", minWidth: 200 },
  { key: "sharing", label: "Typ", track: "120px", minWidth: 120 },
  { key: "updatedAt", label: "Aktualisiert", track: "160px", minWidth: 160 },
  {
    key: "actions",
    label: "Aktionen",
    track: "80px",
    minWidth: 80,
    headerClassName: "sr-only",
  },
];

interface Props {
  readonly entries: readonly EventTemplateListEntry[];
  /** Only viewers who see foreign templates get the owner column */
  readonly showOwner: boolean;
  /** Creating takes `event;create`, which not every viewer of the list has */
  readonly canCreate: boolean;
  readonly emptyMessage: string;
}

export const EventTemplatesTableClient = ({
  entries,
  showOwner,
  canCreate,
  emptyMessage,
}: Props) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const columns = showOwner
    ? [COLUMNS[0], OWNER_COLUMN, ...COLUMNS.slice(1)]
    : COLUMNS;

  return (
    <>
      <TableTile
        heading="Vorlagen"
        cta={
          canCreate && (
            <Button2 type="button" onClick={() => setIsCreateModalOpen(true)}>
              <FaPlus />
              Anlegen
            </Button2>
          )
        }
        columns={columns}
        isEmpty={entries.length === 0}
        emptyMessage={emptyMessage}
      >
        {entries.map((entry) => (
          <EventTemplateRow
            key={entry.template.id}
            entry={entry}
            showOwner={showOwner}
          />
        ))}
      </TableTile>

      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onRequestClose={() => setIsCreateModalOpen(false)}
          className="w-120"
          heading={<h2>Neue Event-Vorlage</h2>}
        >
          <CreateEventTemplateForm
            onSuccess={() => setIsCreateModalOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};
