"use client";

import { api } from "@/trpc/react";
import type { OwnRuntime } from "@sam-monorepo/application";
import { RuntimeKind, type CapabilityId } from "@sam-monorepo/domain";
import { useIsRemoteControlProgramAvailable } from "../runtime/useBrowserRuntime";

/** The presence of a runtime changes seldom while a control UI is open */
const READ_INTERVAL_MILLISECONDS = 30_000;

/**
 * The runtime is online, one of its connectors supplies the capability, and
 * its local access layer lets the capability leave the machine
 */
const isUploadedByDesktopCompanion = (
  runtime: OwnRuntime,
  capabilityId: CapabilityId,
) =>
  runtime.kind === RuntimeKind.desktop_companion &&
  runtime.isOnline &&
  runtime.announcement !== null &&
  runtime.announcement.connectors.some((connector) =>
    connector.capabilities.some((capability) => capability.id === capabilityId),
  ) &&
  runtime.announcement.local_access_layer.capability_rules.some(
    (rule) => rule.capability_id === capabilityId && rule.is_on,
  );

/**
 * Whether a desktop companion of the user uploads the own entries of the
 * capability. Then the browser needs no access of its own, for example no
 * log folder.
 *
 * @param isEnabled Only while the answer changes the control UI
 */
export const useIsUploadedByDesktopCompanion = (
  capabilityId: CapabilityId,
  isEnabled: boolean,
) => {
  const { data } = api.remoteControlProgram.listOwnRuntimes.useQuery(
    undefined,
    {
      enabled: useIsRemoteControlProgramAvailable() && isEnabled,
      refetchInterval: READ_INTERVAL_MILLISECONDS,
      // Without the answer, the control UI asks for the access of the browser
      retry: false,
    },
  );

  return (
    data?.runtimes.some((runtime) =>
      isUploadedByDesktopCompanion(runtime, capabilityId),
    ) ?? false
  );
};
