"use client";

import { Handles } from "@/modules/career/components/Handles";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import {
  FlowNodeRoleCitizensAlignment,
  FlowNodeType,
} from "@sam-monorepo/database/browser";
import {
  NodeResizer,
  NodeToolbar,
  Position,
  useReactFlow,
  type NodeProps,
  type Node as NodeType,
} from "@xyflow/react";
import clsx from "clsx";
import { useState, type ComponentType } from "react";
import { FaPen } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";
import { CreateOrUpdateNodeModal } from "../../../components/CreateOrUpdateNodeModal";
import { useFlowContext } from "../../../components/FlowContext";
import { getBackground } from "../../../utils/getBackground";
import type { AdditionalDataType } from "./additionalDataType";

export type RoleNode = NodeType<
  | {
      redacted: true;
    }
  | {
      role: AdditionalDataType["roles"][number];
      roleCitizensAlignment: FlowNodeRoleCitizensAlignment;
      roleCitizensHideRole: boolean;
      backgroundColor: string;
      backgroundTransparency: number;
      showUnlocked: boolean;
      unlocked: boolean;
    },
  typeof FlowNodeType.ROLE_CITIZENS
>;

export const Node: ComponentType<NodeProps<RoleNode>> = (props) => {
  const { isUpdating, additionalData } = useFlowContext();
  const { deleteElements } = useReactFlow<RoleNode>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const onEdit = () => {
    setIsEditModalOpen((currentValue) => !currentValue);
  };

  const onDelete = () => {
    void deleteElements({ nodes: [{ id: props.id }] });
  };

  const unlocked =
    ("showUnlocked" in props.data && props.data.showUnlocked) ||
    ("unlocked" in props.data && props.data.unlocked);

  const backgroundColor =
    "redacted" in props.data
      ? "rgb(38, 38, 38)"
      : getBackground(
          props.data.backgroundColor,
          props.data.backgroundTransparency,
        );

  return (
    <div className="group/node size-full">
      {isUpdating && (
        <NodeToolbar
          position={Position.Right}
          align="start"
          className="flex flex-col gap-2"
        >
          <button
            onClick={onEdit}
            type="button"
            title="Bearbeiten"
            className="rounded-secondary bg-neutral-800 p-2 text-brand-red-500 hover:bg-neutral-700"
          >
            <FaPen />
          </button>

          {isEditModalOpen && "role" in props.data && (
            <CreateOrUpdateNodeModal
              onRequestClose={onEdit}
              initialData={{
                id: props.id,
                type: FlowNodeType.ROLE_CITIZENS,
                roleId: props.data.role.id,
                roleCitizensAlignment: props.data.roleCitizensAlignment,
                roleCitizensHideRole: props.data.roleCitizensHideRole,
                backgroundColor: props.data.backgroundColor,
                backgroundTransparency: props.data.backgroundTransparency,
                showUnlocked: props.data.showUnlocked,
              }}
            />
          )}

          <button
            onClick={onDelete}
            type="button"
            title="Löschen"
            className="rounded-secondary bg-neutral-800 p-2 text-brand-red-500 hover:bg-neutral-700"
          >
            <FaTrash />
          </button>
        </NodeToolbar>
      )}

      {isUpdating && props.selected && (
        <NodeResizer minWidth={1} minHeight={1} />
      )}

      <div
        className={clsx("h-full rounded-secondary bg-neutral-800 p-4", {
          "opacity-40 grayscale hover:opacity-100 hover:grayscale-0": !unlocked,
          "flex items-center justify-center opacity-40 grayscale-0":
            "redacted" in props.data,
          "flex justify-center":
            !("redacted" in props.data) &&
            (!("roleCitizensAlignment" in props.data) ||
              ("roleCitizensAlignment" in props.data &&
                (!props.data.roleCitizensAlignment ||
                  props.data.roleCitizensAlignment ===
                    FlowNodeRoleCitizensAlignment.CENTER))),
        })}
        style={{
          backgroundColor,
        }}
      >
        {"role" in props.data && (
          <div
            className={clsx("flex gap-4", {
              "flex-col items-center":
                !props.data.roleCitizensAlignment ||
                props.data.roleCitizensAlignment ===
                  FlowNodeRoleCitizensAlignment.CENTER,
              "flex-row items-start":
                props.data.roleCitizensAlignment ===
                FlowNodeRoleCitizensAlignment.LEFT,
              "flex-row-reverse items-start":
                props.data.roleCitizensAlignment ===
                FlowNodeRoleCitizensAlignment.RIGHT,
            })}
          >
            {!props.data.roleCitizensHideRole && (
              <SingleRoleBadge
                roleId={props.data.role.id}
                className="flex-none text-white"
              />
            )}

            <div
              className={clsx("flex flex-wrap gap-x-4 gap-y-2 text-lg", {
                "justify-start":
                  props.data.roleCitizensAlignment ===
                  FlowNodeRoleCitizensAlignment.LEFT,
                "justify-end":
                  props.data.roleCitizensAlignment ===
                  FlowNodeRoleCitizensAlignment.RIGHT,
                "justify-center":
                  !props.data.roleCitizensAlignment ||
                  props.data.roleCitizensAlignment ===
                    FlowNodeRoleCitizensAlignment.CENTER,
              })}
            >
              {(
                additionalData as AdditionalDataType
              ).citizensGroupedByVisibleRoles
                .get(props.data.role.id)
                ?.citizens.filter((citizen) => Boolean(citizen.handle))
                .toSorted((a, b) => a.handle!.localeCompare(b.handle!))
                .map((citizen) => (
                  <CitizenLink
                    key={citizen.id}
                    citizen={citizen}
                    className="py-0.5"
                  />
                ))}
            </div>
          </div>
        )}

        {"redacted" in props.data && (
          <p className="inline-block rounded-secondary border border-brand-red-500 px-2 py-1 text-xs font-bold text-brand-red-500">
            Redacted
          </p>
        )}
      </div>

      <Handles isUpdating={isUpdating} />
    </div>
  );
};
