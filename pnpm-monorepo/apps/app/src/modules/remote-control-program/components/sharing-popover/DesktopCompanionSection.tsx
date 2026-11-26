"use client";

import type { DesktopCompanionSignIn } from "@sam-monorepo/application";
import type { ReactNode } from "react";
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
  /** Undefined while the data of the server loads. The newest first. */
  readonly signIns: readonly DesktopCompanionSignIn[] | undefined;
}

/**
 * The desktop companion comes later (step 5 of the migration). SAM has no
 * settings of it (decision 23), only its sign-ins, for example after a test
 * build. The list shows only when it is not empty.
 */
export const DesktopCompanionSection = ({ serverState, signIns }: Props) => {
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
