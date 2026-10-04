"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { Button2 } from "@/modules/common/components/Button2";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { useSortableList } from "@/modules/common/utils/useSortableList";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCallback, useState, useTransition } from "react";
import { FaPlus } from "react-icons/fa";
import { reorderFlows } from "../actions/reorderFlows";
import type { ManageableFlow } from "../queries/getManageableFlows";
import { CreateFlowModal, type DuplicationSource } from "./CreateFlowModal";
import { FlowRow } from "./FlowRow";

/**
 * The drag handle only exists while the table shows the complete, unfiltered
 * list of live flows — a reorder derived from a filtered subset would not
 * describe the real order.
 */
const HANDLE_COLUMN: TableColumn = {
  key: "handle",
  label: <span className="sr-only">Reihenfolge</span>,
  track: "40px",
  minWidth: 40,
};

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Name", track: "minmax(180px,1.5fr)", minWidth: 180 },
  { key: "slug", label: "Slug", track: "minmax(140px,1fr)", minWidth: 140 },
  { key: "createdAt", label: "Erstellt", track: "160px", minWidth: 160 },
  { key: "updatedAt", label: "Geändert", track: "160px", minWidth: 160 },
  {
    key: "actions",
    label: "Aktionen",
    track: "80px",
    minWidth: 80,
    headerClassName: "sr-only",
  },
];

interface Props {
  readonly flows: readonly ManageableFlow[];
  readonly canReorder: boolean;
  readonly emptyMessage: string;
}

export const FlowsTableClient = ({
  flows,
  canReorder,
  emptyMessage,
}: Props) => {
  /**
   * Mirrors the server list so a drop can reorder before the action comes
   * back, and steps aside whenever the server sends a different list.
   */
  const [orderedFlows, setOrderedFlows] = useState<ManageableFlow[]>(() => [
    ...flows,
  ]);
  const serverSignature = flows.map((flow) => flow.id).join(",");
  const [renderedSignature, setRenderedSignature] = useState(serverSignature);
  if (renderedSignature !== serverSignature) {
    setRenderedSignature(serverSignature);
    setOrderedFlows([...flows]);
  }

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [duplicationSource, setDuplicationSource] =
    useState<DuplicationSource | null>(null);
  const [, startTransition] = useTransition();

  const getFlowName = useCallback(
    (id: UniqueIdentifier) =>
      orderedFlows.find((flow) => flow.id === id)?.name ?? "",
    [orderedFlows],
  );
  const { sensors, accessibility } = useSortableList(getFlowName);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedFlows.findIndex((flow) => flow.id === active.id);
    const newIndex = orderedFlows.findIndex((flow) => flow.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previousFlows = orderedFlows;
    const nextFlows = arrayMove(orderedFlows, oldIndex, newIndex);
    setOrderedFlows(nextFlows);

    const formData = new FormData();
    for (const flow of nextFlows) formData.append("flowId[]", flow.id);

    startTransition(async () => {
      const succeeded = await runAction(reorderFlows, formData);
      /** Put the rows back where they were rather than lying about the order */
      if (!succeeded) setOrderedFlows(previousFlows);
    });
  };

  const columns = canReorder ? [HANDLE_COLUMN, ...COLUMNS] : COLUMNS;

  const rows = orderedFlows.map((flow) => (
    <FlowRow
      key={flow.id}
      flow={flow}
      isSortable={canReorder}
      onDuplicate={(source) =>
        setDuplicationSource({ id: source.id, name: source.name })
      }
    />
  ));

  return (
    <>
      {/*
        The `id` is required, not cosmetic: without it dnd-kit derives its
        `aria-describedby` from a module-level counter that keeps climbing for
        the lifetime of the server process, while the browser's copy always
        restarts at 0 — so every server render disagreed with hydration.

        Without the modifiers the dragged row follows the pointer on both
        axes and past the table's edges, which grows the scroll container and
        pops its scrollbars up mid-drag.
      */}
      <DndContext
        id="career-flows"
        sensors={sensors}
        accessibility={accessibility}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <TableTile
          heading="Karrierebäume"
          cta={
            <Button2 type="button" onClick={() => setIsCreateModalOpen(true)}>
              <FaPlus />
              Anlegen
            </Button2>
          }
          columns={columns}
          isEmpty={orderedFlows.length === 0}
          emptyMessage={emptyMessage}
        >
          <SortableContext
            items={orderedFlows.map((flow) => flow.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows}
          </SortableContext>
        </TableTile>
      </DndContext>

      {isCreateModalOpen && (
        <CreateFlowModal onRequestClose={() => setIsCreateModalOpen(false)} />
      )}

      {duplicationSource && (
        <CreateFlowModal
          source={duplicationSource}
          onRequestClose={() => setDuplicationSource(null)}
        />
      )}
    </>
  );
};
