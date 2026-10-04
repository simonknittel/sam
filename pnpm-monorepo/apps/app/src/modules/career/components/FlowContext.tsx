"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useMemo } from "react";

interface FlowContext {
  isUpdating: boolean;
  setIsCreateNodeModalOpen: Dispatch<SetStateAction<boolean>>;
  additionalData: Record<string, unknown>;
}

const FlowContext = createContext<FlowContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly isUpdating: boolean;
  readonly setIsCreateNodeModalOpen: Dispatch<SetStateAction<boolean>>;
  readonly additionalData: Record<string, unknown>;
}

export const FlowProvider = ({
  children,
  isUpdating,
  setIsCreateNodeModalOpen,
  additionalData,
}: Props) => {
  const value = useMemo(
    () => ({
      isUpdating,
      setIsCreateNodeModalOpen,
      additionalData,
    }),
    [isUpdating, setIsCreateNodeModalOpen, additionalData],
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
