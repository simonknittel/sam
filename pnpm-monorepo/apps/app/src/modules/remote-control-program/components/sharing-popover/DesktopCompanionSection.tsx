"use client";

import type {
  DesktopCompanionSignIn,
  OwnRuntime,
} from "@sam-monorepo/application";
import type { ReactNode } from "react";
import { ConnectedDesktopCompanionListItem } from "./ConnectedDesktopCompanionListItem";
import { DesktopCompanionSignInListItem } from "./DesktopCompanionSignInListItem";
import {
  SharingPopoverSection,
  SharingPopoverSubsection,
} from "./SharingPopoverSection";
import {
  SHARING_POPOVER_RUNTIME_TAB_LABELS,
  SharingPopoverRuntimeTab,
} from "./SharingPopoverTab";

interface Props {
  /** The state of the read of the data of the server */
  readonly serverState: ReactNode;
  /**
   * The connected desktop companions of the owner. Undefined while the data
   * of the server loads. The most recent connections first.
   */
  readonly runtimes: readonly OwnRuntime[] | undefined;
  /** Undefined while the data of the server loads. The newest first. */
  readonly signIns: readonly DesktopCompanionSignIn[] | undefined;
}

/**
 * The desktop companion comes later (step 5 of the migration). SAM has no
 * settings of it (decision 23), only the connected programs and the
 * sign-ins, for example of a test build. Each list shows only when it is not
 * empty.
 */
export const DesktopCompanionSection = ({
  serverState,
  runtimes,
  signIns,
}: Props) => {
  return (
    <SharingPopoverSection
      heading={
        SHARING_POPOVER_RUNTIME_TAB_LABELS[
          SharingPopoverRuntimeTab.DesktopCompanion
        ]
      }
    >
      <p className="text-sm text-neutral-400">
        Der Desktop Companion kommt bald: ein Programm für Windows und Linux,
        das ohne einen Tab von SAM läuft. Es liest die Game Logs von Star
        Citizen und später auch Live-Daten über die gRPC-Schnittstelle des
        Spiels. Was es hochlädt, entscheidest du im Programm.
      </p>

      {serverState}

      {runtimes && runtimes.length > 0 && (
        <SharingPopoverSubsection heading="Verbunden">
          <ul className="flex flex-col divide-y divide-white/10">
            {runtimes.map((runtime) => (
              <ConnectedDesktopCompanionListItem
                key={runtime.runtimeId}
                runtime={runtime}
              />
            ))}
          </ul>
        </SharingPopoverSubsection>
      )}

      {signIns && signIns.length > 0 && (
        <SharingPopoverSubsection heading="Anmeldungen">
          <ul className="flex flex-col divide-y divide-white/10">
            {signIns.map((signIn) => (
              <DesktopCompanionSignInListItem key={signIn.id} signIn={signIn} />
            ))}
          </ul>
        </SharingPopoverSubsection>
      )}
    </SharingPopoverSection>
  );
};
