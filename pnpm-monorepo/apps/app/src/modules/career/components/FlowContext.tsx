"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

interface FlowContext {
  isUpdating: boolean;
  additionalData: Record<string, unknown>;
}

const FlowContext = createContext<FlowContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly isUpdating: boolean;
  readonly additionalData: Record<string, unknown>;
}

export const FlowProvider = ({
  children,
  isUpdating,
  additionalData,
}: Props) => {
  const value = { isUpdating, additionalData };

  return <FlowContext value={value}>{children}</FlowContext>;
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
