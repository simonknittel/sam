"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { TRow, TableRowAlignment } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FlowRoleAccessType } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { FaGripVertical, FaRegCopy } from "react-icons/fa";
import type { ManageableFlow } from "../queries/getManageableFlows";
import { RestoreFlowButton } from "./RestoreFlowButton";

interface Props {
  readonly flow: ManageableFlow;
  /** Renders the drag handle and makes the row sortable */
  readonly isSortable: boolean;
  /** Skips the drag transition for viewers who asked for reduced motion */
  readonly prefersReducedMotion: boolean;
  readonly onDuplicate: (flow: ManageableFlow) => void;
}

export const FlowRow = ({
  flow,
  isSortable,
  prefersReducedMotion,
  onDuplicate,
}: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: flow.id, disabled: !isSortable });

  const readCount = flow.roleAccess.filter(
    (access) => access.type === FlowRoleAccessType.READ,
  ).length;
  const updateCount = flow.roleAccess.filter(
    (access) => access.type === FlowRoleAccessType.UPDATE,
  ).length;

  return (
    <TRow
      ref={setNodeRef}
      alignment={TableRowAlignment.Top}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: prefersReducedMotion ? undefined : transition,
      }}
      className={clsx("py-2", { "relative z-10 bg-neutral-800": isDragging })}
    >
      {isSortable && (
        <td>
          <button
            type="button"
            className="flex size-8 cursor-grab items-center justify-center rounded-secondary text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 focus-visible:outline-2 outline-interaction-700 active:cursor-grabbing"
            aria-label={`${flow.name} verschieben`}
            {...attributes}
            {...listeners}
          >
            <FaGripVertical />
          </button>
        </td>
      )}

      <td className="min-w-0">
        <Link
          href={`/app/career/settings/${flow.id}`}
          title={flow.name}
          className="block truncate text-interaction-500 hover:underline focus-visible:underline active:text-interaction-300"
        >
          {flow.name}
        </Link>

        {flow.deletedAt && (
          <span className="text-xs text-neutral-500">
            Gelöscht am {formatDate(flow.deletedAt)} von{" "}
            {flow.deletedBy?.handle ?? "Unbekannt"}
          </span>
        )}
      </td>

      <td className="min-w-0">
        {flow.deletedAt ? (
          <span
            className="block truncate font-mono text-sm text-neutral-500"
            title={flow.slug}
          >
            {flow.slug}
          </span>
        ) : (
          <Link
            href={`/app/career/${flow.slug}`}
            title={`/app/career/${flow.slug}`}
            className="block truncate font-mono text-sm text-interaction-500 hover:underline focus-visible:underline active:text-interaction-300"
          >
            {flow.slug}
          </Link>
        )}
      </td>

      <td className="min-w-0 text-sm">
        {readCount + updateCount === 0 ? (
          <span className="text-neutral-500">Kein Rollenzugriff</span>
        ) : (
          <span>
            {readCount} × Lesen, {updateCount} × Bearbeiten
          </span>
        )}
      </td>

      <td className="min-w-0 text-sm">{flow._count.nodes}</td>

      <td className="min-w-0 text-sm">
        <span className="block">{formatDate(flow.createdAt)}</span>
        <CitizenLink citizen={flow.createdBy} className="truncate" />
      </td>

      <td className="min-w-0 text-sm">
        <span className="block">{formatDate(flow.updatedAt)}</span>
        <CitizenLink citizen={flow.updatedBy} className="truncate" />
      </td>

      <td>
        {flow.deletedAt ? (
          <RestoreFlowButton
            flowId={flow.id}
            name={flow.name}
            slug={flow.slug}
          />
        ) : (
          <Button2
            type="button"
            variant={Button2Variant.IconOnly}
            tooltip="Duplizieren"
            onClick={() => onDuplicate(flow)}
          >
            <FaRegCopy />
          </Button2>
        )}
      </td>
    </TRow>
  );
};
