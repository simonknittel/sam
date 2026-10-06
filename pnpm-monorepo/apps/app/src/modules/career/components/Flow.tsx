"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Note from "@/modules/common/components/Note";
import {
  type FlowEdge,
  type FlowNode,
  type Flow as FlowPrisma,
} from "@sam-monorepo/database/browser";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MarkerType,
  ReactFlow,
  type DefaultEdgeOptions,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEventHandler } from "react";
import { FaPen, FaSave } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { updateFlow } from "../actions/updateFlow";
import { getInitialNodesAndEdges } from "../utils/getInitialNodesAndEdges";
import { nodeTypes } from "../utils/nodeTypes";
import { CreateOrUpdateNodeModal } from "./CreateOrUpdateNodeModal";
import { FlowProvider } from "./FlowContext";

/**
 * The database stores only the connection of an edge. All edges get the same
 * look from these options.
 */
const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
};

interface Props {
  readonly className?: string;
  readonly flow: Pick<FlowPrisma, "id"> & {
    nodes: (FlowNode & {
      sources: FlowEdge[];
      targets: FlowEdge[];
    })[];
  };
  readonly canUpdate?: boolean;
  readonly isUpdating?: boolean;
  readonly additionalData: Record<string, unknown>;
}

export const Flow = ({
  className,
  flow,
  canUpdate = false,
  isUpdating = false,
  additionalData,
}: Props) => {
  const { initialNodes, initialEdges } = getInitialNodesAndEdges(
    flow,
    additionalData,
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isCreateNodeModalOpen, setIsCreateNodeModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [unsaved, setUnsaved] = useState(false);

  const onNodesChange: OnNodesChange = (changes) => {
    if (
      changes.some((change) => {
        if (change.type === "select") return false;
        if (change.type === "dimensions" && !change.resizing) return false;
        return true;
      })
    )
      setUnsaved(true);
    return setNodes((nds) => applyNodeChanges(changes, nds));
  };
  const onEdgesChange: OnEdgesChange = (changes) => {
    if (changes.some((change) => change.type !== "select")) setUnsaved(true);
    return setEdges((eds) => applyEdgeChanges(changes, eds));
  };
  const onConnect: OnConnect = (params) => {
    setUnsaved(true);
    return setEdges((eds) => addEdge(params, eds));
  };

  const onSave: MouseEventHandler<HTMLButtonElement> = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("flowId", flow.id);
      formData.append("nodes", JSON.stringify(nodes));
      formData.append("edges", JSON.stringify(edges));

      if (await runAction(updateFlow, formData)) setUnsaved(false);
    });
  };

  const onToggleUpdating: MouseEventHandler<HTMLButtonElement> = () => {
    if (isUpdating) {
      document.cookie = `is_updating_flow=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
    } else {
      document.cookie = `is_updating_flow=${flow.id}; path=/`;
    }

    router.refresh();
  };

  return (
    <FlowProvider isUpdating={isUpdating} additionalData={additionalData}>
      {unsaved && (
        <Note
          type="info"
          className="absolute top-4 left-1/2 z-10 -translate-x-1/2 text-blue-500"
          message="Ungespeicherte Änderungen"
        />
      )}

      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className={className}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        snapToGrid
        deleteKeyCode={isUpdating ? "Backspace" : null}
        nodesDraggable={isUpdating}
        nodesConnectable={isUpdating}
        nodesFocusable={isUpdating}
        edgesFocusable={isUpdating}
        colorMode="dark"
        minZoom={0.25}
      >
        <Background color="#444" variant={BackgroundVariant.Dots} />

        <Controls position="top-left" showInteractive={false}>
          {canUpdate && (
            <>
              <ControlButton
                onClick={onToggleUpdating}
                title="Bearbeiten de-/aktivieren"
              >
                <FaPen />
              </ControlButton>

              {isUpdating && (
                <>
                  <ControlButton
                    onClick={() => setIsCreateNodeModalOpen(true)}
                    title="Element hinzufügen"
                  >
                    <FaPlus />
                  </ControlButton>

                  <ControlButton onClick={onSave} title="Speichern">
                    {isPending ? <AsciiSpinner /> : <FaSave />}
                  </ControlButton>
                </>
              )}
            </>
          )}
        </Controls>

        {/* A child of ReactFlow, thus its forms can use useReactFlow() */}
        {isCreateNodeModalOpen && (
          <CreateOrUpdateNodeModal
            onRequestClose={() => setIsCreateNodeModalOpen(false)}
          />
        )}
      </ReactFlow>
    </FlowProvider>
  );
};
