"use client";

import { env } from "@/env";
import { api } from "@/trpc/react";
import { createContext, useEffect, useMemo, type ReactNode } from "react";
import { SharingPopoverProvider } from "../components/sharing-popover/SharingPopoverProvider";
import { BrowserRuntimeController } from "./BrowserRuntimeController";
import { createOwnEntryKeysSource } from "./serverRequests";

/** The version in the `hello` of the relay protocol */
const RUNTIME_VERSION = String(env.NEXT_PUBLIC_RELEASE_NUMBER ?? "development");

/** Null when the user cannot use the Remote Control Program */
export const BrowserRuntimeContext =
  createContext<BrowserRuntimeController | null>(null);

interface Props {
  /**
   * The citizen of the session when `canUseRemoteControlProgram()` of the
   * user is true. Null: the provider starts nothing, and the hooks give no
   * runtime. Each citizen has an own runtime in the browser.
   */
  readonly citizenId: string | null;
  readonly children: ReactNode;
}

/**
 * The browser runtime of the Remote Control Program on all SAM pages (see
 * `README.md`), and the open state of the sharing popover, which the control
 * UIs share with the items of the shell
 */
export const BrowserRuntimeProvider = ({ citizenId, children }: Props) => {
  const trpcUtils = api.useUtils();

  const controller = useMemo(
    () =>
      citizenId === null
        ? null
        : new BrowserRuntimeController({
            runtimeVersion: RUNTIME_VERSION,
            citizenId,
            findOwnEntryKeys: createOwnEntryKeysSource(trpcUtils.client),
          }),
    [citizenId, trpcUtils],
  );

  useEffect(() => {
    if (controller === null) return;

    controller.connect();
    return () => {
      controller.disconnect();
    };
  }, [controller]);

  return (
    <BrowserRuntimeContext value={controller}>
      <SharingPopoverProvider isEnabled={controller !== null}>
        {children}
      </SharingPopoverProvider>
    </BrowserRuntimeContext>
  );
};
