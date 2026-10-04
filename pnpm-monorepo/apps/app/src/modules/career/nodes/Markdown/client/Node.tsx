"use client";

import { Handles } from "@/modules/career/components/Handles";
import {
  FlowNodeMarkdownPosition,
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
import { useCallback, useState, type ComponentType } from "react";
import { FaPen } from "react-icons/fa";
import { FaTrash } from "react-icons/fa6";
import Markdown from "react-markdown";
import { CreateOrUpdateNodeModal } from "../../../components/CreateOrUpdateNodeModal";
import { useFlowContext } from "../../../components/FlowContext";
import { getBackground } from "../../../utils/getBackground";

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
  const { deleteElements } = useReactFlow<Markdown>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const onEdit = useCallback(() => {
    setIsEditModalOpen((currentValue) => !currentValue);
  }, []);

  const onDelete = useCallback(() => {
    void deleteElements({ nodes: [{ id: props.id }] });
  }, [deleteElements, props.id]);

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
            className="rounded-secondary bg-neutral-800 p-2 text-brand-red-500 hover:bg-neutral-700"
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
        className={clsx(
          "prose prose-sm flex h-full flex-col justify-center overflow-hidden rounded-secondary p-4 prose-invert",
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
