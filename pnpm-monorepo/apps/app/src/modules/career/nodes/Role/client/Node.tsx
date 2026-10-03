"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { Handles } from "@/modules/career/components/Handles";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { useRolesContext } from "@/modules/roles/components/RolesContext";
import {
  FlowNodeRoleImage,
  FlowNodeType,
  type Role,
  type Upload,
} from "@sam-monorepo/database/browser";
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
  const { roles } = useRolesContext();
  const authentication = useAuthentication();
  if (!authentication || !authentication.session.entity)
    throw new Error("Unauthorized");

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

  const role =
    "role" in props.data && props.data.role
      ? // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
        roles.find((role) => role.id === props.data.role.id) // eslint-disable-line @typescript-eslint/no-unsafe-member-access
      : null;

  const unlocked =
    ("showUnlocked" in props.data && props.data.showUnlocked) ||
    ("unlocked" in props.data && props.data.unlocked);

  const currentLevel = role
    ? authentication.session.entity.roleAssignments.find(
        (roleAssignment) => roleAssignment.roleId === role.id,
      )?.currentLevel
    : null;
  const showLevelProgress = Boolean(
    role?.maxLevel &&
    (currentLevel ?? 0) < role.maxLevel &&
    unlocked &&
    authentication.session.entity.roleAssignments.some(
      (roleAssignment) => roleAssignment.roleId === role?.id,
    ),
  );

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
        ? role?.thumbnail
        : role?.icon;

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
            className="rounded-secondary bg-neutral-800 p-2 text-brand-red-500 hover:bg-neutral-700"
          >
            <FaTrash />
          </button>
        </NodeToolbar>
      )}

      {props.selected && <NodeResizer minWidth={1} minHeight={1} />}

      <div
        className={clsx(
          "relative flex h-full items-center justify-center rounded-secondary bg-neutral-800 p-4",
          {
            "opacity-40 grayscale hover:opacity-100 hover:grayscale-0":
              !unlocked,
            "opacity-40 grayscale-0": "redacted" in props.data,
          },
        )}
        style={{
          backgroundColor,
        }}
      >
        {role && (
          <Tooltip
            asChild
            side="top"
            sideOffset={20}
            contentClassName="transition-[opacity,translate] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] starting:translate-y-2.5 starting:opacity-0"
            triggerChildren={
              <button type="button" className="h-full w-full cursor-help pb-1">
                <Image
                  src={getPublicUploadUrl(image?.id ?? "")}
                  alt={role.name}
                  title={role.name}
                  width={100}
                  height={100}
                  className="h-full w-full object-contain object-center"
                  unoptimized={
                    (image &&
                      ["image/svg+xml", "image/gif"].includes(
                        image.mimeType,
                      )) ??
                    false
                  }
                  loading="lazy"
                />

                {showLevelProgress ? (
                  <span className="absolute right-0 bottom-0 left-0 block h-1 rounded-b-secondary bg-white/30">
                    <span
                      className="block h-full bg-me"
                      style={{
                        width: `${((currentLevel ?? 0) / role.maxLevel!) * 100}%`,
                      }}
                    />
                  </span>
                ) : null}
              </button>
            }
          >
            {role.name}
          </Tooltip>
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
