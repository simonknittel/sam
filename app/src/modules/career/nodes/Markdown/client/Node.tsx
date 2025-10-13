"use client";

import { Handles } from "@/modules/career/components/Handles";
import { FlowNodeMarkdownPosition, FlowNodeType } from "@prisma/client";
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
import {
  useCallback,
  useState,
  type ComponentType,
  type FormEventHandler,
} from "react";
import toast from "react-hot-toast";
import { FaPen } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";
import Markdown from "react-markdown";
import { CreateOrUpdateNodeModal } from "../../../components/CreateOrUpdateNodeModal";
import { useFlowContext } from "../../../components/FlowContext";
import { getBackground } from "../../../utils/getBackground";
import { schema } from "./schema";

export type Markdown = NodeType<
  {
    markdown: string;
    markdownPosition: FlowNodeMarkdownPosition;
    backgroundColor: string;
    backgroundTransparency: number;
  },
  typeof FlowNodeType.MARKDOWN
>;

export const Node: ComponentType<NodeProps<Markdown>> = (props) => {
  const { isUpdating } = useFlowContext();
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
        markdown: formData.get("markdown"),
        markdownPosition: formData.get("markdownPosition"),
        backgroundColor: formData.get("backgroundColor"),
        backgroundTransparency: formData.get("backgroundTransparency"),
      });

      if (!result.success) {
        toast.error(
          "Beim Speichern ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(result.error);
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
                  markdown: result.data.markdown,
                  markdownPosition: result.data.markdownPosition,
                  backgroundColor: result.data.backgroundColor,
                  backgroundTransparency: result.data.backgroundTransparency,
                },
              },
            },
          ],
          nds,
        );
      });
    },
    [setNodes, props],
  );

  const onDelete = useCallback(() => {
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    setEdges((edges) =>
      edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    );
  }, [nodeId, setNodes, setEdges]);

  const backgroundColor = getBackground(
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
            className="bg-neutral-800 rounded-secondary p-2 text-brand-red-500 hover:bg-neutral-700"
          >
            <FaPen />
          </button>

          {isEditModalOpen && (
            <CreateOrUpdateNodeModal
              onRequestClose={onEdit}
              initialData={{
                id: props.id,
                type: FlowNodeType.MARKDOWN,
                markdown: props.data.markdown,
                markdownPosition: props.data.markdownPosition,
                backgroundColor: props.data.backgroundColor,
                backgroundTransparency: props.data.backgroundTransparency,
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
          "rounded-secondary h-full p-4 prose prose-invert prose-sm overflow-hidden flex flex-col justify-center",
          {
            "text-left":
              props.data.markdownPosition === FlowNodeMarkdownPosition.LEFT ||
              !props.data.markdownPosition,
            "text-right":
              props.data.markdownPosition === FlowNodeMarkdownPosition.RIGHT,
            "text-center":
              props.data.markdownPosition === FlowNodeMarkdownPosition.CENTER,
          },
        )}
        style={{
          backgroundColor,
        }}
      >
        <Markdown>{props.data.markdown}</Markdown>
      </div>

      <Handles isUpdating={isUpdating} />
    </div>
  );
};
