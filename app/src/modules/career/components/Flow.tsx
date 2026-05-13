"use client";

import {
  type FlowEdge,
  type FlowNode,
  type Flow as FlowPrisma,
} from "@/generated/prisma/browser";
import Note from "@/modules/common/components/Note";
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
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { unstable_rethrow, useRouter } from "next/navigation";
import {
  useCallback,
  useState,
  useTransition,
  type MouseEventHandler,
} from "react";
import toast from "react-hot-toast";
import { FaPen, FaSave, FaSpinner } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { updateFlow } from "../actions/updateFlow";
import { getInitialNodesAndEdges } from "../utils/getInitialNodesAndEdges";
import { nodeTypes } from "../utils/nodeTypes";
import { CreateOrUpdateNodeModal } from "./CreateOrUpdateNodeModal";
import { FlowProvider } from "./FlowContext";

interface Props {
  readonly className?: string;
  readonly flow: FlowPrisma & {
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

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    if (
      changes.some((change) => {
        if (change.type === "select") return false;
        if (change.type === "dimensions" && !change.resizing) return false;
        return true;
      })
    )
      setUnsaved(true);
    return setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    if (changes.some((change) => change.type !== "select")) setUnsaved(true);
    return setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);
  const onConnect: OnConnect = useCallback((params) => {
    setUnsaved(true);
    return setEdges((eds) => addEdge(params, eds));
  }, []);

  const onSave: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("flowId", flow.id);
        formData.append("nodes", JSON.stringify(nodes));
        formData.append("edges", JSON.stringify(edges));

        const result = await updateFlow(formData);

        if (result.error) {
          toast.error(result.error);
          console.error(result.error);
          return;
        }

        setUnsaved(false);
        toast.success(result.success!);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  }, [flow.id, nodes, edges]);

  const onToggleUpdating: MouseEventHandler<HTMLButtonElement> =
    useCallback(() => {
      if (isUpdating) {
        document.cookie = `is_updating_flow=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      } else {
        document.cookie = `is_updating_flow=${flow.id}; path=/`;
      }

      router.refresh();
    }, [isUpdating, flow.id, router]);

  return (
    <FlowProvider
      isUpdating={isUpdating}
      setIsCreateNodeModalOpen={setIsCreateNodeModalOpen}
      setUnsaved={setUnsaved}
      setNodes={setNodes}
      additionalData={additionalData}
    >
      {unsaved && (
        <Note
          type="info"
          className="absolute left-1/2 -translate-x-1/2 top-4 z-10 text-blue-500"
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
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        snapToGrid
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
                    {isPending ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSave />
                    )}
                  </ControlButton>
                </>
              )}
            </>
          )}
        </Controls>
      </ReactFlow>

      {isCreateNodeModalOpen && (
        <CreateOrUpdateNodeModal
          onRequestClose={() => setIsCreateNodeModalOpen(false)}
        />
      )}
    </FlowProvider>
  );
};
