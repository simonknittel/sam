"use client";

import { type Node } from "@xyflow/react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useMemo } from "react";

interface FlowContext {
  isUpdating: boolean;
  setIsCreateNodeModalOpen: Dispatch<SetStateAction<boolean>>;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  additionalData: Record<string, unknown>;
}

const FlowContext = createContext<FlowContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly isUpdating: boolean;
  readonly setIsCreateNodeModalOpen: Dispatch<SetStateAction<boolean>>;
  readonly setUnsaved: Dispatch<SetStateAction<boolean>>;
  readonly setNodes: Dispatch<SetStateAction<Node[]>>;
  readonly additionalData: Record<string, unknown>;
}

export const FlowProvider = ({
  children,
  isUpdating,
  setIsCreateNodeModalOpen,
  setUnsaved,
  setNodes,
  additionalData,
}: Props) => {
  const value = useMemo(
    () => ({
      isUpdating,
      setIsCreateNodeModalOpen,
      setUnsaved,
      setNodes,
      additionalData,
    }),
    [
      isUpdating,
      setIsCreateNodeModalOpen,
      setUnsaved,
      setNodes,
      additionalData,
    ],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useFlowContext() {
  const context = useContext(FlowContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
