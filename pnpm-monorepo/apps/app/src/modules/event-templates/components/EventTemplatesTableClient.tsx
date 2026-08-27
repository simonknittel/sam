"use client";

import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import type { EventTemplateListEntry } from "../queries/getEventTemplates";
import { EventTemplateRow } from "./EventTemplateRow";

/**
 * Lazily loaded like the other create forms: the form carries the Markdown
 * renderer of the description preview, which the table itself never needs.
 */
const CreateEventTemplateForm = dynamic(() =>
  import("./CreateEventTemplateForm").then(
    (mod) => mod.CreateEventTemplateForm,
  ),
);

const OWNER_COLUMN: TableColumn = {
  key: "owner",
  label: "Besitzer",
  track: "minmax(140px,1fr)",
  minWidth: 140,
};

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Name", track: "minmax(200px,2fr)", minWidth: 200 },
  { key: "sharing", label: "Freigabe", track: "120px", minWidth: 120 },
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
  /**
   * `event;create` — which not every viewer of the list holds, and which
   * creating, using and duplicating a template all end in.
   */
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
            canCreate={canCreate}
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
