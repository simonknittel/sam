"use client";

import { env } from "@/env";
import { createContext, useEffect, useState, type ReactNode } from "react";
import { BrowserRuntimeController } from "./BrowserRuntimeController";

/** The version in the `hello` of the relay protocol */
const RUNTIME_VERSION = String(env.NEXT_PUBLIC_RELEASE_NUMBER ?? "development");

/** Null when the user cannot use the Remote Control Program */
export const BrowserRuntimeContext =
  createContext<BrowserRuntimeController | null>(null);

interface Props {
  /**
   * `canUseRemoteControlProgram()` of the user. Without it, the provider
   * starts nothing, and the hooks give no runtime.
   */
  readonly isEnabled: boolean;
  readonly children: ReactNode;
}

/**
 * The browser runtime of the Remote Control Program on all SAM pages (see
 * `README.md`)
 */
export const BrowserRuntimeProvider = ({ isEnabled, children }: Props) => {
  const [controller] = useState(
    () => new BrowserRuntimeController({ runtimeVersion: RUNTIME_VERSION }),
  );

  useEffect(() => {
    if (!isEnabled) return;

    controller.connect();
    return () => {
      controller.disconnect();
    };
  }, [controller, isEnabled]);

  return (
    <BrowserRuntimeContext value={isEnabled ? controller : null}>
      {children}
    </BrowserRuntimeContext>
  );
};
