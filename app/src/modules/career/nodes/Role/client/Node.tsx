"use client";

import { env } from "@/env";
import { Handles } from "@/modules/career/components/Handles";
import {
  FlowNodeRoleImage,
  FlowNodeType,
  type Role,
  type Upload,
} from "@prisma/client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  applyNodeChanges,
  NodeResizer,
  NodeToolbar,
  Position,
  useNodeId,
  useReactFlow,
  type NodeProps,
  type Node as NodeType,
} from "@xyflow/react";
import clsx from "clsx";
import Image from "next/image";
import {
  useCallback,
  useState,
  type ComponentType,
  type FormEventHandler,
} from "react";
import toast from "react-hot-toast";
import { FaPen } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";
import { CreateOrUpdateNodeModal } from "../../../components/CreateOrUpdateNodeModal";
import { useFlowContext } from "../../../components/FlowContext";
import { getBackground } from "../../../utils/getBackground";
import type { AdditionalDataType } from "./additionalDataType";
import styles from "./Node.module.css";
import { schema } from "./schema";

export type RoleNode = NodeType<
  | {
      redacted: true;
    }
  | {
      role: Role & {
        icon: Upload | null;
        thumbnail: Upload | null;
      };
      roleImage: FlowNodeRoleImage;
      backgroundColor: string;
      backgroundTransparency: number;
      showUnlocked?: boolean;
      unlocked: boolean;
    },
  typeof FlowNodeType.ROLE
>;

export const Node: ComponentType<NodeProps<RoleNode>> = (props) => {
  const { isUpdating, additionalData } = useFlowContext();
  const nodeId = useNodeId();
  const { setNodes, setEdges } = useReactFlow();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const onEdit = useCallback(() => {
    setIsEditModalOpen((currentValue) => !currentValue);
  }, []);

  const onUpdate: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      setIsEditModalOpen(false);

      const formData = new FormData(event.currentTarget);
      const result = schema.safeParse({
        id: formData.get("id"),
        nodeType: formData.get("nodeType"),
        roleId: formData.get("roleId"),
        roleImage: formData.get("roleImage"),
        backgroundColor: formData.get("backgroundColor"),
        backgroundTransparency: formData.get("backgroundTransparency"),
        showUnlocked: formData.get("showUnlocked"),
      });

      if (!result.success) {
        toast.error(
          "Beim Speichern ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(result.error);
        return;
      }

      const role = (additionalData as AdditionalDataType).roles.find(
        (role) => role.id === result.data.roleId,
      );
      if (!role) {
        toast.error(
          "Beim Speichern ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.",
        );
        return;
      }

      setNodes((nds) => {
        return applyNodeChanges(
          [
            {
              type: "replace",
              id: props.id,
              item: {
                id: props.id,
                type: props.type,
                position: {
                  x: props.positionAbsoluteX,
                  y: props.positionAbsoluteY,
                },
                width: props.width,
                height: props.height,
                data: {
                  role,
                  roleImage: result.data.roleImage,
                  backgroundColor: result.data.backgroundColor,
                  backgroundTransparency: result.data.backgroundTransparency,
                  showUnlocked: result.data.showUnlocked,
                },
              },
            },
          ],
          nds,
        );
      });
    },
    [additionalData, setNodes, props],
  );

  const onDelete = useCallback(() => {
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    setEdges((edges) =>
      edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    );
  }, [nodeId, setNodes, setEdges]);

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

  const image =
    "redacted" in props.data
      ? null
      : props.data.roleImage === FlowNodeRoleImage.THUMBNAIL
        ? props.data.role.thumbnail
        : props.data.role.icon;

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
            className="bg-neutral-800 rounded-secondary p-2 text-brand-red-500 hover:bg-neutral-700"
          >
            <FaPen />
          </button>

          {isEditModalOpen && "role" in props.data && (
            <CreateOrUpdateNodeModal
              onRequestClose={onEdit}
              initialData={{
                id: props.id,
                type: FlowNodeType.ROLE,
                roleId: props.data.role.id,
                roleImage: props.data.roleImage,
                backgroundColor: props.data.backgroundColor,
                backgroundTransparency: props.data.backgroundTransparency,
                showUnlocked: props.data.showUnlocked,
              }}
              onUpdate={onUpdate}
            />
          )}

          <button
            onClick={onDelete}
            type="button"
            title="Löschen"
            className="bg-neutral-800 rounded-secondary p-2 text-brand-red-500 hover:bg-neutral-700"
          >
            <FaTrash />
          </button>
        </NodeToolbar>
      )}

      {props.selected && <NodeResizer minWidth={1} minHeight={1} />}

      <div
        className={clsx(
          "bg-neutral-800 rounded-secondary h-full p-4 flex justify-center items-center",
          {
            "grayscale opacity-40 hover:grayscale-0 hover:opacity-100":
              !unlocked,
            "opacity-40 grayscale-0": "redacted" in props.data,
          },
        )}
        style={{
          backgroundColor,
        }}
      >
        {"role" in props.data && (
          <Tooltip.Provider delayDuration={0}>
            <Tooltip.Root>
              <Tooltip.Trigger className="cursor-help w-full h-full">
                <Image
                  src={`https://${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${image?.id}`}
                  alt={props.data.role.name}
                  title={props.data.role.name}
                  width={100}
                  height={100}
                  className="object-contain object-center w-full h-full"
                  unoptimized={
                    (image &&
                      ["image/svg+xml", "image/gif"].includes(
                        image.mimeType,
                      )) ??
                    false
                  }
                  loading="lazy"
                />
              </Tooltip.Trigger>

              <Tooltip.Content
                className={clsx(
                  "px-2 py-1 text-sm leading-tight select-none rounded-secondary bg-brand-red-500 text-white",
                  styles.TooltipContent,
                )}
                side="top"
                sideOffset={20}
              >
                {props.data.role.name}
                <Tooltip.Arrow className="fill-brand-red-500" />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}

        {"redacted" in props.data && (
          <p className="text-brand-red-500 font-bold border border-brand-red-500 rounded-secondary px-2 py-1 inline-block text-xs">
            Redacted
          </p>
        )}
      </div>

      <Handles isUpdating={isUpdating} />
    </div>
  );
};
